const { z } = require('zod')

const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Utilities',
  'Marketing',
  'Maintenance',
  'Office Supplies',
  'Insurance',
  'Other',
]

const EXPENSE_STATUSES = ['PAID', 'PENDING', 'CANCELLED']
const EXPENSE_RECURRING = ['None', 'Weekly', 'Monthly']

const optionalInt = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().nonnegative().nullable())
const optionalNumber = z.preprocess((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)), z.number().nonnegative())

const createExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required').max(60),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  pendingAmount: z.coerce.number().optional(),
  date: z.string().optional(),
  paymentMethod: z.string().max(40).optional(),
  reference: z.string().max(100).nullable().optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  // Advanced fields
  vendor: z.string().max(200).nullable().optional(),
  supplierId: optionalInt.optional(),
  attachmentUrl: z.string().max(1000).nullable().optional(),
  gstApplicable: z.boolean().optional(),
  gstAmount: optionalNumber.optional(),
  bankAccountId: optionalInt.optional(),
  recurring: z.enum(EXPENSE_RECURRING).optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const updateExpenseSchema = createExpenseSchema.partial()

module.exports = { EXPENSE_CATEGORIES, EXPENSE_STATUSES, EXPENSE_RECURRING, createExpenseSchema, updateExpenseSchema }