const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const purchaseOrderService = require('../services/purchaseOrder.service')

const purchaseOrderController = {
  list: asyncHandler(async (req, res) => {
    const data = await purchaseOrderService.list(req.query)
    success(res, 200, data, 'Purchase orders fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const order = await purchaseOrderService.getById(req.params.id)
    success(res, 200, order, 'Purchase order fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const order = await purchaseOrderService.create({
      ...req.body,
      createdById: req.user.id,
    })
    success(res, 201, order, 'Purchase order created')
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const order = await purchaseOrderService.updateStatus(req.params.id, req.body.status)
    success(res, 200, order, 'Purchase order status updated')
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await purchaseOrderService.remove(req.params.id)
    success(res, 200, result, 'Purchase order deleted')
  }),
}

module.exports = purchaseOrderController
