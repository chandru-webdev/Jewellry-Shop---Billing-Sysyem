// =============================================================
// Shopify webhook authenticity middleware (Phase 16)
//
// Shopify signs every webhook with HMAC-SHA256 using the webhook
// secret (our app's API secret key). We verify the signature on
// the RAW body before trusting anything — same pattern as OAuth.
//
// After this runs, req.webhookTopic is set and the body is trusted.
// =============================================================
const crypto = require('crypto')
const ApiError = require('../utils/ApiError')
const env = require('../config/env')

function verifyShopifyWebhook(req, res, next) {
  const hmac = req.headers['x-shopify-hmac-sha256']
  const topic = req.headers['x-shopify-topic']

  if (!hmac || !topic) {
    throw new ApiError(401, 'Missing Shopify webhook headers')
  }

  const secret = env.shopify.webhookSecret
  if (!secret) {
    throw new ApiError(500, 'SHOPIFY_WEBHOOK_SECRET is not configured')
  }

  // Re-compute the signature over the raw request body
  const digest = crypto.createHmac('sha256', secret).update(req.body).digest('base64')

  // timingSafeEqual avoids leaking info via response timing
  const a = Buffer.from(digest)
  const b = Buffer.from(hmac)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new ApiError(401, 'Invalid Shopify webhook signature')
  }

  req.webhookTopic = topic
  next()
}

module.exports = { verifyShopifyWebhook }
