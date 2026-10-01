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

// An expense that hits the bank account: PAID via Bank Transfer against a
// linked account.
function isBankPaid(e) {
  return e.status === 'PAID' && String(e.paymentMethod || '').toLowerCase() === 'bank transfer' && e.bankAccountId != null
}

function addInterval(date, recurring) {
  const d = new Date(date)
  if (recurring === 'Weekly') d.setDate(d.getDate() + 7)
  else if (recurring === 'Monthly') d.setMonth(d.getMonth() + 1)
  return d
}

const includeRelations = {
  supplier: { select: { id: true, name: true } },
  bankAccount: { select: { id: true, name: true, bank: true, balance: true } },
  createdBy: { select: { id: true, name: true } },
}

function toPatch(data) {
  const patch = {}
  if (data.category !== undefined) patch.category = data.category
  if (data.description !== undefined) patch.description = data.description
  if (data.amount !== undefined) patch.amount = toNumber(data.amount)
  if (data.pendingAmount !== undefined) patch.pendingAmount = toNumber(data.pendingAmount) || 0
  if (data.date !== undefined) patch.date = new Date(data.date)
  if (data.paymentMethod !== undefined) patch.paymentMethod = data.paymentMethod
  if (data.reference !== undefined) patch.reference = data.reference === '' ? null : data.reference
  if (data.status !== undefined) patch.status = data.status
  // Advanced fields
  if (data.vendor !== undefined) patch.vendor = data.vendor === '' ? null : data.vendor
  if (data.supplierId !== undefined) patch.supplierId = data.supplierId || null
  if (data.attachmentUrl !== undefined) patch.attachmentUrl = data.attachmentUrl === '' ? null : data.attachmentUrl
  if (data.gstApplicable !== undefined) patch.gstApplicable = Boolean(data.gstApplicable)
  if (data.gstAmount !== undefined) patch.gstAmount = toNumber(data.gstAmount)
  if (data.bankAccountId !== undefined) patch.bankAccountId = data.bankAccountId || null
  if (data.recurring !== undefined) patch.recurring = data.recurring || 'None'
  if (data.dueDate !== undefined) patch.dueDate = data.dueDate ? new Date(data.dueDate) : null
  if (data.notes !== undefined) patch.notes = data.notes === '' ? null : data.notes
  return patch
}

const expenseService = {
  // GET /api/expenses — searchable list, newest first
  async list({ search, status, category, paymentMethod, limit = 100000 } = {}) {
    const where = {}
    if (status && EXPENSE_STATUSES.includes(status)) where.status = status
    if (category) where.category = category
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (search) {
      const q = escapeLike(search)
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q } },
        { vendor: { contains: q, mode: 'insensitive' } },
      ]
    }
    return prisma.expense.findMany({
      where,
      include: includeRelations,
      orderBy: { date: 'desc' },
      take: Math.min(Number(limit) || 100000, 100000),
    })
  },

  // GET /api/expenses/categories
  async categories() {
    return EXPENSE_CATEGORIES
  },

  // GET /api/expenses/summary
  async summary() {
    const [total, thisMonth, paid, pending, gstInput] = await Promise.all([
      prisma.expense.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: { not: 'CANCELLED' }, date: { gte: startOfMonth() } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: 'PAID', gstApplicable: true }, _sum: { gstAmount: true } }),
    ])
    return {
      total: toNumber(total._sum.amount),
      thisMonth: toNumber(thisMonth._sum.amount),
      paid: toNumber(paid._sum.amount),
      pending: toNumber(pending._sum.amount),
      gstInput: toNumber(gstInput._sum.gstAmount), // input GST (ITC) from paid applicable expenses
      categories: EXPENSE_CATEGORIES,
    }
  },

  async getById(id) {
    const expense = await prisma.expense.findUnique({ where: { id: Number(id) }, include: includeRelations })
    if (!expense) throw new ApiError(404, 'Expense not found')
    return expense
  },

  // POST /api/expenses
  async create(data, userId) {
    const date = data.date ? new Date(data.date) : new Date()
    let dueDate = data.dueDate ? new Date(data.dueDate) : null
    const recurring = data.recurring || 'None'
    // Auto-set the first "next due" when a recurring expense is created.
    if (recurring !== 'None' && !dueDate) {
      dueDate = addInterval(date, recurring)
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          ...toPatch(data),
          date,
          pendingAmount: toNumber(data.pendingAmount) || (data.status === 'PENDING' ? toNumber(data.amount) : 0),
          status: data.status || 'PAID',
          recurring,
          dueDate,
          createdById: userId || null,
        },
        include: includeRelations,
      })
      if (isBankPaid(created)) {
        await tx.bankAccount.update({
          where: { id: created.bankAccountId },
          data: { balance: { decrement: created.amount } },
        })
      }
      return created
    })
  },

  // PUT /api/expenses/:id
  async update(id, data) {
    const existing = await this.getById(id)
    const patch = toPatch(data)
    const next = { ...existing, ...patch }
    const oldDeducted = isBankPaid(existing)
    const newDeducted = isBankPaid(next)

    return prisma.$transaction(async (tx) => {
      // Reconcile bank balance when the deduction state changed.
      if (oldDeducted && !newDeducted) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: { balance: { increment: existing.amount } },
        })
      } else if (!oldDeducted && newDeducted) {
        await tx.bankAccount.update({
          where: { id: next.bankAccountId },
          data: { balance: { decrement: next.amount } },
        })
      } else if (oldDeducted && newDeducted) {
        if (existing.bankAccountId === next.bankAccountId) {
          const delta = Number(next.amount) - Number(existing.amount)
          if (delta !== 0) {
            await tx.bankAccount.update({
              where: { id: next.bankAccountId },
              data: { balance: { decrement: delta } },
            })
          }
        } else {
          // Whole amount moved to a different account.
          await tx.bankAccount.update({
            where: { id: existing.bankAccountId },
            data: { balance: { increment: existing.amount } },
          })
          await tx.bankAccount.update({
            where: { id: next.bankAccountId },
            data: { balance: { decrement: next.amount } },
          })
        }
      }
      return tx.expense.update({ where: { id: existing.id }, data: patch, include: includeRelations })
    })
  },

  // DELETE /api/expenses/:id
  async remove(id) {
    const existing = await this.getById(id)
    return prisma.$transaction(async (tx) => {
      if (isBankPaid(existing)) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: { balance: { increment: existing.amount } },
        })
      }
      await tx.expense.delete({ where: { id: existing.id } })
      return { message: 'Expense deleted' }
    })
  },

  // POST /api/expenses/recurring/process — generate due recurring occurrences.
  // Scans recurring expenses whose dueDate has arrived and creates the next
  // occurrence (same template aside from a forward date). Each run advances
  // the source template's dueDate so no duplicate schedules occur.
  async processRecurring() {
    const now = new Date()
    const templates = await prisma.expense.findMany({
      where: {
        recurring: { not: 'None' },
        dueDate: { not: null, lte: now },
        status: { not: 'CANCELLED' },
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    })

    let generated = 0
    for (const t of templates) {
      await prisma.$transaction(async (tx) => {
        const occurrence = await tx.expense.create({
          data: {
            category: t.category,
            description: t.description,
            amount: t.amount,
            pendingAmount: t.pendingAmount,
            date: t.dueDate,
            paymentMethod: t.paymentMethod,
            reference: t.reference,
            status: t.status,
            vendor: t.vendor,
            supplierId: t.supplierId,
            attachmentUrl: t.attachmentUrl,
            gstApplicable: t.gstApplicable,
            gstAmount: t.gstAmount,
            bankAccountId: t.bankAccountId,
            recurring: 'None',
            dueDate: null,
            notes: t.notes,
            createdById: t.createdById,
          },
        })
        if (isBankPaid(occurrence)) {
          await tx.bankAccount.update({
            where: { id: occurrence.bankAccountId },
            data: { balance: { decrement: occurrence.amount } },
          })
        }
        await tx.expense.update({
          where: { id: t.id },
          data: { dueDate: addInterval(t.dueDate, t.recurring) },
        })
        generated++
      })
    }
    return { processed: templates.length, generated }
  },
}

module.exports = expenseService