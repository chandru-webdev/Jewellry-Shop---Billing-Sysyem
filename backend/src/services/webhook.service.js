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

  // Turn a Shopify order payload into ERP Order + stock changes.
  async processOrder(payload, webhookEventId) {
    const shopifyOrderId = payload.id
    const orderNumber = payload.name || `SHOPIFY-${shopifyOrderId}`
    const shopifyOrderIdBig = BigInt(shopifyOrderId)

    // Second line of idempotency: if this Shopify order was already
    // imported (e.g. retried after a crash), skip it.
    const already = await prisma.order.findUnique({ where: { shopifyOrderId: shopifyOrderIdBig } })
    if (already) return { orderId: already.id, alreadyProcessed: true }

    // ---- Customer (find by email first, then phone, else create) ----
    const email = payload.email || payload.customer?.email || null
    const phone = payload.phone || payload.customer?.phone || null
    const name =
      [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(' ') ||
      email?.split('@')[0] ||
      'Shopify Customer'

    let customerId = null
    if (email) {
      const byEmail = await prisma.customer.findUnique({ where: { email } })
      customerId = byEmail?.id || null
    }
    if (!customerId && phone) {
      const byPhone = await prisma.customer.findUnique({ where: { phone } })
      customerId = byPhone?.id || null
    }
    if (!customerId) {
      const created = await prisma.customer.create({
        data: {
          name,
          email: email || null,
          // Shopify orders sometimes have no phone; keep a unique placeholder.
          phone: phone || `SHOPIFY-${shopifyOrderId}`,
        },
      })
      customerId = created.id
    }

    // ---- Match line items to our products by SKU ----
    const lineItems = (payload.line_items || []).filter((l) => l.sku)
    const skus = lineItems.map((l) => l.sku)
    const products = await prisma.product.findMany({ where: { sku: { in: skus } } })
    const productBySku = new Map(products.map((p) => [p.sku, p]))

    // Only matched products become OrderItems / affect stock.
    // Unmatched SKUs (not in the ERP) are ignored but counted.
    const matched = lineItems.filter((l) => productBySku.has(l.sku))

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
            totalAmount: new Decimal(payload.total_price || 0).toDecimalPlaces(2),
            items: {
              create: matched.map((l) => ({
                productId: productBySku.get(l.sku).id,
                sku: l.sku,
                name: l.title || l.name || l.sku,
                quantity: Number(l.quantity || 1),
                unitPrice: new Decimal(l.price || 0).toDecimalPlaces(2),
                lineTotal: new Decimal(l.price || 0).mul(l.quantity || 1).toDecimalPlaces(2),
              })),
            },
          },
        })

        // Reduce ERP stock for the matched products
        for (const l of matched) {
          await reduceStockInTx(tx, productBySku.get(l.sku).id, Number(l.quantity || 1), orderNumber)
        }

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
