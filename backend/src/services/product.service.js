const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { calculatePrice, getSilverRate } = require('./pricing.service')

const productService = {
  // GET /api/products  — optional filters: ?search=, ?categoryId=, ?isActive=
  async list(filters = {}) {
    const where = {}

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    if (filters.categoryId) where.categoryId = Number(filters.categoryId)
    if (filters.isActive === 'true' || filters.isActive === 'false') {
      where.isActive = filters.isActive === 'true'
    }

    return prisma.product.findMany({
      where,
      include: { category: true, inventory: true },
      orderBy: { id: 'desc' },
    })
  },

  // GET /api/products/:id
  async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { category: true, inventory: true },
    })
    if (!product) throw new ApiError(404, 'Product not found')
    return product
  },

  // POST /api/products  — price is calculated by the backend, never sent by the client
  async create(data, userId) {
    const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } })
    if (duplicate) throw new ApiError(400, `SKU "${data.sku}" already exists`)

    const silverRate = await getSilverRate()
    const price = calculatePrice({
      silverRate,
      weight: data.weight,
      makingCharge: data.makingCharge,
      gstPercent: data.gstPercent || 3,
    })

    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        weight: data.weight,
        makingCharge: data.makingCharge,
        gstPercent: data.gstPercent || 3,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        ...price,
        inventory: { create: { quantity: data.initialStock || 0 } },
      },
      include: { category: true, inventory: true },
    })

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id },
    })

    return product
  },

  // PUT /api/products/:id  — recalculates the price if weight/making/gst changed
  async update(id, data, userId) {
    const existing = await this.getById(id)

    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } })
      if (duplicate) throw new ApiError(400, `SKU "${data.sku}" already exists`)
    }

    const weight = data.weight ?? existing.weight
    const makingCharge = data.makingCharge ?? existing.makingCharge
    const gstPercent = data.gstPercent ?? existing.gstPercent

    // Recalculate using the CURRENT silver rate
    const silverRate = await getSilverRate()
    const price = calculatePrice({ silverRate, weight, makingCharge, gstPercent })

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...price,
      },
      include: { category: true, inventory: true },
    })

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_UPDATED', entity: 'Product', entityId: product.id },
    })

    return product
  },

  // DELETE /api/products/:id  — soft delete: just marks inactive
  async remove(id, userId) {
    const existing = await this.getById(id)
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { isActive: false },
    })

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_DEACTIVATED', entity: 'Product', entityId: product.id },
    })

    return product
  },
}

module.exports = productService
