const { z } = require('zod')

// Must stay in sync with ACCOUNT_TYPES in frontend/src/pages/BankAccounts.jsx.
// The UI offers all four; restricting this to Current/Savings made saving an
// account whose type was Cash Credit or Overdraft fail with a 400.
const BANK_ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft']

const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  bank: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifsc: z.string().length(11, 'IFSC must be exactly 11 characters'),
  type: z.enum(BANK_ACCOUNT_TYPES).optional(),
  openingBalance: z.coerce.number().optional(),
  openingDate: z.string().optional(),
})

const updateBankAccountSchema = createBankAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
  balance: z.coerce.number().optional(),
})

module.exports = { createBankAccountSchema, updateBankAccountSchema, BANK_ACCOUNT_TYPES }