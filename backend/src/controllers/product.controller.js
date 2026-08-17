const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const productService = require('../services/product.service')

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
}

module.exports = productController
