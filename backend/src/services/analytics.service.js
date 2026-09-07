// =============================================================
// Analytics service — powers the 4 new dashboard widgets.
//   GET /api/analytics/overview
//     1. Net Revenue           (sales − refunds, by month)
//     2. Receivable Summary    (outstanding sales invoices, aged)
//     3. Income and Expense    (sales vs expenses, by month)
//     4. Top Expenses          (expense breakdown by category)
// All read-only aggregations over live Order / Invoice / Expense
// and Payment records. Shopify orders already land in the Order
// table via the webhook sync, so Shopify sales are included
// automatically — no separate Shopify call here.
// =============================================================
const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')

const Decimal = Prisma.Decimal

const NUMBER_OF_MONTHS = 12
const REVENUE_ELIGIBLE = { status: { notIn: ['CANCELLED', 'REFUNDED'] } }
const EXPENSE_ELIGIBLE = { status: { not: 'CANCELLED' } }

// Local "YYYY-MM" key + short label for a month going `count` back from now.
function buildMonths(count = NUMBER_OF_MONTHS) {
  const now = new Date()
  const months = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  return months
}

// Inclusive start of the oldest month in the window, exclusive end after the current month.
function monthRange(count = NUMBER_OF_MONTHS) {
  const months = buildMonths(count)
  const start = new Date(months[0].key)
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

const num = (v) => Number(v ?? 0)

const analyticsService = {
  // ---- 1. NET REVENUE: sales minus refunds, grouped by month ----
  async netRevenue(months = NUMBER_OF_MONTHS) {
    const monthsList = buildMonths(months)
    const { start, end } = monthRange(months)

    const [salesRows, refundRows] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lt: end }, ...REVENUE_ELIGIBLE },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lt: end }, status: 'REFUNDED' },
        select: { createdAt: true, amount: true },
      }),
    ])

    const byKey = (list, dateField) => {
      const map = Object.fromEntries(monthsList.map((m) => [m.key, new Decimal(0)]))
      for (const row of list) {
        const d = new Date(row[dateField])
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (map[key]) map[key] = map[key].plus(row.totalAmount ?? row.amount ?? 0)
      }
      return map
    }

    const salesMap = byKey(salesRows, 'createdAt')
    const refundMap = byKey(refundRows, 'createdAt')

    const data = monthsList.map((m) => ({
      key: m.key,
      label: m.label,
      year: m.year,
      revenue: Number(salesMap[m.key].minus(refundMap[m.key]).toDecimalPlaces(2)),
    }))

    return {
      data,
      total: num(data.reduce((sum, r) => sum + r.revenue, 0)),
      hasData: data.some((r) => r.revenue !== 0),
    }
  },

  // ---- 2. RECEIVABLE SUMMARY: outstanding invoices, aged by due date ----
  async receivables() {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: 'VOID' } },
      include: {
        payments: { where: { status: 'PAID' }, select: { amount: true } },
      },
    })

    const buckets = [
      { name: 'Current', min: -Infinity, max: 30 },
      { name: '>30 Days', min: 31, max: 60 },
      { name: '>60 Days', min: 61, max: 90 },
      { name: '>90 Days', min: 91, max: 120 },
      { name: '>120 Days', min: 121, max: 180 },
      { name: 'Older', min: 181, max: Infinity },
    ].map((b) => ({ ...b, value: new Decimal(0) }))

    const today = new Date()
    const bucketIndex = (daysOverdue) => {
      if (daysOverdue <= 30) return 0
      if (daysOverdue <= 60) return 1
      if (daysOverdue <= 90) return 2
      if (daysOverdue <= 120) return 3
      if (daysOverdue <= 180) return 4
      return 5
    }

    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum.plus(p.amount), new Decimal(0))
      const outstanding = new Decimal(inv.grandTotal).minus(paid)
      if (outstanding.lte(0)) continue // fully paid → not receivable

      const base = inv.dueDate || inv.date || new Date()
      const daysOverdue = Math.floor((today.getTime() - new Date(base).getTime()) / 86400000)
      buckets[bucketIndex(daysOverdue)].value = buckets[bucketIndex(daysOverdue)].value.plus(outstanding)
    }

    const data = buckets.map(({ name, value }) => ({ name, value: Number(value.toDecimalPlaces(2)) }))
    return {
      data,
      total: num(data.reduce((sum, b) => sum + b.value, 0)),
      hasData: data.some((b) => b.value !== 0),
    }
  },

  // ---- 3. INCOME & EXPENSE: monthly sales vs expenses ----
  async incomeExpense(months = NUMBER_OF_MONTHS) {
    const monthsList = buildMonths(months)
    const { start, end } = monthRange(months)

    const [salesRows, expenseRows] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lt: end }, ...REVENUE_ELIGIBLE },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lt: end }, ...EXPENSE_ELIGIBLE },
        select: { date: true, amount: true },
      }),
    ])

    const incomeMap = Object.fromEntries(monthsList.map((m) => [m.key, new Decimal(0)]))
    const expenseMap = Object.fromEntries(monthsList.map((m) => [m.key, new Decimal(0)]))

    for (const row of salesRows) {
      const d = new Date(row.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (incomeMap[key]) incomeMap[key] = incomeMap[key].plus(row.totalAmount ?? 0)
    }
    for (const row of expenseRows) {
      const d = new Date(row.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (expenseMap[key]) expenseMap[key] = expenseMap[key].plus(row.amount ?? 0)
    }

    const data = monthsList.map((m) => ({
      key: m.key,
      label: m.label,
      income: Number(incomeMap[m.key].toDecimalPlaces(2)),
      expense: Number(expenseMap[m.key].toDecimalPlaces(2)),
    }))

    return {
      data,
      incomeTotal: num(data.reduce((s, r) => s + r.income, 0)),
      expenseTotal: num(data.reduce((s, r) => s + r.expense, 0)),
      hasData: data.some((r) => r.income !== 0 || r.expense !== 0),
    }
  },

  // ---- 4. TOP EXPENSES: expense total by category ----
  async topExpenses(months = NUMBER_OF_MONTHS) {
    const { start, end } = monthRange(months)

    const rows = await prisma.expense.findMany({
      where: { date: { gte: start, lt: end }, ...EXPENSE_ELIGIBLE },
      select: { category: true, amount: true },
    })

    const map = new Map()
    for (const row of rows) {
      map.set(row.category, (map.get(row.category) || new Decimal(0)).plus(row.amount ?? 0))
    }

    const data = [...map.entries()]
      .map(([category, value]) => ({ name: category, value: Number(value.toDecimalPlaces(2)) }))
      .sort((a, b) => b.value - a.value)

    return {
      data,
      total: num(data.reduce((s, d) => s + d.value, 0)),
      hasData: data.length > 0,
    }
  },

  // ---- One call for the whole widget section ----
  async overview({ months } = {}) {
    const n = Math.min(Math.max(Number(months) || NUMBER_OF_MONTHS, 1), 12)
    const [netRevenue, receivables, incomeExpense, topExpenses] = await Promise.all([
      this.netRevenue(n),
      this.receivables(),
      this.incomeExpense(n),
      this.topExpenses(n),
    ])
    return { netRevenue, receivables, incomeExpense, topExpenses }
  },
}

module.exports = analyticsService