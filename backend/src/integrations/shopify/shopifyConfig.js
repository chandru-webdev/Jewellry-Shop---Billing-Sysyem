// =============================================================
// Shopiy credentials — single source of truth for store access.
//
// Credentials can come from two places:
//   1. A row in the Setting table (key `shopifyConfig`) — editable from
//      Settings > Integrations in the app (preferred).
//   2. Server environment variables (SHOPIFY_SHOP_DOMAIN and
//      SHOPIFY_ACCESS_TOKEN) as a fallback for existing deployments.
//
// DB values win over env so the app can manage its own store. The
// `shopifyConfig` key is deliberately NOT part of the settings whitelist,
// so GET /api/settings never leaks the access token to logged-in users.
// =============================================================
const prisma = require('../../prisma/client')
const env = require('../../config/env')

const CONFIG_KEY = 'shopifyConfig'

// Read + parse the stored config row (null if never saved).
async function getStoredConfig() {
  const row = await prisma.setting.findUnique({ where: { key: CONFIG_KEY } })
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

// Resolve the credentials to use right now: DB first, env fallback.
// Always returns a plain { source, shopDomain, accessToken, webhookSecret }.
async function credentials() {
  const stored = await getStoredConfig()
  if (stored?.shopDomain && stored?.accessToken) {
    return {
      source: 'db',
      shopDomain: stored.shopDomain,
      accessToken: stored.accessToken,
      webhookSecret: stored.webhookSecret || '',
    }
  }
  const domain = env.shopify?.shopDomain
  const token = env.shopify?.accessToken
  return {
    source: 'env',
    shopDomain: domain || null,
    accessToken: token || null,
    webhookSecret: env.shopify?.webhookSecret || '',
  }
}

// Persist a validated config (upsert). Returns the stored object.
async function saveConfig(data) {
  const payload = {
    shopDomain: data.shopDomain,
    accessToken: data.accessToken,
    webhookSecret: data.webhookSecret || '',
    updatedAt: new Date().toISOString(),
  }
  await prisma.setting.upsert({
    where: { key: CONFIG_KEY },
    update: { value: JSON.stringify(payload) },
    create: { key: CONFIG_KEY, value: JSON.stringify(payload) },
  })
  return payload
}

// Remove the stored config so we fall back to environment credentials.
async function clearConfig() {
  await prisma.setting.deleteMany({ where: { key: CONFIG_KEY } })
}

module.exports = { credentials, getStoredConfig, saveConfig, clearConfig, CONFIG_KEY }