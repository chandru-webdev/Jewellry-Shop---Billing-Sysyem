// =============================================================
// Shopify webhook processing service (Phase 17)
//
// Shopify -> Node.js -> PostgreSQL -> ERP
//
// orders/create is the first fully wired topic:
//   1. Save the raw event (WebhookEvent) — used for idempotency
//   2. Find/create the customer
//   3. Create the Order + OrderItem rows (source SHOPIFY)
//   4. Reduce ERP stock for each matched SKU (ledger entry)
//   5. Push the new stock back to Shopify (Phase 19)
//
// IDEMPOTENCY: WebhookEvent.eventId is UNIQUE. If the same event
// arrives twice, the second request is skipped — stock is NEVER
// reduced twice (10 -> 8, never 6).
// =============================================================
const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const shopifyService = require('./shopify.service')

const Decimal = Prisma.Decimal

// Map Shopify payment fields to our PaymentMethod enum.
function mapShopifyPaymentMethod(payload) {
  const gw = (payload.payment_gateway_names || [])
    .map((g) => String(g || '').toLowerCase())
    .filter(Boolean)
  const joined = gw.join(' ')
  if (/upi/.test(joined)) return 'UPI'
  if (/card|payment_pages|paypal|stripe|razorpay|phonepe/.test(joined)) return 'CARD'
  if (/bank|n?.?eft|wire|transfer/.test(joined)) return 'BANK_TRANSFER'
  if (/cash/.test(joined)) return 'CASH'
  if (/manual|local/.test(joined)) return 'ONLINE'
  if (gw.length > 0) return 'ONLINE'
  return null
}

// Reduce stock inside the caller's transaction. Clamps to what is
// actually available so a slightly stale stock level never breaks
// the order save. Matches the ledger style used by POS sales.
async function reduceStockInTx(tx, productId, quantity, reference) {
  const inv = await tx.inventory.findUnique({ where: { productId } })
  if (!inv) return { reduced: 0 }

  const taken = Math.max(0, Math.min(quantity, inv.quantity))
  await tx.inventory.update({
    where: { id: inv.id },
    data: { quantity: inv.quantity - taken },
  })
  await tx.inventoryTransaction.create({
    data: {
      productId,
      type: 'SALE',
      quantity: -taken,
      reference,
      note: 'Shopify order',
      createdById: null, // no ERP user — came from Shopify
    },
  })
  return { reduced: taken }
}

// Shared phone reserved for the single "Guest" customer that catches orders
// whose customer details Shopify redacted (guest checkout, no email, no phone).
const {
  GUEST_PHONE,
  normalizePhone,
  normalizeEmail,
  pickCustomerMatch,
  isUniqueConstraintError,
} = require('../utils/customerMatch')

// Load the customers that could match this order. The Shopify id is indexed so
// it is looked up directly; email/phone need normalising before comparison and
// the same number can be stored in many formats ("+91 98765 43210", "098765..."),
// which a SQL substring match cannot catch, so those fall back to the full
// customer list and are compared in JS. Shopify webhook volume is low, and the
// customer table is small, so this stays cheap.
async function findCustomerCandidates({ shopifyCustomerId, email, phone }) {
  if (shopifyCustomerId != null) {
    const byId = await prisma.customer.findUnique({ where: { shopifyCustomerId: BigInt(shopifyCustomerId) } })
    if (byId) return [byId]
  }
  if (!email && !phone) return []
  return prisma.customer.findMany({
    select: { id: true, name: true, email: true, phone: true, address: true, shopifyCustomerId: true },
  })
}

// Find the order's customer, creating one only when nothing matches. Handles
// guest checkouts (no email, no phone) by attaching to a shared Guest customer,
// and recovers from a concurrent-create unique-constraint clash by re-reading
// the record the other request just wrote.
async function findOrCreateCustomer({ payload, name, address, shopifyOrderId }) {
  const shopifyCustomerId = payload.customer?.id ?? null
  const email = normalizeEmail(payload.email || payload.customer?.email)
  const phone = normalizePhone(payload.phone || payload.customer?.phone)

  const candidates = await findCustomerCandidates({ shopifyCustomerId, email, phone })
  const match = pickCustomerMatch(candidates, { shopifyCustomerId, email, phone })

  if (match) {
    // Backfill what we now know (link to the Shopify id, fill a missing address)
    // so the next order from this customer matches by id. Never fatal.
    const patch = {}
    if (shopifyCustomerId != null && match.shopifyCustomerId == null) patch.shopifyCustomerId = BigInt(shopifyCustomerId)
    if (address && !match.address) patch.address = address
    if (Object.keys(patch).length) {
      await prisma.customer.update({ where: { id: match.id }, data: patch }).catch(() => {})
    }
    return { customerId: match.id, created: false, guest: false }
  }

  const isGuest = !email && !phone

  // All guest checkouts share one "Guest" customer so they import without
  // inventing a fake per-order phone.
  if (isGuest) {
    const guest = await prisma.customer.findUnique({ where: { phone: GUEST_PHONE } })
    if (guest) return { customerId: guest.id, created: false, guest: true }
  }

  const data = isGuest
    ? { name: 'Guest', email: null, address, phone: GUEST_PHONE }
    : {
        name,
        email: email || null,
        address,
        // Shopify orders sometimes have no phone; keep a unique placeholder so
        // the NOT NULL unique column is satisfied.
        phone: phone || `SHOPIFY-${shopifyCustomerId || shopifyOrderId}`,
        shopifyCustomerId: shopifyCustomerId != null ? BigInt(shopifyCustomerId) : null,
      }

  try {
    const created = await prisma.customer.create({ data })
    return { customerId: created.id, created: true, guest: isGuest }
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err
    // A concurrent webhook wrote the row first — reuse it instead of failing.
    const again = await findCustomerCandidates({ shopifyCustomerId, email, phone })
    const existing =
      pickCustomerMatch(again, { shopifyCustomerId, email, phone }) ||
      (isGuest ? await prisma.customer.findUnique({ where: { phone: GUEST_PHONE } }) : null)
    if (existing) return { customerId: existing.id, created: false, guest: isGuest, matchedAfterConflict: true }
    throw err
  }
}

const webhookService = {
  // Entry point called by the route for every webhook topic.
  async handle({ topic, eventId, payload, shopDomain }) {
    // ---- IDEMPOTENCY ----
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: String(eventId) },
    })
    if (existing) return { duplicate: true, eventId }

    const event = await prisma.webhookEvent.create({
      data: { topic, shopDomain, eventId: String(eventId), payload },
    })

    try {
      let result = {}

      if (topic === 'orders/create' || topic === 'orders/paid') {
        result = await this.processOrder(payload, event.id)
      } else if (topic === 'products/create' || topic === 'products/update') {
        result = await this.processProduct(payload, event.id)
      } else if (topic === 'orders/cancelled' || topic === 'orders/fulfilled') {
        result = { topic, note: 'Order lifecycle event acknowledged' }
      } else if (topic === 'refunds/create') {
        result = { topic, note: 'Refund event acknowledged' }
      } else {
        result = { topic, note: 'Topic not yet wired — event stored' }
      }

      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() },
      })

      return { duplicate: false, ...result }
    } catch (err) {
      // Leave processed=false so Shopify retries later if it was
      // a transient error; a permanent error will stay here forever.
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { error: err.message },
      })
      throw err
    }
  },

  // products/create + products/update: import the product into the ERP.
  // New products arrive as PENDING imports for human review; linked products
  // get their images synced back from the store. Reuses importShopifyProduct
  // so the pull button and the webhooks behave identically.
  async processProduct(payload, webhookEventId) {
    const shopifyProductId = payload.id

    const result = await shopifyService.importShopifyProduct(payload)

    await prisma.auditLog.create({
      data: {
        action: result.action === 'created' ? 'SHOPIFY_PRODUCT_IMPORTED' : 'SHOPIFY_PRODUCT_UPDATED',
        entity: 'Product',
        entityId: result.id || null,
        metadata: { shopifyProductId, webhookEventId, action: result.action },
      },
    })

    await prisma.shopifySyncLog.create({
      data: {
        type: 'PRODUCT',
        status: result.action === 'skipped' ? 'SKIPPED' : 'SUCCESS',
        itemsProcessed: 1,
        message: `Shopify product ${shopifyProductId}: ${result.action}`,
        payload: { shopifyProductId, action: result.action },
      },
    })

    return { shopifyProductId, action: result.action, id: result.id }
  },

  // Turn a Shopify order payload into ERP Order + stock changes.
  async processOrder(payload, webhookEventId) {
    const shopifyOrderId = payload.id
    const orderNumber = payload.name || `SHOPIFY-${shopifyOrderId}`
    const shopifyOrderIdBig = BigInt(shopifyOrderId)

    // Map Shopify payment gateway names to our PaymentMethod enum.
    const paymentMethod = mapShopifyPaymentMethod(payload)

    // Second line of idempotency: if this Shopify order was already
    // imported (e.g. retried after a crash), skip it.
    const already = await prisma.order.findUnique({ where: { shopifyOrderId: shopifyOrderIdBig } })
    if (already) return { orderId: already.id, alreadyProcessed: true }

    // ---- Customer (match by Shopify id, then email, then phone, else create) ----
    const rawEmail = payload.email || payload.customer?.email || null
    const name =
      [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(' ') ||
      rawEmail?.split('@')[0] ||
      'Shopify Customer'

    // Pick the best shipping address available on the order payload.
    const shipAddr = payload.shipping_address || payload.billing_address || null
    const address = shipAddr
      ? [
          shipAddr.address1,
          shipAddr.address2,
          shipAddr.city,
          [shipAddr.province, shipAddr.zip].filter(Boolean).join(' '),
          shipAddr.country,
        ]
          .filter(Boolean)
          .join(', ')
      : null

    const { customerId, guest } = await findOrCreateCustomer({
      payload,
      name,
      address,
      shopifyOrderId,
    })
    if (guest) {
      console.warn(
        `Shopify order ${orderNumber}: no usable customer email/phone — attached to the Guest customer.`
      )
    }

    // ---- Match line items to our products by SKU ----
    const lineItems = (payload.line_items || []).filter((l) => l.sku)
    const skus = lineItems.map((l) => l.sku)
    const products = await prisma.product.findMany({ where: { sku: { in: skus } } })
    const productBySku = new Map(products.map((p) => [p.sku, p]))
    const silverRate = (await prisma.metalRate.findUnique({ where: { metal: 'silver' } }))?.rate ?? 0

    // Only matched products become OrderItems / affect stock.
    // Unmatched SKUs (not in the ERP) are ignored but counted.
    const matched = lineItems.filter((l) => productBySku.has(l.sku))

    // Order header must equal the sum of the stored line items. Shopify's
    // total_price also includes shipping, taxes and unmatched-SKU lines, so it
    // cannot be used as-is or the header would never match the items.
    const itemsData = matched.map((l) => {
      const prod = productBySku.get(l.sku)
      const quantity = Number(l.quantity || 1)
      const lineTotal = new Decimal(l.price || 0).mul(quantity)
      return {
        productId: prod.id,
        sku: l.sku,
        name: l.title || l.name || l.sku,
        quantity,
        unitPrice: new Decimal(l.price || 0).toDecimalPlaces(2),
        lineTotal: lineTotal.toDecimalPlaces(2),
        weight: Number(prod.weight ?? 0),
        makingCharge: Number(prod.makingCharge ?? 0),
        silverRate,
        gstAmount: new Decimal(prod.gstAmount ?? 0).mul(quantity).toDecimalPlaces(2),
      }
    })
    const totalAmount = itemsData.reduce((sum, it) => sum.plus(it.lineTotal), new Decimal(0))

    // ---- Create order + items + reduce stock atomically ----
    const order = await prisma.$transaction(
      async (tx) => {
        const ord = await tx.order.create({
          data: {
            orderNumber,
            source: 'SHOPIFY',
            shopifyOrderId: shopifyOrderIdBig,
            customerId,
            status: 'PAID',
            paymentMethod,
            totalAmount: totalAmount.toDecimalPlaces(2),
            items: { create: itemsData },
          },
        })

        // Reduce ERP stock for the matched products
        for (const l of matched) {
          await reduceStockInTx(tx, productBySku.get(l.sku).id, Number(l.quantity || 1), orderNumber)
        }

        // Record a linked payment so the dashboard Payment Status card
        // reflects Shopify sales too. Shopify orders are treated as paid.
        await tx.payment.create({
          data: {
            orderId: ord.id,
            customerId,
            amount: totalAmount.toDecimalPlaces(2),
            method: paymentMethod || 'ONLINE',
            status: 'PAID',
          },
        })

        return ord
      },
      { timeout: 60000 }
    )

    // ---- Audit + sync log ----
    await prisma.auditLog.create({
      data: {
        action: 'SHOPIFY_ORDER_IMPORTED',
        entity: 'Order',
        entityId: order.id,
        metadata: { shopifyOrderId, webhookEventId },
      },
    })

    await prisma.shopifySyncLog.create({
      data: {
        type: 'ORDER',
        status: 'SUCCESS',
        itemsProcessed: matched.length,
        message: `Order ${orderNumber} imported`,
        payload: { shopifyOrderId },
      },
    })

    // ---- Push the reduced stock back to Shopify so both sides match ----
    if (matched.length > 0) {
      const fresh = await prisma.product.findMany({
        where: { id: { in: matched.map((l) => productBySku.get(l.sku).id) } },
        include: { inventory: true },
      })
      for (const product of fresh) {
        if (product.shopifyInventoryItemId) {
          await shopifyService
            .setInventoryLevel(Number(product.shopifyInventoryItemId), product.inventory?.quantity ?? 0)
            .catch(() => {}) // a stock push failure must not fail the webhook
        }
      }
    }

    return { orderId: order.id, orderNumber, alreadyProcessed: false }
  },
}

module.exports = webhookService

// Exposed for unit tests (pure helpers, no DB access).
module.exports.normalizePhone = normalizePhone
module.exports.normalizeEmail = normalizeEmail
module.exports.pickCustomerMatch = pickCustomerMatch
module.exports.GUEST_PHONE = GUEST_PHONE
module.exports._findOrCreateCustomer = findOrCreateCustomer
