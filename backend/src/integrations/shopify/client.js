// =============================================================
// Shopify Admin REST API — small HTTP client
// Every call to Shopify goes through here, so there is ONE place
// that knows the store domain, the access token and the API version.
//
// Shopify rate-limits REST calls (~2 per second for custom apps),
// so bulk loops use a short delay — see services/shopify.service.js
// =============================================================
const env = require('../../config/env')

const API_VERSION = '2025-01'

class ShopifyApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ShopifyApiError'
    this.status = status
  }
}

// GET or POST (or any method) to /admin/api/2025-01/<path>
async function request(path, { method = 'GET', body } = {}) {
  const { shopDomain, accessToken } = env.shopify

  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    throw new ShopifyApiError(503, 'Shopify credentials are not configured. Add them to backend/.env')
  }

  const url = `https://${shopDomain}/admin/api/${API_VERSION}${path}`

  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    // Network-level failure (Shopify unreachable, DNS, etc.)
    throw new ShopifyApiError(0, `Could not reach Shopify: ${err.message}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ShopifyApiError(res.status, `Shopify API ${res.status}: ${text.slice(0, 300)}`)
  }

  // 204 = success with no body; everything else is JSON
  if (res.status === 204) return null
  return res.json()
}

// Small helper for the 600ms delay between Shopify calls in bulk syncs
function throttle() {
  return new Promise((resolve) => setTimeout(resolve, 600))
}

module.exports = { request, throttle, ShopifyApiError }
