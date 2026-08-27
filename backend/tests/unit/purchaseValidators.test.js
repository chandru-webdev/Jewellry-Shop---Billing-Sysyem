const { test } = require('node:test')
const assert = require('node:assert')
const { createPurchaseOrderSchema, updatePurchaseOrderStatusSchema } = require('../../src/validators/purchaseOrder.validator')
const { createPurchaseReturnSchema, updatePurchaseReturnStatusSchema } = require('../../src/validators/purchaseReturn.validator')

// ─── Purchase Order validators ───

test('createPurchaseOrderSchema accepts valid input', () => {
  const result = createPurchaseOrderSchema.safeParse({
    supplierId: 1,
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: 10, unitPrice: 1500 }],
    notes: 'Urgent order',
  })
  assert.strictEqual(result.success, true)
})

test('createPurchaseOrderSchema rejects empty items', () => {
  const result = createPurchaseOrderSchema.safeParse({ supplierId: 1, items: [] })
  assert.strictEqual(result.success, false)
})

test('createPurchaseOrderSchema rejects missing supplierId', () => {
  const result = createPurchaseOrderSchema.safeParse({
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: 10, unitPrice: 1500 }],
  })
  assert.strictEqual(result.success, false)
})

test('createPurchaseOrderSchema rejects item with empty SKU', () => {
  const result = createPurchaseOrderSchema.safeParse({
    supplierId: 1,
    items: [{ sku: '', name: 'Silver Chain', quantity: 10, unitPrice: 1500 }],
  })
  assert.strictEqual(result.success, false)
})

test('createPurchaseOrderSchema rejects negative quantity', () => {
  const result = createPurchaseOrderSchema.safeParse({
    supplierId: 1,
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: -5, unitPrice: 1500 }],
  })
  assert.strictEqual(result.success, false)
})

test('createPurchaseOrderSchema rejects zero unitPrice', () => {
  const result = createPurchaseOrderSchema.safeParse({
    supplierId: 1,
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: 10, unitPrice: 0 }],
  })
  assert.strictEqual(result.success, false)
})

test('createPurchaseOrderSchema accepts optional productId', () => {
  const result = createPurchaseOrderSchema.safeParse({
    supplierId: 1,
    items: [{ productId: 5, sku: 'SC-001', name: 'Silver Chain', quantity: 10, unitPrice: 1500 }],
  })
  assert.strictEqual(result.success, true)
})

test('updatePurchaseOrderStatusSchema accepts valid statuses', () => {
  for (const status of ['PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']) {
    const result = updatePurchaseOrderStatusSchema.safeParse({ status })
    assert.strictEqual(result.success, true, `Status ${status} should be valid`)
  }
})

test('updatePurchaseOrderStatusSchema rejects invalid status', () => {
  const result = updatePurchaseOrderStatusSchema.safeParse({ status: 'SHIPPED' })
  assert.strictEqual(result.success, false)
})

// ─── Purchase Return validators ───

test('createPurchaseReturnSchema accepts valid input', () => {
  const result = createPurchaseReturnSchema.safeParse({
    supplierId: 1,
    purchaseOrderId: 10,
    reason: 'Damaged goods',
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: 5, unitPrice: 1500 }],
  })
  assert.strictEqual(result.success, true)
})

test('createPurchaseReturnSchema accepts input without purchaseOrderId', () => {
  const result = createPurchaseReturnSchema.safeParse({
    supplierId: 1,
    reason: 'Defective',
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: 2, unitPrice: 800 }],
  })
  assert.strictEqual(result.success, true)
})

test('createPurchaseReturnSchema rejects empty items', () => {
  const result = createPurchaseReturnSchema.safeParse({ supplierId: 1, items: [] })
  assert.strictEqual(result.success, false)
})

test('createPurchaseReturnSchema rejects negative unitPrice', () => {
  const result = createPurchaseReturnSchema.safeParse({
    supplierId: 1,
    items: [{ sku: 'SC-001', name: 'Silver Chain', quantity: 1, unitPrice: -100 }],
  })
  assert.strictEqual(result.success, false)
})

test('updatePurchaseReturnStatusSchema accepts valid statuses', () => {
  for (const status of ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED']) {
    const result = updatePurchaseReturnStatusSchema.safeParse({ status })
    assert.strictEqual(result.success, true, `Status ${status} should be valid`)
  }
})

test('updatePurchaseReturnStatusSchema rejects invalid status', () => {
  const result = updatePurchaseReturnStatusSchema.safeParse({ status: 'VOID' })
  assert.strictEqual(result.success, false)
})

test('purchase order line total is correctly calculated (Decimal)', () => {
  const { Prisma } = require('@prisma/client')
  const qty = new Prisma.Decimal(12)
  const price = new Prisma.Decimal(1525.75)
  const lineTotal = qty.mul(price)
  assert.strictEqual(Number(lineTotal).toFixed(2), '18309.00')
})

test('purchase return line total with fractional quantities', () => {
  const { Prisma } = require('@prisma/client')
  const qty = new Prisma.Decimal(2.5)
  const price = new Prisma.Decimal(3200)
  const lineTotal = qty.mul(price)
  assert.strictEqual(Number(lineTotal).toFixed(2), '8000.00')
})
