const { z } = require('zod')

const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.number().int().positive('Select a category'),
  weight: z.number().positive('Weight must be greater than 0'),
  makingCharge: z.number().nonnegative('Making charge cannot be negative'),
  gstPercent: z.number().min(0).max(30).optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  initialStock: z.number().int().nonnegative().optional(),
  updateStock: z.boolean().optional(),
})

// For updates every field is optional
const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
})

module.exports = { createProductSchema, updateProductSchema }
