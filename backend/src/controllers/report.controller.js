const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const reportService = require('../services/report.service')

const reportController = {
  // GET /api/reports/sales?from=2026-01-01&to=2026-01-31
  sales: asyncHandler(async (req, res) => {
    const report = await reportService.sales(req.query)
    success(res, 200, report, 'Sales report fetched')
  }),

  // GET /api/reports/inventory
  inventory: asyncHandler(async (req, res) => {
    const report = await reportService.inventory()
    success(res, 200, report, 'Inventory report fetched')
  }),

  // GET /api/reports/products?from=&to=&limit=
  products: asyncHandler(async (req, res) => {
    const report = await reportService.products(req.query)
    success(res, 200, report, 'Product report fetched')
  }),
}

module.exports = reportController
