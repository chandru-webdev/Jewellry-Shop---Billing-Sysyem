const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

const purchaseReturnService = {
  async list({ search, status, supplierId, limit = 50, page = 1 } = {}) {
    const where = {}
    if (status) where.status = status
    if (supplierId) where.supplierId = Number(supplierId)
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { returnNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
        { supplier: { phone: { contains: q } } },
      ]
    }

    const take = Math.min(Number(limit) || 50, 200)
    const skip = (Number(page) - 1) * take

    const [returns, total] = await Promise.all([
      prisma.purchaseReturn.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
          items: true,
          _count: { select: { items: true } },
        },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      prisma.purchaseReturn.count({ where }),
    ])

    return { returns, total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
  },

  async getById(id) {
    const ret = await prisma.purchaseReturn.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        items: true,
        createdById_rel: { select: { id: true, name: true } },
      },
    })
    if (!ret) throw new ApiError(404, 'Purchase return not found')
    return ret
  },

  async create({ supplierId, purchaseOrderId, reason, items, createdById }) {
    if (!items || items.length === 0) {
      throw new ApiError(400, 'At least one item is required')
    }

    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'prPrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'PR-'
    const last = await prisma.purchaseReturn.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const returnNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

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

    const ret = await prisma.purchaseReturn.create({
      data: {
        returnNumber,
        purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : null,
        supplierId: Number(supplierId),
        reason: reason || null,
        totalItems: items.length,
        totalQuantity,
        totalAmount,
        createdById: createdById || null,
        items: { create: itemsData },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    })

    return ret
  },

  async updateStatus(id, status) {
    const ret = await this.getById(id)
    const allowed = ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED']
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Invalid status: ${status}`)
    }

    return prisma.purchaseReturn.update({
      where: { id: ret.id },
      data: { status },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
    })
  },

  async remove(id) {
    const ret = await this.getById(id)
    if (ret.status !== 'PENDING') {
      throw new ApiError(400, 'Only pending purchase returns can be deleted')
    }
    await prisma.purchaseReturn.delete({ where: { id: ret.id } })
    return { message: 'Purchase return deleted' }
  },
}

module.exports = purchaseReturnService
