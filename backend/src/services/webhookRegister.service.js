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
const env = require('../config/env')
const { request, ShopifyApiError } = require('../integrations/shopify/client')

// Topics we must never miss (order sync depends on these).
const REQUIRED_TOPICS = ['orders/create', 'orders/paid', 'orders/cancelled', 'orders/fulfilled', 'refunds/create']

// The public URL Shopify calls. In production this must be the Railway
// domain; in development it can be a tunnelled URL (ngrok etc).
function webhookCallbackUrl(topic) {
  const base = process.env.PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000'
  const path = topic.startsWith('refunds') ? '/api/webhooks/shopify/refunds' : '/api/webhooks/shopify/orders'
  return `${base}${path}`
}

// Register all required webhooks. Idempotent — never duplicates.
// Safe to call on every startup.
async function registerWebhooks() {
  const { shopDomain, accessToken, webhookSecret } = env.shopify

  // Skip silently in demo mode (credentials not configured).
  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    console.log('[WEBHOOKS] Shopify credentials not configured — skipping webhook registration.')
    return
  }
  if (!webhookSecret) {
    console.warn('[WEBHOOKS] SHOPIFY_WEBHOOK_SECRET not set — skipping webhook registration.')
    return
  }

  // Fetch existing webhook subscriptions (we must load them via GraphQL
  // AppSubscription-like endpoint; the old REST webhooks.json is the easy path).
  let existing = []
  try {
    const res = await request('/webhooks.json')
    existing = res.webhooks || []
  } catch (err) {
    console.error('[WEBHOOKS] Could not list existing webhooks:', err.message)
    return
  }

  const existingByTopic = new Map()
  for (const wh of existing) {
    if (!existingByTopic.has(wh.topic)) existingByTopic.set(wh.topic, [])
    existingByTopic.get(wh.topic).push(wh)
  }

  for (const topic of REQUIRED_TOPICS) {
    const targetUrl = webhookCallbackUrl(topic)
    const already = (existingByTopic.get(topic) || []).find((wh) => wh.address === targetUrl)

    if (already) continue

    console.log(`[WEBHOOKS] Registering ${topic} -> ${targetUrl}`)
    await request('/webhooks.json', {
      method: 'POST',
      body: {
        webhook: {
          topic,
          address: targetUrl,
          format: 'json',
        },
      },
    }).catch((err) => {
      console.error(`[WEBHOOKS] Failed to register ${topic}:`, err.message)
    })
  }

  console.log(`[WEBHOOKS] Registration complete. ${REQUIRED_TOPICS.length} topics ensured.`)
}

module.exports = { registerWebhooks }
