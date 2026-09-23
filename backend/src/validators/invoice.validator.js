const { z } = require('zod')

const lineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
})

// Editing may send back per-unit prices so original sale prices are preserved
// instead of being recalculated at the product's current rates.
const editLineSchema = lineSchema.extend({
  baseAmount: z.number().finite().nonnegative().optional(),
  gstAmount: z.number().finite().nonnegative().optional(),
  sellingPrice: z.number().finite().nonnegative().optional(),
})

const createInvoiceSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    phone: z.string().min(5, 'Valid phone number required'),
    email: z.email().optional(),
    address: z.string().optional(),
    gstin: z.string().optional(),
  }),
  items: z.array(lineSchema).min(1, 'Add at least one product'),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']).optional(),
})

const updateInvoiceSchema = z.object({
  customerId: z.number().int().positive().nullable().optional(),
  customer: z
    .object({
      name: z.string().min(1).optional(),
      phone: z.string().min(5).optional(),
      email: z.email().optional(),
      address: z.string().optional(),
      gstin: z.string().optional(),
    })
    .optional(),
  items: z.array(editLineSchema).optional(),
  discount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']).optional(),
  status: z.enum(['DRAFT', 'FINAL', 'PAID', 'VOID']).optional(),
})

module.exports = { createInvoiceSchema, updateInvoiceSchema }
