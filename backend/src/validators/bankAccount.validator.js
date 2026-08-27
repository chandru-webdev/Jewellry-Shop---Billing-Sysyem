const { z } = require('zod')

const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  bank: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifsc: z.string().length(11, 'IFSC must be exactly 11 characters'),
  type: z.enum(['Current', 'Savings']).optional(),
  openingBalance: z.coerce.number().optional(),
  openingDate: z.string().optional(),
})

const updateBankAccountSchema = createBankAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
})

module.exports = { createBankAccountSchema, updateBankAccountSchema }
