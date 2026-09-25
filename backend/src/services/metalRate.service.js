const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { previewRecalculation, recalculateAllProducts } = require('./pricing.service')
const shopifyService = require('./shopify.service')
const notificationService = require('./notification.service')

const Decimal = Prisma.Decimal

const metalRateService = {
  // Current silver rate + last change info
  async getCurrent() {
    const rate = await prisma.metalRate.findUnique({
      where: { metal: 'silver' },
      include: { updatedBy: { select: { name: true } } },
    })
    if (!rate) throw new ApiError(500, 'Silver rate not initialised. Run: npm run db:seed')
    return rate
  },

  // Full audit trail: old rate -> new rate, who, when
  async getHistory(limit = 50) {
    return prisma.metalRateHistory.findMany({
      orderBy: { changedAt: 'desc' },
      take: Number(limit) || 50,
      include: { changedBy: { select: { id: true, name: true } } },
    })
  },

  // POST /api/metal-rates/preview — show what would change, don't save
  async preview(newRate) {
    const current = await this.getCurrent()
    const preview = await previewRecalculation(newRate)
    return {
      oldRate: current.rate,
      newRate,
      ...preview,
    }
  },

  // PUT /api/metal-rates/silver — the FULL publish workflow:
  //   1. Save history entry (oldRate -> newRate, who, when)
  //   2. Update the central silver rate
  //   3. Recalculate every active product's price
  //   4. Push the new prices to Shopify (Phase 18)
  //   5. Audit log
  async updateSilver(newRate, userId) {
    const current = await this.getCurrent()

    if (new Decimal(current.rate).equals(newRate)) {
      return { unchanged: true, rate: current.rate }
    }

    // Atomic compare-and-swap: only update if the rate hasn't changed since we
    // read it.  This prevents duplicate history entries when the user retries
    // after a Railway proxy timeout (the previous attempt already committed).
    const updated = await prisma.metalRate.updateMany({
      where: { metal: 'silver', rate: current.rate },
      data: { rate: newRate, updatedById: userId },
    })
    if (updated.count === 0) {
      const latest = await this.getCurrent()
      return { unchanged: true, rate: latest.rate, message: 'Rate was already updated by another request' }
    }

    // History + audit log (rate itself is already updated above). The steps
    // array records each real stage with its own timestamp for the live tracker.
    const rateAt = new Date()
    const stepRate = { key: 'rate', label: 'Rate updated in ERP', status: 'DONE', at: rateAt.toISOString(), detail: `₹${current.rate} → ₹${newRate}/gm`, error: null }
    const [historyRec] = await prisma.$transaction([
      prisma.metalRateHistory.create({
        data: { metal: 'silver', oldRate: current.rate, newRate, changedById: userId, steps: [stepRate] },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'SILVER_RATE_CHANGED',
          entity: 'MetalRate',
          metadata: { oldRate: current.rate.toString(), newRate: newRate.toString() },
        },
      }),
    ])

    // Recalculate products (fast, DB-only — keep in the request path).
    const repriceAt = new Date()
    const updatedProducts = await recalculateAllProducts(newRate, { userId, reason: 'silver_rate_change' })
    const stepReprice = { key: 'reprice', label: 'Products repriced', status: 'DONE', at: repriceAt.toISOString(), detail: `${updatedProducts} products repriced`, error: null }

    // Track pipeline status on the history row: prices repriced + waiting on
    // the (slow) Shopify push.  The background sync below updates it.
    await prisma.metalRateHistory.update({
      where: { id: historyRec.id },
      data: { productsUpdated: updatedProducts, shopifyStatus: 'PENDING', steps: [stepRate, stepReprice] },
    })

    // Shopify sync + notifications: fire-and-forget.  These are slow (Shopify
    // API latency × product count) and must not block the HTTP response —
    // Railway's proxy times out after ~60 s and the user retries, causing
    // duplicate work.  The finished sync status lands on the history row so the
    // Daily Report shows green/red per update.
    const changePct = ((Number(newRate) - Number(current.rate)) / Number(current.rate) * 100).toFixed(2)
    const notificationPromise = notificationService.createForAll({
      type: 'RATE_CHANGED',
      title: 'Silver Rate Updated',
      message: `Rate changed from ₹${current.rate}/gm to ₹${newRate}/gm (${changePct > 0 ? '+' : ''}${changePct}%). ${updatedProducts} products updated.`,
    }).catch(err => console.error('[METAL RATE] Notification failed:', err.message))

    const shopifyPromise = shopifyService.syncAllPrices(userId)
      .then(result => {
        const ok = result.failed === 0
        const message = ok
          ? `${result.ok} product prices synced to Shopify`
          : `${result.failed} failed. ${result.firstError || ''}`.trim()
        const stepShopify = {
          key: 'shopify', label: 'Pushed to Shopify',
          status: ok ? 'DONE' : 'FAILED',
          at: new Date().toISOString(),
          detail: message,
          error: ok ? null : (result.firstError || 'Shopify push failed'),
        }
        return prisma.metalRateHistory.update({
          where: { id: historyRec.id },
          data: {
            shopifyStatus: ok ? 'SUCCESS' : 'FAILED',
            shopifyMessage: message,
            syncPayload: { total: result.total ?? 0, ok: result.ok ?? 0, failed: result.failed ?? 0, firstError: result.firstError || null },
            steps: [stepRate, stepReprice, stepShopify],
          },
        })
      })
      .catch(err => {
        const message = `Shopify sync error: ${err.message}`
        const stepShopify = {
          key: 'shopify', label: 'Pushed to Shopify',
          status: 'FAILED',
          at: new Date().toISOString(),
          detail: message,
          error: err.message,
        }
        return prisma.metalRateHistory.update({
          where: { id: historyRec.id },
          data: {
            shopifyStatus: 'FAILED',
            shopifyMessage: message,
            syncPayload: { total: 0, ok: 0, failed: -1, firstError: err.message },
            steps: [stepRate, stepReprice, stepShopify],
          },
        })
      })
      .catch(() => {})

    // Don't await — let these run in the background.
    Promise.allSettled([notificationPromise, shopifyPromise]).catch(() => {})

    return {
      unchanged: false,
      oldRate: current.rate,
      newRate,
      updatedProducts,
      historyId: historyRec.id,
    }
  },

  // Day-wise pipeline report (frontend groups by its own local date).
  // Each history row carries productsUpdated + shopifyStatus/message, so the
  // page can show "rate ok -> prices ok -> shopify ok" and turn red on failure.
  async getReport({ days = 30, limit = 200 } = {}) {
    const since = new Date(Date.now() - (Number(days) * 86400000))
    const take = Math.min(Math.max(Number(limit) || 200, 1), 500)
    const items = await prisma.metalRateHistory.findMany({
      where: { changedAt: { gte: since } },
      orderBy: { changedAt: 'desc' },
      take,
      include: { changedBy: { select: { id: true, name: true } } },
    })
    const summary = {
      total: items.length,
      complete: items.filter(i => i.shopifyStatus === 'SUCCESS').length,
      pending: items.filter(i => i.shopifyStatus === 'PENDING' || i.shopifyStatus === null).length,
      failed: items.filter(i => i.shopifyStatus === 'FAILED').length,
    }
    return { days: Number(days), items, summary }
  },

  // Retry the Shopify price push for one rate change and persist the outcome.
  async retryShopify(historyId, userId) {
    const history = await prisma.metalRateHistory.findUnique({ where: { id: historyId } })
    if (!history) throw new ApiError(404, 'Rate history entry not found')

    const result = await shopifyService.syncAllPrices(userId)
    const ok = result.failed === 0
    const shopifyMessage = ok
      ? `${result.ok} product prices synced to Shopify`
      : `${result.failed} failed. ${result.firstError || ''}`.trim()

    // Rebuild base steps from what the row recorded (rate + reprice), then
    // stamp the fresh sync result onto the shopify step.
    const stored = Array.isArray(history.steps) ? history.steps.filter(s => s.key !== 'shopify') : []
    const base = stored.length >= 2 ? stored : [
      { key: 'rate', label: 'Rate updated in ERP', status: 'DONE', at: history.changedAt.toISOString(), detail: `₹${history.oldRate} → ₹${history.newRate}/gm`, error: null },
      { key: 'reprice', label: 'Products repriced', status: 'DONE', at: history.changedAt.toISOString(), detail: `${history.productsUpdated ?? 'N/A'} products repriced`, error: null },
    ]
    const stepShopify = {
      key: 'shopify', label: 'Pushed to Shopify',
      status: ok ? 'DONE' : 'FAILED',
      at: new Date().toISOString(),
      detail: shopifyMessage,
      error: ok ? null : (result.firstError || 'Shopify push failed'),
    }
    const steps = [...base, stepShopify]

    const updated = await prisma.metalRateHistory.update({
      where: { id: historyId },
      data: {
        shopifyStatus: ok ? 'SUCCESS' : 'FAILED',
        shopifyMessage,
        syncPayload: { total: result.total ?? 0, ok: result.ok ?? 0, failed: result.failed ?? 0, firstError: result.firstError || null },
        steps,
      },
    })
    return { id: updated.id, ok: result.ok, failed: result.failed, shopifyStatus: updated.shopifyStatus, shopifyMessage: updated.shopifyMessage, steps: updated.steps }
  },
}

module.exports = metalRateService
