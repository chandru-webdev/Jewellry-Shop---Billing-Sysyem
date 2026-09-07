const { z } = require('zod')

const purchaseOrderItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  weight: z.coerce.number().optional(),
  rate: z.coerce.number().optional(),
  lineTotal: z.coerce.number().optional(),
})

const createPurchaseOrderSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required'),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']).optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  orderDate: z.union([z.string(), z.date()]).optional(),
  expectedDelivery: z.union([z.string(), z.date()]).optional(),
  gstPercent: z.coerce.number().nonnegative().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().nonnegative().optional(),
})

const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']),
})

const updatePurchaseOrderSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required').optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']).optional(),
  notes: z.string().optional(),
  orderDate: z.union([z.string(), z.date()]).optional(),
  expectedDelivery: z.union([z.string(), z.date()]).optional(),
  gstPercent: z.coerce.number().nonnegative().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().nonnegative().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required').optional(),
})

module.exports = { createPurchaseOrderSchema, updatePurchaseOrderStatusSchema, updatePurchaseOrderSchema }
