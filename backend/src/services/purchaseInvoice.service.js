const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

const purchaseInvoiceService = {
  async list({ search, status, supplierId, purchaseOrderId, limit = 50, page = 1 } = {}) {
    const where = {}
    if (status) where.status = status
    if (supplierId) where.supplierId = Number(supplierId)
    if (purchaseOrderId) where.purchaseOrderId = Number(purchaseOrderId)
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const take = Math.min(Number(limit) || 50, 200)
    const skip = (Number(page) - 1) * take

    const [invoices, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true, gstin: true } },
          purchaseOrder: { select: { poNumber: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      prisma.purchaseInvoice.count({ where }),
    ])

    return { invoices, total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
  },

  async getById(id) {
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true, gstin: true, address: true } },
        purchaseOrder: { select: { id: true, poNumber: true, supplierId: true, status: true, totalAmount: true, expectedDelivery: true, gstPercent: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
        createdById_rel: { select: { id: true, name: true } },
      },
    })
    if (!invoice) throw new ApiError(404, 'Purchase invoice not found')

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const balance = Number(invoice.totalAmount) - totalPaid

    return {
      ...invoice,
      totalPaid,
      balance: balance > 0 ? balance : 0,
      status: balance <= 0 ? 'PAID' : invoice.status,
    }
  },

  async create({ supplierId, items, notes, createdById, invoiceDate, dueDate, subtotal, gstPercent }) {
    if (!items || items.length === 0) {
      throw new ApiError(400, 'At least one item is required')
    }

    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'piPrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'PI-'
    const last = await prisma.purchaseInvoice.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const invoiceNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

    const itemsData = items.map((item) => {
      const qty = new Decimal(item.quantity)
      const weight = item.weight !== undefined ? new Decimal(item.weight) : new Decimal(0)
      const rate = new Decimal(item.unitPrice || 0)
      const lineTotal = weight.gt(0) ? weight.mul(rate).mul(qty) : rate.mul(qty)
      return {
        product: item.productId ? { connect: { id: Number(item.productId) } } : undefined,
        sku: item.sku,
        name: item.name,
        quantity: qty,
        unitPrice: rate,
        lineTotal,
        weight,
      }
    })
    const totalAmount = itemsData.reduce((sum, it) => sum.plus(it.lineTotal), new Decimal(0))

    const gst = new Decimal(gstPercent || 3)
    const gstAmount = totalAmount.mul(gst).div(100)
    const actualTotal = totalAmount.plus(gstAmount)

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber,
        supplierId: Number(supplierId),
        status: 'PENDING',
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal: totalAmount,
        gstPercent: gst,
        gstAmount,
        totalAmount: actualTotal,
        notes: notes || null,
        createdById: createdById || null,
        items: { create: itemsData },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    })

    return invoice
  },

  async update(id, data) {
    const invoice = await this.getById(id)

    if (data.items !== undefined && invoice.status !== 'PENDING' && invoice.status !== 'PARTIALLY_PAID') {
      throw new ApiError(400, `Only PENDING or PARTIALLY_PAID invoices can be edited`)
    }

    if (data.status) {
      if (invoice.status === 'PAID' || invoice.status === 'VOID') {
        throw new ApiError(400, `Cannot update invoice with status: ${invoice.status}`)
      }
      if (data.status === 'VOID') {
        return prisma.purchaseInvoice.update({
          where: { id: invoice.id },
          data: { status: 'VOID' },
          include: { supplier: { select: { id: true, name: true } }, items: true, payments: true },
        })
      }
    }

    const baseData = {}
    if (data.supplierId !== undefined) baseData.supplierId = Number(data.supplierId)
    if (data.status !== undefined) baseData.status = data.status
    if (data.notes !== undefined) baseData.notes = data.notes || null
    if (data.invoiceDate !== undefined) baseData.invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : undefined
    if (data.dueDate !== undefined) baseData.dueDate = data.dueDate ? new Date(data.dueDate) : undefined
    if (data.subtotal !== undefined) baseData.subtotal = new Decimal(data.subtotal)
    if (data.gstPercent !== undefined) baseData.gstPercent = new Decimal(data.gstPercent)

    let update = { ...baseData }

    if (data.items !== undefined) {
      if (data.items.length === 0) {
        throw new ApiError(400, 'At least one item is required')
      }
      const itemsData = data.items.map((item) => {
        const qty = new Decimal(item.quantity)
        const weight = item.weight !== undefined ? new Decimal(item.weight) : new Decimal(0)
        const rate = new Decimal(item.unitPrice || 0)
        const lineTotal = weight.gt(0) ? weight.mul(rate).mul(qty) : rate.mul(qty)
        return {
          product: item.productId ? { connect: { id: Number(item.productId) } } : undefined,
          sku: item.sku,
          name: item.name,
          quantity: qty,
          unitPrice: rate,
          lineTotal,
          weight,
        }
      })
      const totalAmount = itemsData.reduce((sum, it) => sum.plus(it.lineTotal), new Decimal(0))
      const gst = data.gstPercent !== undefined ? new Decimal(data.gstPercent) : invoice.gstPercent
      const gstAmount = totalAmount.mul(gst).div(100)
      const actualTotal = totalAmount.plus(gstAmount)

      update = {
        ...update,
        subtotal: totalAmount,
        gstPercent: gst,
        gstAmount,
        totalAmount: actualTotal,
        items: {
          deleteMany: {},
          create: itemsData,
        },
      }
    }

    return prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: update,
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })
  },

  async remove(id) {
    const invoice = await this.getById(id)
    if (invoice.status !== 'PENDING') {
      throw new ApiError(400, 'Only pending purchase invoices can be deleted')
    }
    if (invoice.amountPaid > 0) {
      throw new ApiError(400, 'Cannot delete invoice with payments recorded')
    }
    await prisma.purchaseInvoice.delete({ where: { id: invoice.id } })
    return { message: 'Purchase invoice deleted' }
  },

  async refreshPaymentState(id) {
    const invoice = await this.getById(id)
    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const balance = Number(invoice.totalAmount) - totalPaid

    let newStatus = invoice.status
    if (balance <= 0) newStatus = 'PAID'
    else if (invoice.status !== 'VOID' && totalPaid > 0) newStatus = 'PARTIALLY_PAID'

    return prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: { status: newStatus },
      include: { supplier: { select: { id: true, name: true } }, payments: true },
    })
  },

  async recordPayment(id, { amount, method, reference, createdById }) {
    const invoice = await this.getById(id)

    const totalPaidCurrent = invoice.payments.reduce((sum, p) => sum.plus(p.amount), new Decimal(0))
    const newAmountPaid = totalPaidCurrent.plus(new Decimal(amount))

    if (newAmountPaid.gt(invoice.totalAmount)) {
      throw new ApiError(400, 'Payment exceeds outstanding balance')
    }

    const payment = await prisma.purchaseInvoicePayment.create({
      data: {
        purchaseInvoiceId: invoice.id,
        amount: new Decimal(amount),
        method: method || 'OTHER',
        reference,
        createdById: createdById || null,
      },
      include: { purchaseInvoice: true },
    })

    const newStatus = newAmountPaid >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID'

    await prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus,
      },
      include: { supplier: { select: { id: true, name: true } }, payments: true },
    })

    return payment
  },
}

module.exports = purchaseInvoiceService