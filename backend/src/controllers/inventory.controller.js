const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const inventoryService = require('../services/inventory.service')

const inventoryController = {
  list: asyncHandler(async (req, res) => {
    const inventory = await inventoryService.list()
    success(res, 200, inventory, 'Inventory fetched')
  }),

  transactions: asyncHandler(async (req, res) => {
    const transactions = await inventoryService.listTransactions(req.query)
    success(res, 200, transactions, 'Transactions fetched')
  }),

  stockIn: asyncHandler(async (req, res) => {
    const result = await inventoryService.stockIn({
      productId: req.body.productId,
      quantity: req.body.quantity,
      note: req.body.note,
      userId: req.user.id,
    })
    success(res, 200, result, 'Stock added')
  }),

  stockOut: asyncHandler(async (req, res) => {
    const result = await inventoryService.stockOut({
      productId: req.body.productId,
      quantity: req.body.quantity,
      note: req.body.note,
      userId: req.user.id,
    })
    success(res, 200, result, 'Stock removed')
  }),

  stockTransfer: asyncHandler(async (req, res) => {
    const result = await inventoryService.stockTransfer({
      productId: req.body.productId,
      quantity: req.body.quantity,
      from: req.body.from,
      to: req.body.to,
      note: req.body.note,
      userId: req.user.id,
    })
    success(res, 200, result, 'Stock transferred')
  }),

  // Re-push current ERP quantities to Shopify for every product whose last
  // stock sync failed (recorded in ShopifySyncLog). Lets an admin repair
  // storefront stock that would otherwise show a stale / wrong quantity.
  retrySync: asyncHandler(async (req, res) => {
    const result = await inventoryService.retryFailedSyncs({ limit: Number(req.query.limit) || 50 })
    success(res, 200, result, 'Failed stock syncs retried')
  }),
}

module.exports = inventoryController
