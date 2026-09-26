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
const { credentials } = require('../integrations/shopify/shopifyConfig')

async function verifyShopifyWebhook(req, res, next) {
  const hmac = req.headers['x-shopify-hmac-sha256']
  const topic = req.headers['x-shopify-topic']

  if (!hmac || !topic) {
    throw new ApiError(401, 'Missing Shopify webhook headers')
  }

  // Resolve the secret the same way the rest of the API does — the store is
  // configured either in Settings > Integrations (DB) or via env vars.
  const { webhookSecret } = await credentials()
  if (!webhookSecret) {
    throw new ApiError(500, 'Shopify webhook secret is not configured. Set it in Settings > Integrations > Shopify or in backend/.env')
  }

  // Re-compute the signature over the raw request body
  const digest = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('base64')

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
