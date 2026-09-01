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
const prisma = require('../prisma/client')
const { request, throttle, ShopifyApiError } = require('../integrations/shopify/client')
const { calculatePrice, getSilverRate } = require('./pricing.service')

const shopifyService = {

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
        const variant = sp.variants?.[0]
        if (!variant) { skipped++; continue }

        const sku = variant.sku || `SHOPIFY-${sp.id}`
        const name = sp.title || 'Untitled Product'
        const weight = parseFloat(variant.weight) || 5
        const shopifyPrice = parseFloat(variant.price) || 0

        // Check if product already exists by SKU
        const existing = await prisma.product.findUnique({ where: { sku } })

        // Calculate price using our pricing engine
        const makingCharge = 180 // default making charge for imported products
        const price = calculatePrice({
          silverRate,
          weight,
          makingCharge,
          gstPercent: 3,
        })

        if (existing) {
          // Update existing product with Shopify link
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              shopifyProductId: BigInt(sp.id),
              shopifyVariantId: BigInt(variant.id),
              shopifyInventoryItemId: variant.inventory_item_id ? BigInt(variant.inventory_item_id) : null,
              name,
              weight,
            },
          })

          // Create inventory if it doesn't exist
          if (!existing.inventoryId) {
            await prisma.inventory.create({
              data: { productId: existing.id, quantity: variant.inventory_quantity || 0 },
            })
          }

          updated++
        } else {
          // Determine category from Shopify product type
          let categoryId = defaultCategory?.id
          if (sp.product_type) {
            const cat = await prisma.category.findFirst({
              where: { name: { equals: sp.product_type, mode: 'insensitive' } },
            })
            if (cat) categoryId = cat.id
          }

          // Create new product
          const product = await prisma.product.create({
            data: {
              sku,
              name,
              description: sp.body_html?.replace(/<[^>]*>/g, '') || '',
              categoryId: categoryId || 1,
              metal: 'silver',
              weight,
              makingCharge,
              gstPercent: 3,
              baseAmount: price.baseAmount,
              gstAmount: price.gstAmount,
              sellingPrice: price.sellingPrice,
              isActive: sp.status === 'active',
              shopifyProductId: BigInt(sp.id),
              shopifyVariantId: BigInt(variant.id),
              shopifyInventoryItemId: variant.inventory_item_id ? BigInt(variant.inventory_item_id) : null,
            },
          })

          // Create inventory record
          await prisma.inventory.create({
            data: { productId: product.id, quantity: variant.inventory_quantity || 0 },
          })

          created++
        }

        ok++
      } catch (err) {
        failed++
        if (!firstError) firstError = err.message
      }
    }

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
      await this.logSync('ORDER', ok, failed, firstError, userId)
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

  // Fetch products from Shopify store (for preview/listing in UI)
  async fetchProducts(params = {}) {
    const { limit = 50, page = 1, search } = params
    const queryParams = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    })
    if (search) queryParams.set('search', search)

    const res = await request(`/products.json?${queryParams.toString()}`)
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
        await request('/inventory_levels/set.json', {
          method: 'POST',
          body: {
            location_id: lvl.location_id,
            inventory_item_id: inventoryItemId,
            available: 0,
          },
        })
      }
    }

    return request('/inventory_levels/set.json', {
      method: 'POST',
      body: {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      },
    })
  },

  // Create a brand-new product on Shopify. Returns the Shopify ids.
  async createProductOnShopify(product) {
    const res = await request('/products.json', {
      method: 'POST',
      body: {
        product: {
          title: product.name,
          vendor: 'OPAL LINE',
          product_type: product.category?.name || 'Jewellery',
          body_html: product.description || '',
          status: product.isActive ? 'active' : 'draft',
          variants: [
            {
              sku: product.sku,
              price: Number(product.sellingPrice).toFixed(2),
              weight: Number(product.weight),
              weight_unit: 'g',
              inventory_management: 'shopify',
            },
          ],
        },
      },
    })

    const p = res.product
    const variant = p.variants[0]

    // Give the new variant its starting stock
    await this.setInventoryLevel(variant.inventory_item_id, product.inventory?.quantity ?? 0)

    return {
      shopifyProductId: p.id,
      shopifyVariantId: variant.id,
      shopifyInventoryItemId: variant.inventory_item_id,
    }
  },

  // Update an existing Shopify product's details + price (and stock)
  async updateProductOnShopify(product) {
    await request(`/products/${product.shopifyProductId}.json`, {
      method: 'PUT',
      body: {
        product: {
          id: Number(product.shopifyProductId),
          title: product.name,
          product_type: product.category?.name || 'Jewellery',
          body_html: product.description || '',
          status: product.isActive ? 'active' : 'draft',
        },
      },
    })

    await request(`/variants/${product.shopifyVariantId}.json`, {
      method: 'PUT',
      body: {
        variant: {
          id: Number(product.shopifyVariantId),
          price: Number(product.sellingPrice).toFixed(2),
          sku: product.sku,
        },
      },
    })

    if (product.shopifyInventoryItemId) {
      await this.setInventoryLevel(Number(product.shopifyInventoryItemId), product.inventory?.quantity ?? 0)
    }
  },

  // Push ONE ERP product to Shopify (create if needed, else update)
  async syncProduct(productId) {
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { category: true, inventory: true },
    })
    if (!product) throw new Error(`Product ${productId} not found`)

    let ids = null

    // No link saved yet: reuse an existing Shopify product with the same
    // SKU if one exists, otherwise create a brand-new one.
    if (!product.shopifyProductId) {
      ids = (await this.findShopifyProductBySku(product.sku)) || (await this.createProductOnShopify(product))
      await prisma.product.update({
        where: { id: product.id },
        data: {
          shopifyProductId: ids.shopifyProductId,
          shopifyVariantId: ids.shopifyVariantId,
          shopifyInventoryItemId: ids.shopifyInventoryItemId,
        },
      })
      return { productId: product.id, sku: product.sku, ...ids }
    }

    // Linked but the Shopify product was deleted there: recreate it.
    try {
      await this.updateProductOnShopify(product)
    } catch (err) {
      if (!(err instanceof ShopifyApiError) || err.status !== 404) throw err
      ids = await this.createProductOnShopify(product)
      await prisma.product.update({
        where: { id: product.id },
        data: {
          shopifyProductId: ids.shopifyProductId,
          shopifyVariantId: ids.shopifyVariantId,
          shopifyInventoryItemId: ids.shopifyInventoryItemId,
        },
      })
      return { productId: product.id, sku: product.sku, ...ids }
    }

    return { productId: product.id, sku: product.sku }
  },

  // ---------- bulk jobs (recorded in ShopifySyncLog) ----------

  // Push every active product (create missing + update existing)
  async syncAllProducts(userId) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, inventory: true },
    })

    let ok = 0
    let failed = 0
    let firstError = null

    for (const product of products) {
      try {
        await this.syncProduct(product.id)
        ok++
      } catch (err) {
        failed++
        if (!firstError) firstError = err.message
      }
      await throttle()
    }

    await this.logSync('PRODUCT', ok, failed, firstError, userId)
    return { total: products.length, ok, failed, firstError }
  },

  // Re-publish every product price to Shopify (after a rate change)
  async syncAllPrices(userId) {
    const products = await prisma.product.findMany({
      where: { isActive: true, shopifyVariantId: { not: null } },
    })

    let ok = 0
    let failed = 0
    let firstError = null

    for (const product of products) {
      try {
        await request(`/variants/${product.shopifyVariantId}.json`, {
          method: 'PUT',
          body: {
            variant: {
              id: Number(product.shopifyVariantId),
              price: Number(product.sellingPrice).toFixed(2),
            },
          },
        })
        ok++
      } catch (err) {
        failed++
        if (!firstError) firstError = err.message
      }
      await throttle()
    }

    await this.logSync('PRICE', ok, failed, firstError, userId)
    return { total: products.length, ok, failed, firstError }
  },

  // Push every product's current stock to Shopify
  async syncAllInventory(userId) {
    const products = await prisma.product.findMany({
      where: { shopifyInventoryItemId: { not: null } },
      include: { inventory: true },
    })

    let ok = 0
    let failed = 0
    let firstError = null

    for (const product of products) {
      try {
        await this.setInventoryLevel(Number(product.shopifyInventoryItemId), product.inventory?.quantity ?? 0)
        ok++
      } catch (err) {
        failed++
        if (!firstError) firstError = err.message
      }
      await throttle()
    }

    await this.logSync('INVENTORY', ok, failed, firstError, userId)
    return { total: products.length, ok, failed, firstError }
  },

  // Write one row in ShopifySyncLog so the dashboard can show status
  async logSync(type, ok, failed, firstError, userId) {
    await prisma.shopifySyncLog.create({
      data: {
        type,
        status: failed === 0 ? 'SUCCESS' : failed > 0 && ok > 0 ? 'FAILED' : 'FAILED',
        itemsProcessed: ok,
        message: failed === 0 ? 'All items synced' : `${failed} failed. ${firstError || ''}`.trim(),
        payload: { ok, failed, userId },
      },
    })
  },

  // Latest sync result per type (for the dashboard widget)
  async syncStatus() {
    const types = ['PRODUCT', 'PRICE', 'INVENTORY', 'ORDER']
    const logs = await Promise.all(
      types.map((type) => prisma.shopifySyncLog.findFirst({ where: { type }, orderBy: { id: 'desc' } }))
    )
    const latest = {}
    types.forEach((type, i) => { latest[type.toLowerCase()] = logs[i] })
    return latest
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
