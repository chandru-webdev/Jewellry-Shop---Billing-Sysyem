const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const shopifyService = require('./shopify.service')

const Decimal = Prisma.Decimal

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// One endpoint that powers the whole dashboard. Everything is read-only.
const dashboardService = {
  async getStats() {
    const today = startOfDay()
    const month = startOfMonth()

    const [
      revenueToday,
      revenueMonth,
      revenueTotal,
      salesToday,
      salesMonth,
      salesTotal,
      pendingOrders,
      ordersToday,
      customers,
      productCounts,
      silverRate,
      lowStockProducts,
      recentInvoices,
      recentOrders,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { date: { gte: today }, status: { not: 'VOID' } },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: { date: { gte: month }, status: { not: 'VOID' } },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { not: 'VOID' } },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.count({
        where: { date: { gte: today }, status: { not: 'VOID' } },
      }),
      prisma.invoice.count({
        where: { date: { gte: month }, status: { not: 'VOID' } },
      }),
      prisma.invoice.count({
        where: { status: { not: 'VOID' } },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.customer.count(),
      prisma.product.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),
      prisma.metalRate.findUnique({
        where: { metal: 'silver' },
        include: { updatedBy: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { isActive: true, inventory: { isNot: null } },
        include: {
          inventory: true,
          category: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { status: { not: 'VOID' } },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          salesperson: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { date: 'desc' },
        take: 6,
      }),
      prisma.order.findMany({
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ])

    const totalProducts = productCounts.reduce((sum, row) => sum + row._count._all, 0)
    const activeProducts = productCounts.find((row) => row.isActive)?._count?._all ?? 0

    const lowStock = lowStockProducts.filter(
      (p) => (p.inventory?.quantity ?? 0) <= p.lowStockThreshold
    )

    return {
      revenue: {
        today: revenueToday._sum.grandTotal ?? new Decimal(0),
        month: revenueMonth._sum.grandTotal ?? new Decimal(0),
        total: revenueTotal._sum.grandTotal ?? new Decimal(0),
      },
      sales: {
        today: salesToday,
        month: salesMonth,
        total: salesTotal,
      },
      orders: {
        pending: pendingOrders,
        today: ordersToday,
      },
      customers,
      products: { total: totalProducts, active: activeProducts },
      silverRate: silverRate
        ? {
            rate: silverRate.rate,
            updatedAt: silverRate.updatedAt,
            updatedBy: silverRate.updatedBy?.name ?? null,
          }
        : null,
      lowStock: {
        count: lowStock.length,
        items: lowStock.slice(0, 8).map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category?.name ?? null,
          quantity: p.inventory?.quantity ?? 0,
          threshold: p.lowStockThreshold,
        })),
      },
      recentInvoices,
      recentOrders,
      // Latest Shopify sync status (Phase 19) — read directly, never fails the dashboard
      shopifySync: await shopifyService.syncStatus().catch(() => null),
    }
  },
}

module.exports = dashboardService
