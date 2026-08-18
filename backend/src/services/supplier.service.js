const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const supplierService = {
  async list({ search, limit = 50, isActive } = {}) {
    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === true
    }
    return prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: Number(limit),
    })
  },

  async getById(id) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(id) },
    })
    if (!supplier) throw new ApiError(404, 'Supplier not found')
    return supplier
  },

  async create(data) {
    return prisma.supplier.create({ data })
  },

  async update(id, data) {
    const supplier = await prisma.supplier.findUnique({ where: { id: Number(id) } })
    if (!supplier) throw new ApiError(404, 'Supplier not found')
    return prisma.supplier.update({ where: { id: supplier.id }, data })
  },
}

module.exports = supplierService
