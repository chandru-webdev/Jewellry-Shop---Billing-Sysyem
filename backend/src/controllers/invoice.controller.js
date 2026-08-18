const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const invoiceService = require('../services/invoice.service')

const invoiceController = {
  list: asyncHandler(async (req, res) => {
    const invoices = await invoiceService.list(req.query)
    success(res, 200, invoices, 'Invoices fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getById(req.params.id)
    success(res, 200, invoice, 'Invoice fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const invoice = await invoiceService.create(req.body, req.user.id)
    success(res, 201, invoice, 'Invoice created')
  }),

  update: asyncHandler(async (req, res) => {
    const invoice = await invoiceService.update(req.params.id, req.body, req.user.id)
    success(res, 200, invoice, 'Invoice updated')
  }),
}

module.exports = invoiceController
