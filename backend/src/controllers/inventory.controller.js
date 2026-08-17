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
}

module.exports = inventoryController
