const env = require('../config/env')

// Global error handler — the LAST middleware in the chain.
// Any error thrown in a route ends up here.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (env.nodeEnv === 'development') {
    console.error(err)
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  const details = err.details

  res.status(statusCode).json({
    success: false,
    message,
    details,
  })
}

module.exports = errorHandler
