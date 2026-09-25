const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { previewRecalculation } = require('./pricing.service')
const notificationService = require('./notification.service')

const Decimal = Prisma.Decimal

const rateRequestService = {
  // Manager submits a rate change request
  async createRequest({ newRate, userId }) {
    const current = await prisma.metalRate.findUnique({
      where: { metal: 'silver' },
    })
    if (!current) throw new ApiError(500, 'Silver rate not initialised')

    if (new Decimal(current.rate).equals(newRate)) {
      throw new ApiError(400, 'New rate is the same as current rate')
    }

    // Generate preview data for the request
    const preview = await previewRecalculation(newRate)

    const request = await prisma.metalRateRequest.create({
      data: {
        oldRate: current.rate,
        newRate,
        requestedById: userId,
        previewJson: preview,
        status: 'PENDING',
      },
      include: { requestedBy: { select: { id: true, name: true, email: true } } },
    })

    // Notify all SUPER_ADMIN users
    const admins = await prisma.user.findMany({
      where: { role: { name: 'SUPER_ADMIN' }, isActive: true },
      select: { id: true },
    })
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'SILVER_RATE_REQUEST',
          title: 'Silver Rate Change Request',
          message: `${request.requestedBy.name} requested rate change from ₹${current.rate}/gm to ₹${newRate}/gm. Awaiting approval.`,
        })),
      })
    }

    return request
  },

  // Admin lists all pending/approved/rejected requests
  async listRequests(status) {
    const where = status ? { status } : {}
    return prisma.metalRateRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    })
  },

  // Admin reviews a request (approve/reject)
  async reviewRequest({ requestId, status, userId }) {
    const request = await prisma.metalRateRequest.findUnique({
      where: { id: requestId },
      include: { requestedBy: { select: { id: true, name: true, email: true } } },
    })
    if (!request) throw new ApiError(404, 'Request not found')
    if (request.status !== 'PENDING') {
      throw new ApiError(400, `Request is already ${request.status.toLowerCase()}`)
    }

    if (status === 'APPROVED') {
      const { recalculateAllProducts } = require('./pricing.service')
      const shopifyService = require('./shopify.service')

      // Atomic: check status + apply rate inside a single transaction so two
      // concurrent approvals can't both create history entries.
      const result = await prisma.$transaction(async (tx) => {
        const locked = await tx.metalRateRequest.findUnique({ where: { id: requestId } })
        if (locked.status !== 'PENDING') {
          return { alreadyHandled: true, status: locked.status }
        }

        const current = await tx.metalRate.findUnique({ where: { metal: 'silver' } })
        if (!current) throw new ApiError(500, 'Silver rate not initialised')

        let updatedProducts = 0
        let historyCreated = false
        let historyId = null
        let stepRate = null

        if (!new Decimal(current.rate).equals(request.newRate)) {
          const rateAt = new Date()
          stepRate = { key: 'rate', label: 'Rate updated in ERP', status: 'DONE', at: rateAt.toISOString(), detail: `₹${current.rate} → ₹${request.newRate}/gm`, error: null }
          const rec = await tx.metalRateHistory.create({
            data: { metal: 'silver', oldRate: current.rate, newRate: request.newRate, changedById: userId, steps: [stepRate] },
          })
          historyId = rec.id
          await tx.metalRate.update({
            where: { metal: 'silver' },
            data: { rate: request.newRate, updatedById: userId },
          })
          await tx.auditLog.create({
            data: {
              userId,
              action: 'SILVER_RATE_CHANGED',
              entity: 'MetalRate',
              metadata: { oldRate: current.rate.toString(), newRate: request.newRate.toString(), approvedFromRequestId: requestId },
            },
          })
          historyCreated = true
        }

        await tx.metalRateRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED', reviewedById: userId, reviewedAt: new Date() },
        })

        return { historyCreated, historyId, currentRate: current.rate, stepRate }
      })

      if (result.alreadyHandled) {
        throw new ApiError(400, `Request is already ${result.status.toLowerCase()}`)
      }

      // Heavy/slow work outside the transaction — fire-and-forget so Railway
      // proxy doesn't time out and the user doesn't retry.
      let updatedProducts = 0
      let historyId = result.historyId
      let stepReprice = null
      if (result.historyCreated) {
        const repriceAt = new Date()
        updatedProducts = await recalculateAllProducts(request.newRate)
        stepReprice = { key: 'reprice', label: 'Products repriced', status: 'DONE', at: repriceAt.toISOString(), detail: `${updatedProducts} products repriced`, error: null }
        // Track pipeline status on the history row (mirrors metalRate.updateSilver).
        if (historyId) {
          await prisma.metalRateHistory.update({
            where: { id: historyId },
            data: { productsUpdated: updatedProducts, shopifyStatus: 'PENDING', steps: [result.stepRate, stepReprice].filter(Boolean) },
          })
        }
      }

      const shopifyPromise = (result.historyCreated
        ? shopifyService.syncAllPrices(userId)
            .then(syncResult => {
              if (historyId) {
                const ok = syncResult.failed === 0
                const message = ok
                  ? `${syncResult.ok} product prices synced to Shopify`
                  : `${syncResult.failed} failed. ${syncResult.firstError || ''}`.trim()
                const stepShopify = {
                  key: 'shopify', label: 'Pushed to Shopify',
                  status: ok ? 'DONE' : 'FAILED',
                  at: new Date().toISOString(),
                  detail: message,
                  error: ok ? null : (syncResult.firstError || 'Shopify push failed'),
                }
                return prisma.metalRateHistory.update({
                  where: { id: historyId },
                  data: {
                    shopifyStatus: ok ? 'SUCCESS' : 'FAILED',
                    shopifyMessage: message,
                    syncPayload: { total: syncResult.total ?? 0, ok: syncResult.ok ?? 0, failed: syncResult.failed ?? 0, firstError: syncResult.firstError || null },
                    steps: [result.stepRate, stepReprice, stepShopify].filter(Boolean),
                  },
                })
              }
              return null
            })
            .catch(err => {
              console.error('[RATE REQUEST] Shopify sync failed:', err.message)
              if (historyId) {
                const message = `Shopify sync error: ${err.message}`
                const stepShopify = {
                  key: 'shopify', label: 'Pushed to Shopify',
                  status: 'FAILED',
                  at: new Date().toISOString(),
                  detail: message,
                  error: err.message,
                }
                return prisma.metalRateHistory.update({
                  where: { id: historyId },
                  data: {
                    shopifyStatus: 'FAILED',
                    shopifyMessage: message,
                    syncPayload: { total: 0, ok: 0, failed: -1, firstError: err.message },
                    steps: [result.stepRate, stepReprice, stepShopify].filter(Boolean),
                  },
                }).catch(() => null)
              }
              return null
            })
        : Promise.resolve(null)
      )

      const notificationsPromise = (result.historyCreated
        ? (async () => {
            const changePct = ((Number(request.newRate) - Number(result.currentRate)) / Number(result.currentRate) * 100).toFixed(2)
            await notificationService.createForAll({
              type: 'RATE_CHANGED',
              title: 'Silver Rate Updated',
              message: `Rate changed from ₹${result.currentRate}/gm to ₹${request.newRate}/gm (${changePct > 0 ? '+' : ''}${changePct}%). ${updatedProducts} products updated.`,
            })
            await notificationService.create({
              userId: request.requestedById,
              type: 'SILVER_RATE_APPROVED',
              title: 'Rate Request Approved',
              message: `Your rate change request from ₹${result.currentRate}/gm to ₹${request.newRate}/gm was approved. ${updatedProducts} products updated.`,
            })
          })()
        : (async () => {
            await notificationService.create({
              userId: request.requestedById,
              type: 'SILVER_RATE_APPROVED',
              title: 'Rate Request Approved',
              message: `Your rate change request was approved. Rate was already current.`,
            })
          })()
      )

      Promise.allSettled([shopifyPromise, notificationsPromise]).catch(() => {})

      const updated = await prisma.metalRateRequest.findUnique({
        where: { id: requestId },
        include: { reviewedBy: { select: { id: true, name: true, email: true } } },
      })
      return { ...updated, updatedProducts }
    } else {
      // REJECTED
      await prisma.metalRateRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', reviewedById: userId, reviewedAt: new Date() },
      })

      // Notify the requester
      await notificationService.create({
        userId: request.requestedById,
        type: 'SILVER_RATE_REJECTED',
        title: 'Rate Request Rejected',
        message: `Your rate change request from ₹${request.oldRate}/gm to ₹${request.newRate}/gm was rejected.`,
      })

      return { status: 'REJECTED', message: 'Request rejected' }
    }
  },

  // Get a single request by ID
  async getRequestById(requestId) {
    return prisma.metalRateRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    })
  },
}

module.exports = rateRequestService