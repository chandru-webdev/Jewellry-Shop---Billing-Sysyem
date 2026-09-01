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

const stockTransferSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  from: z.string().min(1, 'Source location is required'),
  to: z.string().min(1, 'Destination location is required'),
  note: z.string().optional(),
})

module.exports = { stockInSchema, stockOutSchema, stockTransferSchema }
