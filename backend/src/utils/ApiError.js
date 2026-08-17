// A standard error that carries an HTTP status code.
// Throw this anywhere: new ApiError(400, 'Invalid input')
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true
  }
}

module.exports = ApiError
