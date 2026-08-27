const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const purchaseReturnService = require('../services/purchaseReturn.service')

const purchaseReturnController = {
  list: asyncHandler(async (req, res) => {
    const data = await purchaseReturnService.list(req.query)
    success(res, 200, data, 'Purchase returns fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const ret = await purchaseReturnService.getById(req.params.id)
    success(res, 200, ret, 'Purchase return fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const ret = await purchaseReturnService.create({
      ...req.body,
      createdById: req.user.id,
    })
    success(res, 201, ret, 'Purchase return created')
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const ret = await purchaseReturnService.updateStatus(req.params.id, req.body.status)
    success(res, 200, ret, 'Purchase return status updated')
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await purchaseReturnService.remove(req.params.id)
    success(res, 200, result, 'Purchase return deleted')
  }),
}

module.exports = purchaseReturnController
