const asyncHandler = require('../utils/asyncHandler')
const { success, failure } = require('../utils/ApiResponse')
const purchaseInvoiceService = require('../services/purchaseInvoice.service')

const purchaseInvoiceController = {
  list: asyncHandler(async (req, res) => {
    const data = await purchaseInvoiceService.list(req.query)
    success(res, 200, data, 'Purchase invoices fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await purchaseInvoiceService.getById(req.params.id)
    success(res, 200, data, 'Purchase invoice fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const data = await purchaseInvoiceService.create({
      ...req.body,
      createdById: req.user.id,
    })
    success(res, 201, data, 'Purchase invoice created')
  }),

  update: asyncHandler(async (req, res) => {
    const data = await purchaseInvoiceService.update(req.params.id, req.body)
    success(res, 200, data, 'Purchase invoice updated')
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await purchaseInvoiceService.remove(req.params.id)
    success(res, 200, data, 'Purchase invoice deleted')
  }),

  recordPayment: asyncHandler(async (req, res) => {
    const payment = await purchaseInvoiceService.recordPayment(req.params.id, {
      ...req.body,
      createdById: req.user.id,
    })
    success(res, 201, payment, 'Payment recorded')
  }),

  refreshPaymentState: asyncHandler(async (req, res) => {
    const invoice = await purchaseInvoiceService.refreshPaymentState(req.params.id)
    success(res, 200, invoice, 'Payment state refreshed')
  }),
}

module.exports = purchaseInvoiceController