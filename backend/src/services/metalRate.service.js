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

    await prisma.$transaction([
      prisma.metalRateHistory.create({
        data: { metal: 'silver', oldRate: current.rate, newRate, changedById: userId },
      }),
      prisma.metalRate.update({
        where: { metal: 'silver' },
        data: { rate: newRate, updatedById: userId },
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

    const updatedProducts = await recalculateAllProducts(newRate, { userId, reason: 'silver_rate_change' })

    // Phase 18: publish the new prices to the Shopify store.
    // The rate change itself must never fail because Shopify is busy,
    // so any Shopify error is reported back instead of thrown.
    let shopifySync = null
    try {
      shopifySync = await shopifyService.syncAllPrices(userId)
    } catch (err) {
      shopifySync = { ok: 0, failed: -1, error: err.message }
    }

    // Create notification for rate change
    const changePct = ((Number(newRate) - Number(current.rate)) / Number(current.rate) * 100).toFixed(2)
    await notificationService.createForAll({
      type: 'RATE_CHANGED',
      title: 'Silver Rate Updated',
      message: `Rate changed from ₹${current.rate}/gm to ₹${newRate}/gm (${changePct > 0 ? '+' : ''}${changePct}%). ${updatedProducts} products updated.`,
    })

    return {
      unchanged: false,
      oldRate: current.rate,
      newRate,
      updatedProducts,
      shopifySync,
    }
  },
}

module.exports = metalRateService
