// Opens a new browser window with a clean, printable invoice and triggers print.
// Works even with the browser's "Save as PDF" option — no extra library needed.
// Renders actual Business + Invoice settings (name, logo, GSTIN, address,
// payment terms, footer, T&C, bank transfer details) instead of hardcoded text.

import { settingsApi } from '../api/settings'
import { bankAccountsApi } from '../api/bankAccounts'

const money = (n, symbol) =>
  symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function row(label, value) {
  return `<tr><td class="muted" style="padding:4px 0;">${label}</td><td class="right strong">${value}</td></tr>`
}

// Show only the last 4 digits of an account number ("Pay to: Account XXXX1234").
const maskAccount = (acc) => {
  const s = String(acc || '').replace(/\s/g, '')
  return s.length <= 4 ? s : `XXXX${s.slice(-4)}`
}

export default async function printInvoice(invoice) {
  let settings = {}
  let banks = []
  try {
    ;[settings, banks] = await Promise.all([
      settingsApi.getAll().then((r) => r.data.data).catch(() => ({})),
      bankAccountsApi.list({ isActive: true }).then((r) => r.data.data).catch(() => []),
    ])
  } catch {
    // Print with defaults; nothing in the template depends on settings.
  }

  const businessName = esc(settings.businessName || 'OPAL LINE')
  const symbol = settings.currency === 'INR' ? '₹' : ` ${esc(settings.currency || 'INR')} `
  const taxNote = settings.taxInclusive !== false
    ? 'Prices include GST'
    : 'Prices exclude GST (GST added at checkout)'
  const gstin = esc(settings.gstin || '')
  const pan = esc(settings.pan || '')

  const items = (invoice.items || [])
    .map(
      (it) => `
        <tr>
          <td class="strong">${esc(it.name)}<div class="muted">${esc(it.sku)} · ${esc(it.weight)} g</div></td>
          <td class="center">${it.quantity}</td>
          <td class="center">${money(it.silverRate, symbol)}</td>
          <td class="right">${money(it.baseAmount, symbol)}</td>
          <td class="right">${money(it.gstAmount, symbol)}</td>
          <td class="right strong">${money(it.finalAmount, symbol)}</td>
        </tr>`
    )
    .join('')

  const bankBlock = banks.length
    ? `<div class="box">
      <h3>Pay To</h3>
      ${banks.map((b) => `<p class="strong">${esc(b.name || b.bank)}</p><p>${esc(b.bank)} · A/c ${maskAccount(b.accountNumber)} · IFSC ${esc(b.ifsc)}</p>`).join('')}
    </div>`
    : ''

  const identity = [
    settings.businessAddress ? `<p>${esc(settings.businessAddress)}</p>` : '',
    settings.businessPhone ? `<p>${esc(settings.businessPhone)}</p>` : '',
    settings.businessEmail ? `<p>${esc(settings.businessEmail)}</p>` : '',
    gstin ? `<p class="strong">GSTIN: ${gstin}</p>` : '',
    pan ? `<p class="muted">PAN: ${pan}</p>` : '',
  ].filter(Boolean).join('')

  const customerGstin = invoice.customer?.gstin ? `<p>GSTIN: ${esc(invoice.customer.gstin)}</p>` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${esc(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1e1b2e; padding: 32px; }
    .muted { color: #6b7280; font-size: 12px; }
    .strong { font-weight: 600; }
    .right { text-align: right; }
    .center { text-align: center; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .brand { display: flex; gap: 14px; align-items: center; }
    .brand img { width: 64px; height: 64px; object-fit: contain; }
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
    .box .box + .box { margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #4c1d95; color: #fff; padding: 8px 10px; font-size: 12px; text-align: left; }
    th.r, td.r { text-align: right; }
    th.c, td.c { text-align: center; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
    tfoot td { border-bottom: none; padding: 4px 10px; }
    .grand { border-top: 2px solid #4c1d95; }
    .grand td { font-size: 15px; }
    .footer { margin-top: 28px; display: flex; justify-content: space-between; gap: 24px; font-size: 12px; color: #6b7280; }
    .terms { margin-top: 14px; font-size: 11px; color: #6b7280; line-height: 1.5; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: #4c1d95; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 14px; cursor: pointer; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>

  <div class="head">
    <div class="brand">
      ${settings.businessLogo ? `<img src="${settings.businessLogo}" alt="logo" />` : ''}
      <div>
        <h1>${businessName}</h1>
        ${identity}
      </div>
    </div>
    <div class="meta">
      <div class="num">${esc(invoice.invoiceNumber)}</div>
      <div>Date: ${fmtDate(invoice.date)}</div>
      ${invoice.paymentMethod ? `<div>Payment: ${esc(invoice.paymentMethod)}</div>` : ''}
      <div>Terms: ${esc(settings.paymentTerms || 'Due on Receipt')}</div>
      <div>Status: ${esc(invoice.status)}</div>
    </div>
  </div>

  <div class="thick"></div>

  <div class="grid">
    <div class="box">
      <h3>Billed To</h3>
      <p class="strong">${esc(invoice.customer?.name || 'Walk-in Customer')}</p>
      <p>${esc(invoice.customer?.phone || '')}</p>
      ${invoice.customer?.email ? `<p>${esc(invoice.customer.email)}</p>` : ''}
      ${invoice.customer?.address ? `<p>${esc(invoice.customer.address)}</p>` : ''}
      ${customerGstin}
    </div>
    <div class="box">
      <h3>Salesperson</h3>
      <p>${esc(invoice.salesperson?.name || '—')}</p>
      ${bankBlock}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="c">Qty</th>
        <th class="c">Rate</th>
        <th class="r">Base Amount</th>
        <th class="r">GST</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
    <tfoot>
      ${row('Total Weight', `${esc(invoice.totalWeight)} g`)}
      ${row('Subtotal', money(invoice.subtotal, symbol))}
      ${row('GST Total', money(invoice.gstTotal, symbol))}
      ${invoice.discount > 0 ? row('Discount', `- ${money(invoice.discount, symbol)}`) : ''}
      <tr class="grand">
        <td colspan="5" class="right strong" style="padding-top:10px;">GRAND TOTAL</td>
        <td class="right strong" style="padding-top:10px;">${money(invoice.grandTotal, symbol)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div>${esc(settings.invoiceFooter || 'Thank you for shopping with us!')}</div>
    <div>${taxNote}${settings.currency === 'INR' ? '' : ` · ${esc(settings.currency)}`}</div>
  </div>

  ${settings.invoiceTerms ? `<div class="terms"><div class="strong" style="margin-bottom:3px;">Terms & Conditions</div>${esc(settings.invoiceTerms)}</div>` : ''}
</body>
</html>`

  const win = window.open('', '_blank', 'width=820,height=1000')
  if (!win) return
  win.document.write(html)
  win.document.close()
}