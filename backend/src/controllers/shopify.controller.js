const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const shopifyService = require('../services/shopify.service')

const shopifyController = {
  // POST /api/shopify/sync/products — push one product
  syncOneProduct: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncProduct(req.params.id)
    success(res, 200, result, 'Product synced to Shopify')
  }),

  // POST /api/shopify/sync/all-products — push every active product
  syncAllProducts: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncAllProducts(req.user.id)
    success(res, 200, result, 'Products synced to Shopify')
  }),

  // POST /api/shopify/sync/prices
  syncAllPrices: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncAllPrices(req.user.id)
    success(res, 200, result, 'Prices synced to Shopify')
  }),

  // POST /api/shopify/sync/inventory
  syncAllInventory: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncAllInventory(req.user.id)
    success(res, 200, result, 'Inventory synced to Shopify')
  }),

  // GET /api/shopify/status
  status: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncStatus()
    success(res, 200, result, 'Shopify sync status fetched')
  }),

  // POST /api/shopify/pull-products — pull products from Shopify into ERP
  pullProducts: asyncHandler(async (req, res) => {
    const result = await shopifyService.pullProductsFromShopify(req.user.id)
    success(res, 200, result, 'Products pulled from Shopify')
  }),
}

module.exports = shopifyController
