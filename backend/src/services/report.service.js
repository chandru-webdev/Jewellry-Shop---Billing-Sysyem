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
  // grouped by day. Also returns aggregate totals.
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
      },
      orderBy: { date: 'asc' },
    })

    // Group by calendar day (YYYY-MM-DD local time)
    const byDay = new Map()
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

      totalRevenue = totalRevenue.plus(inv.grandTotal)
      totalGst = totalGst.plus(inv.gstTotal)
      totalDiscount = totalDiscount.plus(inv.discount)
      count += 1
    }

    return {
      totals: {
        invoices: count,
        revenue: totalRevenue,
        gst: totalGst,
        discount: totalDiscount,
      },
      daily: [...byDay.values()].map((e) => ({
        date: e.date,
        revenue: e.revenue,
        count: e.count,
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
        stockValue: totalValue,
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
    if (fromDate) where.createdAt = { ...where.createdAt, gte: fromDate }
    if (toDate) where.createdAt = { ...where.createdAt, lte: toDate }

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

    return { top: rows }
  },
}

module.exports = reportService
