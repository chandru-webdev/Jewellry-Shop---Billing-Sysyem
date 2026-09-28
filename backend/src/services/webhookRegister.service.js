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

// The base URL Shopify is told to call. In production PUBLIC_API_URL must be
// the deployed Railway domain; with no value we fall back to localhost (dev).
function publicCallbackBase() {
  return String(process.env.PUBLIC_API_URL || '').replace(/\/$/, '') || `http://localhost:${process.env.PORT || 5000}`
}

// Guard against pointing a live store at a machine that Shopify can never
// reach (localhost / private ranges). Webhook registration and the health
// "missing webhook" verdict only make sense against a public base.
function isPublicBase(baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '')
  let host
  try {
    const u = new URL(base)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    host = u.hostname
  } catch {
    return false
  }
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(host)) return false
  if (/^(10\.|192\.168\.|169\.254\.)/.test(host)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
  return true
}

// The URL Shopify calls for a given topic.
function webhookCallbackUrl(topic) {
  const base = publicCallbackBase()
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

  // Never point a live store at a local/private machine — that would register
  // webhooks Shopify can never deliver to. Requires a public PUBLIC_API_URL.
  const base = publicCallbackBase()
  if (!isPublicBase(base)) {
    console.warn(`[WEBHOOKS] Skipping registration: callback base "${base}" is not a public URL. Set PUBLIC_API_URL to your deployed domain.`)
    return REQUIRED_TOPICS.map((topic) => ({
      topic,
      status: 'skipped',
      address: webhookCallbackUrl(topic),
      message: 'PUBLIC_API_URL is not a public URL — refusing to point the store at it',
    }))
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

module.exports = { registerWebhooks, REQUIRED_TOPICS, webhookCallbackUrl, publicCallbackBase, isPublicBase }
