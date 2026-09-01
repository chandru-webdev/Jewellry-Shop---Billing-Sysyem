const express = require('express')
const shopifyController = require('../controllers/shopify.controller')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

// Everything under /api/shopify requires login.
// MANAGER and ADMIN can trigger syncs.
router.use(authenticate)
router.use(authorize('SUPER_ADMIN', 'MANAGER'))

// GET /api/shopify/status — latest sync results (any logged-in user)
router.get('/status', shopifyController.status)

// GET /api/shopify/sync-logs — list sync log entries
router.get('/sync-logs', shopifyController.syncLogs)

// GET /api/shopify/inventory-comparison — ERP vs Shopify stock levels
router.get('/inventory-comparison', shopifyController.inventoryComparison)

// GET /api/shopify/price-comparison — ERP vs Shopify prices
router.get('/price-comparison', shopifyController.priceComparison)

// POST /api/shopify/pull-products — pull products FROM Shopify into ERP
router.post('/pull-products', shopifyController.pullProducts)

// POST /api/shopify/pull-orders — pull orders FROM Shopify into ERP
router.post('/pull-orders', shopifyController.pullOrders)

// POST /api/shopify/pull-customers — pull customers FROM Shopify into ERP
router.post('/pull-customers', shopifyController.pullCustomers)

// GET /api/shopify/products — fetch products FROM Shopify (preview only)
router.get('/products', shopifyController.fetchProducts)

// POST /api/shopify/sync/... — manual sync jobs
router.post('/sync/products/:id', shopifyController.syncOneProduct)
router.post('/sync/all-products', shopifyController.syncAllProducts)
router.post('/sync/prices', shopifyController.syncAllPrices)
router.post('/sync/inventory', shopifyController.syncAllInventory)

module.exports = router
