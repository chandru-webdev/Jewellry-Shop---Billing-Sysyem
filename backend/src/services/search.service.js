const prisma = require('../prisma/client')

const searchService = {
  // GET /api/search?q=query — global search across Products, Invoices, Orders, Customers
  async search(query, role) {
    if (!query || query.trim().length < 1) {
      return { products: [], invoices: [], orders: [], customers: [] }
    }

    const q = query.trim()

    // Build role-based restrictions
    // All authenticated users can search; data filtering is at query level

    const [products, invoices, orders, customers] = await Promise.all([
      // Products: search by name or SKU
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          category: { select: { name: true } },
          inventory: { select: { quantity: true } },
        },
        take: 8,
        orderBy: { name: 'asc' },
      }),

      // Invoices: search by invoice number or customer name
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          grandTotal: true,
          date: true,
          customer: { select: { name: true } },
        },
        take: 8,
        orderBy: { date: 'desc' },
      }),

      // Orders: search by order number or customer name
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          source: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),

      // Customers: search by name, phone, or email
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          _count: { select: { invoices: true, orders: true } },
        },
        take: 8,
        orderBy: { name: 'asc' },
      }),
    ])

    return { products, invoices, orders, customers }
  },
}

module.exports = searchService
