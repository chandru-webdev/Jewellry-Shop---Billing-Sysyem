// Opens a new browser window with a clean, printable invoice and triggers print.
// Works even with the browser's "Save as PDF" option — no extra library needed.

const money = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

function row(label, value) {
  return `<tr><td class="muted" style="padding:4px 0;">${label}</td><td class="right strong">${value}</td></tr>`
}

export default function printInvoice(invoice) {
  const items = (invoice.items || [])
    .map(
      (it) => `
        <tr>
          <td class="strong">${it.name}<div class="muted">${it.sku} · ${it.weight} g</div></td>
          <td class="center">${it.quantity}</td>
          <td class="center">${money(it.silverRate)}</td>
          <td class="right">${money(it.baseAmount)}</td>
          <td class="right">${money(it.gstAmount)}</td>
          <td class="right strong">${money(it.finalAmount)}</td>
        </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1e1b2e; padding: 32px; }
    .muted { color: #6b7280; font-size: 12px; }
    .strong { font-weight: 600; }
    .right { text-align: right; }
    .center { text-align: center; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .brand h1 { font-size: 26px; letter-spacing: 1px; }
    .brand h1 span { color: #b8860b; }
    .brand p { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .meta { text-align: right; font-size: 13px; line-height: 1.8; }
    .meta .num { font-size: 18px; font-weight: 700; color: #4c1d95; }
    .rule { border-top: 2px solid #4c1d95; margin: 16px 0; }
    .thick { border-top: 4px double #4c1d95; margin: 12px 0 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
    .box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }
    .box p { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #4c1d95; color: #fff; padding: 8px 10px; font-size: 12px; text-align: left; }
    th.r, td.r { text-align: right; }
    th.c, td.c { text-align: center; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
    tfoot td { border-bottom: none; padding: 4px 10px; }
    .grand { border-top: 2px solid #4c1d95; }
    .grand td { font-size: 15px; }
    .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: #4c1d95; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 14px; cursor: pointer; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>

  <div class="head">
    <div class="brand">
      <h1>OPAL <span>LINE</span></h1>
      <p>Silver Jewellery · GST invoicing</p>
    </div>
    <div class="meta">
      <div class="num">${invoice.invoiceNumber}</div>
      <div>Date: ${fmtDate(invoice.date)}</div>
      <div>Status: ${invoice.status}</div>
      ${invoice.paymentMethod ? `<div>Payment: ${invoice.paymentMethod}</div>` : ''}
    </div>
  </div>

  <div class="thick"></div>

  <div class="grid">
    <div class="box">
      <h3>Billed To</h3>
      <p class="strong">${invoice.customer?.name || 'Walk-in Customer'}</p>
      <p>${invoice.customer?.phone || ''}</p>
      ${invoice.customer?.email ? `<p>${invoice.customer.email}</p>` : ''}
      ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
    </div>
    <div class="box">
      <h3>Salesperson</h3>
      <p>${invoice.salesperson?.name || '—'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="c">Qty</th>
        <th class="c">Silver ₹/g</th>
        <th class="r">Base Amount</th>
        <th class="r">GST (3%)</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
    <tfoot>
      ${row('Total Weight', `${invoice.totalWeight} g`)}
      ${row('Subtotal', money(invoice.subtotal))}
      ${row('GST Total', money(invoice.gstTotal))}
      ${invoice.discount > 0 ? row('Discount', `- ${money(invoice.discount)}`) : ''}
      <tr class="grand">
        <td colspan="5" class="right strong" style="padding-top:10px;">GRAND TOTAL</td>
        <td class="right strong" style="padding-top:10px;">${money(invoice.grandTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div>Thank you for shopping with OPAL LINE</div>
    <div>Silversmith since inception · Prices include GST</div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=820,height=1000')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
