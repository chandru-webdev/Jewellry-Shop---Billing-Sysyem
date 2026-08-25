const { z } = require('zod')

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Please provide a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  roleId: z.coerce.number().int().positive('Role is required'),
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email('Please provide a valid email').optional(),
  roleId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  customPermissions: z.array(z.string()).nullable().optional(),
})

const setPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

module.exports = { createUserSchema, updateUserSchema, setPasswordSchema }
