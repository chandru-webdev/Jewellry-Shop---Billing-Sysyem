const { z } = require('zod')

// Login: email must look like an email, password at least 6 characters.
const loginSchema = z.object({
  email: z.email('Please provide a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Change password: current password + new password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

// Forgot password: just an email
const forgotPasswordSchema = z.object({
  email: z.email('Please provide a valid email'),
})

// Reset password: email + code + new password
const resetPasswordSchema = z.object({
  email: z.email('Please provide a valid email'),
  code: z.string().min(4, 'Reset code is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

module.exports = { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema }
