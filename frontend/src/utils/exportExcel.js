import * as XLSX from 'xlsx'

export const orderStatusLabel = { PENDING: 'Pending', PAID: 'Paid', FULFILLED: 'Fulfilled', CANCELLED: 'Cancelled', REFUNDED: 'Refunded' }
const piStatusLabel = { PENDING: 'Pending', PARTIALLY_PAID: 'Partly Paid', PAID: 'Paid', VOID: 'Void' }
const poStatusLabel = { PENDING: 'Pending', CONFIRMED: 'Confirmed', PROCESSING: 'Processing', RECEIVED: 'Received', CANCELLED: 'Cancelled', RETURNED: 'Returned' }
const prStatusLabel = { PENDING: 'Pending', APPROVED: 'Approved', PROCESSING: 'Processing', COMPLETED: 'Completed', REJECTED: 'Rejected' }
const payStatusLabel = { PAID: 'Paid', PENDING: 'Pending', FAILED: 'Failed', REFUNDED: 'Refunded', CANCELLED: 'Cancelled' }

export const fmtDate = (d) => {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v))

// Inclusive [from, to] date filter. from/to are 'YYYY-MM-DD' strings or undefined.
export const inRange = (dateVal, from, to) => {
  const d = fmtDate(dateVal)
  if (!d) return true
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

const appendTotals = (ws, rows) => {
  const headers = rows[0] ? Object.keys(rows[0]) : []
  if (!headers.length) return
  const totals = headers.map((h, i) => {
    if (i === 0) return 'TOTAL'
    let sum = 0
    for (const r of rows) {
      const v = Number(r[h])
      if (Number.isFinite(v)) sum += v
    }
    return sum
  })
  XLSX.utils.sheet_add_aoa(ws, [totals], { origin: -1 })
}

const finish = (wb, filename) => {
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`)
}

const sheet = (wb, name, rows) => {
  const ws = XLSX.utils.json_to_sheet(rows)
  if (rows.length) appendTotals(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, name)
  return ws
}

const wb = () => XLSX.utils.book_new()

// ---------- Products ----------
export function exportProductsExcel(products) {
  const rows = products.map((p) => ({
    Product: p.name,
    SKU: p.sku,
    Category: p.category?.name || '',
    Purity: num(p.purity),
    'Net Weight (g)': num(p.weight),
    'Making Charge (INR/g)': num(p.makingCharge),
    'GST %': num(p.gstPercent),
    'Cost Price (INR)': num(p.costPrice),
    'Selling Price (INR)': num(p.sellingPrice),
    'Stock Qty': num(p.inventory?.quantity) || 0,
    'Low Stock Level': num(p.lowStockThreshold) || 0,
    Status: p.isActive ? 'Active' : 'Inactive',
    Created: fmtDate(p.createdAt),
  }))
  const out = wb()
  sheet(out, 'Products', rows)
  finish(out, 'Products')
}

// ---------- Inventory (stock overview) ----------
export function exportInventoryExcel(apiItems) {
  const rows = (apiItems || []).map((item) => {
    const qty = num(item.quantity)
    const weight = num(item.weight ?? item.product?.weight)
    const reorderLevel = num(item.reorderLevel ?? item.product?.lowStockThreshold)
    const costValue = num(item.costValue ?? item.product?.costPrice) * qty
    const sellingValue = num(item.sellingValue ?? item.product?.sellingPrice) * qty
    const status = qty === 0 ? 'Out of Stock' : qty <= reorderLevel ? 'Low Stock' : 'In Stock'
    return {
      Product: item.product?.name || item.name || '',
      SKU: item.product?.sku || item.sku || '',
      Qty: qty,
      'Weight (g)': weight,
      'Cost Value (INR)': costValue,
      'Selling Value (INR)': sellingValue,
      'Reorder Level': reorderLevel,
      Status: status,
    }
  })
  const out = wb()
  sheet(out, 'Inventory', rows)
  finish(out, 'Inventory')
}

// ---------- Orders (with line items) ----------
export function exportOrdersExcel(orders) {
  const out = wb()
  const rows = orders.map((o) => ({
    'Order No': o.orderNumber || `#${o.id}`,
    'Internal ID': o.id,
    Date: fmtDate(o.createdAt),
    Customer: o.customer?.name || '',
    Phone: o.customer?.phone || '',
    Source: o.source || '',
    'Payment Method': o.paymentMethod || '',
    Items: o._count?.items ?? o.items?.length ?? 0,
    'Invoice Ref': o.invoice?.invoiceNumber || '',
    Status: orderStatusLabel[o.status] || o.status,
    'Total (INR)': num(o.totalAmount),
  }))
  sheet(out, 'Orders', rows)

  const itemRows = []
  for (const o of orders) {
    for (const it of o.items || []) {
      itemRows.push({
        'Order No': o.orderNumber || `#${o.id}`,
        Product: it.name,
        SKU: it.sku,
        Qty: num(it.quantity),
        'Unit Price (INR)': num(it.unitPrice),
        'Weight (g)': num(it.weight),
        'Making (INR)': num(it.makingCharge),
        'Rate (INR/g)': num(it.silverRate),
        'GST (INR)': num(it.gstAmount),
        'Line Total (INR)': num(it.lineTotal),
      })
    }
  }
  if (itemRows.length) {
    const ws = XLSX.utils.json_to_sheet(itemRows)
    XLSX.utils.book_append_sheet(out, ws, 'Items')
  }
  finish(out, 'Orders')
}

// ---------- Customers ----------
export function exportCustomersExcel(customers) {
  const rows = customers.map((c) => ({
    Name: c.name,
    Phone: c.phone || '',
    Email: c.email || '',
    Address: c.address || '',
    GSTIN: c.gstin || '',
    Orders: c.orders ?? c._count?.invoices ?? 0,
    'Total Spent (INR)': num(c.totalSpent),
    'Last Order': fmtDate(c.lastOrder),
    Created: fmtDate(c.createdAt),
  }))
  const out = wb()
  sheet(out, 'Customers', rows)
  finish(out, 'Customers')
}

// ---------- Suppliers ----------
export function exportSuppliersExcel(suppliers) {
  const rows = suppliers.map((s) => ({
    Supplier: s.name,
    'Contact Person': s.contactPerson || '',
    Phone: s.phone || '',
    Email: s.email || '',
    Address: s.address || '',
    GSTIN: s.gstin || '',
    'Total POs': num(s.totalPOs),
    'Purchase Value (INR)': num(s.totalPurchaseValue),
    'Outstanding (INR)': num(s.outstanding),
    Status: s.isActive ? 'Active' : 'Inactive',
    Created: fmtDate(s.createdAt),
  }))
  const out = wb()
  sheet(out, 'Suppliers', rows)
  finish(out, 'Suppliers')
}

// ---------- Purchase Invoices ----------
export function exportPurchaseInvoicesExcel(invoices) {
  const out = wb()
  const rows = invoices.map((inv) => ({
    'Invoice #': inv.invoiceNumber,
    'PO Ref': inv.purchaseOrder?.poNumber || '',
    Supplier: inv.supplier?.name || '',
    Phone: inv.supplier?.phone || '',
    'Invoice Date': fmtDate(inv.invoiceDate),
    'Due Date': fmtDate(inv.dueDate),
    'Subtotal (INR)': num(inv.subtotal),
    'GST (INR)': num(inv.gstAmount),
    'Total (INR)': num(inv.totalAmount),
    'Amount Paid (INR)': num(inv.amountPaid),
    'Balance (INR)': num(inv.totalAmount) - num(inv.amountPaid),
    Status: piStatusLabel[inv.status] || inv.status,
  }))
  sheet(out, 'Purchase Invoices', rows)

  const itemRows = []
  for (const inv of invoices) {
    for (const it of inv.items || []) {
      itemRows.push({
        'Invoice #': inv.invoiceNumber,
        Product: it.name || it.product?.name || '',
        SKU: it.sku || it.product?.sku || '',
        Qty: num(it.quantity),
        'Unit Price (INR)': num(it.unitPrice),
        'Line Total (INR)': num(it.lineTotal),
      })
    }
  }
  if (itemRows.length) {
    const ws = XLSX.utils.json_to_sheet(itemRows)
    XLSX.utils.book_append_sheet(out, ws, 'Items')
  }
  finish(out, 'Purchase-Invoices')
}

// ---------- Purchase Orders ----------
export function exportPurchaseOrdersExcel(orders) {
  const out = wb()
  const rows = orders.map((o) => ({
    'PO #': o.poNumber,
    Supplier: o.supplier?.name || '',
    Phone: o.supplier?.phone || '',
    'Order Date': fmtDate(o.orderDate || o.createdAt),
    'Expected Delivery': fmtDate(o.expectedDelivery),
    Items: o.totalItems ?? o._count?.items ?? 0,
    Qty: num(o.totalQuantity),
    'Weight (g)': num(o.totalWeight),
    'Subtotal (INR)': num(o.subtotal),
    'GST %': num(o.gstPercent),
    'Total (INR)': num(o.totalAmount),
    Status: poStatusLabel[o.status] || o.status,
  }))
  sheet(out, 'Purchase Orders', rows)

  const itemRows = []
  for (const o of orders) {
    for (const it of o.items || []) {
      itemRows.push({
        'PO #': o.poNumber,
        Product: it.name || '',
        SKU: it.sku || '',
        Qty: num(it.quantity),
        'Unit Price (INR)': num(it.unitPrice),
        'Weight (g)': num(it.weight),
        'Line Total (INR)': num(it.lineTotal),
      })
    }
  }
  if (itemRows.length) {
    const ws = XLSX.utils.json_to_sheet(itemRows)
    XLSX.utils.book_append_sheet(out, ws, 'Items')
  }
  finish(out, 'Purchase-Orders')
}

// ---------- Purchase Returns ----------
export function exportPurchaseReturnsExcel(returns) {
  const out = wb()
  const rows = returns.map((r) => ({
    'Return #': r.returnNumber,
    'PO Ref': r.purchaseOrder?.poNumber || '',
    Supplier: r.supplier?.name || '',
    'Return Date': fmtDate(r.createdAt || r.date),
    Items: r.totalItems ?? r._count?.items ?? 0,
    Qty: num(r.totalQuantity),
    'Weight (g)': num(r.totalWeight),
    Reason: r.reason || '',
    'Refund Amount (INR)': num(r.totalAmount),
    Status: prStatusLabel[r.status] || r.status,
  }))
  sheet(out, 'Purchase Returns', rows)

  const itemRows = []
  for (const r of returns) {
    for (const it of r.items || []) {
      itemRows.push({
        'Return #': r.returnNumber,
        Product: it.name || '',
        SKU: it.sku || '',
        Qty: num(it.quantity),
        'Unit Price (INR)': num(it.unitPrice),
        'Weight (g)': num(it.weight),
        'Line Total (INR)': num(it.lineTotal),
      })
    }
  }
  if (itemRows.length) {
    const ws = XLSX.utils.json_to_sheet(itemRows)
    XLSX.utils.book_append_sheet(out, ws, 'Items')
  }
  finish(out, 'Purchase-Returns')
}

// ---------- Payments ----------
export function exportPaymentsExcel(payments) {
  const rows = payments.map((p) => ({
    Date: fmtDate(p.createdAt || p.date),
    'Invoice Ref': p.invoice?.invoiceNumber || '',
    'Order Ref': p.order?.orderNumber || '',
    'Customer / Supplier': p.customer?.name || p.supplier?.name || '',
    Method: p.method || '',
    Type: p.type || '',
    Amount: Math.abs(num(p.amount)),
    Status: payStatusLabel[p.status] || p.status,
    Reference: p.reference || '',
  }))
  const out = wb()
  sheet(out, 'Payments', rows)
  finish(out, 'Payments')
}

// ---------- Expenses ----------
export function exportExpensesExcel(expenses) {
  const rows = expenses.map((e) => ({
    Date: fmtDate(e.date),
    Category: e.category || '',
    Description: e.description || '',
    'Amount (INR)': num(e.amount),
    'Payment Method': e.paymentMethod || '',
    Status: e.status || '',
    Reference: e.reference || '',
  }))
  const out = wb()
  sheet(out, 'Expenses', rows)
  finish(out, 'Expenses')
}

// ---------- Metal rate history ----------
export function exportMetalRateHistoryExcel(history) {
  const rows = history.map((h) => ({
    Date: fmtDate(h.changedAt),
    Metal: h.metal || 'silver',
    'Old Rate (INR/g)': num(h.oldRate),
    'New Rate (INR/g)': num(h.newRate),
    'Change (INR/g)': num(h.newRate) - num(h.oldRate),
    'Changed By': h.changedBy?.name || '',
  }))
  const out = wb()
  sheet(out, 'Rate History', rows)
  finish(out, 'Metal-Rates')
}
