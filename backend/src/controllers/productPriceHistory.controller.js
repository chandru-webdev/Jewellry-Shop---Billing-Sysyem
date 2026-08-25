const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const productPriceHistoryService = require('../services/productPriceHistory.service')

const productPriceHistoryController = {
  list: asyncHandler(async (req, res) => {
    const data = await productPriceHistoryService.list(req.query)
    success(res, 200, data, 'Price history fetched')
  }),

  getByProduct: asyncHandler(async (req, res) => {
    const records = await productPriceHistoryService.getByProduct(req.params.productId, req.query)
    success(res, 200, records, 'Product price history fetched')
  }),

  getStats: asyncHandler(async (req, res) => {
    const stats = await productPriceHistoryService.getStats(req.query)
    success(res, 200, stats, 'Price history stats fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const record = await productPriceHistoryService.getById(req.params.id)
    success(res, 200, record, 'Price history record fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const record = await productPriceHistoryService.create({
      ...req.body,
      changedById: req.user.id,
    })
    success(res, 201, record, 'Price history record created')
  }),
}

module.exports = productPriceHistoryController
