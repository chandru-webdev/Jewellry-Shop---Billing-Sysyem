// =============================================================
// Shopify webhook registration
//
// Orders are imported into the ERP via Shopify webhooks
// (orders/create). If the webhook was never registered in the
// store's Settings > Notifications (or the app's API), orders
// silently never arrive. This module ensures the critical
// webhooks are subscribed programmatically at server startup,
// so a fresh Railway deploy always has order delivery wired up.
// =============================================================
const prisma = require('../prisma/client')
const { credentials } = require('../integrations/shopify/shopifyConfig')
const { request, ShopifyApiError } = require('../integrations/shopify/client')

// Topics we must never miss (order sync + product/image sync depend on these).
const REQUIRED_TOPICS = [
  'orders/create',
  'orders/paid',
  'orders/cancelled',
  'orders/fulfilled',
  'refunds/create',
  'products/create',
  'products/update',
]

// The public URL Shopify calls. In production this must be the Railway
// domain; in development it can be a tunnelled URL (ngrok etc).
function webhookCallbackUrl(topic) {
  const base = process.env.PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000'
  let path = '/api/webhooks/shopify/orders'
  if (topic.startsWith('refunds')) path = '/api/webhooks/shopify/refunds'
  else if (topic.startsWith('products')) path = '/api/webhooks/shopify/products'
  return `${base}${path}`
}

// Register all required webhooks. Idempotent — never duplicates.
// Safe to call on every startup. Resolves credentials the same way the
// rest of the API does (DB config first, env fallback) so a store wired
// up from Settings > Integrations is registered too.
//
// Returns an array of per-topic results so the UI can show exactly what
// happened instead of just logging to the console.
async function registerWebhooks() {
  const { shopDomain, accessToken, webhookSecret } = await credentials()

  // Skip silently in demo mode (credentials not configured).
  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    console.log('[WEBHOOKS] Shopify credentials not configured — skipping webhook registration.')
    return []
  }
  if (!webhookSecret) {
    console.warn('[WEBHOOKS] SHOPIFY_WEBHOOK_SECRET not set — skipping webhook registration.')
    return []
  }

  // Fetch existing webhook subscriptions (we must load them via GraphQL
  // AppSubscription-like endpoint; the old REST webhooks.json is the easy path).
  let existing = []
  try {
    const res = await request('/webhooks.json')
    existing = res.webhooks || []
  } catch (err) {
    console.error('[WEBHOOKS] Could not list existing webhooks:', err.message)
    throw err
  }

  const existingByTopic = new Map()
  for (const wh of existing) {
    if (!existingByTopic.has(wh.topic)) existingByTopic.set(wh.topic, [])
    existingByTopic.get(wh.topic).push(wh)
  }

  const results = []
  for (const topic of REQUIRED_TOPICS) {
    const targetUrl = webhookCallbackUrl(topic)
    const already = (existingByTopic.get(topic) || []).find((wh) => wh.address === targetUrl)

    if (already) {
      results.push({ topic, status: 'already', address: targetUrl })
      continue
    }

    try {
      await request('/webhooks.json', {
        method: 'POST',
        body: {
          webhook: {
            topic,
            address: targetUrl,
            format: 'json',
          },
        },
      })
      results.push({ topic, status: 'created', address: targetUrl })
    } catch (err) {
      const message = err instanceof ShopifyApiError ? `${err.status} ${err.message}` : err.message
      results.push({ topic, status: 'failed', address: targetUrl, message })
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  const failed = results.filter((r) => r.status === 'failed').length
  console.log(`[WEBHOOKS] Registration complete. ${created} created, ${failed} failed, ${REQUIRED_TOPICS.length - created - failed} already present.`)
  return results
}

module.exports = { registerWebhooks, REQUIRED_TOPICS, webhookCallbackUrl }
