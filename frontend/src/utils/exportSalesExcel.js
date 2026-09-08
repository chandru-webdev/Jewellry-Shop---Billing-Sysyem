import * as XLSX from 'xlsx'

const statusLabel = { PAID: 'Billed', FINAL: 'Billed', DRAFT: 'Draft', VOID: 'Returned' }
const orderStatusLabel = { PENDING: 'Pending', PAID: 'Paid', FULFILLED: 'Fulfilled', CANCELLED: 'Cancelled', REFUNDED: 'Refunded' }

const fmtDate = (d) => {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v))

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

export function exportSalesInvoicesExcel(invoices, itemRows = []) {
  const wb = XLSX.utils.book_new()

  const summary = invoices.map((inv) => ({
    'Invoice No': inv.invoiceNumber,
    Date: fmtDate(inv.date || inv.createdAt),
    Customer: inv.customer?.name || '',
    Phone: inv.customer?.phone || '',
    Salesperson: inv.salesperson?.name || '',
    'Order Ref': inv.order?.orderNumber || '',
    Items: inv.totalQuantity ?? 0,
    Status: statusLabel[inv.status] || inv.status || 'Draft',
    'Payment Method': inv.paymentMethod || '',
    'Subtotal (INR)': num(inv.subtotal),
    'GST (INR)': num(inv.gstTotal),
    'Discount (INR)': num(inv.discount),
    'Grand Total (INR)': num(inv.grandTotal),
  }))

  const ws = XLSX.utils.json_to_sheet(summary)
  if (summary.length) appendTotals(ws, summary)
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices')

  if (itemRows.length) {
    const items = itemRows.map((it) => ({
      'Invoice No': it.invoiceNumber,
      Date: fmtDate(it.date),
      Product: it.name,
      SKU: it.sku || it.product?.sku || '',
      Qty: num(it.quantity),
      'Weight (g)': num(it.weight),
      'Making (INR)': num(it.makingCharge),
      'Rate (INR/g)': num(it.silverRate),
      'Base Amt (INR)': num(it.baseAmount),
      'GST (INR)': num(it.gstAmount),
      'Total (INR)': num(it.finalAmount),
    }))
    const ws2 = XLSX.utils.json_to_sheet(items)
    XLSX.utils.book_append_sheet(wb, ws2, 'Items')
  }

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Sales-Invoices-${stamp}.xlsx`)
}

function orderSheets(orders, sheetName) {
  const summary = orders.map((o) => ({
    'Order No': o.orderNumber || `#${o.id}`,
    Date: fmtDate(o.createdAt),
    Customer: o.customer?.name || '',
    Phone: o.customer?.phone || '',
    Source: o.source || '',
    'Payment Method': o.paymentMethod || '',
    Items: o._count?.items ?? o.items?.length ?? 0,
    Status: orderStatusLabel[o.status] || o.status,
    'Total (INR)': num(o.totalAmount),
  }))

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

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(summary)
  if (summary.length) appendTotals(ws, summary)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  if (itemRows.length) {
    const ws2 = XLSX.utils.json_to_sheet(itemRows)
    XLSX.utils.book_append_sheet(wb, ws2, 'Items')
  }
  return wb
}

export function exportSalesOrdersExcel(orders) {
  const stamp = new Date().toISOString().slice(0, 10)
  const wb = orderSheets(orders, 'Orders')
  XLSX.writeFile(wb, `Sales-Orders-${stamp}.xlsx`)
}

export function exportReturnsExcel(returns) {
  const stamp = new Date().toISOString().slice(0, 10)
  const wb = orderSheets(returns, 'Returns')
  XLSX.writeFile(wb, `Sales-Returns-${stamp}.xlsx`)
}

export function exportCustomersExcel(customers) {
  const rows = customers.map((c) => ({
    Name: c.name,
    Phone: c.phone || '',
    Email: c.email || '',
    GSTIN: c.gstin || '',
    Address: c.address || '',
    Orders: c.orders ?? c._count?.invoices ?? 0,
    'Total Spent (INR)': num(c.totalSpent),
    'Last Order': fmtDate(c.lastOrder),
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  if (rows.length) appendTotals(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Customers')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Customers-${stamp}.xlsx`)
}
