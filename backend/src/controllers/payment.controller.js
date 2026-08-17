const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const paymentService = require('../services/payment.service')

const paymentController = {
  list: asyncHandler(async (req, res) => {
    const payments = await paymentService.list(req.query)
    success(res, 200, payments, 'Payments fetched')
  }),

  dues: asyncHandler(async (req, res) => {
    const dues = await paymentService.getDues()
    success(res, 200, dues, 'Dues fetched')
  }),

  summary: asyncHandler(async (req, res) => {
    const summary = await paymentService.getSummary()
    success(res, 200, summary, 'Payment summary fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const payment = await paymentService.getById(req.params.id)
    success(res, 200, payment, 'Payment fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const payment = await paymentService.create(req.body, req.user.id)
    success(res, 201, payment, 'Payment recorded')
  }),
}

module.exports = paymentController
