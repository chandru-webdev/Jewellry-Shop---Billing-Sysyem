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

    const [orders, total] = await Promise.all([
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

    return { orders, total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
  },

  async getById(id) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: true,
        returns: true,
        createdById_rel: { select: { id: true, name: true } },
      },
    })
    if (!order) throw new ApiError(404, 'Purchase order not found')
    return order
  },

  async create({ supplierId, items, notes, createdById }) {
    if (!items || items.length === 0) {
      throw new ApiError(400, 'At least one item is required')
    }

    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'poPrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'PO-'
    const last = await prisma.purchaseOrder.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const poNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

    let totalQuantity = new Decimal(0)
    let totalAmount = new Decimal(0)
    const itemsData = items.map((item) => {
      const qty = new Decimal(item.quantity)
      const price = new Decimal(item.unitPrice)
      const lineTotal = qty.mul(price)
      totalQuantity = totalQuantity.plus(qty)
      totalAmount = totalAmount.plus(lineTotal)
      return {
        productId: item.productId || null,
        sku: item.sku,
        name: item.name,
        quantity: qty,
        unitPrice: price,
        lineTotal,
      }
    })

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: Number(supplierId),
        totalItems: items.length,
        totalQuantity,
        totalAmount,
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
    const allowed = ['PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED']
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Invalid status: ${status}`)
    }

    return prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { status },
      include: { supplier: { select: { id: true, name: true } }, items: true },
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
