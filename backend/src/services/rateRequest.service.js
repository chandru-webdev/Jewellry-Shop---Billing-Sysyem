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
      // Apply the rate change - same logic as metalRateService.updateSilver
      const current = await prisma.metalRate.findUnique({
        where: { metal: 'silver' },
      })
      if (!current) throw new ApiError(500, 'Silver rate not initialised')

      if (!new Decimal(current.rate).equals(request.newRate)) {
        // Transaction: history + rate update + audit log
        await prisma.$transaction([
          prisma.metalRateHistory.create({
            data: { metal: 'silver', oldRate: current.rate, newRate: request.newRate, changedById: userId },
          }),
          prisma.metalRate.update({
            where: { metal: 'silver' },
            data: { rate: request.newRate, updatedById: userId },
          }),
          prisma.auditLog.create({
            data: {
              userId,
              action: 'SILVER_RATE_CHANGED',
              entity: 'MetalRate',
              metadata: { oldRate: current.rate.toString(), newRate: request.newRate.toString(), approvedFromRequestId: requestId },
            },
          }),
        ])

        // Recalculate all active products
        const { recalculateAllProducts } = require('./pricing.service')
        const updatedProducts = await recalculateAllProducts(request.newRate)

        // Push to Shopify
        const shopifyService = require('./shopify.service')
        let _shopifySync = null
        try {
          _shopifySync = await shopifyService.syncAllPrices(userId)
        } catch (err) {
          _shopifySync = { ok: 0, failed: -1, error: err.message }
        }

        // Notify all users of the rate change
        const changePct = ((Number(request.newRate) - Number(current.rate)) / Number(current.rate) * 100).toFixed(2)
        await notificationService.createForAll({
          type: 'RATE_CHANGED',
          title: 'Silver Rate Updated',
          message: `Rate changed from ₹${current.rate}/gm to ₹${request.newRate}/gm (${changePct > 0 ? '+' : ''}${changePct}%). ${updatedProducts} products updated.`,
        })

        // Notify the requester
        await notificationService.create({
          userId: request.requestedById,
          type: 'SILVER_RATE_APPROVED',
          title: 'Rate Request Approved',
          message: `Your rate change request from ₹${current.rate}/gm to ₹${request.newRate}/gm was approved. ${updatedProducts} products updated.`,
        })
      }

      // Update request status
      const updated = await prisma.metalRateRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedById: userId, reviewedAt: new Date() },
        include: { reviewedBy: { select: { id: true, name: true, email: true } } },
      })
      return { ...updated, shopifySync, updatedProducts }
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