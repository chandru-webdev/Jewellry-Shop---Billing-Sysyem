const { z } = require('zod')

const lineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
})

const createInvoiceSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    phone: z.string().min(5, 'Valid phone number required'),
    email: z.email().optional(),
    address: z.string().optional(),
  }),
  items: z.array(lineSchema).min(1, 'Add at least one product'),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']).optional(),
})

const updateInvoiceSchema = z.object({
  customerId: z.number().int().positive().nullable().optional(),
  status: z.enum(['DRAFT', 'FINAL', 'PAID', 'VOID']).optional(),
})

module.exports = { createInvoiceSchema, updateInvoiceSchema }
