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

const createExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required').max(60),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be a positive number'),
  date: z.string().optional(),
  paymentMethod: z.string().max(40).optional(),
  reference: z.string().max(100).nullable().optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
})

const updateExpenseSchema = createExpenseSchema.partial()

module.exports = { EXPENSE_CATEGORIES, EXPENSE_STATUSES, createExpenseSchema, updateExpenseSchema }