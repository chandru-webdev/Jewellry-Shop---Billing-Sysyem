const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const shopifyService = require('./shopify.service')

const Decimal = Prisma.Decimal

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfMonth(date = new Date()) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function getDateRange(filter, customStart, customEnd) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  switch (filter) {
    case 'today': {
      return { start: todayStart, end: todayEnd }
    }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case 'last7days': {
      const s = new Date(now)
      s.setDate(s.getDate() - 6)
      return { start: startOfDay(s), end: todayEnd }
    }
    case 'last30days': {
      const s = new Date(now)
      s.setDate(s.getDate() - 29)
      return { start: startOfDay(s), end: todayEnd }
    }
    case 'thisMonth': {
      return { start: startOfMonth(now), end: todayEnd }
    }
    case 'lastMonth': {
      const s = new Date(now)
      s.setMonth(s.getMonth() - 1)
      s.setDate(1)
      const e = new Date(now)
      e.setDate(0)
      return { start: startOfDay(s), end: endOfDay(e) }
    }
    case 'custom': {
      const s = customStart ? new Date(customStart) : todayStart
      const e = customEnd ? new Date(customEnd) : todayEnd
      return { start: startOfDay(s), end: endOfDay(e) }
    }
    default: {
      // Default: this week (last 7 days)
      const s = new Date(now)
      s.setDate(s.getDate() - 6)
      return { start: startOfDay(s), end: todayEnd }
    }
  }
}

// One endpoint that powers the whole dashboard. Everything is read-only.
const dashboardService = {
  async getStats(filters = {}) {
    const { filter = 'last7days', startDate, endDate } = filters
    const dateRange = getDateRange(filter, startDate, endDate)
    const now = new Date()
    const today = startOfDay(now)
    const month = startOfMonth(now)

    const [
      // Filtered period stats
      revenuePeriod,
      salesPeriod,
      ordersPeriod,
      // Today stats
      revenueToday,
      salesToday,
      ordersToday,
      // Month stats
      revenueMonth,
      salesMonth,
      // Overall
      pendingOrders,
      customers,
      productCounts,
      silverRate,
      lowStockProducts,
      recentInvoices,
      recentOrders,
      // Period-specific data
      periodOrders,
      periodPayments,
      // Silver rate history for the period
      silverRateHistory,
      // Total revenue (all time)
      totalRevenueAgg,
    ] = await Promise.all([
      // Revenue for selected period (from orders — invoices don't exist for Shopify orders)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),

      // Invoice count for selected period (revenue-eligible sales count)
      prisma.order.count({
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),

      // Orders count for selected period
      prisma.order.count({
        where: { createdAt: { gte: dateRange.start, lte: dateRange.end } },
      }),

      // Today revenue (from orders)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { totalAmount: true },
      }),

      // Today sales count (orders)
      prisma.order.count({
        where: { createdAt: { gte: today }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),

      // Today orders
      prisma.order.count({ where: { createdAt: { gte: today } } }),

      // Month revenue (from orders)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: month },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { totalAmount: true },
      }),

      // Month sales count (orders)
      prisma.order.count({
        where: { createdAt: { gte: month }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      }),

      // Pending orders
      prisma.order.count({ where: { status: 'PENDING' } }),

      // Total customers
      prisma.customer.count(),

      // Product counts
      prisma.product.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),

      // Current silver rate
      prisma.metalRate.findUnique({
        where: { metal: 'silver' },
        include: { updatedBy: { select: { name: true } } },
      }),

      // Low stock products
      prisma.product.findMany({
        where: { isActive: true, inventory: { isNot: null } },
        include: {
          inventory: true,
          category: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // Recent invoices (last 6)
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

      // Recent orders (last 6)
      prisma.order.findMany({
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),

      // All orders in selected period (for top products calculation + daily sales chart)
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: dateRange.start, lte: dateRange.end },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
        },
        include: {
          product: { select: { id: true, name: true, sku: true, sellingPrice: true } },
          order: { select: { createdAt: true } },
        },
      }),

      // Payments for period (for payment status chart)
      prisma.payment.findMany({
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }),

      // Silver rate history for the period
      prisma.metalRateHistory.findMany({
        where: {
          changedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        orderBy: { changedAt: 'asc' },
        take: 30,
      }),

      // Total revenue (all time, from orders)
      prisma.order.aggregate({
        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _sum: { totalAmount: true },
      }),
    ])

    const totalProducts = productCounts.reduce((sum, row) => sum + row._count._all, 0)
    const activeProducts = productCounts.find((row) => row.isActive)?._count?._all ?? 0

    const lowStock = lowStockProducts.filter(
      (p) => (p.inventory?.quantity ?? 0) <= p.lowStockThreshold
    )

    // Calculate top selling products from period orders
    const productSales = {}
    for (const item of periodOrders) {
      const key = item.productId
      if (!productSales[key]) {
        productSales[key] = {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          qty: 0,
          weight: 0,
          revenue: new Decimal(0),
        }
      }
      productSales[key].qty += item.quantity
      productSales[key].weight += Number(item.weight || 0) * item.quantity
      productSales[key].revenue = productSales[key].revenue.plus(item.lineTotal || 0)
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue.minus(a.revenue).toNumber())
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        sku: p.sku,
        qty: p.qty,
        weight: Number(p.weight.toFixed(2)),
        revenue: Number(p.revenue.toFixed(2)),
      }))

    // Calculate payment status from period data
    const paidAmount = periodPayments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0))
    const pendingPaymentAmount = periodPayments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0))
    const failedPaymentAmount = periodPayments
      .filter((p) => p.status === 'FAILED')
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0))
    const refundedPaymentAmount = periodPayments
      .filter((p) => p.status === 'REFUNDED')
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0))

    const paymentTotal = paidAmount
      .plus(pendingPaymentAmount)
      .plus(failedPaymentAmount)
      .plus(refundedPaymentAmount)
    const paymentTotalNum = Number(paymentTotal)

    const paymentStatus = [
      {
        name: 'Paid',
        value: Number(paidAmount),
        pct: paymentTotalNum > 0 ? Math.round((Number(paidAmount) / paymentTotalNum) * 100) : 0,
        color: '#10b981',
      },
      {
        name: 'Pending',
        value: Number(pendingPaymentAmount),
        pct: paymentTotalNum > 0 ? Math.round((Number(pendingPaymentAmount) / paymentTotalNum) * 100) : 0,
        color: '#f59e0b',
      },
      {
        name: 'Failed / Overdue',
        value: Number(failedPaymentAmount),
        pct: paymentTotalNum > 0 ? Math.round((Number(failedPaymentAmount) / paymentTotalNum) * 100) : 0,
        color: '#ef4444',
      },
      {
        name: 'Refunded',
        value: Number(refundedPaymentAmount),
        pct: paymentTotalNum > 0 ? Math.round((Number(refundedPaymentAmount) / paymentTotalNum) * 100) : 0,
        color: '#64748b',
      },
    ]

    // Generate sales overview data by day within the period
    const salesOverview = []
    const msPerDay = 86400000
    const dayCount = Math.min(Math.ceil((dateRange.end - dateRange.start) / msPerDay) + 1, 31)
    for (let i = 0; i < dayCount; i++) {
      const day = new Date(dateRange.start)
      day.setDate(day.getDate() + i)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      // We'll calculate these with a quick query in parallel below, but for now
      // use a simpler approach: group by date from order data
      const dayOrders = periodOrders.filter((item) => {
        const created = new Date(item.order?.createdAt || 0)
        return created >= day && created <= dayEnd
      })

      const dayLabel = day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      const dayRevenue = dayOrders.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
      )

      salesOverview.push({
        date: dayLabel,
        revenue: Math.round(dayRevenue),
        orders: dayOrders.length,
      })
    }

    // Format silver rate history for the chart
    const silverRateData = silverRateHistory.map((h) => ({
      date: h.changedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      rate: Number(h.newRate),
    }))

    // If no history data, add current rate as single point
    if (silverRateData.length === 0 && silverRate) {
      silverRateData.push({
        date: today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        rate: Number(silverRate.rate),
      })
    }

    // Calculate previous period for trend comparison
    const periodLength = dateRange.end - dateRange.start
    const prevStart = new Date(dateRange.start.getTime() - periodLength)
    const prevEnd = new Date(dateRange.start.getTime() - 1)

    const [prevRevenue, prevSalesCount, prevOrdersCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: prevStart, lte: prevEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: prevStart, lte: prevEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      prisma.order.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
    ])

    // Calculate supplier count, stock, weight, outstanding, and inventory value in parallel
    const [suppliers, stockAgg, weightAgg, outstandingAgg, inventoryValueAgg] = await Promise.all([
      prisma.supplier.count(),
      prisma.inventory.aggregate({ _sum: { quantity: true } }),
      prisma.product.aggregate({ where: { isActive: true }, _sum: { weight: true } }),
      prisma.payment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      prisma.product.aggregate({ where: { isActive: true }, _sum: { sellingPrice: true } }),
    ])

    // Today's expenses (payments out - for now use total payments in period)
    // This is a placeholder until an expenses model is added
    const todayExpenses = new Decimal(0)

    // Calculate period-specific totals
    const periodRevenue = Number(revenuePeriod._sum.totalAmount ?? 0)
    const prevPeriodRevenue = Number(prevRevenue._sum.totalAmount ?? 0)
    const salesTrend = prevPeriodRevenue > 0
      ? Math.round(((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100)
      : 0

    const ordersTrend = prevOrdersCount > 0
      ? Math.round(((ordersPeriod - prevOrdersCount) / prevOrdersCount) * 100)
      : 0

    // Month-over-month comparison for bottom analytics
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const lastMonthEnd = startOfMonth(now)

    const [lastMonthRevenue, lastMonthOrders] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
    ])

    const monthRevenue = Number(revenueMonth._sum.totalAmount ?? 0)
    const lastMonthRevenueNum = Number(lastMonthRevenue._sum.totalAmount ?? 0)
    const monthSalesTrend = lastMonthRevenueNum > 0
      ? Math.round(((monthRevenue - lastMonthRevenueNum) / lastMonthRevenueNum) * 100)
      : 0

    const monthSalesCount = salesMonth
    const monthOrdersTrend = lastMonthOrders > 0
      ? Math.round(((monthSalesCount - lastMonthOrders) / lastMonthOrders) * 100)
      : 0

    const avgOrderValue = monthSalesCount > 0 ? Math.round(monthRevenue / monthSalesCount) : 0
    const prevAvgOrderValue = lastMonthOrders > 0 ? Math.round(lastMonthRevenueNum / lastMonthOrders) : 0
    const avgOrderTrend = prevAvgOrderValue > 0
      ? Math.round(((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100)
      : 0

    const inventoryValue = Number(inventoryValueAgg._sum.sellingPrice ?? 0)

    return {
      // Date range info
      dateRange: {
        filter,
        start: dateRange.start,
        end: dateRange.end,
      },

      // Period KPIs (filtered by date range)
      periodRevenue,
      periodSalesCount: salesPeriod,
      periodOrdersCount: ordersPeriod,
      salesTrend,
      ordersTrend,

      // Today stats
      revenue: {
        today: Number(revenueToday._sum.totalAmount ?? 0),
        month: monthRevenue,
        total: Number(totalRevenueAgg._sum.totalAmount ?? 0),
      },
      sales: {
        today: salesToday,
        month: monthSalesCount,
      },
      orders: {
        pending: pendingOrders,
        today: ordersToday,
      },

      customers,
      suppliers,
      products: { total: totalProducts, active: activeProducts },

      // Stock summary
      stock: {
        totalQuantity: stockAgg._sum.quantity ?? 0,
        totalWeight: Number(weightAgg._sum.weight ?? 0),
      },

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

      // Charts
      salesOverview,
      topProducts,
      paymentStatus,
      paymentTotal: Number(paymentTotal),
      silverRateHistory: silverRateData,

      // Outstanding / pending
      outstanding: Number(outstandingAgg._sum.amount ?? 0),
      outstandingInvoices: outstandingAgg._count,
      todayExpenses: Number(todayExpenses),

      // Bottom analytics
      monthSales: monthRevenue,
      monthSalesTrend,
      monthOrders: monthSalesCount,
      monthOrdersTrend,
      avgOrderValue,
      avgOrderTrend,
      returnRate: 0,
      returnRateTrend: 0,
      profitMargin: monthRevenue > 0 ? Math.round(((monthRevenue - Number(todayExpenses)) / monthRevenue) * 100 * 100) / 100 : 0,
      profitMarginTrend: 0,
      inventoryValue,

      shopifySync: await shopifyService.syncStatus().catch(() => null),
    }
  },
}

module.exports = dashboardService
