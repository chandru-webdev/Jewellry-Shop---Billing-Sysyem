const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

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
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { reference: { contains: search } },
        { invoice: { invoiceNumber: { contains: search } } },
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
