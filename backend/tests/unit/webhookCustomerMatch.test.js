const test = require('node:test')
const assert = require('node:assert/strict')
const prisma = require('../../src/prisma/client')
const webhookService = require('../../src/services/webhook.service')

const { normalizePhone, normalizeEmail, pickCustomerMatch, GUEST_PHONE } = webhookService

test('normalizePhone strips formatting and the +91/91/0 prefix', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210')
  assert.equal(normalizePhone('91-98765-43210'), '9876543210')
  assert.equal(normalizePhone('09876543210'), '9876543210')
  assert.equal(normalizePhone('9876543210'), '9876543210')
  assert.equal(normalizePhone('(987) 654-3210'), '9876543210')
})

test('normalizePhone returns null when there are no digits', () => {
  assert.equal(normalizePhone(null), null)
  assert.equal(normalizePhone(undefined), null)
  assert.equal(normalizePhone(''), null)
  assert.equal(normalizePhone('GUEST'), null)
})

test('normalizeEmail trims and lowercases, blank becomes null', () => {
  assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com')
  assert.equal(normalizeEmail(''), null)
  assert.equal(normalizeEmail(null), null)
})

test('pickCustomerMatch matches a phone saved in a different format', () => {
  const customers = [
    { id: 1, shopifyCustomerId: null, email: null, phone: '+91 98765 43210' },
    { id: 2, shopifyCustomerId: null, email: null, phone: '7012345678' },
  ]
  const match = pickCustomerMatch(customers, { shopifyCustomerId: null, email: null, phone: normalizePhone('9876543210') })
  assert.equal(match.id, 1)
})

test('pickCustomerMatch matches email case-insensitively', () => {
  const customers = [
    { id: 7, shopifyCustomerId: null, email: 'Priya@Example.com', phone: '9000000000' },
  ]
  const match = pickCustomerMatch(customers, { shopifyCustomerId: null, email: normalizeEmail('PRIYA@example.COM'), phone: null })
  assert.equal(match.id, 7)
})

test('pickCustomerMatch prefers the Shopify customer id over email/phone', () => {
  const customers = [
    { id: 1, shopifyCustomerId: 55, email: 'a@x.com', phone: '9876543210' },
    { id: 2, shopifyCustomerId: 99, email: 'a@x.com', phone: '9876543210' },
  ]
  const match = pickCustomerMatch(customers, { shopifyCustomerId: 99, email: 'a@x.com', phone: '9876543210' })
  assert.equal(match.id, 2)
})

test('pickCustomerMatch returns null for a guest order with no email or phone', () => {
  const customers = [{ id: 1, shopifyCustomerId: 55, email: 'a@x.com', phone: '9876543210' }]
  const match = pickCustomerMatch(customers, { shopifyCustomerId: null, email: null, phone: null })
  assert.equal(match, null)
})

test('GUEST_PHONE is a stable non-numeric sentinel', () => {
  assert.equal(GUEST_PHONE, 'GUEST')
  assert.equal(normalizePhone(GUEST_PHONE), null)
})

test('a repeat webhook for the same order short-circuits as alreadyProcessed', async () => {
  let createCalled = false
  prisma.order.findUnique = async () => ({ id: 42 })
  prisma.customer.create = async () => {
    createCalled = true
    return { id: 1 }
  }
  try {
    const result = await webhookService.processOrder({ id: 123456, name: '#1001' }, 'evt-1')
    assert.deepEqual(result, { orderId: 42, alreadyProcessed: true })
    assert.equal(createCalled, false, 'must not create a customer for an already-imported order')
  } finally {
    delete prisma.order.findUnique
    delete prisma.customer.create
  }
})
