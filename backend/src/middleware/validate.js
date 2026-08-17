const { failure } = require('../utils/ApiResponse')

// Validates the request body against a zod schema BEFORE the controller runs.
// Usage: router.post('/', validate(loginSchema), controller)
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    return failure(res, 400, 'Validation failed', result.error.flatten().fieldErrors)
  }
  // Replace req.body with the validated, cleaned data
  req.body = result.data
  next()
}

module.exports = validate
