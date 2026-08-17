const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

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

  // Core logic: update the quantity AND append a ledger entry in ONE database
  // transaction, so they can never fall out of sync.
  async change(productId, delta, type, userId, note) {
    return prisma.$transaction(
      async (tx) => {
        const result = await this.applyInTx(tx, productId, delta, type, userId, note)
        return { productId, previous: result.previous, quantity: result.quantity }
      },
      { timeout: 60000 }
    )
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

    return { previous: inv.quantity, quantity: newQuantity }
  },
}

module.exports = inventoryService
