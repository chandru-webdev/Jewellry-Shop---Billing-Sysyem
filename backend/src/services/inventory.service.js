const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const notificationService = require('./notification.service')
const settingService = require('./setting.service')
const shopifyService = require('./shopify.service')

// ALL stock changes go through this one service.
// This is also what the Shopify webhook handler will call in Phase 17,
// so the "reduce stock on online sale" behaviour is identical to manual stock-out.
const inventoryService = {
  // All products with their current stock level
  async list() {
    return prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  },

  // GET /api/inventory/transactions — the ledger
  async listTransactions(filters = {}) {
    const where = {}
    if (filters.productId) where.productId = Number(filters.productId)
    if (filters.type) where.type = filters.type

    return prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  },

  async stockIn({ productId, quantity, userId, note }) {
    return this.change(productId, quantity, 'STOCK_IN', userId, note)
  },

  async stockOut({ productId, quantity, userId, note }) {
    return this.change(productId, -quantity, 'STOCK_OUT', userId, note)
  },

  // Move stock between locations. A transfer does not change the product's total
  // quantity, so it only appends a balanced pair of ledger entries (STOCK_OUT from
  // the source location and STOCK_IN to the destination) atomically, validating
  // that enough stock is available before recording the movement.
  async stockTransfer({ productId, quantity, from, to, userId, note }) {
    return prisma.$transaction(
      async (tx) => {
        const inv = await tx.inventory.findUnique({ where: { productId } })
        if (!inv) throw new ApiError(404, 'This product has no inventory record')
        if (quantity > inv.quantity) {
          throw new ApiError(400, `Not enough stock to transfer. Available: ${inv.quantity}`)
        }

        const extra = note ? ` — ${note}` : ''
        await tx.inventoryTransaction.create({
          data: {
            productId,
            type: 'STOCK_OUT',
            quantity: -quantity,
            note: `Transfer OUT to ${to}${extra}`,
            createdById: userId,
          },
        })
        await tx.inventoryTransaction.create({
          data: {
            productId,
            type: 'STOCK_IN',
            quantity,
            note: `Transfer IN from ${from}${extra}`,
            createdById: userId,
          },
        })

        return { productId, quantity, from, to }
      },
      { timeout: 60000 }
    )
  },

  // Core logic: update the quantity AND append a ledger entry in ONE database
  // transaction, so they can never fall out of sync.
  async change(productId, delta, type, userId, note) {
    const result = await prisma.$transaction(
      async (tx) => {
        const result = await this.applyInTx(tx, productId, delta, type, userId, note)
        return { productId, previous: result.previous, quantity: result.quantity }
      },
      { timeout: 60000 }
    )

    // Push stock to Shopify after successful DB update (non-blocking).
    // Failures are recorded so they can be retried — never silently swallowed.
    this.syncToShopify(productId, result.quantity)

    return result
  },

  // Push stock level to Shopify (best-effort). Never throws — on failure the
  // error is recorded in ShopifySyncLog so the stale storefront stock is
  // visible and can be re-pushed with retryFailedSyncs().
  async syncToShopify(productId, newQuantity) {
    try {
      const product = await prisma.product.findUnique({ where: { id: productId } })
      if (!product?.shopifyInventoryItemId) {
        await this.recordSyncFailure(productId, newQuantity, 'Product has no Shopify inventory item id')
        return { ok: false, error: 'NO_INVENTORY_ITEM_ID' }
      }

      await shopifyService.setInventoryLevel(
        Number(product.shopifyInventoryItemId),
        newQuantity
      )
      return { ok: true }
    } catch (err) {
      await this.recordSyncFailure(productId, newQuantity, err.message || 'Unknown sync error')
      return { ok: false, error: err.message }
    }
  },

  // Record a failed stock push so it can be surfaced and retried.
  async recordSyncFailure(productId, newQuantity, error) {
    try {
      await prisma.shopifySyncLog.create({
        data: {
          type: 'INVENTORY',
          status: 'FAILED',
          itemsProcessed: 0,
          message: `Stock sync to Shopify failed (product ${productId}, qty ${newQuantity}): ${error}`,
          payload: { productId, quantity: newQuantity, error },
        },
      })
    } catch (err) {
      // Logging must never break a stock update.
    }
  },

  // Re-push the CURRENT ERP quantity to Shopify for every product whose last
  // stock sync failed. Returns a summary of the retried pushes.
  async retryFailedSyncs({ limit = 50 } = {}) {
    const failed = await prisma.shopifySyncLog.findMany({
      where: { type: 'INVENTORY', status: 'FAILED' },
      orderBy: { id: 'desc' },
      take: limit,
    })

    const uniqueIds = []
    const seen = new Set()
    for (const log of failed) {
      const productId = log.payload?.productId
      if (!productId || seen.has(productId)) continue
      seen.add(productId)
      uniqueIds.push(productId)
    }

    const results = []
    for (const productId of uniqueIds) {
      const product = await prisma.product.findUnique({
        where: { id: Number(productId) },
        include: { inventory: true },
      })
      if (!product) continue
      const qty = product.inventory?.quantity ?? 0
      const res = await this.syncToShopify(product.id, qty)
      results.push({ productId: product.id, sku: product.sku, ok: res.ok })
    }

    return {
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }
  },

  // Reusable inside another $transaction — used by billing / Shopify webhooks
  // so stock reduction and the invoice/order are saved atomically together.
  async applyInTx(tx, productId, delta, type, userId, note, reference) {
    const inv = await tx.inventory.findUnique({ where: { productId } })
    if (!inv) throw new ApiError(404, 'This product has no inventory record')

    const newQuantity = inv.quantity + delta
    if (newQuantity < 0) {
      throw new ApiError(400, `Not enough stock. Available: ${inv.quantity}`)
    }

    await tx.inventory.update({
      where: { id: inv.id },
      data: { quantity: newQuantity },
    })

    await tx.inventoryTransaction.create({
      data: {
        productId,
        type,
        quantity: delta,
        note,
        reference,
        createdById: userId,
      },
    })

    // Check for low stock after inventory change. Uses the product's own
    // threshold when set, otherwise the global default from Settings.
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (product) {
      const [lowStockEnabled, defaultThreshold] = await Promise.all([
        notificationService.isEnabled('LOW_STOCK'),
        settingService.getValue('lowStockThresholdDefault'),
      ])
      const threshold = product.lowStockThreshold != null ? product.lowStockThreshold : defaultThreshold
      if (lowStockEnabled && newQuantity <= threshold && newQuantity >= 0) {
        await notificationService.createForAll({
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${product.name} (${product.sku}) has only ${newQuantity} units left — below threshold of ${threshold}`,
        })
      }
    }

    return { previous: inv.quantity, quantity: newQuantity }
  },
}

module.exports = inventoryService
