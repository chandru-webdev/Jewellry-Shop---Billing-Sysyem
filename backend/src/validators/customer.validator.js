const { z } = require('zod')

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(5, 'Valid phone number required'),
  email: z.email().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
})

const createCustomerSchema = customerSchema

const updateCustomerSchema = customerSchema.partial()

module.exports = { createCustomerSchema, updateCustomerSchema }
