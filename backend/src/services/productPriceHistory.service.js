const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const Decimal = Prisma.Decimal

const productPriceHistoryService = {
  async list(filters = {}) {
    const where = {}

    if (filters.productId) {
      where.productId = Number(filters.productId)
    }

    if (filters.priceType && filters.priceType !== 'ALL') {
      where.priceType = filters.priceType
    }

    if (filters.reason) {
      where.reason = { contains: filters.reason, mode: 'insensitive' }
    }

    if (filters.changedById) {
      where.changedById = Number(filters.changedById)
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) {
        const end = new Date(filters.dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    if (filters.search) {
      const q = filters.search
      where.OR = [
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { product: { sku: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { changedBy: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const page = Number(filters.page) || 1
    const limit = Math.min(Number(filters.limit) || 50, 200)
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      prisma.productPriceHistory.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, sellingPrice: true, weight: true, makingCharge: true, metal: true } },
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productPriceHistory.count({ where }),
    ])

    return { records, total, page, limit, totalPages: Math.ceil(total / limit) }
  },

  async getByProduct(productId, filters = {}) {
    const where = { productId: Number(productId) }

    if (filters.priceType && filters.priceType !== 'ALL') {
      where.priceType = filters.priceType
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) {
        const end = new Date(filters.dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const records = await prisma.productPriceHistory.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, sellingPrice: true, weight: true, makingCharge: true, metal: true, category: { select: { name: true } } } },
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(filters.limit) || 100,
    })

    return records
  },

  async getStats(filters = {}) {
    const where = {}

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) {
        const end = new Date(filters.dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [totalUpdates, increases, decreases, products] = await Promise.all([
      prisma.productPriceHistory.count({ where }),
      prisma.productPriceHistory.count({ where: { ...where, changeAmount: { gt: 0 } } }),
      prisma.productPriceHistory.count({ where: { ...where, changeAmount: { lt: 0 } } }),
      prisma.productPriceHistory.findMany({
        where,
        select: { changeAmount: true },
      }),
    ])

    const distinctProducts = await prisma.productPriceHistory.findMany({
      where,
      select: { productId: true },
      distinct: ['productId'],
    })

    const avgChange = products.length > 0
      ? products.reduce((sum, p) => sum + Number(p.changeAmount), 0) / products.length
      : 0

    return {
      productsUpdated: distinctProducts.length,
      totalUpdates,
      increases,
      decreases,
      avgChange: Math.round(avgChange),
    }
  },

  async getById(id) {
    const record = await prisma.productPriceHistory.findUnique({
      where: { id: Number(id) },
      include: {
        product: {
          select: {
            id: true, name: true, sku: true, sellingPrice: true, baseAmount: true,
            gstAmount: true, weight: true, makingCharge: true, metal: true,
            category: { select: { name: true } },
          },
        },
        changedBy: { select: { id: true, name: true } },
      },
    })
    if (!record) throw new ApiError(404, 'Price history record not found')
    return record
  },

  async create({ productId, priceType, oldPrice, newPrice, reason, notes, changedById }) {
    const oldP = new Decimal(oldPrice)
    const newP = new Decimal(newPrice)
    const changeAmount = newP.minus(oldP)
    const changePercentage = oldP.equals(0)
      ? 0
      : changeAmount.div(oldP).mul(100).toDecimalPlaces(4)

    return prisma.productPriceHistory.create({
      data: {
        productId,
        priceType,
        oldPrice: oldP.toDecimalPlaces(2),
        newPrice: newP.toDecimalPlaces(2),
        changeAmount: changeAmount.toDecimalPlaces(2),
        changePercentage,
        reason,
        notes: notes || null,
        changedById: changedById || null,
      },
    })
  },

  async createBulk(records) {
    if (records.length === 0) return 0

    const data = records.map((r) => {
      const oldP = new Decimal(r.oldPrice)
      const newP = new Decimal(r.newPrice)
      const changeAmount = newP.minus(oldP)
      const changePercentage = oldP.equals(0)
        ? 0
        : changeAmount.div(oldP).mul(100).toDecimalPlaces(4)

      return {
        productId: r.productId,
        priceType: r.priceType || 'SELLING',
        oldPrice: oldP.toDecimalPlaces(2),
        newPrice: newP.toDecimalPlaces(2),
        changeAmount: changeAmount.toDecimalPlaces(2),
        changePercentage,
        reason: r.reason,
        notes: r.notes || null,
        changedById: r.changedById || null,
      }
    })

    await prisma.productPriceHistory.createMany({ data })
    return data.length
  },
}

module.exports = productPriceHistoryService
