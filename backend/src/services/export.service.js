const prisma = require('../prisma/client')

function toCsvRow(values) {
  return values.map((v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }).join(',')
}

function toCsvString(headers, rows) {
  return [headers.join(','), ...rows.map(toCsvRow)].join('\n')
}

const exportService = {
  async products() {
    const products = await prisma.product.findMany({
      include: { category: true, inventory: true },
      orderBy: { id: 'asc' },
    })
    const headers = ['id', 'name', 'sku', 'category', 'selling_price', 'cost_price', 'stock', 'status']
    const rows = products.map((p) => [
      p.id, p.name, p.sku, p.category?.name ?? '',
      p.sellingPrice, p.costPrice, p.inventory?.quantity ?? 0, p.isActive ? 'Active' : 'Inactive',
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async customers() {
    const customers = await prisma.customer.findMany({
      include: { invoices: true },
      orderBy: { id: 'asc' },
    })
    const headers = ['id', 'name', 'email', 'phone', 'gstin', 'city', 'state', 'total_invoices', 'total_amount']
    const rows = customers.map((c) => [
      c.id, c.name, c.email ?? '', c.phone ?? '', c.gstin ?? '',
      c.city ?? '', c.state ?? '', c.invoices?.length ?? 0,
      c.invoices?.reduce((s, inv) => s + Number(inv.totalAmount), 0) ?? 0,
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async orders() {
    const invoices = await prisma.invoice.findMany({
      include: { customer: true },
      orderBy: { id: 'asc' },
    })
    const headers = ['id', 'invoice_no', 'customer', 'date', 'total_amount', 'gst_amount', 'status']
    const rows = invoices.map((inv) => [
      inv.id, inv.invoiceNo, inv.customer?.name ?? '',
      inv.createdAt?.toISOString?.() ?? inv.createdAt ?? '', inv.totalAmount, inv.gstAmount, inv.status ?? 'PENDING',
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async inventory() {
    const items = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { id: 'asc' },
    })
    const headers = ['id', 'product', 'sku', 'quantity', 'reorder_level', 'updated_at']
    const rows = items.map((inv) => [
      inv.id, inv.product?.name ?? '', inv.product?.sku ?? '',
      inv.quantity, inv.reorderLevel ?? 0, inv.updatedAt?.toISOString?.() ?? inv.updatedAt ?? '',
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async sales() {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['PAID', 'PARTIAL'] } },
      orderBy: { createdAt: 'asc' },
    })
    const byMonth = {}
    for (const inv of invoices) {
      const d = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { revenue: 0, orders: 0 }
      byMonth[key].revenue += Number(inv.totalAmount) || 0
      byMonth[key].orders++
    }
    const headers = ['month', 'revenue', 'orders', 'avg_order_value']
    const rows = Object.entries(byMonth).map(([month, v]) => [
      month, v.revenue.toFixed(2), v.orders, v.orders > 0 ? (v.revenue / v.orders).toFixed(2) : '0.00',
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async gst() {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'asc' },
    })
    const byPeriod = {}
    for (const inv of invoices) {
      const d = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byPeriod[key]) byPeriod[key] = { taxable: 0, cgst: 0, sgst: 0 }
      byPeriod[key].taxable += Number(inv.totalAmount) || 0
      byPeriod[key].cgst += Number(inv.cgstAmount) || 0
      byPeriod[key].sgst += Number(inv.sgstAmount) || 0
    }
    const headers = ['period', 'taxable_value', 'cgst', 'sgst', 'total_tax']
    const rows = Object.entries(byPeriod).map(([period, v]) => [
      period, v.taxable.toFixed(2), v.cgst.toFixed(2), v.sgst.toFixed(2), (v.cgst + v.sgst).toFixed(2),
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },
}

module.exports = exportService
