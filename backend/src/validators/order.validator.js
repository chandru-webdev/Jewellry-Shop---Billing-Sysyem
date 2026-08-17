const { z } = require('zod')

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(5, 'Valid phone number required'),
  email: z.email().optional(),
  address: z.string().optional(),
})

const createOrderSchema = z.object({
  customer: customerSchema.optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive('Quantity must be at least 1'),
  })).min(1, 'Add at least one product'),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED']),
})

module.exports = { createOrderSchema, updateStatusSchema }
