const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const shopifyService = require('../services/shopify.service')
const prisma = require('../prisma/client')

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

  // POST /api/shopify/pull-orders — pull orders from Shopify into ERP
  pullOrders: asyncHandler(async (req, res) => {
    const result = await shopifyService.pullOrdersFromShopify(req.user.id)
    success(res, 200, result, 'Orders pulled from Shopify')
  }),

  // POST /api/shopify/pull-customers — pull customers from Shopify into ERP
  pullCustomers: asyncHandler(async (req, res) => {
    const result = await shopifyService.pullCustomersFromShopify(req.user.id)
    success(res, 200, result, 'Customers pulled from Shopify')
  }),

  // GET /api/shopify/products — fetch products from Shopify (preview)
  fetchProducts: asyncHandler(async (req, res) => {
    const { limit, page, search } = req.query
    const result = await shopifyService.fetchProducts({ limit, page, search })
    success(res, 200, result, 'Products fetched from Shopify')
  }),

  // GET /api/shopify/sync-logs — list sync log entries
  syncLogs: asyncHandler(async (req, res) => {
    const { type, status, limit: queryLimit } = req.query
    const allowedTypes = ['PRODUCT', 'PRICE', 'INVENTORY', 'ORDER']
    const allowedStatuses = ['SUCCESS', 'FAILED', 'PENDING']
    const where = {}
    if (type && allowedTypes.includes(type)) where.type = type
    if (status && allowedStatuses.includes(status)) where.status = status
    const logs = await prisma.shopifySyncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(queryLimit) || 50, 200),
    })
    success(res, 200, logs, 'Sync logs fetched')
  }),

  // GET /api/shopify/inventory-comparison — ERP vs Shopify stock
  inventoryComparison: asyncHandler(async (req, res) => {
    const data = await shopifyService.inventoryComparison()
    success(res, 200, data, 'Inventory comparison fetched')
  }),

  // GET /api/shopify/price-comparison — ERP vs Shopify prices
  priceComparison: asyncHandler(async (req, res) => {
    const data = await shopifyService.priceComparison()
    success(res, 200, data, 'Price comparison fetched')
  }),
}

module.exports = shopifyController
