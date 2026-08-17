const express = require('express')
const { verifyShopifyWebhook } = require('../middleware/shopifyWebhook')
const webhookController = require('../controllers/webhook.controller')

const router = express.Router()

// Shopify webhooks MUST be received as raw bytes so the HMAC can be
// recomputed over the exact body Shopify signed. (express.json would
// have already parsed/re-serialized it and broken the signature.)
router.use(express.raw({ type: '*/*' }))
router.use(verifyShopifyWebhook)

// This router is mounted at /api/webhooks (see app.js), so routes here
// start with /shopify to make the full path /api/webhooks/shopify/orders.
router.post('/shopify/orders', webhookController.handleOrder)

// Refunds
router.post('/shopify/refunds', webhookController.handleRefund)

module.exports = router
