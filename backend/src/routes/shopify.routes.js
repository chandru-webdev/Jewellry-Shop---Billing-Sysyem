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

// POST /api/shopify/sync/... — manual sync jobs
router.post('/sync/products/:id', shopifyController.syncOneProduct)
router.post('/sync/all-products', shopifyController.syncAllProducts)
router.post('/sync/prices', shopifyController.syncAllPrices)
router.post('/sync/inventory', shopifyController.syncAllInventory)

module.exports = router
