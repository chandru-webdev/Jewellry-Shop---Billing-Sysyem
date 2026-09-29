// =============================================================
// Shopify Admin REST API — small HTTP client
// Every call to Shopify goes through here, so there is ONE place
// that knows the store domain, the access token and the API version.
//
// Shopify rate-limits REST calls (~2 per second sustained for custom
// apps, with a small burst allowance). Bulk syncs run several products
// in PARALLEL, so all calls wait on a shared token-bucket limiter
// instead of pacing one product at a time.
// =============================================================
const { credentials } = require('./shopifyConfig')

const API_VERSION = '2025-01'

class ShopifyApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ShopifyApiError'
    this.status = status
  }
}

// ---- Shared rate limiter ----------------------------------------------
// Refills 1 token every ~600ms (≈1.66 requests/sec sustained) with a small
// burst allowance so a few parallel calls can start together. Every REST and
// GraphQL call waits for a token, so concurrency never exceeds Shopify's cap.
const TOKEN_REFILL_MS = 600
const TOKEN_BURST = 10
let tokens = TOKEN_BURST
let lastRefill = Date.now()

function acquireToken() {
  return new Promise((resolve) => {
    const step = () => {
      const now = Date.now()
      if (tokens < TOKEN_BURST) {
        tokens = Math.min(TOKEN_BURST, tokens + ((now - lastRefill) / TOKEN_REFILL_MS))
      }
      lastRefill = now
      if (tokens >= 1) {
        tokens -= 1
        resolve()
        return
      }
      const wait = Math.max(1, TOKEN_REFILL_MS - (now - lastRefill))
      setTimeout(step, wait)
    }
    step()
  })
}

// Every call gets a ceiling so a silently-stuck Shopify request can never
// hang a worker slot (or the whole sync) forever.
const REQUEST_TIMEOUT_MS = 30000

// GET or POST (or any method) to /admin/api/2025-01/<path>
async function request(path, { method = 'GET', body } = {}) {
  const { shopDomain, accessToken } = await credentials()

  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    throw new ShopifyApiError(503, 'Shopify credentials are not configured. Add them in Settings > Integrations > Shopify, or to backend/.env')
  }

  await acquireToken()

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    // Network-level failure (Shopify unreachable, DNS, timeout, etc.)
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

// POST to the Admin GraphQL endpoint (/admin/api/2025-01/graphql.json).
// Returns { data, errors } — `errors` here is the transport-level GraphQL
// errors array; field-level failures come back as userErrors in `data`.
async function graphql(query, variables = {}) {
  const { shopDomain, accessToken } = await credentials()

  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    throw new ShopifyApiError(503, 'Shopify credentials are not configured. Add them in Settings > Integrations > Shopify, or to backend/.env')
  }

  await acquireToken()

  const url = `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    throw new ShopifyApiError(0, `Could not reach Shopify GraphQL: ${err.message}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ShopifyApiError(res.status, `Shopify GraphQL ${res.status}: ${text.slice(0, 300)}`)
  }

  return res.json()
}

// Small helper for the 600ms delay between Shopify calls in bulk syncs
function throttle() {
  return new Promise((resolve) => setTimeout(resolve, 600))
}

// Errors Shopify returns when a write collides or the platform is briefly
// overwhelmed. Transient 5xx/429/409/timeouts should be retried; the sync code
// always sends the FULL product/variant state, so a retried write converges.
function isTransientShopifyError(err) {
  return (
    err instanceof ShopifyApiError &&
    (err.status === 0 ||
      err.status >= 500 ||
      err.status === 429 ||
      (err.status === 409 && /currently being modified|already been modified/i.test(err.message)))
  )
}

// Call `fn` and retry on transient Shopify errors with exponential backoff.
// Non-transient errors (4xx validation, auth, 404 etc.) bubble up immediately.
async function withRetry(fn, { attempts = 3, baseDelayMs = 800 } = {}) {
  let lastErr
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isTransientShopifyError(err) || attempt === attempts - 1) throw err
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt))
    }
  }
  throw lastErr
}

module.exports = { request, graphql, throttle, ShopifyApiError, withRetry }
