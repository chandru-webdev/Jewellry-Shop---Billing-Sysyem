const { z } = require('zod')

const stockInSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  note: z.string().optional(),
})

const stockOutSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  note: z.string().optional(),
})

module.exports = { stockInSchema, stockOutSchema }
