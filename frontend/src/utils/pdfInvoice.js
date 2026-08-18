import { jsPDF } from 'jspdf'

const INR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 15

  // Colors
  const royal = [76, 29, 149]
  const gold = [184, 134, 11]
  const dark = [30, 27, 46]
  const muted = [107, 114, 128]
  const light = [243, 244, 246]

  // Helper: draw text
  const text = (str, x, y, opts = {}) => {
    const { size = 10, weight = 'normal', color = dark, align = 'left' } = opts
    doc.setFontSize(size)
    doc.setFont('helvetica', weight)
    doc.setTextColor(...color)
    if (align === 'right') {
      doc.text(str, x, y, { align: 'right' })
    } else {
      doc.text(str, x, y)
    }
  }

  // Helper: draw line
  const line = (x1, y1, x2, y2, c = royal, w = 0.5) => {
    doc.setDrawColor(...c)
    doc.setLineWidth(w)
    doc.line(x1, y1, x2, y2)
  }

  // ---- HEADER ----
  // Brand
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...royal)
  doc.text('OPAL', 20, y)
  doc.text('LINE', 55, y)
  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...muted)
  doc.text('Silver Jewellery  \u00b7  GST Invoicing', 20, y)
  y += 8

  // Right meta
  const metaX = pageWidth - 20
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...royal)
  doc.text(invoice.invoiceNumber, metaX, 20, { align: 'right' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...dark)
  doc.text(`Date: ${fmtDate(invoice.date)}`, metaX, 28, { align: 'right' })
  doc.text(`Status: ${invoice.status}`, metaX, 34, { align: 'right' })
  if (invoice.paymentMethod) {
    doc.text(`Payment: ${invoice.paymentMethod}`, metaX, 40, { align: 'right' })
  }
  y = Math.max(y, 44)

  // Thick rule
  line(20, y, pageWidth - 20, y, royal, 1.5)
  y += 6

  // ---- BILLED TO / SALESPERSON ----
  const boxW = 80
  const boxH = 28
  const leftX = 20
  const rightX = pageWidth - 20 - boxW

  // Billed To box
  doc.setDrawColor(...light)
  doc.setLineWidth(0.3)
  doc.roundedRect(leftX, y, boxW, boxH, 2, 2, 'D')
  text('BILLED TO', leftX + 3, y + 5, { size: 8, weight: 'bold', color: muted })
  text(invoice.customer?.name || 'Walk-in Customer', leftX + 3, y + 11, { size: 10, weight: 'bold', color: dark })
  if (invoice.customer?.phone) text(invoice.customer.phone, leftX + 3, y + 16, { size: 9, color: dark })
  if (invoice.customer?.email) text(invoice.customer.email, leftX + 3, y + 21, { size: 9, color: dark })

  // Salesperson box
  doc.roundedRect(rightX, y, boxW, boxH, 2, 2, 'D')
  text('SALESPERSON', rightX + 3, y + 5, { size: 8, weight: 'bold', color: muted })
  text(invoice.salesperson?.name || '\u2014', rightX + 3, y + 12, { size: 10, weight: 'bold', color: dark })

  y += boxH + 8

  // ---- ITEMS TABLE ----
  const col = [
    { key: 'name', label: 'Item', x: 20, w: 75, align: 'left' },
    { key: 'quantity', label: 'Qty', x: 95, w: 15, align: 'center' },
    { key: 'weight', label: 'Wt (g)', x: 110, w: 18, align: 'center' },
    { key: 'silverRate', label: 'Silver \u20b9/g', x: 128, w: 25, align: 'right' },
    { key: 'baseAmount', label: 'Base', x: 153, w: 22, align: 'right' },
    { key: 'gstAmount', label: 'GST (3%)', x: 175, w: 22, align: 'right' },
    { key: 'finalAmount', label: 'Total', x: 197, w: 22, align: 'right' },
  ]

  // Header row
  doc.setFillColor(...royal)
  doc.roundedRect(20, y, pageWidth - 40, 8, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  col.forEach((c) => {
    const tx = c.align === 'right' ? c.x + c.w - 1 : c.align === 'center' ? c.x + c.w / 2 : c.x + 1
    doc.text(c.label, tx, y + 5.5, { align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left' })
  })
  y += 8

  // Data rows
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  ;(invoice.items || []).forEach((it, i) => {
    if (y > pageHeight - 30) {
      doc.addPage()
      y = 15
    }
    if (i % 2 === 0) {
      doc.setFillColor(...light)
      doc.rect(20, y, pageWidth - 40, 7, 'F')
    }
    doc.setTextColor(...dark)
    col.forEach((c) => {
      let val = ''
      switch (c.key) {
        case 'name':
          val = `${it.name}\n${it.sku || ''} \u00b7 ${it.weight} g`
          break
        case 'quantity':
          val = String(it.quantity)
          break
        case 'weight':
          val = Number(it.weight).toFixed(3)
          break
        case 'silverRate':
          val = INR(it.silverRate)
          break
        case 'baseAmount':
          val = INR(it.baseAmount)
          break
        case 'gstAmount':
          val = INR(it.gstAmount)
          break
        case 'finalAmount':
          val = INR(it.finalAmount)
          break
      }
      const tx = c.align === 'right' ? c.x + c.w - 1 : c.align === 'center' ? c.x + c.w / 2 : c.x + 1
      if (c.key === 'name') {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(it.name, tx, y + 3.5, { align: 'left' })
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...muted)
        doc.text(`${it.sku || ''} \u00b7 ${it.weight} g`, tx, y + 6, { align: 'left' })
        doc.setTextColor(...dark)
      } else {
        doc.text(val, tx, y + 4.5, { align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left' })
      }
    })
    y += 7
  })

  // Table bottom line
  line(20, y, pageWidth - 20, y, royal, 0.5)
  y += 4

  // ---- TOTALS ----
  const totalsX = pageWidth - 20
  const labelX = pageWidth - 80

  text('Total Weight', labelX, y, { size: 9, color: muted })
  text(`${Number(invoice.totalWeight).toFixed(3)} g`, totalsX, y, { size: 9, align: 'right' })
  y += 6

  text('Subtotal', labelX, y, { size: 9, color: muted })
  text(INR(invoice.subtotal), totalsX, y, { size: 9, align: 'right' })
  y += 6

  text('GST Total (3%)', labelX, y, { size: 9, color: muted })
  text(INR(invoice.gstTotal), totalsX, y, { size: 9, align: 'right' })
  y += 6

  if (Number(invoice.discount) > 0) {
    text('Discount', labelX, y, { size: 9, color: [239, 68, 68] })
    text(`- ${INR(invoice.discount)}`, totalsX, y, { size: 9, align: 'right', color: [239, 68, 68] })
    y += 6
  }

  // Grand total
  line(labelX - 5, y - 2, totalsX + 2, y - 2, royal, 1)
  text('GRAND TOTAL', labelX, y + 4, { size: 11, weight: 'bold', color: royal })
  text(INR(invoice.grandTotal), totalsX, y + 4, { size: 11, weight: 'bold', align: 'right', color: royal })
  y += 12

  // ---- PAYMENT INFO ----
  if (invoice.paymentMethod) {
    doc.setFillColor(...light)
    doc.roundedRect(20, y, pageWidth - 40, 14, 2, 2, 'F')
    text('\u2713  Payment Received', 25, y + 6, { size: 10, weight: 'bold', color: [16, 185, 129] })
    text(`Via ${invoice.paymentMethod}`, 25, y + 11, { size: 9, color: muted })
    y += 20
  }

  // ---- FOOTER ----
  y = pageHeight - 20
  line(20, y, pageWidth - 20, y, royal, 0.3)
  y += 4
  text('Thank you for shopping with OPAL LINE', pageWidth / 2, y, { size: 9, weight: 'bold', color: royal, align: 'center' })
  y += 5
  text('Silversmith since inception  \u00b7  Prices include GST', pageWidth / 2, y, { size: 8, color: muted, align: 'center' })

  return doc
}

export function downloadInvoicePDF(invoice) {
  const doc = generateInvoicePDF(invoice)
  doc.save(`OPAL_LINE_Invoice_${invoice.invoiceNumber}.pdf`)
}