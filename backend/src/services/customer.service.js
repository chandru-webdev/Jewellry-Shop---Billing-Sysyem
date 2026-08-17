const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const customerService = {
  async list({ search, limit = 50 } = {}) {
    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }
    return prisma.customer.findMany({
      where,
      include: { _count: { select: { invoices: true } } },
      orderBy: { name: 'asc' },
      take: Number(limit),
    })
  },

  async getById(id) {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        invoices: { orderBy: { id: 'desc' }, take: 10 },
        _count: { select: { invoices: true, payments: true } },
      },
    })
    if (!customer) throw new ApiError(404, 'Customer not found')
    return customer
  },

  async create(data) {
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } })
    if (existing) throw new ApiError(400, 'A customer with that phone number already exists')
    return prisma.customer.create({ data })
  },

  async update(id, data) {
    const customer = await prisma.customer.findUnique({ where: { id: Number(id) } })
    if (!customer) throw new ApiError(404, 'Customer not found')

    if (data.phone && data.phone !== customer.phone) {
      const taken = await prisma.customer.findUnique({ where: { phone: data.phone } })
      if (taken) throw new ApiError(400, 'A customer with that phone number already exists')
    }

    return prisma.customer.update({ where: { id: customer.id }, data })
  },
}

module.exports = customerService
