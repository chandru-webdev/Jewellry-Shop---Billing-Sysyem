const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { escapeLike } = require('../utils/sanitizeSearch')
const { EXPENSE_CATEGORIES, EXPENSE_STATUSES } = require('../validators/expense.validator')

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function toNumber(value) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

const expenseService = {
  // GET /api/expenses — searchable list, newest first
  async list({ search, status, category, limit = 100 } = {}) {
    const where = {}
    if (status && EXPENSE_STATUSES.includes(status)) where.status = status
    if (category) where.category = category
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q } },
      ]
    }
    return prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(Number(limit) || 100, 500),
    })
  },

  // GET /api/expenses/categories
  async categories() {
    return EXPENSE_CATEGORIES
  },

  // GET /api/expenses/summary
  async summary() {
    const [total, thisMonth, paid, pending] = await Promise.all([
      prisma.expense.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: { not: 'CANCELLED' }, date: { gte: startOfMonth() } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    ])
    return {
      total: toNumber(total._sum.amount),
      thisMonth: toNumber(thisMonth._sum.amount),
      paid: toNumber(paid._sum.amount),
      pending: toNumber(pending._sum.amount),
      categories: EXPENSE_CATEGORIES,
    }
  },

  async getById(id) {
    const expense = await prisma.expense.findUnique({ where: { id: Number(id) } })
    if (!expense) throw new ApiError(404, 'Expense not found')
    return expense
  },

  // POST /api/expenses
  async create(data, userId) {
    return prisma.expense.create({
      data: {
        category: data.category,
        description: data.description,
        amount: toNumber(data.amount),
        date: data.date ? new Date(data.date) : new Date(),
        paymentMethod: data.paymentMethod || 'Cash',
        reference: data.reference || null,
        status: data.status || 'PAID',
        createdById: userId || null,
      },
    })
  },

  // PUT /api/expenses/:id
  async update(id, data) {
    await this.getById(id)
    const patch = {}
    if (data.category !== undefined) patch.category = data.category
    if (data.description !== undefined) patch.description = data.description
    if (data.amount !== undefined) patch.amount = toNumber(data.amount)
    if (data.date !== undefined) patch.date = new Date(data.date)
    if (data.paymentMethod !== undefined) patch.paymentMethod = data.paymentMethod
    if (data.reference !== undefined) patch.reference = data.reference
    if (data.status !== undefined) patch.status = data.status
    return prisma.expense.update({ where: { id: Number(id) }, data: patch })
  },

  // DELETE /api/expenses/:id
  async remove(id) {
    await this.getById(id)
    await prisma.expense.delete({ where: { id: Number(id) } })
    return { message: 'Expense deleted' }
  },
}

module.exports = expenseService