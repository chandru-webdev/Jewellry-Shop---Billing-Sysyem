const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const orderService = require('../services/order.service')

const orderController = {
  list: asyncHandler(async (req, res) => {
    const orders = await orderService.list(req.query)
    success(res, 200, orders, 'Orders fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const order = await orderService.getById(req.params.id)
    success(res, 200, order, 'Order fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const order = await orderService.create(req.body, req.user.id)
    success(res, 201, order, 'Order created')
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const order = await orderService.updateStatus(req.params.id, req.body.status, req.user.id)
    success(res, 200, order, 'Order status updated')
  }),
}

module.exports = orderController
