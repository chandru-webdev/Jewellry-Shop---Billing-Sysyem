// Every API endpoint returns JSON in the same shape:
//   success: true/false
//   message: human-readable message
//   data:    the payload (or null)
// This makes the frontend predictable and easy to handle.

const success = (res, statusCode = 200, data = null, message = 'OK') => {
  return res.status(statusCode).json({ success: true, message, data })
}

const failure = (res, statusCode = 400, message = 'Something went wrong', details) => {
  return res.status(statusCode).json({ success: false, message, details })
}

module.exports = { success, failure }
