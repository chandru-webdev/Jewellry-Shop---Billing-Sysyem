const { z } = require('zod')

const purchaseOrderItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
})

const createPurchaseOrderSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required'),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
})

const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']),
})

module.exports = { createPurchaseOrderSchema, updatePurchaseOrderStatusSchema }
