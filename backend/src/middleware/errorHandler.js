const env = require('../config/env')
const ApiError = require('../utils/ApiError')

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

  // Unexpected errors — never leak internals to client
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}

module.exports = errorHandler
