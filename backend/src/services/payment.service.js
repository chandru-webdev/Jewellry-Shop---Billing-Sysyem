const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

const paymentService = {
  // GET /api/payments — searchable history, newest first
  async list({ search, status, method, customerId, limit = 50 } = {}) {
    const where = {}
    if (status) where.status = status
    if (method) where.method = method
    if (customerId) where.customerId = Number(customerId)
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { reference: { contains: q } },
        { invoice: { invoiceNumber: { contains: q } } },
      ]
    }
    return prisma.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    })
  },

  // GET /api/payments/dues — every invoice still owed money, with the balance
  async getDues() {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['DRAFT', 'FINAL'] } },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        payments: { where: { status: 'PAID' }, select: { amount: true } },
        _count: { select: { items: true } },
      },
      orderBy: { date: 'asc' },
    })

    const dues = invoices
      .map((inv) => {
        const paid = inv.payments.reduce((sum, p) => sum.plus(p.amount), new Decimal(0))
        const balance = new Decimal(inv.grandTotal).minus(paid)
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customer: inv.customer,
          items: inv._count.items,
          grandTotal: new Decimal(inv.grandTotal),
          paid,
          balance: balance.greaterThan(0) ? balance : new Decimal(0),
        }
      })
      .filter((d) => d.balance.greaterThan(0))

    const totalDue = dues.reduce((sum, d) => sum.plus(d.balance), new Decimal(0))

    return { count: dues.length, totalDue, items: dues }
  },

  // GET /api/payments/summary — headline numbers for the page header
  async getSummary() {
    const [todayAgg, monthAgg, totalAgg, outstanding] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: startOfDay() } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true }, _count: true }),
      this.getDues(),
    ])

    return {
      collected: {
        today: todayAgg._sum.amount ?? new Decimal(0),
        month: monthAgg._sum.amount ?? new Decimal(0),
        total: totalAgg._sum.amount ?? new Decimal(0),
        count: totalAgg._count,
      },
      outstanding: {
        count: outstanding.count,
        totalDue: outstanding.totalDue,
      },
    }
  },

  // Re-sync a linked invoice's PAID status from its PAID payments after edits.
  async _syncInvoice(invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (!inv || inv.status === 'VOID') return
    const agg = await prisma.payment.aggregate({
      where: { invoiceId, status: 'PAID' },
      _sum: { amount: true },
    })
    const paid = agg._sum.amount ?? new Decimal(0)
    if (paid.greaterThanOrEqualTo(new Decimal(inv.grandTotal))) {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID' } })
      if (inv.orderId) {
        await prisma.order.updateMany({
          where: { id: inv.orderId, status: 'PENDING' },
          data: { status: 'PAID' },
        })
      }
    } else if (inv.status === 'PAID') {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'FINAL' } })
    }
  },

  // PUT /api/payments/:id — edit amount/method/status/reference, then keep the
  // linked invoice's PAID state in sync with the PAID payments total.
  async update(id, data, userId) {
    const existing = await this.getById(id)
    const patch = {}
    if (data.amount !== undefined) patch.amount = new Decimal(data.amount).toDecimalPlaces(2)
    if (data.pendingAmount !== undefined && data.pendingAmount !== null) patch.pendingAmount = new Decimal(data.pendingAmount).toDecimalPlaces(2)
    if (data.method !== undefined) patch.method = data.method
    if (data.status !== undefined) patch.status = data.status
    if (data.reference !== undefined) patch.reference = data.reference || null

    const updated = await prisma.payment.update({ where: { id: existing.id }, data: patch })

    if (existing.invoiceId) await this._syncInvoice(existing.invoiceId)
    else if (existing.orderId && updated.status === 'REFUNDED') {
      await prisma.order.updateMany({
        where: { id: existing.orderId, status: 'PAID' },
        data: { status: 'PENDING' },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_UPDATED',
        entity: 'Payment',
        entityId: updated.id,
        metadata: {
          amount: updated.amount.toString(),
          method: updated.method,
          status: updated.status,
        },
      },
    })

    return this.getById(updated.id)
  },

  async getById(id) {
    const payment = await prisma.payment.findUnique({
      where: { id: Number(id) },
      include: { customer: true, invoice: true, order: true },
    })
    if (!payment) throw new ApiError(404, 'Payment not found')
    return payment
  },

  // POST /api/payments — record a payment. Marks the invoice PAID once it's
  // fully covered, and settles the linked order too.
  async create(data, userId) {
    let invoice = null
    let customerId = data.customerId ? Number(data.customerId) : null

    if (data.invoiceId) {
      invoice = await prisma.invoice.findUnique({ where: { id: Number(data.invoiceId) } })
      if (!invoice) throw new ApiError(404, 'Invoice not found')
      if (invoice.status === 'VOID') throw new ApiError(400, 'Cannot collect payment on a voided invoice')
      customerId = invoice.customerId
    }

    if (!customerId) throw new ApiError(400, 'Customer is required')

    const amount = new Decimal(data.amount)
    if (amount.lessThanOrEqualTo(0)) throw new ApiError(400, 'Payment amount must be greater than zero')

    const payment = await prisma.$transaction(
      async (tx) => {
      const created = await tx.payment.create({
        data: {
          invoiceId: invoice?.id ?? null,
          orderId: data.orderId ? Number(data.orderId) : null,
          customerId,
          amount: amount.toDecimalPlaces(2),
          pendingAmount: data.pendingAmount !== undefined && data.pendingAmount !== null
            ? new Decimal(data.pendingAmount).toDecimalPlaces(2)
            : new Decimal(0),
          method: data.method,
          status: data.status || 'PAID',
          reference: data.reference || null,
        },
      })

      // Auto-settle: once PAID payments cover the whole invoice, close it.
      if (invoice && !['VOID', 'PAID'].includes(invoice.status)) {
        const agg = await tx.payment.aggregate({
          where: { invoiceId: invoice.id, status: 'PAID' },
          _sum: { amount: true },
        })
        const paid = agg._sum.amount ?? new Decimal(0)
        if (paid.greaterThanOrEqualTo(new Decimal(invoice.grandTotal))) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID', paymentMethod: created.method },
          })
          if (invoice.orderId) {
            await tx.order.updateMany({
              where: { id: invoice.orderId, status: 'PENDING' },
              data: { status: 'PAID' },
            })
          }
        }
      }

      return created
      },
      { timeout: 60000 }
    )

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_CREATED',
        entity: 'Payment',
        entityId: payment.id,
        metadata: { amount: payment.amount.toString(), method: payment.method },
      },
    })

    return this.getById(payment.id)
  },
}

module.exports = paymentService
