const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const supplierService = require('../services/supplier.service')

const supplierController = {
  list: asyncHandler(async (req, res) => {
    const suppliers = await supplierService.list(req.query)
    success(res, 200, suppliers, 'Suppliers fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const supplier = await supplierService.getById(req.params.id)
    success(res, 200, supplier, 'Supplier fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const supplier = await supplierService.create(req.body)
    success(res, 201, supplier, 'Supplier created')
  }),

  update: asyncHandler(async (req, res) => {
    const supplier = await supplierService.update(req.params.id, req.body)
    success(res, 200, supplier, 'Supplier updated')
  }),
}

module.exports = supplierController
