// =============================================================
// INTEGRATION TESTS — the MOST IMPORTANT scenario in the spec.
//
// Run:  npm run test:integration
// Requires: a running PostgreSQL database + seeded data.
//   ⚠️  Prefer a SEPARATE test database (e.g. opal_line_test),
//      not your live/production database.
//
// Scenario under test:
//   1. Silver rate is ₹120/g, product Ring (5g, making 180, stock 10)
//   2. Admin publishes ₹125/g
//      -> rate saved, price recalculated, history recorded
//   3. Shopify sends orders/create for qty 2
//      -> stock 10 -> 8, order saved
//   4. Same webhook arrives a second time
//      -> stock stays 8 (NOT 6) — idempotency works
//
// The test cleans up every row it creates and restores the rate.
//
// IMPORTANT: the webhook HMAC is signed with a FIXED test secret so
// the test is deterministic. This must be set BEFORE the app loads.
// =============================================================
process.env.SHOPIFY_WEBHOOK_SECRET = 'opal-line-test-secret'

const { test, before, after } = require('node:test')
const assert = require('node:assert')
const crypto = require('crypto')
const request = require('supertest')
const { Prisma } = require('@prisma/client')
const prisma = require('../../src/prisma/client')
const app = require('../../src/app')
const { calculatePrice, recalculateAllProducts } = require('../../src/services/pricing.service')

const Decimal = Prisma.Decimal

// Unique run id so re-runs never collide with leftover data.
const RUN = `TEST${Date.now()}`
const SKU = `TEST-RING-${RUN}`
const SHOPIFY_ORDER_ID = BigInt(Date.now())

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@opalline.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123'

let token = null
let categoryId = null
let productId = null
let originalRate = null
let newRateId = null
const NEW_RATE = 125

// Expected price for our test product (weight 5, making 180, GST 3%) at any rate.
function expectedPrice(rate) {
  const price = calculatePrice({ silverRate: rate, weight: 5, makingCharge: 180, gstPercent: 3 })
  return Number(price.sellingPrice).toFixed(2)
}

// Login once, reuse the token for every request.
async function login() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  assert.strictEqual(res.status, 200)
  token = res.body.data.token
}

async function getSilverRate() {
  const res = await request(app).get('/api/metal-rates').set('Authorization', `Bearer ${token}`)
  return res.body.data
}

// Build a signed Shopify orders/create payload (raw body + HMAC header).
// Real Shopify always sends x-shopify-order-id for order topics — the
// controller uses it as the idempotency key.
function shopifyOrderPayload(qty) {
  const body = JSON.stringify({
    id: Number(SHOPIFY_ORDER_ID),
    name: `#${Number(SHOPIFY_ORDER_ID)}`,
    email: `customer-${RUN}@test.com`,
    customer: {
      first_name: 'Test',
      last_name: 'Buyer',
      email: `customer-${RUN}@test.com`,
      phone: `919999${RUN.slice(-6)}`,
    },
    line_items: [{ sku: SKU, title: 'Test Silver Ring', quantity: qty, price: '1570.75' }],
    total_price: String(1570.75 * qty),
  })

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  const hmac = crypto.createHmac('sha256', secret || '').update(body).digest('base64')

  return { body, hmac }
}

async function postWebhook() {
  const { body, hmac } = shopifyOrderPayload(2)
  return request(app)
    .post('/api/webhooks/shopify/orders')
    .set('Content-Type', 'application/json')
    .set('x-shopify-topic', 'orders/create')
    .set('x-shopify-hmac-sha256', hmac)
    .set('x-shopify-shop-domain', 'test-shop.myshopify.com')
    .set('x-shopify-order-id', String(SHOPIFY_ORDER_ID))
    .send(body)
}

before(async () => {
  await login()

  // Remember the current rate so we can restore it at the end.
  const current = await getSilverRate()
  originalRate = current.rate

  // Reuse the first category (Rings) for the test product.
  const cats = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`)
  categoryId = cats.body.data[0].id

  // Create the product: weight 5g, making ₹180/g, stock 10.
  const created = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      sku: SKU,
      name: 'Test Silver Ring',
      categoryId,
      weight: 5,
      makingCharge: 180,
      gstPercent: 3,
      initialStock: 10,
    })
  assert.strictEqual(created.status, 201)
  productId = created.body.data.id
})

after(async () => {
  if (!productId) return

  // ---- Clean up everything the test created, in FK-safe order ----
  try {
    await prisma.webhookEvent.deleteMany({ where: { eventId: String(SHOPIFY_ORDER_ID) } })
    await prisma.inventoryTransaction.deleteMany({ where: { productId } })
    const orders = await prisma.order.findMany({ where: { shopifyOrderId: SHOPIFY_ORDER_ID } })
    for (const o of orders) {
      // A linked Payment row is created for the order; must be removed
      // before the order/customer (Payment FK is RESTRICT).
      await prisma.payment.deleteMany({ where: { orderId: o.id } })
      await prisma.orderItem.deleteMany({ where: { orderId: o.id } })
    }
    await prisma.order.deleteMany({ where: { shopifyOrderId: SHOPIFY_ORDER_ID } })
    await prisma.customer.deleteMany({ where: { phone: `919999${RUN.slice(-6)}` } })
    await prisma.inventory.deleteMany({ where: { productId } })
    await prisma.product.delete({ where: { id: productId } })

    // Restore the silver rate and recompute prices WITHOUT a new history row.
    if (originalRate) {
      await prisma.metalRate.update({ where: { metal: 'silver' }, data: { rate: originalRate } })
      await recalculateAllProducts(originalRate)
    }
    if (newRateId) {
      await prisma.metalRateHistory.deleteMany({ where: { id: newRateId } })
    }
  } catch (err) {
    console.error('Cleanup warning:', err.message)
  }

  await prisma.$disconnect()
})

test('pricing workflow: preview → publish → product price changes', async () => {
  // Product was created at the CURRENT rate -> its price must match the formula
  const beforeProduct = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
  assert.strictEqual(
    Number(beforeProduct.body.data.sellingPrice).toFixed(2),
    expectedPrice(originalRate)
  )

  // Preview shows what WOULD change (nothing saved yet)
  const preview = await request(app)
    .post('/api/metal-rates/preview')
    .set('Authorization', `Bearer ${token}`)
    .send({ rate: NEW_RATE })
  assert.strictEqual(preview.status, 200)
  assert.ok(preview.body.data.affectedCount >= 1)
  assert.strictEqual(preview.body.data.oldRate.toString(), originalRate.toString())
  assert.strictEqual(preview.body.data.newRate.toString(), String(NEW_RATE))

  // Publish ₹125 -> recalculates every active product
  const publish = await request(app)
    .put('/api/metal-rates/silver')
    .set('Authorization', `Bearer ${token}`)
    .send({ rate: NEW_RATE })
  assert.strictEqual(publish.status, 200)
  assert.strictEqual(publish.body.data.newRate.toString(), String(NEW_RATE))
  assert.ok(publish.body.data.updatedProducts >= 1)

  // Product price matches the formula at the new rate
  const afterProduct = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
  assert.strictEqual(
    Number(afterProduct.body.data.sellingPrice).toFixed(2),
    expectedPrice(NEW_RATE)
  )

  // History has a new row for this change
  const history = await request(app)
    .get('/api/metal-rates/history')
    .set('Authorization', `Bearer ${token}`)
  const row = history.body.data.find(
    (h) => h.newRate.toString() === String(NEW_RATE) && h.oldRate.toString() === originalRate.toString()
  )
  assert.ok(row, 'Expected a history row for this rate change')
  newRateId = row.id
})

test('webhook idempotency: stock 10 -> 8, second delivery keeps 8', async () => {
  // Confirm starting stock
  const before = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
  assert.strictEqual(before.body.data.inventory.quantity, 10)

  // First webhook: 200, order processed
  const first = await postWebhook()
  assert.strictEqual(first.status, 200)
  assert.strictEqual(first.body.data.duplicate, false)
  assert.ok(first.body.data.orderId)

  // Stock now 8
  const afterOne = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
  assert.strictEqual(afterOne.body.data.inventory.quantity, 8)

  // Second webhook (same order): must NOT reduce stock again
  const second = await postWebhook()
  assert.strictEqual(second.status, 200)
  assert.strictEqual(second.body.data.duplicate, true)

  const afterTwo = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
  assert.strictEqual(afterTwo.body.data.inventory.quantity, 8)
})

test('reports endpoints respond', async () => {
  for (const path of ['/api/reports/sales', '/api/reports/inventory', '/api/reports/products']) {
    const res = await request(app).get(path).set('Authorization', `Bearer ${token}`)
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
  }
})
