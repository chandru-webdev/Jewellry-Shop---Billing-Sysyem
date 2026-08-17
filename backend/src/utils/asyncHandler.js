// Wraps an async route handler so errors are forwarded to Express
// automatically. Without this, you'd need try/catch in every route.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
