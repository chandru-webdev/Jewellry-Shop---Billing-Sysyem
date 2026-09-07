const { z } = require('zod')

const purchaseInvoiceItemSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  weight: z.coerce.number().optional(),
  lineTotal: z.coerce.number().optional(),
})

const createPurchaseInvoiceSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required'),
  purchaseOrderId: z.coerce.number().int().positive().optional(),
  items: z.array(purchaseInvoiceItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  subtotal: z.coerce.number().default(0).optional(),
  gstPercent: z.coerce.number().default(3).optional(),
})

const updatePurchaseInvoiceSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required').optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'VOID']).optional(),
  items: z.array(purchaseInvoiceItemSchema).min(1, 'At least one item is required').optional(),
  notes: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  subtotal: z.coerce.number().default(0).optional(),
  gstPercent: z.coerce.number().default(3).optional(),
})

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).default('OTHER'),
  reference: z.string().optional(),
})

module.exports = { createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema, recordPaymentSchema }