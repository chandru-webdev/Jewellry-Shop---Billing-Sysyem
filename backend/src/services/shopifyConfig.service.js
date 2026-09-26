// =============================================================
// Shopify integration config service
//
// Gives Settings > Integrations the ability to connect the app to a
// Shopify store without touching server environment variables:
//   1. Save store domain + Admin API access token (+ webhook secret)
//   2. Test the connection live against the store
//   3. Register the required webhooks on demand
//
// Secrets live in the Setting table under the reserved `shopifyConfig` key
// (never exposed by GET /api/settings) and DATABASE values override
// environment variables at runtime.
// =============================================================
const ApiError = require('../utils/ApiError')
const { request } = require('../integrations/shopify/client')
const {
  credentials,
  saveConfig,
  clearConfig,
} = require('../integrations/shopify/shopifyConfig')
const { registerWebhooks, webhookCallbackUrl, REQUIRED_TOPICS } = require('./webhookRegister.service')

const API_VERSION = '2025-01'

// Strip protocol / path / case from whatever the user typed so only a bare
// host stays (e.g. "https://opal-line.myshopify.com/admin" -> "opal-line.myshopify.com").
function normalizeDomain(value) {
  const s = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  return s
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

function maskToken(token) {
  if (!token) return ''
  if (token.length <= 8) return '••••••••'
  return `••••${String(token).slice(-4)}`
}

const shopifyConfigService = {
  // Public, no-secret view used by the Settings page.
  async getMasked() {
    const creds = await credentials()
    const connected = Boolean(creds.shopDomain && creds.accessToken && !creds.shopDomain.startsWith('PASTE'))
    return {
      connected,
      source: creds.source,
      shopDomain: creds.shopDomain,
      tokenMasked: maskToken(creds.accessToken),
      hasWebhookSecret: Boolean(creds.webhookSecret),
      apiVersion: API_VERSION,
      webhookUrl: webhookCallbackUrl('orders/create'),
    }
  },

  // Live probe: fetch the shop's public info to prove the credentials work.
  async testConnection() {
    const res = await request('/shop.json')
    const shop = res.shop || {}
    return {
      ok: true,
      name: shop.name || null,
      domain: shop.domain || shop.myshopify_domain || null,
      email: shop.email || null,
      plan: shop.plan_name || null,
      currency: shop.currency || null,
    }
  },

  // Validate + persist a config, then verify it live and (when a webhook
  // secret is supplied) ensure the required webhooks are registered.
  async save(data, userId) {
    const shopDomain = normalizeDomain(data.shopDomain)
    if (!shopDomain || !DOMAIN_RE.test(shopDomain)) {
      throw new ApiError(400, 'Enter a valid shop domain, e.g. your-store.myshopify.com')
    }

    const accessToken = String(data.accessToken || '').trim()
    if (!accessToken || accessToken.length < 10) {
      throw new ApiError(400, 'Enter the Shopify Admin API access token (it is normally 32+ characters)')
    }

    const webhookSecret = String(data.webhookSecret || '').trim()
    const saved = await saveConfig({ shopDomain, accessToken, webhookSecret })

    // Prove the credentials are real before calling them configured.
    let test
    try {
      test = await this.testConnection()
    } catch (err) {
      throw new ApiError(400, `Saved, but the connection test failed: ${err.message}`)
    }

    // Register webhooks so order/product webhooks actually arrive.
    let webhooks = []
    if (webhookSecret) {
      try {
        webhooks = await registerWebhooks()
      } catch (err) {
        throw new ApiError(400, `Saved and connected (${test.name}), but webhook registration failed: ${err.message}`)
      }
    }

    return {
      config: await this.getMasked(),
      test,
      webhooks: { registered: true, skipped: !webhookSecret, topicCount: REQUIRED_TOPICS.length, results: webhooks },
      missingWebhookSecret: !webhookSecret,
    }
  },

  // Remove the stored config so the app falls back to env credentials.
  async clear(userId) {
    await clearConfig()
    return this.getMasked()
  },

  // Re-run webhook registration against the currently active credentials.
  async ensureWebhooks() {
    const { webhookSecret } = await credentials()
    if (!webhookSecret) {
      return { registered: false, skipped: true, topicCount: REQUIRED_TOPICS.length, results: [] }
    }
    const results = await registerWebhooks()
    return { registered: true, skipped: false, topicCount: REQUIRED_TOPICS.length, results }
  },
}

module.exports = shopifyConfigService