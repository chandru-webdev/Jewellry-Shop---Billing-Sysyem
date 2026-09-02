const env = require('../config/env')
const ApiError = require('../utils/ApiError')
const { ShopifyApiError } = require('../integrations/shopify/client')

// Global error handler — the LAST middleware in the chain.
// Any error thrown in a route ends up here.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log full error details server-side
  console.error(err)

  // Operational errors (ApiError) — safe to send message to client
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    })
  }

  // Shopify API errors carry a real status (0 = unreachable). Surface the
  // message so the UI can show the actual reason instead of a generic 500.
  if (err instanceof ShopifyApiError) {
    const status = err.status && err.status >= 100 && err.status <= 599 ? err.status : 502
    return res.status(status).json({ success: false, message: err.message })
  }

  // Unexpected errors — never leak internals to client
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}

module.exports = errorHandler
