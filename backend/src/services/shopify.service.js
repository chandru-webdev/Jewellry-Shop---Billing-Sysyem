// =============================================================
// Shopify service — the ERP -> Shopify bridge (Phase 15-19)
//
// What it does:
//   1. Push a product (create or update) to Shopify
//   2. Push a product's price to Shopify  (Phase 18)
//   3. Push a product's stock to Shopify   (Phase 19)
//
// It reads products from OUR database and writes them to the
// Shopify store. Every bulk job is recorded in ShopifySyncLog
// so the dashboard can show the last sync status.
// =============================================================
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const prisma = require('../prisma/client')
const { Prisma } = require('@prisma/client')
const { request, graphql, throttle, ShopifyApiError, withRetry } = require('../integrations/shopify/client')
const { getSilverRate } = require('./pricing.service')
const { normalizeSKU } = require('../utils/sku')
const env = require('../config/env')
const { credentials } = require('../integrations/shopify/shopifyConfig')

const Decimal = Prisma.Decimal

// History is kept for 3 days, then pruned (see pruneSyncHistory below).
const HISTORY_RETENTION_MS = 3 * 24 * 60 * 60 * 1000

// How many products a bulk job may process at the same time. Calls are still
// paced by the shared Shopify rate limiter (client.js), so several products
// can be in flight without blowing Shopify's ~2 req/s sustained cap.
const BULK_CONCURRENCY = 4

// How long to pause after a product write that carried images, so Shopify
// finishes reprocessing and releases the product lock before the variant /
// inventory / metafield writes for the same product go out. See the 409 note in
// updateProductOnShopify.
const PRODUCT_WRITE_SETTLE_MS = Number(process.env.SHOPIFY_PRODUCT_SETTLE_MS) > 0
  ? Number(process.env.SHOPIFY_PRODUCT_SETTLE_MS)
  : 2500

// How many not-yet-present photos we are willing to upload inside ONE product
// update. Image uploads are the slow part of the call: the silver-bangle product
// was missing 68, and pushing them all in one PUT could not finish inside the
// 30s client ceiling and came back "could not reach Shopify". Batching keeps
// every request small; later syncs of the same product carry the next batch
// until the gallery is complete.
const MAX_NEW_IMAGES_PER_SYNC = Number(process.env.SHOPIFY_MAX_NEW_IMAGES) > 0
  ? Number(process.env.SHOPIFY_MAX_NEW_IMAGES)
  : 12

// A gallery bigger than this gets checked for byte-identical copies before it
// is pushed. Filenames cannot spot them: Shopify mints an unrelated uuid for
// every re-upload, so "the same photo 106 times" has 106 different names and
// never matches on string comparison. Only the bytes are the same. The
// threshold is 1: anything that could hold a duplicate gets checked, because
// the duplicates we actually found were on 6-14 image galleries, not the big
// ones. The cost is re-downloading the gallery on a sync, which is cheap
// compared to shipping the same photo twenty times.
const IMAGE_DEDUPE_THRESHOLD = Number(process.env.SHOPIFY_IMAGE_DEDUPE_THRESHOLD) > 0
  ? Number(process.env.SHOPIFY_IMAGE_DEDUPE_THRESHOLD)
  : 1

const IMAGE_HASH_TIMEOUT_MS = Number(process.env.SHOPIFY_IMAGE_HASH_TIMEOUT_MS) > 0
  ? Number(process.env.SHOPIFY_IMAGE_HASH_TIMEOUT_MS)
  : 20000

const IMAGE_HASH_CONCURRENCY = 8

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Run `worker(item, index)` over every item with at most `concurrency` in
// flight at once. Each worker must return (not throw) its own outcome so one
// failing item never stalls or rejects the rest of the pool.
async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return results
}

// A Shopify 404 means the id we stored for a product no longer exists on the
// store: it was deleted there, or replaced (Shopify mints a new id every time a
// product is recreated). That is a DEAD MAPPING, not a transient failure, so a
// bulk job must clear the stale ids and carry on rather than failing the whole
// run on one product. Clearing them also lets the next product sync treat the
// product as unlinked and recreate it under a fresh id.
function isStaleShopifyMappingError(err) {
  return err instanceof ShopifyApiError && err.status === 404
}

// Shopify mints a fresh uuid every time the same image is re-uploaded, so a
// photo that round-trips ERP -> Shopify -> ERP grows a filename each trip:
//   images_A.jpg -> images_A_B.jpg -> images_A_B_C.jpg
// normalizeImageUrl used to strip only ONE trailing "_token", so images_A_B.jpg
// collapsed to images_A.jpg while images_A_B_C.jpg collapsed to images_A_B.jpg
// -- two spellings of the same photo compared as different, so every sync
// re-appended the whole gallery and it grew without bound.
// Keep the FIRST uuid (that is the photo's identity) and drop the rest.
// Only uuid-SHAPED groups are stripped here, so this cannot merge two different
// photos that merely share a filename stem. (The separate size-suffix rule below
// is pre-existing and broader -- it still collapses "product_image_1.jpg" and
// "product_image_2.jpg" to the same key. Left alone deliberately: tightening it
// changes dedupe for every product and risks dropping legitimately distinct
// images. Raise it as its own change if it ever bites.)
const RE_UPLOAD_UUIDS = /(_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})+(?=\.[^.]+$)/i

const shopifyService = {

  // Exposed for tests and for the inventory/stock paths that need to tell a
  // dead Shopify mapping (404) apart from a real sync failure.
  isStaleShopifyMappingError,

  // Normalize a Shopify product payload's image list to clean image URLs.
  shopifyImageUrls(sp) {
    return (sp.images || []).map((img) => (img && img.src) || '').filter(Boolean)
  },

  // Normalize URL for comparison: strip query params, CDN size suffixes
  normalizeImageUrl(url) {
    if (!url) return ''
    try {
      const u = new URL(url)
      let path = u.pathname.replace(RE_UPLOAD_UUIDS, '$1')
      // Remove query params and Shopify CDN size suffixes (e.g., _100x, _large)
      path = path.replace(/(_\d+x\d*|_\w+)(?=\.[^.]+$)/, '')
      return `${u.origin}${path}`
    } catch {
      return String(url).trim()
    }
  },

  // True when the image is hosted by Shopify itself rather than by our own
  // uploads. Only Shopify-hosted URLs are subject to a deletion made in the
  // Shopify admin -- a local /uploads/... file has never been on the store and
  // still has to be pushed.
  isStoreHostedImage(url) {
    try {
      const host = new URL(url).hostname.toLowerCase()
      return host === 'cdn.shopify.com' || host.endsWith('.cdn.shopify.com')
    } catch {
      return false
    }
  },

  // Merge image URLs: store images first, then ERP images that aren't already on store.
  // Normalizes URLs for comparison to handle CDN variants.
  mergeImageUrls(storeImages, erpImages) {
    const merged = []
    const seen = new Set()
    // Only strings belong here. Anything else (a {src} payload object that
    // leaked in) would be persisted as-is and later crash every call site that
    // does url.endsWith(...), taking the whole sync down with it.
    const add = (src) => {
      if (typeof src !== 'string') return
      const trimmed = src.trim()
      if (!trimmed) return
      const key = this.normalizeImageUrl(trimmed)
      if (seen.has(key)) return
      seen.add(key)
      merged.push(trimmed)
    }
    // Add store images first (they're already on Shopify)
    for (const src of storeImages || []) add(src)
    // Add ERP images only if not already present (after normalization)
    for (const src of erpImages || []) add(src)
    return merged
  },

  // Drop byte-identical copies from a gallery, keeping the first occurrence.
  // Shopify re-hosts the file we send it, so every re-upload of the same photo
  // comes back under a brand-new uuid -- 106 different filenames, 106 copies of
  // one image. No string comparison can see that; only the bytes can.
  //
  // Anything that cannot be downloaded is kept: a hash we never computed must
  // never be treated as a duplicate of another image.
  async dedupeImagesByContent(urls, progress) {
    const list = (urls || []).filter(Boolean)
    if (list.length <= IMAGE_DEDUPE_THRESHOLD) return list

    const hashes = new Array(list.length)
    let next = 0
    const worker = async () => {
      while (next < list.length) {
        const i = next++
        try {
          const res = await fetch(list[i], { signal: AbortSignal.timeout(IMAGE_HASH_TIMEOUT_MS) })
          if (!res.ok) continue
          const buf = Buffer.from(await res.arrayBuffer())
          hashes[i] = crypto.createHash('sha256').update(buf).digest('hex')
        } catch {
          // network/timeout: leave undefined so the image is kept
        }
      }
    }
    await Promise.all(Array.from({ length: IMAGE_HASH_CONCURRENCY }, worker))

    const seen = new Set()
    const out = []
    let duplicates = 0
    for (let i = 0; i < list.length; i++) {
      const hash = hashes[i]
      if (hash) {
        if (seen.has(hash)) {
          duplicates++
          continue
        }
        seen.add(hash)
      }
      out.push(list[i])
    }

    if (duplicates && typeof progress === 'function') {
      progress('shopifyImages', 'running', `Removing ${duplicates} identical duplicate image(s)…`)
    }
    return duplicates ? out : list
  },

  // Import ONE Shopify product into the ERP (used by the full pull and by the
  // products/create + products/update webhooks).
  //
  // Brand-new products are imported as PENDING (isActive=false, pendingImport=true)
  // so a human can review them in the ERP Products page before they go live.
  // Price is adopted from Shopify for new products only; for products already in
  // the ERP, price/stock stay ERP-owned and only images + shopify links sync back.
  async importShopifyProduct(sp, { silverRate, defaultCategory } = {}) {
    const variant = sp.variants?.[0]
    if (!variant) return { action: 'skipped', reason: 'no variant' }

    const sku = normalizeSKU(variant.sku || `SHOPIFY-${sp.id}`)
    const shopifyPrice = parseFloat(variant.price) || 0
    const storeImages = this.shopifyImageUrls(sp)

    let weight = parseFloat(variant.weight)
    if (Number.isNaN(weight) || weight <= 0) weight = 0.5

    // Match by SKU first, then by shopifyProductId (avoids import loops when
    // our own ERP->Shopify push triggers a products/update webhook).
    let existing = await prisma.product.findUnique({ where: { sku } })
    if (!existing && sp.id) {
      existing = await prisma.product.findFirst({
        where: { shopifyProductId: BigInt(sp.id) },
      })
    }

    if (existing) {
      // Linked product: sync images back into the ERP, refresh shopify links,
      // and backfill a weight only when the ERP one is missing/invalid.
      const mergedImages = this.mergeImageUrls(existing.imageUrls, storeImages)
      const data = {
        shopifyProductId: BigInt(sp.id),
        shopifyVariantId: BigInt(variant.id),
        shopifyInventoryItemId: variant.inventory_item_id ? BigInt(variant.inventory_item_id) : existing.shopifyInventoryItemId,
        shopifyImageUrl: storeImages[0] || existing.shopifyImageUrl,
        imageUrls: mergedImages.length ? mergedImages : null,
        shopifyStatus: (sp.status && ['active', 'draft', 'archived'].includes(sp.status)) ? sp.status : existing.shopifyStatus || 'active',
        chargeTax: typeof variant.taxable === 'boolean' ? variant.taxable : existing.chargeTax,
      }
      if (!existing.weight || Number(existing.weight) <= 0) {
        data.weight = weight
        if (!existing.netWeight || Number(existing.netWeight) <= 0) data.netWeight = weight
      }

      await prisma.product.update({ where: { id: existing.id }, data })

      // Create inventory row if missing (one inventory per product).
      const invRow = await prisma.inventory.findUnique({ where: { productId: existing.id } })
      if (!invRow) {
        await prisma.inventory.create({ data: { productId: existing.id, quantity: variant.inventory_quantity || 0 } })
      }

      return { action: 'updated', id: existing.id }
    }

    // ---- Brand-new product: import as PENDING for human review ----
    const silver = silverRate ?? (await getSilverRate())
    const defaultCategoryId = defaultCategory?.id

    let categoryId = defaultCategoryId
    if (sp.product_type) {
      const cat = await prisma.category.findFirst({
        where: { name: { equals: sp.product_type, mode: 'insensitive' } },
      })
      if (cat) categoryId = cat.id
    }

    // Adopt Shopify's price so the storefront and ERP agree for new imports.
    // Derive base/gst so baseAmount + gstAmount still sum to sellingPrice.
    const gstPercent = 3
    const sellingPrice = new Decimal(shopifyPrice || 0)
    const baseAmount = sellingPrice.div(1 + gstPercent / 100).toDecimalPlaces(2)
    const gstAmount = sellingPrice.minus(baseAmount).toDecimalPlaces(2)

    const product = await prisma.product.create({
      data: {
        sku,
        name: sp.title || 'Untitled Product',
        description: sp.body_html?.replace(/<[^>]*>/g, '') || '',
        categoryId: categoryId || 1,
        metal: 'silver',
        weight,
        netWeight: weight,
        makingCharge: 0,
        gstPercent: 3,
        baseAmount,
        gstAmount,
        sellingPrice,
        isActive: false,
        pendingImport: true,
        shopifyProductId: BigInt(sp.id),
        shopifyVariantId: BigInt(variant.id),
        shopifyInventoryItemId: variant.inventory_item_id ? BigInt(variant.inventory_item_id) : null,
        shopifyImageUrl: storeImages[0] || null,
        imageUrls: storeImages.length ? storeImages : null,
        shopifyStatus: (sp.status && ['active', 'draft', 'archived'].includes(sp.status)) ? sp.status : 'active',
        chargeTax: typeof variant.taxable === 'boolean' ? variant.taxable : true,
      },
    })

    await prisma.inventory.create({
      data: { productId: product.id, quantity: variant.inventory_quantity || 0 },
    })

    return { action: 'created', id: product.id }
  },

  // Pull ALL products from Shopify store into the ERP database.
  // Creates new products or updates existing ones matched by SKU.
  async pullProductsFromShopify(userId) {
    let ok = 0
    let failed = 0
    let created = 0
    let updated = 0
    let skipped = 0
    let firstError = null

    const silverRate = await getSilverRate()
    const defaultCategory = await prisma.category.findFirst({ orderBy: { name: 'asc' } })

    // Paginate through all Shopify products
    let sinceId = 0
    const allShopifyProducts = []

    while (true) {
      const res = await request(`/products.json?limit=250&since_id=${sinceId}`)
      const products = res.products || []
      if (!products.length) break
      allShopifyProducts.push(...products)
      sinceId = products[products.length - 1].id
      await throttle()
    }

    for (const sp of allShopifyProducts) {
      try {
        const result = await this.importShopifyProduct(sp, { silverRate, defaultCategory })
        if (result.action === 'created') created++
        else if (result.action === 'updated') updated++
        else skipped++
        ok++
      } catch (err) {
        failed++
        if (!firstError) firstError = err.message
      }
    }

    // Backfill weight for existing products that have a Shopify variant link
    // but currently show weight = 0 (e.g. synced before this fix was in place).
    await prisma.product.findMany({
      where: { shopifyVariantId: { not: null }, weight: 0 },
      select: { id: true, sku: true, shopifyVariantId: true }
    }).then(products => {
      products.forEach(async (p) => {
        try {
          await prisma.product.update({
            where: { id: p.id },
            data: { weight: 0.5 }
          })
        } catch (e) { /* ignore — product may have been deleted */ }
      })
    })

    await this.logSync('PRODUCT', ok, failed, firstError, userId)

    return {
      total: allShopifyProducts.length,
      ok,
      created,
      updated,
      skipped,
      failed,
      firstError,
    }
  },

  // Pull orders FROM Shopify into the ERP.
  // Uses the Shopify Orders API (not webhooks) so a missed webhook never
  // loses an order — this is the reliable backstop / manual pull button.
  // Reuses webhookService.processOrder for consistent handling (customer
  // matching, SKU line mapping, stock reduction, idempotency by shopifyOrderId).
  async pullOrdersFromShopify(userId) {
    const webhookService = require('./webhook.service')

    let ok = 0
    let failed = 0
    let created = 0
    let already = 0
    let firstError = null

    // Paginate using since_id (REST orders.json orders by id, newest last).
    // Fetch a generous window so the manual pull is useful out of the box.
    let sinceId = 0
    // Shopify expects created_at_min as an ISO-8601 timestamp, not a Unix epoch.
    const until = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // last 30 days
    let scannedOrders = 0
    let apiError = null

    while (true) {
      const path = `/orders.json?limit=250&status=any&created_at_min=${until}&since_id=${sinceId}`

      let res
      try {
        res = await request(path)
      } catch (err) {
        apiError = err.message
        break // network/credential error — stop, log below
      }

      const orders = res.orders || []
      if (!orders.length) break

      for (const order of orders) {
        scannedOrders++
        try {
          const exists = await prisma.order.findUnique({
            where: { shopifyOrderId: BigInt(order.id) },
            select: { id: true },
          })
          if (exists) {
            already++
            continue
          }

          const result = await webhookService.processOrder(order, null)
          if (result.alreadyProcessed) {
            already++
          } else {
            created++
          }
          ok++
        } catch (err) {
          failed++
          if (!firstError) {
            const shopifyErr = err.status ? `API ${err.status}` : ''
            firstError = `${shopifyErr} ${err.message}`.trim()
          }
        }
      }

      sinceId = orders[orders.length - 1].id
      await throttle()
    }

    if (scannedOrders === 0 && !firstError && apiError) {
      firstError = apiError
    }

    // Only write a sync log when there was real work to record (order actually
    // imported or an API failure). Repeated "no-op" pulls would otherwise spam
    // the log with identical "All items synced" rows that look like the order
    // syncing again.
    if (created > 0 || failed > 0 || firstError) {
      await this.logSync('ORDER', ok, failed, firstError, userId, scannedOrders)
    }

    return {
      total: scannedOrders,
      ok,
      created,
      already,
      skipped: 0,
      failed,
      firstError: firstError || null,
    }
  },

  // Pull customers FROM Shopify into the ERP database. Customers are matched
  // by email, then by phone; when neither matches an existing record a new
  // customer is created. The pull is recorded in ShopifySyncLog (type CUSTOMER)
  // so the sync logs / system health show the last customer sync status.
  async pullCustomersFromShopify(userId) {
    let total = 0
    let created = 0
    let updated = 0
    let failed = 0
    let firstError = null

    let sinceId = 0
    while (true) {
      let res
      try {
        res = await request(`/customers.json?limit=250&since_id=${sinceId}`)
      } catch (err) {
        if (!firstError) firstError = err.message
        break // network/credential error — stop
      }

      const customers = res.customers || []
      if (!customers.length) break

      for (const c of customers) {
        try {
          const email = c.email || null
          // The ERP Customer model requires a unique phone number and the
          // Shopify record may not have one, so fall back to a stable
          // placeholder keyed by the Shopify customer id.
          const phone = c.phone || `SHOPIFY-${c.id}`
          const name =
            [c.first_name, c.last_name].filter(Boolean).join(' ') ||
            (email ? email.split('@')[0] : 'Shopify Customer')

          const d = c.default_address
          const address = d
            ? [d.address1, d.address2, d.city, [d.province, d.zip].filter(Boolean).join(' '), d.country]
                .filter(Boolean)
                .join(', ') || null
            : null

          let existing = null
          if (email) existing = await prisma.customer.findUnique({ where: { email } })
          if (!existing) existing = await prisma.customer.findUnique({ where: { phone } })

          if (existing) {
            await prisma.customer.update({
              where: { id: existing.id },
              data: { name, email: email || existing.email, address: address || existing.address },
            })
            updated++
          } else {
            await prisma.customer.create({ data: { name, email, phone, address } })
            created++
          }
          total++
        } catch (err) {
          failed++
          if (!firstError) {
            const shopifyErr = err.status ? `API ${err.status}` : ''
            firstError = `${shopifyErr} ${err.message}`.trim()
          }
        }
      }

      sinceId = customers[customers.length - 1].id
      await throttle()
    }

    // Only write a sync log when there was real work to record (a customer
    // actually imported/updated or an API failure). Repeated no-op pulls would
    // otherwise spam the log with identical "All items synced" rows.
    if (total > 0 || failed > 0 || firstError) {
      await this.logSync('CUSTOMER', total, failed, firstError, userId)
    }

    return {
      total,
      ok: total,
      created,
      updated,
      matched: total - failed,
      failed,
      firstError: firstError || null,
    }
  },

  // Fetch products from Shopify store (for preview/listing in UI).
  // Shopify's /products.json only supports cursor pagination now — the legacy
  // "page" param is rejected with a 400 — so we fetch the first page of up to
  // 250 products and let the calling page filter client-side.
  async fetchProducts(params = {}) {
    const { limit = 250 } = params
    const res = await request(`/products.json?limit=${encodeURIComponent(limit)}`)
    const products = res.products || []

    return products.map((p) => {
      const variant = p.variants?.[0]
      return {
        shopifyId: p.id,
        title: p.title,
        status: p.status,
        productType: p.product_type,
        vendor: p.vendor,
        sku: variant?.sku || '',
        price: variant?.price || '0',
        weight: variant?.weight || 0,
        weightUnit: variant?.weight_unit || 'g',
        inventoryQuantity: variant?.inventory_quantity || 0,
        inventoryManagement: variant?.inventory_management || null,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }
    })
  },

  // ---------- helpers ----------

  // Find an existing Shopify product that already uses this SKU.
  // Makes the sync IDEMPOTENT: if a product was pushed before but the
  // link was never saved (e.g. a partial failure), we reuse it instead
  // of creating a duplicate.
  async findShopifyProductBySku(sku) {
    let sinceId = 0
    while (true) {
      const res = await request(
        `/products.json?limit=250&fields=id,status,variants&since_id=${sinceId}`
      )
      const products = res.products
      if (!products.length) break
      for (const p of products) {
        for (const v of p.variants || []) {
          if (v.sku === sku) {
            return {
              shopifyProductId: p.id,
              shopifyVariantId: v.id,
              shopifyInventoryItemId: v.inventory_item_id,
            }
          }
        }
      }
      sinceId = products[products.length - 1].id
    }
    return null
  },

  // Find one Shopify "location" id. Every stock value lives at a
  // location. We use ONE canonical location for all products (cached),
  // otherwise stock would be split across locations and double-counted.
  //
  // WHICH location? It must be one the Online Store can sell from —
  // otherwise customers see "Sold out" even though the Shopify total is > 0.
  // "Shop location" (and any shop-named location) is the online-fulfilling
  // one in this store; fall back to the first active location if unknown.
  async getLocationId() {
    if (this._locationId) return this._locationId

    const res = await request('/locations.json')
    const locations = res.locations || []
    const chosen =
      locations.find((l) => l.active && l.name.toLowerCase().includes('shop')) ||
      locations.find((l) => l.active) ||
      locations[0]

    if (!chosen) throw new Error('No Shopify location found.')
    this._locationId = chosen.id
    return this._locationId
  },

  // Push a stock quantity to Shopify for one inventory item.
  // Also sets every OTHER location to 0 so the total is always correct.
  async setInventoryLevel(inventoryItemId, quantity) {
    const locationId = await this.getLocationId()

    const levels = await request(`/inventory_levels.json?inventory_item_ids=${inventoryItemId}`)
    for (const lvl of levels.inventory_levels || []) {
      if (lvl.location_id !== locationId) {
        await withRetry(() =>
          request('/inventory_levels/set.json', {
            method: 'POST',
            body: {
              location_id: lvl.location_id,
              inventory_item_id: inventoryItemId,
              available: 0,
            },
          })
        )
      }
    }

    return withRetry(() =>
      request('/inventory_levels/set.json', {
        method: 'POST',
        body: {
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available: quantity,
        },
      })
    )
  },

  // Create a brand-new product on Shopify. Returns the Shopify ids.
  async createProductOnShopify(product) {
    const shopifyStatus = product.shopifyStatus || (product.isActive ? 'active' : 'draft')
    const variant = {
      sku: product.sku,
      price: Number(product.sellingPrice).toFixed(2),
      weight: Number(product.netWeight ?? product.weight ?? 0),
      weight_unit: 'g',
      taxable: product.chargeTax !== false,
      inventory_management: product.trackInventory === false ? null : 'shopify',
    }

    if (product.compareAtPrice && Number(product.compareAtPrice) > 0) {
      variant.compare_at_price = Number(product.compareAtPrice).toFixed(2)
    }

    const shopifyProduct = {
      title: product.name,
      vendor: product.shopifyVendor || 'OPAL LINE',
      product_type: product.shopifyProductType || product.category?.name || 'Jewellery',
      body_html: product.description || '',
      status: shopifyStatus,
      variants: [variant],
    }

    if (product.shopifyTags) shopifyProduct.tags = product.shopifyTags

    const imageUrls = Array.isArray(product.imageUrls) && product.imageUrls.length
      ? product.imageUrls
      : product.shopifyImageUrl
        ? [product.shopifyImageUrl]
        : []
    if (imageUrls.length) {
      shopifyProduct.images = imageUrls.map((src) => ({ src }))
    }

    const res = await withRetry(() =>
      request('/products.json', {
        method: 'POST',
        body: { product: shopifyProduct },
      })
    )

    const p = res.product
    const createdVariant = p.variants[0]

    // Give the new variant its starting stock (only when Shopify manages it)
    const invQty = product.inventory?.quantity ?? 0
    if (product.trackInventory !== false && createdVariant.inventory_item_id) {
      await this.setInventoryLevel(createdVariant.inventory_item_id, invQty)
    }

    // Push the product-details / price-breakup metafields (storefront section).
    await this.pushProductMetafields({ ...product, shopifyProductId: p.id })

    // Upload videos to Shopify product media
    const videoUrls = (product.imageUrls || []).filter(u => u && (u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.mov')))
    for (const videoUrl of videoUrls) {
      try {
        await this.uploadVideoToShopify({ ...product, shopifyProductId: p.id }, videoUrl)
      } catch (err) {
        console.error(`Failed to upload video ${videoUrl} to Shopify:`, err.message)
      }
    }

    return {
      shopifyProductId: p.id,
      shopifyVariantId: createdVariant.id,
      shopifyInventoryItemId: createdVariant.inventory_item_id,
    }
  },

  // Update an existing Shopify product's details + price (and stock).
  // Optional onProgress(stepKey, status, message) streams each step to the
  // product update page. When omitted the function behaves exactly as before.
  async updateProductOnShopify(product, { onProgress = null } = {}) {
    const progress = onProgress || (() => {})
    const shopifyStatus = product.shopifyStatus || (product.isActive ? 'active' : 'draft')
    const shopifyProduct = {
      id: Number(product.shopifyProductId),
      title: product.name,
      vendor: product.shopifyVendor || 'OPAL LINE',
      product_type: product.shopifyProductType || product.category?.name || 'Jewellery',
      body_html: product.description || '',
      status: shopifyStatus,
    }

    if (product.shopifyTags) shopifyProduct.tags = product.shopifyTags

    // Fetch the store's CURRENT images and merge, so ERP-side updates APPEND
    // images instead of wiping store-only ones (two-way image ownership).
    let storeImages = []
    // Keep each store image's Shopify id too. Sending an image as {src} only
    // tells Shopify to CREATE it, so a payload of 70 {src} entries on a product
    // that already has those 70 rebuilds every one of them -- which is both how
    // the galleries got duplicates and why the PUT could finish in time.
    let storeImageIds = new Map()
    let storeReadOk = false
    progress('shopifyImages', 'running', 'Reading store images…')
    try {
      const res = await request(`/products/${product.shopifyProductId}.json?fields=images`)
      const imgs = res.product?.images || []
      storeImages = imgs.map((img) => img.src).filter(Boolean)
      storeImageIds = new Map(
        imgs.filter((img) => img.src && img.id).map((img) => [this.normalizeImageUrl(img.src), img.id])
      )
      storeReadOk = true
      progress('shopifyImages', 'done', `${storeImages.length} store image(s)`)
    } catch (err) {
      // If we can't read the store product, fall back to a plain image update
      progress('shopifyImages', 'done', 'Could not read store images — merging local only')
    }

    const erpImages = Array.isArray(product.imageUrls) && product.imageUrls.length
      ? product.imageUrls
      : product.shopifyImageUrl
        ? [product.shopifyImageUrl]
        : []
    let mergedImages = this.mergeImageUrls(storeImages, erpImages)

    // Honour deletions made in the Shopify admin. mergeImageUrls is a union, so
    // an image you delete on the store stayed in the ERP and the very next sync
    // re-uploaded it -- deleting a duplicate and pushing brought it straight
    // back. An ERP copy that Shopify hosts but the product no longer has was
    // removed on purpose; drop it instead of resurrecting it. Only applied when
    // the store read actually succeeded, otherwise a failed read would look like
    // "everything was deleted".
    if (storeReadOk && mergedImages.length) {
      const storeKeys = new Set(storeImages.map((src) => this.normalizeImageUrl(src)))
      const kept = []
      for (const src of mergedImages) {
        if (this.isStoreHostedImage(src) && !storeKeys.has(this.normalizeImageUrl(src))) continue
        kept.push(src)
      }
      mergedImages = kept
    }

    // Byte-level pass: drop identical copies. This is what actually cleans a
    // gallery like "silver bangle: 106 images, 1 distinct" -- every copy is the
    // same file under a different uuid, so string comparison keeps all 106.
    mergedImages = await this.dedupeImagesByContent(mergedImages, progress)

    // Only rewrite Shopify images when the merged set actually changed. Sending
    // the full image array on every sync re-triggers Shopify's async image
    // processing, which keeps the product "currently being modified" (409) and
    // can surface as 500 errors on the product write.
    const storeSet = new Set(storeImages.map((src) => this.normalizeImageUrl(src)))
    const mergedSet = new Set(mergedImages.map((src) => this.normalizeImageUrl(src)))
    const imagesChanged =
      storeSet.size !== mergedSet.size || [...mergedSet].some((url) => !storeSet.has(url))
    // ERP images that did not fit into this sync's upload budget; they stay in
    // the ERP list and are retried on the next sync.
    let deferredImages = []
    if (imagesChanged && mergedImages.length) {
      // Images already on the product carry their id, so Shopify keeps them
      // as they are; only genuinely new photos are sent as {src} and uploaded.
      // Uploading is the slow part: one product can be missing dozens of photos,
      // and pushing every missing one in a single PUT reliably blows past the
      // 30s request ceiling (it timed out at 30029ms with 68 images pending).
      // So add at most a handful per sync -- the next sync picks up the rest.
      const existing = []
      const fresh = []
      for (const src of mergedImages) {
        const id = storeImageIds.get(this.normalizeImageUrl(src))
        if (id) existing.push({ id: Number(id), src })
        else fresh.push({ src })
      }
      const newCount = Math.min(fresh.length, MAX_NEW_IMAGES_PER_SYNC)
      if (newCount < fresh.length) {
        progress(
          'shopifyImages',
          'running',
          `Adding ${newCount} of ${fresh.length} new images (rest on next sync)…`
        )
      }
      shopifyProduct.images = [...existing, ...fresh.slice(0, newCount)]
      // Whatever did not fit stays in the ERP list for the next sync.
      deferredImages = fresh.slice(newCount).map((entry) => entry.src)
    }

    progress('shopifyProduct', 'running', 'Updating product details…')
    let putRes = null
    try {
      putRes = await withRetry(() =>
        request(`/products/${product.shopifyProductId}.json`, {
          method: 'PUT',
          body: { product: shopifyProduct },
        })
      )
      progress('shopifyProduct', 'done', 'Product details updated')
    } catch (err) {
      progress('shopifyProduct', 'failed', err.message)
      throw err
    }

    // Shopify re-hosts every image we send it, so a photo uploaded on the
    // billing page becomes TWO records: our /uploads/foo.jpg and the store's
    // cdn.shopify.com/... copy. Nothing dedupes those (different origins), so the
    // next sync still sees /uploads/foo.jpg as "missing from the store" and
    // uploads it again -- which is the duplicate loop: one photo in, two copies
    // out, forever. Adopt the store's URLs as canonical after a successful push
    // so the original retires instead of surviving alongside its own copy.
    const storeSrcs = (putRes?.product?.images || []).map((img) => img.src).filter(Boolean)
    if (storeSrcs.length) {
      // Videos live in imageUrls too and Shopify will not return them as
      // product images, so carry them across rather than silently dropping them.
      const isVideo = (u) => /\.(mp4|webm|mov)$/i.test(u || '')
      const videos = (product.imageUrls || []).filter(
        (u) => isVideo(u) && !storeSrcs.some((s) => this.normalizeImageUrl(s) === this.normalizeImageUrl(u))
      )
      const nextImages = this.mergeImageUrls(storeSrcs, [...deferredImages, ...videos])
      const current = Array.isArray(product.imageUrls) ? product.imageUrls : []
      const same =
        nextImages.length === current.length &&
        nextImages.every((u, i) => u === current[i])
      if (!same) {
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrls: nextImages },
        })
        progress('shopifyImages', 'done', `Gallery synced from Shopify (${storeSrcs.length} image(s))`)
      }
    }

    // A successful product PUT puts Shopify into async processing (image
    // reprocessing, media handling) and it holds a write lock on the product
    // while doing so. The variant / inventory / metafield writes that follow all
    // target the SAME product, so without a short settle they collide with
    // Shopify's own processing and come back 409 "currently being modified".
    // Pausing here is far cheaper than letting each write burn its whole retry
    // budget. Tunable, and skipped when the product write sent no images.
    if (shopifyProduct.images && shopifyProduct.images.length) {
      await sleep(PRODUCT_WRITE_SETTLE_MS)
    }

    const variantUpdate = {
      id: Number(product.shopifyVariantId),
      price: Number(product.sellingPrice).toFixed(2),
      sku: product.sku,
      taxable: product.chargeTax !== false,
    }

    if (product.compareAtPrice && Number(product.compareAtPrice) > 0) {
      variantUpdate.compare_at_price = Number(product.compareAtPrice).toFixed(2)
    } else if (product.compareAtPrice === null || product.compareAtPrice === undefined) {
      variantUpdate.compare_at_price = null
    }

    progress('shopifyVariant', 'running', 'Updating variant & price…')
    try {
      await withRetry(() =>
        request(`/variants/${product.shopifyVariantId}.json`, {
          method: 'PUT',
          body: { variant: variantUpdate },
        })
      )
      progress('shopifyVariant', 'done', `Price ₹${Number(product.sellingPrice || 0).toFixed(2)}`)
    } catch (err) {
      progress('shopifyVariant', 'failed', err.message)
      throw err
    }

    if (product.shopifyInventoryItemId && product.trackInventory !== false) {
      progress('shopifyInventory', 'running', 'Syncing inventory…')
      try {
        await this.setInventoryLevel(Number(product.shopifyInventoryItemId), product.inventory?.quantity ?? 0)
        progress('shopifyInventory', 'done', `${product.inventory?.quantity ?? 0} in stock`)
      } catch (err) {
        progress('shopifyInventory', 'failed', err.message)
        throw err
      }
    } else {
      progress('shopifyInventory', 'skipped', 'Inventory not tracked on Shopify')
    }

    // Refresh the storefront product-details / price-breakup metafields.
    progress('shopifyMetafields', 'running', 'Pushing storefront details…')
    try {
      await this.pushProductMetafields(product)
      progress('shopifyMetafields', 'done', 'Storefront details updated')
    } catch (err) {
      progress('shopifyMetafields', 'failed', err.message)
      throw err
    }

    // Upload videos to Shopify product media (new videos only — existing stay)
    const videoUrls = (product.imageUrls || []).filter(u => u && (u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.mov')))
    if (videoUrls.length) {
      progress('shopifyMedia', 'running', `Uploading ${videoUrls.length} video(s)…`)
      let ok = 0
      for (const videoUrl of videoUrls) {
        try {
          await this.uploadVideoToShopify(product, videoUrl)
          ok++
        } catch (err) {
          console.error(`Failed to upload video ${videoUrl} to Shopify:`, err.message)
        }
      }
      progress('shopifyMedia', 'done', ok === videoUrls.length ? 'Media up to date' : `${ok}/${videoUrls.length} video(s) uploaded`)
    } else {
      progress('shopifyMedia', 'skipped', 'No new videos')
    }
  },

  // Push the product-details + price-breakup metafields (silver / stone /
  // pricing namespaces) that the shopify storefront section reads.
  // Stone ns is only written when the product has a stone (stoneWeight > 0).
  async pushProductMetafields(product) {
    const hasStone = product.stoneWeight != null && Number(product.stoneWeight) > 0
    const netWeight = Number(product.netWeight ?? product.weight ?? 0)
    const purity = Number(product.purity ?? 92.5)
    const stoneCarats = hasStone ? (Number(product.stoneWeight) * 5).toFixed(3) : null

    const metafields = [
      { namespace: 'silver', key: 'purity', value: String(purity), type: 'single_line_text_field' },
      { namespace: 'silver', key: 'weight', value: String(netWeight), type: 'number_decimal' },
      { namespace: 'silver', key: 'rate', value: String(product.silverRateUsed ?? 0), type: 'number_decimal' },
      { namespace: 'silver', key: 'gross_weight', value: String(Number(product.grossWeight ?? netWeight)), type: 'number_decimal' },
      { namespace: 'silver', key: 'colour', value: String(product.colour || ''), type: 'single_line_text_field' },
      { namespace: 'pricing', key: 'making_charge', value: String(Number(product.makingCharge ?? 0)), type: 'number_decimal' },
      { namespace: 'pricing', key: 'base_amount', value: String(Number(product.baseAmount ?? 0)), type: 'number_decimal' },
      { namespace: 'pricing', key: 'gst_amount', value: String(Number(product.gstAmount ?? 0)), type: 'number_decimal' },
      { namespace: 'pricing', key: 'grand_total', value: String(Number(product.sellingPrice ?? 0)), type: 'number_decimal' },
    ]

    if (hasStone) {
      metafields.push(
        { namespace: 'stone', key: 'type', value: String(product.stoneType || 'Stone'), type: 'single_line_text_field' },
        { namespace: 'stone', key: 'weight', value: stoneCarats, type: 'number_decimal' },
        { namespace: 'stone', key: 'pieces', value: String(Number(product.stonePieces) || 1), type: 'number_integer' },
        { namespace: 'stone', key: 'value', value: String(Number(product.stoneValue ?? 0)), type: 'number_decimal' },
      )
    }

    // Drop empty / NaN values — Shopify rejects blank numeric & text values
    // ("Value can't be blank"), which was failing the whole price sync.
    const validMetafields = metafields.filter(
      (m) => m.value !== '' && m.value !== null && m.value !== 'NaN' && m.value !== undefined
    )

    const ownerId = `gid://shopify/Product/${product.shopifyProductId}`
    const res = await withRetry(() =>
      graphql(
        `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
        { metafields: validMetafields.map((m) => ({ ...m, ownerId })) }
      )
    )

    const userErrors = res?.data?.metafieldsSet?.userErrors || []
    if (userErrors.length) {
      throw new ShopifyApiError(422, `Shopify metafields: ${userErrors.map((e) => e.message).join('; ')}`)
    }
  },

  // Upload a video file to Shopify and attach as product media
  // Uses staged uploads: create target -> PUT file -> productCreateMedia
  async uploadVideoToShopify(product, videoUrl) {
    // videoUrl is like "/uploads/xyz.mp4" or full URL
    // Extract filename and read from local uploads dir
    const filename = videoUrl.split('/').pop()
    if (!filename) throw new Error('Invalid video URL')
    const localPath = path.join(process.cwd(), 'uploads', filename)
    if (!fs.existsSync(localPath)) throw new Error(`Video file not found: ${localPath}`)

    const fileBuffer = fs.readFileSync(localPath)
    const fileSize = fileBuffer.length
    const mimeType = 'video/mp4' // assume mp4; could detect from extension

    // 1. Create staged upload target
    const stagedRes = await graphql(
      `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { field message }
        }
      }`,
      {
        input: [{
          resource: 'PRODUCT_VIDEO',
          filename,
          mimeType,
          fileSize,
          httpMethod: 'POST'
        }]
      }
    )

    const stagedData = stagedRes?.data?.stagedUploadsCreate
    const errors = stagedData?.userErrors || []
    if (errors.length) throw new ShopifyApiError(422, `Staged upload: ${errors.map(e => e.message).join('; ')}`)

    const target = stagedData?.stagedTargets?.[0]
    if (!target) throw new Error('No staged target returned')

    // 2. Upload file to staged URL (multipart/form-data with parameters)
    const formData = new FormData()
    target.parameters.forEach(p => formData.append(p.name, p.value))
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename)

    const uploadRes = await fetch(target.url, {
      method: 'POST',
      body: formData,
      // This PUT goes straight to Shopify's upload host, not through request(),
      // so it needs its own ceiling. Without one a stalled upload pins the
      // worker slot forever and the bulk job never finishes.
      signal: AbortSignal.timeout(120000),
    })
    if (!uploadRes.ok) throw new Error(`Staged upload failed: ${uploadRes.status}`)

    // 3. Create product media from staged resource URL
    const mediaRes = await graphql(
      `mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { id mediaContentType }
          mediaUserErrors { code message }
        }
      }`,
      {
        productId: `gid://shopify/Product/${product.shopifyProductId}`,
        media: [{ originalSource: target.resourceUrl, mediaContentType: 'VIDEO' }]
      }
    )

    const mediaErrors = mediaRes?.data?.productCreateMedia?.mediaUserErrors || []
    if (mediaErrors.length) throw new ShopifyApiError(422, `Product media: ${mediaErrors.map(e => e.message).join('; ')}`)

    return mediaRes.data.productCreateMedia.media
  },

  // Push ONE ERP product to Shopify (create if needed, else update)
  // onProgress(stepKey, status, message) forwards the inner Shopify steps
  // (used by the bulk sync jobs to show which step a product is on).
  //
  // A product with no shopifyProductId is created here (reusing a matching SKU
  // if Shopify already has one), so the per-row Sync button works on a product
  // that has never been pushed. Last outcome is stamped onto the Product so the
  // list can show "Synced 2 mins ago" without re-querying Sync Logs.
  async syncProduct(productId, { onProgress = null } = {}) {
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { category: true, inventory: true },
    })
    if (!product) throw new Error(`Product ${productId} not found`)

    let ids = null

    const stampSync = (data) =>
      prisma.product.update({
        where: { id: product.id },
        data: { shopifyLastSyncedAt: new Date(), shopifyLastSyncError: null, ...data },
      })

    // No link saved yet: reuse an existing Shopify product with the same
    // SKU if one exists, otherwise create a brand-new one.
    if (!product.shopifyProductId) {
      ids = (await this.findShopifyProductBySku(product.sku)) || (await this.createProductOnShopify(product))
      await stampSync({
        shopifyProductId: ids.shopifyProductId,
        shopifyVariantId: ids.shopifyVariantId,
        shopifyInventoryItemId: ids.shopifyInventoryItemId,
      })
      return { productId: product.id, sku: product.sku, created: true, ...ids }
    }

    // Linked but the Shopify product was deleted there: recreate it.
    try {
      await this.updateProductOnShopify(product, onProgress ? { onProgress } : {})
    } catch (err) {
      if (!isStaleShopifyMappingError(err)) throw err
      ids = await this.createProductOnShopify(product)
      await stampSync({
        shopifyProductId: ids.shopifyProductId,
        shopifyVariantId: ids.shopifyVariantId,
        shopifyInventoryItemId: ids.shopifyInventoryItemId,
      })
      return { productId: product.id, sku: product.sku, created: true, ...ids }
    }

    await stampSync({})
    return { productId: product.id, sku: product.sku }
  },

  // Record a failed sync attempt so the list can show "Sync failed - retry".
  async markSyncFailed(productId, message) {
    return prisma.product
      .update({
        where: { id: Number(productId) },
        data: { shopifyLastSyncError: (message || 'Shopify sync failed').slice(0, 500) },
      })
      .catch(() => null)
  },

  // The product is linked to a Shopify product/variant/inventory item that
  // Shopify now answers 404 for, i.e. it was deleted (or recreated) on the
  // store. Drop the dead ids so the product is treated as unlinked and can be
  // recreated on the next product sync, instead of 404-ing forever. Best-effort
  // — a failure here must not break the calling sync job.
  async clearStaleShopifyMapping(productId) {
    return prisma.product
      .update({
        where: { id: Number(productId) },
        data: {
          shopifyProductId: null,
          shopifyVariantId: null,
          shopifyInventoryItemId: null,
          shopifyLastSyncError:
            'Stale Shopify mapping cleared — the linked Shopify product no longer exists (404). Re-sync to recreate it.',
        },
      })
      .catch(() => null)
  },

  // ---------- bulk jobs (recorded in ShopifySyncLog) ----------

  // Push every active product (create missing + update existing)
  // onBulk(key, label, status, message) streams one row per product so the
  // "Sync All" button can show live, colour-coded progress.
  async syncAllProducts(userId, { onBulk = null } = {}) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, inventory: true },
    })

    const results = await runPool(products, BULK_CONCURRENCY, async (product) => {
      const key = String(product.id)
      try {
        onBulk?.(key, product.name, 'running', 'Starting…')
        await this.syncProduct(product.id, {
          onProgress: (step, status, message) => {
            if (status === 'running') onBulk?.(key, product.name, 'running', message || 'Syncing…')
          },
        })
        onBulk?.(key, product.name, 'done', 'Synced')
        return { ok: true }
      } catch (err) {
        onBulk?.(key, product.name, 'failed', err.message)
        return { ok: false, message: err.message }
      }
    })

    const ok = results.filter((r) => r.ok).length
    const failed = products.length - ok
    const firstError = results.find((r) => !r.ok)?.message || null
    const failures = products
      .map((p, i) => (results[i].ok ? null : { id: p.id, sku: p.sku, name: p.name, message: results[i].message }))
      .filter(Boolean)

    await this.logSync('PRODUCT', ok, failed, firstError, userId, products.length, failures)
    return { total: products.length, ok, failed, firstError, failures }
  },

  // Re-publish every product price to Shopify (after a rate change)
  async syncAllPrices(userId, { onBulk = null } = {}) {
    const products = await prisma.product.findMany({
      where: { isActive: true, shopifyVariantId: { not: null } },
    })

    const results = await runPool(products, BULK_CONCURRENCY, async (product) => {
      const key = String(product.id)
      const price = Number(product.sellingPrice).toFixed(2)
      try {
        onBulk?.(key, product.name, 'running', `Pushing price ₹${price}…`)
        await withRetry(() =>
          request(`/variants/${product.shopifyVariantId}.json`, {
            method: 'PUT',
            body: {
              variant: {
                id: Number(product.shopifyVariantId),
                price: Number(product.sellingPrice).toFixed(2),
              },
            },
          })
        )
        await this.pushProductMetafields(product)
        onBulk?.(key, product.name, 'done', `₹${price}`)
        return { ok: true }
      } catch (err) {
        // A 404 is a dead Shopify link, not a price-sync failure. Clear the
        // stale ids so the product is re-created on its next product sync, and
        // keep this product from failing the whole job.
        if (isStaleShopifyMappingError(err)) {
          await this.clearStaleShopifyMapping(product.id)
          onBulk?.(key, product.name, 'done', 'Stale Shopify link cleared')
          return { ok: true, staleCleared: true }
        }
        onBulk?.(key, product.name, 'failed', err.message)
        return { ok: false, message: err.message }
      }
    })

    const ok = results.filter((r) => r.ok).length
    const failed = products.length - ok
    const firstError = results.find((r) => !r.ok)?.message || null
    const failures = products
      .map((p, i) => (results[i].ok ? null : { id: p.id, sku: p.sku, name: p.name, message: results[i].message }))
      .filter(Boolean)
    const staleCleared = products
      .map((p, i) => (results[i].staleCleared
        ? { id: p.id, sku: p.sku, name: p.name, message: 'Stale Shopify mapping cleared (Shopify returned 404)' }
        : null))
      .filter(Boolean)

    await this.logSync('PRICE', ok, failed, firstError, userId, products.length, failures, staleCleared)
    return { total: products.length, ok, failed, firstError, failures, staleCleared }
  },

  // Push every product's current stock to Shopify
  async syncAllInventory(userId, { onBulk = null } = {}) {
    const products = await prisma.product.findMany({
      where: { shopifyInventoryItemId: { not: null } },
      include: { inventory: true },
    })

    const results = await runPool(products, BULK_CONCURRENCY, async (product) => {
      const key = String(product.id)
      const qty = product.inventory?.quantity ?? 0
      try {
        onBulk?.(key, product.name, 'running', `Syncing ${qty} in stock…`)
        await this.setInventoryLevel(Number(product.shopifyInventoryItemId), qty)
        onBulk?.(key, product.name, 'done', `${qty} in stock`)
        return { ok: true }
      } catch (err) {
        // Dead inventory-item mapping (404): clear the stale ids and keep the
        // rest of the stock job going instead of failing it.
        if (isStaleShopifyMappingError(err)) {
          await this.clearStaleShopifyMapping(product.id)
          onBulk?.(key, product.name, 'done', 'Stale Shopify link cleared')
          return { ok: true, staleCleared: true }
        }
        onBulk?.(key, product.name, 'failed', err.message)
        return { ok: false, message: err.message }
      }
    })

    const ok = results.filter((r) => r.ok).length
    const failed = products.length - ok
    const firstError = results.find((r) => !r.ok)?.message || null
    const failures = products
      .map((p, i) => (results[i].ok ? null : { id: p.id, sku: p.sku, name: p.name, message: results[i].message }))
      .filter(Boolean)
    const staleCleared = products
      .map((p, i) => (results[i].staleCleared
        ? { id: p.id, sku: p.sku, name: p.name, message: 'Stale Shopify mapping cleared (Shopify returned 404)' }
        : null))
      .filter(Boolean)

    await this.logSync('INVENTORY', ok, failed, firstError, userId, products.length, failures, staleCleared)
    return { total: products.length, ok, failed, firstError, failures, staleCleared }
  },

  // How many items the combined "Sync All" job will touch, split by stage.
  // Orders are counted during the pull (unknown upfront), so their stage starts
  // at 0 and is filled in once the pull finishes.
  async countSyncScope() {
    const [products, prices, inventory] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, shopifyVariantId: { not: null } } }),
      prisma.product.count({ where: { shopifyInventoryItemId: { not: null } } }),
    ])
    const stages = [
      { key: 'products', label: 'Products', count: products },
      { key: 'prices', label: 'Prices', count: prices },
      { key: 'inventory', label: 'Inventory', count: inventory },
      { key: 'orders', label: 'Orders', count: 0 },
    ]
    return { total: products + prices + inventory + 1, stages }
  },

  // Combined "Sync All": runs products, prices, inventory and orders as one job
  // so the dashboard can show a single live panel with a stage per phase. Each
  // stage still writes its own ShopifySyncLog row (via syncAllProducts etc.), so
  // Sync Logs / History stay populated exactly as if the buttons were pressed
  // separately.
  async syncAllCombined(userId, { onBulk = null, onStage = null, onStageDone = null, includeOrders = true } = {}) {
    const stageOf = (stageKey) => (key, label, status, message) =>
      onBulk?.(stageKey, key, label, status, message)

    const runStage = async (key, label, fn) => {
      onStage?.(key, label)
      const res = await fn()
      onStageDone?.(key, { ok: res.ok ?? 0, failed: res.failed ?? 0, total: res.total ?? 0 })
      return res
    }

    const productRes = await runStage('products', 'Syncing products', () =>
      this.syncAllProducts(userId, { onBulk: stageOf('products') })
    )
    const priceRes = await runStage('prices', 'Syncing prices', () =>
      this.syncAllPrices(userId, { onBulk: stageOf('prices') })
    )
    const inventoryRes = await runStage('inventory', 'Syncing inventory', () =>
      this.syncAllInventory(userId, { onBulk: stageOf('inventory') })
    )

    let orderRes = { ok: 0, failed: 0, total: 0 }
    if (includeOrders) {
      orderRes = await runStage('orders', 'Pulling orders', async () => {
        const r = await this.pullOrdersFromShopify(userId)
        onBulk?.('orders', 'orders', 'Orders', 'done', `${r.created ?? 0} new, ${r.already ?? 0} already synced`)
        return { ok: r.created ?? 0, failed: r.failed ?? 0, total: r.total ?? 0 }
      })
    }

    const total = (productRes.total || 0) + (priceRes.total || 0) + (inventoryRes.total || 0) + (orderRes.total || 0)
    const ok = (productRes.ok || 0) + (priceRes.ok || 0) + (inventoryRes.ok || 0) + (orderRes.ok || 0)
    const failed = (productRes.failed || 0) + (priceRes.failed || 0) + (inventoryRes.failed || 0) + (orderRes.failed || 0)
    return { total, ok, failed }
  },

  // Write one row in ShopifySyncLog so the dashboard can show status.
  // `total` is the number of items the job tried (products in the sync scope);
  // `ok`/`failed` split that total, `pending` = items still not processed.
  // `failures` (optional) is the per-item failure detail [ { id, name, sku, message } ]
  // so the UI can show WHICH products failed and WHY.
  // `warnings` (optional) is the same shape for non-fatal outcomes such as a
  // stale Shopify mapping (404) that was cleared — the job still SUCCEEDED, but
  // the detail is worth surfacing.
  async logSync(type, ok, failed, firstError, userId, total, failures, warnings) {
    await this.pruneSyncHistory()

    const pending = Math.max((total ?? 0) - ok - failed, 0)
    const failureDetail = Array.isArray(failures) ? failures.slice(0, 100) : []
    const warningDetail = Array.isArray(warnings) ? warnings.slice(0, 100) : []
    const baseMessage = failed === 0 ? 'All items synced' : `${failed} failed. ${firstError || ''}`.trim()
    const message =
      failed === 0 && warningDetail.length
        ? `${baseMessage} — ${warningDetail.length} stale Shopify mapping${warningDetail.length > 1 ? 's' : ''} cleared`
        : baseMessage
    await prisma.shopifySyncLog.create({
      data: {
        type,
        status: failed === 0 ? 'SUCCESS' : 'FAILED',
        itemsProcessed: ok,
        message,
        payload: {
          total: total ?? ok,
          ok,
          failed,
          pending,
          userId,
          ...(failureDetail.length ? { failures: failureDetail } : {}),
          ...(warningDetail.length ? { warnings: warningDetail } : {}),
        },
      },
    })
  },

  // History is only kept for 3 days — drop anything older. Runs on every sync
  // log write and every history/sync-logs read so old rows can't accumulate.
  async pruneSyncHistory() {
    await prisma.shopifySyncLog.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - HISTORY_RETENTION_MS) } },
    })
  },

  // Latest sync result per type (for the dashboard widget)
  async syncStatus() {
    const types = ['PRODUCT', 'PRICE', 'INVENTORY', 'ORDER', 'CUSTOMER']
    const logs = await Promise.all(
      types.map((type) => prisma.shopifySyncLog.findFirst({ where: { type }, orderBy: { id: 'desc' } }))
    )
    const latest = {}
    types.forEach((type, i) => { latest[type.toLowerCase()] = logs[i] })
    const { shopDomain } = await credentials()
    latest.shopDomain = shopDomain || null
    return latest
  },

  // Re-run the bulk job for each sync type that has FAILED log entries, then
  // delete only those stale FAILED rows. New jobs record fresh SUCCESS/FAILED
  // logs whose failures stay visible.
  async retryFailedSyncs(userId) {
    const failed = await prisma.shopifySyncLog.findMany({
      where: { status: 'FAILED' },
      select: { id: true, type: true },
      orderBy: { id: 'desc' },
      take: 200,
    })

    const jobByType = {
      PRODUCT: () => this.syncAllProducts(userId),
      PRICE: () => this.syncAllPrices(userId),
      INVENTORY: () => this.syncAllInventory(userId),
      ORDER: () => this.pullOrdersFromShopify(userId),
      CUSTOMER: () => this.pullCustomersFromShopify(userId),
    }

    const types = [...new Set(failed.map((l) => l.type))]
    const results = []
    for (const type of types) {
      const job = jobByType[type]
      if (!job) continue
      try {
        const res = await job()
        results.push({ type, ok: res.ok ?? 0, failed: res.failed ?? 0, retried: true })
      } catch (err) {
        results.push({ type, retried: false, error: err.message || 'Unknown error' })
      }
    }

    const staleIds = failed.filter((l) => types.includes(l.type)).map((l) => l.id)
    let cleared = 0
    if (staleIds.length) {
      const del = await prisma.shopifySyncLog.deleteMany({ where: { id: { in: staleIds } } })
      cleared = del.count
    }

    return { types: types.length, results, cleared }
  },

  // ERP vs Shopify inventory comparison
  async inventoryComparison() {
    const products = await prisma.product.findMany({
      where: { isActive: true, shopifyInventoryItemId: { not: null } },
      include: { inventory: true },
      orderBy: { sku: 'asc' },
    })

    // Fetch current Shopify inventory levels in bulk
    const itemIds = products.map((p) => Number(p.shopifyInventoryItemId)).filter(Boolean)
    let shopifyLevels = {}
    if (itemIds.length > 0) {
      try {
        const locationId = await this.getLocationId()
        const res = await request(`/inventory_levels.json?inventory_item_ids=${itemIds.join(',')}`)
        for (const lvl of res.inventory_levels || []) {
          if (lvl.location_id === locationId) {
            shopifyLevels[lvl.inventory_item_id] = lvl.available ?? 0
          }
        }
      } catch {
        // Shopify not configured — return ERP-only data
      }
    }

    return products.map((p) => {
      const erpStock = p.inventory?.quantity ?? 0
      const shopifyStock = shopifyLevels[Number(p.shopifyInventoryItemId)] ?? null
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        erpStock,
        shopifyStock,
        match: shopifyStock !== null ? erpStock === shopifyStock : null,
        lastSync: null,
      }
    })
  },

  // ERP vs Shopify price comparison
  async priceComparison() {
    const products = await prisma.product.findMany({
      where: { isActive: true, shopifyVariantId: { not: null } },
      orderBy: { sku: 'asc' },
    })

    // Fetch current Shopify variant prices in bulk
    const variantIds = products.map((p) => Number(p.shopifyVariantId)).filter(Boolean)
    let shopifyPrices = {}
    if (variantIds.length > 0) {
      try {
        const ids = variantIds.join(',')
        const res = await request(`/variants.json?ids=${ids}`)
        for (const v of res.variants || []) {
          shopifyPrices[v.id] = Number(v.price) || 0
        }
      } catch {
        // Shopify not configured — return ERP-only data
      }
    }

    return products.map((p) => {
      const erpPrice = Number(p.sellingPrice) || 0
      const shopifyPrice = shopifyPrices[Number(p.shopifyVariantId)] ?? null
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        erpPrice,
        shopifyPrice,
        match: shopifyPrice !== null ? Math.abs(erpPrice - shopifyPrice) < 0.01 : null,
        lastSync: null,
      }
    })
  },
}

module.exports = shopifyService
