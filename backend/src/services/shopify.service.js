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

const shopifyService = {
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
    const latest = {}
    for (const type of types) {
      const log = await prisma.shopifySyncLog.findFirst({
        where: { type },
        orderBy: { id: 'desc' },
      })
      latest[type.toLowerCase()] = log
    }
    return latest
  },
}

module.exports = shopifyService
