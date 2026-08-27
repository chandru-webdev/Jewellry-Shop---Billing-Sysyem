const { z } = require('zod')

const createPriceHistorySchema = z.object({
  productId: z.coerce.number().int().positive('Product ID is required'),
  priceType: z.enum(['SELLING', 'BUYING', 'MAKING', 'METAL']).optional(),
  oldPrice: z.coerce.number({ message: 'Old price must be a number' }),
  newPrice: z.coerce.number({ message: 'New price must be a number' }),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
})

module.exports = { createPriceHistorySchema }
