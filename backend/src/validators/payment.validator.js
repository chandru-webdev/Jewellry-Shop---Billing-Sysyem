const { z } = require('zod')

const createPaymentSchema = z.object({
  invoiceId: z.coerce.number().int().positive().optional(),
  orderId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  pendingAmount: z.coerce.number().optional(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  reference: z.string().optional(),
})

const updatePaymentSchema = createPaymentSchema.partial()

module.exports = { createPaymentSchema, updatePaymentSchema }
