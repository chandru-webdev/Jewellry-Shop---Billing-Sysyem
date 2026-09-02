// =============================================================
// Reports service (Phase 20)
// Read-only aggregations for the Reports page. Nothing is written.
//   GET /api/reports/sales      -> revenue over time
//   GET /api/reports/inventory  -> stock summary + low stock
//   GET /api/reports/products   -> top products by revenue
// =============================================================
const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const Decimal = Prisma.Decimal

// Parse "2026-01-01" style query params into Date objects.
// Missing -> undefined so Prisma ignores the filter.
function parseDate(value) {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, `Invalid date: ${value}`)
  }
  return d
}

const reportService = {
  // ---------- SALES REPORT ----------
  // Sums invoice grand totals (excluding VOID) in a date range,
  // grouped by day. Also returns aggregate totals, a payment-method
  // breakdown, salesperson totals and the most recent invoices.
  async sales({ from, to } = {}) {
    const where = {
      status: { not: 'VOID' },
    }
    const fromDate = parseDate(from)
    const toDate = parseDate(to)
    if (fromDate) where.date = { ...where.date, gte: fromDate }
    if (toDate) where.date = { ...where.date, lte: toDate }

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        date: true,
        grandTotal: true,
        gstTotal: true,
        discount: true,
        paymentMethod: true,
        invoiceNumber: true,
        status: true,
        customer: { select: { name: true } },
        salesperson: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    // Group by calendar day (YYYY-MM-DD local time)
    const byDay = new Map()
    const byMethod = new Map()
    const bySalesperson = new Map()
    let totalRevenue = new Decimal(0)
    let totalGst = new Decimal(0)
    let totalDiscount = new Decimal(0)
    let count = 0

    for (const inv of invoices) {
      const day = inv.date.toISOString().slice(0, 10)
      const entry = byDay.get(day) || { date: day, revenue: new Decimal(0), count: 0 }
      entry.revenue = entry.revenue.plus(inv.grandTotal)
      entry.count += 1
      byDay.set(day, entry)

      const method = inv.paymentMethod || 'Other'
      const m = byMethod.get(method) || { method, amount: new Decimal(0), count: 0 }
      m.amount = m.amount.plus(inv.grandTotal)
      m.count += 1
      byMethod.set(method, m)

      const sp = inv.salesperson?.name
      if (sp) {
        const s = bySalesperson.get(sp) || { name: sp, orders: 0, revenue: new Decimal(0) }
        s.orders += 1
        s.revenue = s.revenue.plus(inv.grandTotal)
        bySalesperson.set(sp, s)
      }

      totalRevenue = totalRevenue.plus(inv.grandTotal)
      totalGst = totalGst.plus(inv.gstTotal)
      totalDiscount = totalDiscount.plus(inv.discount)
      count += 1
    }

    return {
      totals: {
        invoices: count,
        revenue: Number(totalRevenue),
        gst: Number(totalGst),
        discount: Number(totalDiscount),
      },
      daily: [...byDay.values()].map((e) => ({
        date: e.date,
        revenue: Number(e.revenue),
        count: e.count,
      })),
      methods: [...byMethod.values()]
        .map((m) => ({ method: m.method, amount: Number(m.amount), count: m.count }))
        .sort((a, b) => b.amount - a.amount),
      salespeople: [...bySalesperson.values()]
        .map((s) => ({ name: s.name, orders: s.orders, revenue: Number(s.revenue) }))
        .sort((a, b) => b.revenue - a.revenue),
      recent: invoices
        .slice()
        .reverse()
        .slice(0, 6)
        .map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customer: inv.customer?.name ?? '—',
          amount: Number(inv.grandTotal),
          gst: Number(inv.gstTotal),
          method: inv.paymentMethod ?? '—',
          status: inv.status,
        })),
    }
  },

  // ---------- BUSINESS REPORT ----------
  // Profit-and-loss style aggregation over a date range: revenue, GST,
  // purchases (COGS proxy), operating expenses, cash flow, top customers.
  async business({ from, to } = {}) {
    const fromDate = parseDate(from)
    const toDate = parseDate(to)
    const whereDate = {}
    if (fromDate) whereDate.gte = fromDate
    if (toDate) whereDate.lte = toDate

    const [invoices, payments, expenses, purchaseOrders, prevRevenueAgg, prevExpenseAgg] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: { not: 'VOID' }, ...(Object.keys(whereDate).length ? { date: whereDate } : {}) },
        select: { date: true, grandTotal: true, gstTotal: true, invoiceNumber: true, customer: { select: { id: true, name: true } } },
      }),
      prisma.payment.findMany({
        where: { status: 'PAID', ...(Object.keys(whereDate).length ? { createdAt: whereDate } : {}) },
        select: { createdAt: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { status: { not: 'CANCELLED' }, ...(Object.keys(whereDate).length ? { date: whereDate } : {}) },
        select: { date: true, amount: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { status: { in: ['RECEIVED', 'PROCESSING'] }, ...(Object.keys(whereDate).length ? { createdAt: whereDate } : {}) },
        select: { createdAt: true, totalAmount: true },
      }),
      null,
      null,
    ])

    // Previous matching window (same length before `from`) for trends.
    let prevRevenue = new Decimal(0)
    let prevExpenses = new Decimal(0)
    if (fromDate && toDate) {
      const span = toDate.getTime() - fromDate.getTime()
      const prevTo = new Date(fromDate.getTime() - 1)
      const prevFrom = new Date(fromDate.getTime() - span)
      const [pRev, pExp] = await Promise.all([
        prisma.invoice.aggregate({
          where: { status: { not: 'VOID' }, date: { gte: prevFrom, lte: prevTo } },
          _sum: { grandTotal: true },
        }),
        prisma.expense.aggregate({
          where: { status: { not: 'CANCELLED' }, date: { gte: prevFrom, lte: prevTo } },
          _sum: { amount: true },
        }),
      ])
      prevRevenue = pRev._sum.grandTotal ?? new Decimal(0)
      prevExpenses = pExp._sum.amount ?? new Decimal(0)
    }

    const toMonth = (d, field) => {
      const dt = d instanceof Date ? d : new Date(d)
      if (Number.isNaN(dt.getTime())) return null
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    }

    const monthly = new Map()
    const bucket = (key) => {
      if (!key) return null
      if (!monthly.has(key)) {
        monthly.set(key, { month: key, revenue: new Decimal(0), gst: new Decimal(0), inflow: new Decimal(0), outflow: new Decimal(0), purchases: new Decimal(0) })
      }
      return monthly.get(key)
    }

    let totalRevenue = new Decimal(0)
    let totalGst = new Decimal(0)
    let invoiced = 0
    let totalPurchases = new Decimal(0)
    let totalExpenses = new Decimal(0)
    const customerMap = new Map()

    for (const inv of invoices) {
      const b = bucket(toMonth(inv.date, 'date'))
      totalRevenue = totalRevenue.plus(inv.grandTotal)
      totalGst = totalGst.plus(inv.gstTotal)
      invoiced += 1
      if (b) b.revenue = b.revenue.plus(inv.grandTotal), b.gst = b.gst.plus(inv.gstTotal)
      const key = inv.customer?.id ? String(inv.customer.id) : inv.customer?.name
      if (key) {
        const c = customerMap.get(key) || { name: inv.customer.name, invoices: 0, amount: new Decimal(0) }
        c.invoices += 1
        c.amount = c.amount.plus(inv.grandTotal)
        customerMap.set(key, c)
      }
    }

    for (const p of payments) {
      const b = bucket(toMonth(p.createdAt, 'createdAt'))
      if (b) b.inflow = b.inflow.plus(p.amount)
    }

    for (const e of expenses) {
      const b = bucket(toMonth(e.date, 'date'))
      if (b) b.outflow = b.outflow.plus(e.amount)
      totalExpenses = totalExpenses.plus(e.amount)
    }

    for (const po of purchaseOrders) {
      const b = bucket(toMonth(po.createdAt, 'createdAt'))
      if (b) b.purchases = b.purchases.plus(po.totalAmount), b.outflow = b.outflow.plus(po.totalAmount)
      totalPurchases = totalPurchases.plus(po.totalAmount)
    }

    const taxableRevenue = totalRevenue.minus(totalGst)
    const grossProfit = taxableRevenue.minus(totalPurchases)
    const netProfit = grossProfit.minus(totalExpenses)

    return {
      totals: {
        invoices: invoiced,
        revenue: Number(totalRevenue),
        gst: Number(totalGst),
        taxableRevenue: Number(taxableRevenue),
        purchases: Number(totalPurchases),
        expenses: Number(totalExpenses),
        grossProfit: Number(grossProfit),
        netProfit: Number(netProfit),
      },
      prev: { revenue: Number(prevRevenue), expenses: Number(prevExpenses) },
      monthly: [...monthly.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((m) => ({
          month: m.month,
          revenue: Number(m.revenue),
          gst: Number(m.gst),
          expense: Number(m.outflow.minus(m.purchases)),
          inflow: Number(m.inflow),
          outflow: Number(m.outflow),
          purchases: Number(m.purchases),
        })),
      topCustomers: [...customerMap.values()]
        .sort((a, b) => b.amount.minus(a.amount).toNumber())
        .slice(0, 8)
        .map((c) => ({ name: c.name, invoices: c.invoices, amount: Number(c.amount) })),
      recent: invoices
        .slice()
        .reverse()
        .slice(0, 6)
        .map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customer: inv.customer?.name ?? '—',
          amount: Number(inv.grandTotal),
        })),
    }
  },

  // ---------- INVENTORY REPORT ----------
  // Stock levels, stock value at current selling price, and low stock.
  async inventory() {
    const products = await prisma.product.findMany({
      include: {
        inventory: true,
        category: { select: { name: true } },
      },
      orderBy: { sku: 'asc' },
    })

    let totalUnits = 0
    let totalValue = new Decimal(0)
    const lowStock = []

    for (const p of products) {
      const qty = p.inventory?.quantity ?? 0
      totalUnits += qty
      totalValue = totalValue.plus(new Decimal(p.sellingPrice).mul(qty))

      if (qty <= p.lowStockThreshold) {
        lowStock.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category?.name ?? null,
          quantity: qty,
          threshold: p.lowStockThreshold,
          sellingPrice: p.sellingPrice,
        })
      }
    }

    return {
      summary: {
        products: products.length,
        totalUnits,
        stockValue: Number(totalValue),
        lowStockCount: lowStock.length,
      },
      lowStock: lowStock.sort((a, b) => a.quantity - b.quantity),
    }
  },

  // ---------- PRODUCT REPORT ----------
  // Top products by units sold and by revenue (from OrderItems).
  async products({ from, to, limit = 10 } = {}) {
    const where = {}
    const fromDate = parseDate(from)
    const toDate = parseDate(to)
    if (fromDate || toDate) {
      // OrderItem has no createdAt — filter through the parent order.
      where.order = { createdAt: {} }
      if (fromDate) where.order.createdAt.gte = fromDate
      if (toDate) where.order.createdAt.lte = toDate
    }

    const items = await prisma.orderItem.findMany({
      where,
      select: {
        sku: true,
        name: true,
        quantity: true,
        lineTotal: true,
      },
    })

    const bySku = new Map()
    for (const item of items) {
      const entry = bySku.get(item.sku) || { sku: item.sku, name: item.name, units: 0, revenue: new Decimal(0) }
      entry.units += item.quantity
      entry.revenue = entry.revenue.plus(item.lineTotal)
      bySku.set(item.sku, entry)
    }

    const rows = [...bySku.values()]
      .sort((a, b) => b.revenue.minus(a.revenue).toNumber())
      .slice(0, Number(limit) || 10)

    return { top: rows.map((r) => ({ ...r, revenue: Number(r.revenue), units: r.units })) }
  },
}

module.exports = reportService
