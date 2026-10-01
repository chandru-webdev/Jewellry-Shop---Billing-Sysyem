const { test } = require('node:test')
const assert = require('node:assert')
const { createExpenseSchema, updateExpenseSchema } = require('../../src/validators/expense.validator')

const base = {
  category: 'Rent',
  description: 'Office rent',
  amount: 50000,
  date: '2026-09-01',
  paymentMethod: 'Bank Transfer',
  status: 'PAID',
}

test('createExpenseSchema accepts valid minimal input', () => {
  const result = createExpenseSchema.safeParse(base)
  assert.strictEqual(result.success, true)
})

test('createExpenseSchema rejects zero amount', () => {
  const result = createExpenseSchema.safeParse({ ...base, amount: 0 })
  assert.strictEqual(result.success, false)
})

test('createExpenseSchema rejects negative amount', () => {
  const result = createExpenseSchema.safeParse({ ...base, amount: -100 })
  assert.strictEqual(result.success, false)
})

test('createExpenseSchema rejects invalid status', () => {
  const result = createExpenseSchema.safeParse({ ...base, status: 'SHIPPED' })
  assert.strictEqual(result.success, false)
})

test('createExpenseSchema accepts advanced fields (vendor, supplier, bank, gst, recurring)', () => {
  const result = createExpenseSchema.safeParse({
    ...base,
    vendor: 'Acme Traders',
    supplierId: 7,
    bankAccountId: 2,
    gstApplicable: true,
    gstAmount: 1500,
    recurring: 'Monthly',
    dueDate: '2026-10-01',
    notes: 'Paid via NEFT',
    attachmentUrl: 'https://cdn.example.com/receipt.pdf',
  })
  assert.strictEqual(result.success, true)
})

test('createExpenseSchema accepts string numbers for amount (coercion)', () => {
  const result = createExpenseSchema.safeParse({ ...base, amount: '50000' })
  assert.strictEqual(result.success, true)
})

test('createExpenseSchema rejects invalid recurring value', () => {
  const result = createExpenseSchema.safeParse({ ...base, recurring: 'Yearly' })
  assert.strictEqual(result.success, false)
})

test('createExpenseSchema accepts optional fields as empty strings/nulls', () => {
  const result = createExpenseSchema.safeParse({ ...base, vendor: '', supplierId: null, recurring: 'None' })
  assert.strictEqual(result.success, true)
})