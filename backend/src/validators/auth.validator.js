const { z } = require('zod')

// Login: email must look like an email, password at least 6 characters.
const loginSchema = z.object({
  email: z.email('Please provide a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

module.exports = { loginSchema }
