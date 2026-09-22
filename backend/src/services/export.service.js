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

// Flatten either Json array of image URLs or a single shopifyImageUrl into one column.
function productImageUrl(p) {
  if (Array.isArray(p.imageUrls) && p.imageUrls.length) {
    return p.imageUrls.filter(Boolean).join('; ')
  }
  return p.shopifyImageUrl ?? ''
}

function allImageUrls(p) {
  const urls = []
  if (Array.isArray(p.imageUrls)) {
    for (const u of p.imageUrls) if (u) urls.push(u)
  }
  if (p.shopifyImageUrl && !urls.includes(p.shopifyImageUrl)) urls.push(p.shopifyImageUrl)
  return urls.length ? urls.join('; ') : ''
}

const toDate = (d) => (d instanceof Date ? d.toISOString() : d ? String(d) : '')

const exportService = {
  async products() {
    const products = await prisma.product.findMany({
      include: { category: true, collection: true, supplier: true, inventory: true },
      orderBy: { id: 'asc' },
    })
    const headers = [
      'id', 'sku', 'name', 'description', 'category', 'collection', 'supplier',
      'barcode', 'metal', 'purity', 'colour', 'gross_weight_g', 'stone_weight_g', 'net_weight_g',
      'weight_g', 'stone_type', 'stone_pieces', 'stone_value', 'silver_rate_used',
      'making_charge_per_g', 'gst_percent', 'base_amount', 'gst_amount', 'selling_price',
      'cost_price', 'compare_at_price', 'stock_quantity', 'reserved_quantity', 'low_stock_threshold',
      'status', 'pending_import', 'charge_tax', 'track_inventory', 'push_to_shopify', 'shopify_status',
      'shopify_product_id', 'shopify_variant_id', 'shopify_inventory_item_id', 'shopify_vendor',
      'shopify_product_type', 'shopify_tags', 'image_url', 'image_urls_all', 'created_at', 'updated_at',
    ]
    const rows = products.map((p) => [
      p.id, p.sku, p.name, p.description ?? '',
      p.category?.name ?? '', p.collection?.name ?? '', p.supplier?.name ?? '',
      p.barcode ?? '', p.metal ?? 'silver', p.purity ?? 92.5, p.colour ?? '',
      p.grossWeight ?? 0, p.stoneWeight ?? 0, p.netWeight ?? 0, p.weight ?? 0,
      p.stoneType ?? '', p.stonePieces ?? '', p.stoneValue ?? '', p.silverRateUsed ?? '',
      p.makingCharge ?? 0, p.gstPercent ?? 3, p.baseAmount ?? 0, p.gstAmount ?? 0, p.sellingPrice ?? 0,
      p.costPrice ?? 0, p.compareAtPrice ?? '', p.inventory?.quantity ?? 0, p.inventory?.reserved ?? 0,
      p.lowStockThreshold ?? 5, p.isActive ? 'Active' : 'Inactive', p.pendingImport ? 'Pending Import' : '',
      p.chargeTax !== false, p.trackInventory !== false, p.pushToShopify !== false, p.shopifyStatus ?? 'active',
      p.shopifyProductId ? String(p.shopifyProductId) : '', p.shopifyVariantId ? String(p.shopifyVariantId) : '',
      p.shopifyInventoryItemId ? String(p.shopifyInventoryItemId) : '', p.shopifyVendor ?? '',
      p.shopifyProductType ?? '', p.shopifyTags ?? '', productImageUrl(p), allImageUrls(p),
      toDate(p.createdAt), toDate(p.updatedAt),
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async customers() {
    const customers = await prisma.customer.findMany({
      include: { invoices: true },
      orderBy: { id: 'asc' },
    })
    const headers = [
      'id', 'name', 'email', 'phone', 'address', 'gstin',
      'total_invoices', 'total_amount', 'created_at', 'updated_at',
    ]
    const rows = customers.map((c) => [
      c.id, c.name, c.email ?? '', c.phone ?? '', c.address ?? '', c.gstin ?? '',
      c.invoices?.length ?? 0,
      c.invoices?.reduce((s, inv) => s + Number(inv.grandTotal), 0) ?? 0,
      toDate(c.createdAt), toDate(c.updatedAt),
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async orders() {
    const invoices = await prisma.invoice.findMany({
      include: { customer: true, order: true },
      orderBy: { id: 'asc' },
    })
    const headers = [
      'id', 'invoice_no', 'customer', 'customer_email', 'customer_phone', 'date',
      'due_date', 'order_ref', 'payment_method', 'salesperson',
      'subtotal', 'discount', 'gst_amount', 'grand_total', 'total_weight', 'total_making_charge',
      'status', 'created_at', 'updated_at',
    ]
    const rows = invoices.map((inv) => [
      inv.id, inv.invoiceNumber, inv.customer?.name ?? '',
      inv.customer?.email ?? '', inv.customer?.phone ?? '',
      toDate(inv.date) || toDate(inv.createdAt), toDate(inv.dueDate),
      inv.order?.orderNumber ?? '',
      inv.paymentMethod ?? '', inv.salespersonId ?? '',
      inv.subtotal ?? 0, inv.discount ?? 0, inv.gstTotal ?? 0, inv.grandTotal ?? 0,
      inv.totalWeight ?? 0, inv.totalMakingCharge ?? 0,
      inv.status ?? 'DRAFT', toDate(inv.createdAt), toDate(inv.updatedAt),
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async inventory() {
    const items = await prisma.inventory.findMany({
      include: { product: { include: { category: true, supplier: true } } },
      orderBy: { id: 'asc' },
    })
    const headers = [
      'id', 'product', 'sku', 'category', 'supplier', 'quantity', 'reserved',
      'low_stock_threshold', 'selling_price', 'cost_price', 'image_url', 'updated_at',
    ]
    const rows = items.map((inv) => [
      inv.id, inv.product?.name ?? '', inv.product?.sku ?? '',
      inv.product?.category?.name ?? '', inv.product?.supplier?.name ?? '',
      inv.quantity, inv.reserved ?? 0, inv.product?.lowStockThreshold ?? 0,
      inv.product?.sellingPrice ?? 0, inv.product?.costPrice ?? 0,
      productImageUrl(inv.product), toDate(inv.updatedAt),
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },

  async sales() {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['PAID'] } },
      orderBy: { createdAt: 'asc' },
    })
    const byMonth = {}
    for (const inv of invoices) {
      const d = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { revenue: 0, orders: 0 }
      byMonth[key].revenue += Number(inv.grandTotal) || 0
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
      byPeriod[key].taxable += Number(inv.grandTotal) || 0
      byPeriod[key].cgst += Number(inv.gstTotal) / 2 || 0
      byPeriod[key].sgst += Number(inv.gstTotal) / 2 || 0
    }
    const headers = ['period', 'taxable_value', 'cgst', 'sgst', 'total_tax']
    const rows = Object.entries(byPeriod).map(([period, v]) => [
      period, v.taxable.toFixed(2), v.cgst.toFixed(2), v.sgst.toFixed(2), (v.cgst + v.sgst).toFixed(2),
    ])
    return { csv: toCsvString(headers, rows), count: rows.length, size: toCsvString(headers, rows).length }
  },
}

module.exports = exportService