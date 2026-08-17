const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const webhookService = require('../services/webhook.service')

const webhookController = {
  // POST /api/webhooks/shopify/orders — any Shopify order webhook topic
  // (orders/create, orders/paid, orders/cancelled, orders/fulfilled, ...)
  handleOrder: asyncHandler(async (req, res) => {
    const eventId =
      req.headers['x-shopify-order-id'] ||
      req.body.id ||
      // fallback unique id so retries are still detected
      `${req.webhookTopic}-${req.headers['x-shopify-webhook-id'] || ''}`

    const result = await webhookService.handle({
      topic: req.webhookTopic,
      eventId: eventId || `${Date.now()}-${Math.random()}`,
      payload: JSON.parse(req.body.toString('utf8')),
      shopDomain: req.headers['x-shopify-shop-domain'] || '',
    })

    success(res, 200, result, 'Webhook received')
  }),

  // POST /api/webhooks/shopify/refunds — refunds/create
  handleRefund: asyncHandler(async (req, res) => {
    const result = await webhookService.handle({
      topic: req.webhookTopic || 'refunds/create',
      eventId: req.body.id ? `refund-${req.body.id}` : `${Date.now()}-${Math.random()}`,
      payload: JSON.parse(req.body.toString('utf8')),
      shopDomain: req.headers['x-shopify-shop-domain'] || '',
    })

    success(res, 200, result, 'Webhook received')
  }),
}

module.exports = webhookController
