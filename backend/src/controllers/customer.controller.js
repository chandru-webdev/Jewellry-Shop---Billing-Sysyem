const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const customerService = require('../services/customer.service')

const customerController = {
  list: asyncHandler(async (req, res) => {
    const customers = await customerService.list(req.query)
    success(res, 200, customers, 'Customers fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const customer = await customerService.getById(req.params.id)
    success(res, 200, customer, 'Customer fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const customer = await customerService.create(req.body)
    success(res, 201, customer, 'Customer created')
  }),

  update: asyncHandler(async (req, res) => {
    const customer = await customerService.update(req.params.id, req.body)
    success(res, 200, customer, 'Customer updated')
  }),
}

module.exports = customerController
