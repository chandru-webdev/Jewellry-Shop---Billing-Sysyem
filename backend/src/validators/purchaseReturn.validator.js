const { z } = require('zod')

const purchaseReturnItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
})

const createPurchaseReturnSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required'),
  purchaseOrderId: z.coerce.number().int().positive().optional(),
  reason: z.string().optional(),
  items: z.array(purchaseReturnItemSchema).min(1, 'At least one item is required'),
})

const updatePurchaseReturnStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED']),
})

module.exports = { createPurchaseReturnSchema, updatePurchaseReturnStatusSchema }
