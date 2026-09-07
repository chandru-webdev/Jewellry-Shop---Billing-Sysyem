const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

const purchaseOrderService = {
  async list({ search, status, supplierId, limit = 50, page = 1 } = {}) {
    const where = {}
    if (status) where.status = status
    if (supplierId) where.supplierId = Number(supplierId)
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { poNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
        { supplier: { phone: { contains: q } } },
      ]
    }

    const take = Math.min(Number(limit) || 50, 200)
    const skip = (Number(page) - 1) * take

    const [rows, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          items: true,
          _count: { select: { items: true } },
        },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    const orders = rows.map((o) => ({
      ...o,
      totalQuantity: o.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
      totalWeight: o.items.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0),
    }))

    return { orders, total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
  },

  async getById(id) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true, address: true, contactPerson: true, gstin: true } },
        items: true,
        returns: true,
        createdById_rel: { select: { id: true, name: true } },
      },
    })
    if (!order) throw new ApiError(404, 'Purchase order not found')
    return order
  },

  async create({ supplierId, status, items, notes, createdById, orderDate, expectedDelivery, gstPercent, subtotal, totalAmount: providedTotal }) {
    if (!items || items.length === 0) {
      throw new ApiError(400, 'At least one item is required')
    }

    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'poPrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'PO-'
    const last = await prisma.purchaseOrder.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const poNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

    let totalQuantity = new Decimal(0)
    let totalWeight = new Decimal(0)
    let subTotal = new Decimal(0)
    const itemsData = items.map((item) => {
      const qty = new Decimal(item.quantity)
      const weight = item.weight !== undefined ? new Decimal(item.weight) : new Decimal(0)
      const rate = item.rate !== undefined ? new Decimal(item.rate) : new Decimal(item.unitPrice)
      const perUnit = weight.greaterThan(0) ? weight.mul(rate) : rate
      const lineTotal = perUnit.mul(qty)
      totalQuantity = totalQuantity.plus(qty)
      totalWeight = totalWeight.plus(weight.mul(qty))
      subTotal = subTotal.plus(lineTotal)
      return {
        product: item.productId ? { connect: { id: Number(item.productId) } } : undefined,
        sku: item.sku,
        name: item.name,
        quantity: qty,
        unitPrice: rate,
        lineTotal,
        weight,
        rate,
      }
    })

    const gstPct = new Decimal(gstPercent !== undefined ? gstPercent : 3)
    const gstAmount = subTotal.mul(gstPct).div(100)
    const finalTotal = new Decimal(providedTotal ?? 0).greaterThan(0)
      ? new Decimal(providedTotal)
      : subTotal.plus(gstAmount)

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        status: status || 'DRAFT',
        supplierId: Number(supplierId),
        orderDate: orderDate ? new Date(orderDate) : null,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        gstPercent: gstPct,
        subtotal: subTotal,
        totalItems: items.length,
        totalQuantity,
        totalWeight,
        totalAmount: finalTotal,
        notes: notes || null,
        createdById: createdById || null,
        items: { create: itemsData },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    })

    return order
  },

  async updateStatus(id, status) {
    const order = await this.getById(id)
    const allowed = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Invalid status: ${status}`)
    }

    return prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { status },
      include: { supplier: { select: { id: true, name: true } }, items: true },
    })
  },

  async update(id, data) {
    const existing = await this.getById(id)

    if (data.items !== undefined && (!data.items || data.items.length === 0)) {
      throw new ApiError(400, 'At least one item is required')
    }

    const allowedEditStatuses = ['DRAFT', 'PENDING']
    if (!allowedEditStatuses.includes(existing.status)) {
      throw new ApiError(400, `Only ${allowedEditStatuses.join(' or ')} purchase orders can be edited`)
    }

    const baseData = {}
    if (data.supplierId !== undefined) baseData.supplierId = Number(data.supplierId)
    if (data.status !== undefined) baseData.status = data.status
    if (data.notes !== undefined) baseData.notes = data.notes || null
    if (data.orderDate !== undefined) baseData.orderDate = data.orderDate ? new Date(data.orderDate) : null
    if (data.expectedDelivery !== undefined) baseData.expectedDelivery = data.expectedDelivery ? new Date(data.expectedDelivery) : null
    if (data.gstPercent !== undefined) baseData.gstPercent = new Decimal(data.gstPercent)

    let update = { ...baseData }

    if (data.items !== undefined) {
      let totalQuantity = new Decimal(0)
      let totalWeight = new Decimal(0)
      let subTotal = new Decimal(0)
      const itemsData = data.items.map((item) => {
        const qty = new Decimal(item.quantity)
        const weight = item.weight !== undefined ? new Decimal(item.weight) : new Decimal(0)
        const rate = item.rate !== undefined ? new Decimal(item.rate) : new Decimal(item.unitPrice)
        const perUnit = weight.greaterThan(0) ? weight.mul(rate) : rate
        const lineTotal = perUnit.mul(qty)
        totalQuantity = totalQuantity.plus(qty)
        totalWeight = totalWeight.plus(weight.mul(qty))
        subTotal = subTotal.plus(lineTotal)
        return {
          product: item.productId ? { connect: { id: Number(item.productId) } } : undefined,
          sku: item.sku,
          name: item.name,
          quantity: qty,
          unitPrice: rate,
          lineTotal,
          weight,
          rate,
        }
      })

      const gstPct = new Decimal(update.gstPercent ?? data.gstPercent ?? 3)
      const gstAmount = subTotal.mul(gstPct).div(100)
      const finalTotal = new Decimal(data.totalAmount ?? 0).greaterThan(0)
        ? new Decimal(data.totalAmount)
        : subTotal.plus(gstAmount)

      update = {
        ...update,
        subtotal: subTotal,
        totalItems: data.items.length,
        totalQuantity,
        totalWeight,
        totalAmount: finalTotal,
        items: {
          deleteMany: {},
          create: itemsData,
        },
      }
    } else if (data.subtotal !== undefined || data.totalAmount !== undefined) {
      update = {
        ...update,
        ...(data.subtotal !== undefined && { subtotal: new Decimal(data.subtotal) }),
        ...(data.totalAmount !== undefined && { totalAmount: new Decimal(data.totalAmount) }),
      }
    }

    return prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: update,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: true,
        _count: { select: { items: true } },
      },
    })
  },

  async remove(id) {
    const order = await this.getById(id)
    if (order.status !== 'PENDING') {
      throw new ApiError(400, 'Only pending purchase orders can be deleted')
    }
    await prisma.purchaseOrder.delete({ where: { id: order.id } })
    return { message: 'Purchase order deleted' }
  },
}

module.exports = purchaseOrderService
