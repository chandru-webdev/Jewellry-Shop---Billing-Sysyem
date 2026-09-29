const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const productService = require('../services/product.service')
const { recalculateMissingSilverRate } = require('../services/pricing.service')
const syncProgress = require('../services/syncProgress.service')
const pipeProgressStream = require('../utils/progressStream')

const productController = {
  list: asyncHandler(async (req, res) => {
    const products = await productService.list(req.query)
    success(res, 200, products, 'Products fetched')
  }),

  getById: asyncHandler(async (req, res) => {
    const product = await productService.getById(req.params.id)
    success(res, 200, product, 'Product fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const product = await productService.create(req.body, req.user.id)
    success(res, 201, product, 'Product created')
  }),

  update: asyncHandler(async (req, res) => {
    const product = await productService.update(req.params.id, req.body, req.user.id)
    success(res, 200, product, 'Product updated')
  }),

  remove: asyncHandler(async (req, res) => {
    const product = await productService.remove(req.params.id, req.user.id)
    success(res, 200, product, 'Product deactivated')
  }),

  duplicate: asyncHandler(async (req, res) => {
    const product = await productService.duplicate(req.params.id, req.user.id)
    success(res, 201, product, 'Product duplicated')
  }),

  approveImport: asyncHandler(async (req, res) => {
    const product = await productService.approveImport(req.params.id, req.user.id)
    success(res, 200, product, 'Import approved')
  }),

  discardImport: asyncHandler(async (req, res) => {
    const result = await productService.discardImport(req.params.id, req.user.id)
    success(res, 200, result, 'Import discarded')
  }),

  repairPricing: asyncHandler(async (req, res) => {
    const result = await recalculateMissingSilverRate({ userId: req.user.id, reason: 'PRICING_FIX_MISSING_SILVER_RATE' })
    success(res, 200, result, 'Pricing repaired')
  }),

  // Current snapshot of a product's in-flight sync (steps + statuses).
  getSyncProgress: asyncHandler(async (req, res) => {
    const data = syncProgress.getSnapshot(req.params.id)
    success(res, 200, data, 'Sync progress fetched')
  }),

  // Server-Sent Events stream — pushes each step update in real time and
  // closes once the job finishes. No success() envelope; it's raw SSE frames.
  getSyncProgressStream: asyncHandler(async (req, res) => {
    pipeProgressStream(req, res, req.params.id)
  }),
}

module.exports = productController
