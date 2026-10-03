import { useQuery } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { invoicesApi } from '../api/invoices'
import { settingsApi } from '../api/settings'
import { formatINR, formatDate } from '../utils/format'

// The first two digits of a GSTIN are the state code. Comparing the seller's and
// the buyer's is what decides CGST+SGST (same state) vs IGST (different state).
function stateCode(gstin) {
  const m = /^([0-9]{2})[A-Z]{5}/.exec(String(gstin || '').toUpperCase())
  return m ? m[1] : null
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1025]">
          <h3 className="text-sm font-bold text-royal-950 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer" aria-label="Close">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-royal-950 dark:text-white mt-0.5 break-words">{value}</p>
    </div>
  )
}

function Row({ label, value, strong = false }) {
  return (
    <tr className={strong ? 'bg-royal-50 dark:bg-white/5' : ''}>
      <td className={`py-2 ${strong ? 'font-medium text-royal-950 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</td>
      <td className={`py-2 text-right ${strong ? 'font-bold text-royal-700 dark:text-gray-200' : 'font-semibold text-royal-950 dark:text-white'}`}>{value}</td>
    </tr>
  )
}

// Full detail behind the "View" action on a GSTR-1 row. The invoice list endpoint
// strips the item lines and returns only an item count, so the single-invoice
// endpoint is what gives us the product-wise GST actually charged.
export default function GSTR1DetailModal({ invoiceId, onClose }) {
  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['gstr1-invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId).then((r) => r.data.data),
    enabled: Boolean(invoiceId),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data.data),
    retry: false,
  })

  const items = invoice?.items || []
  const own = stateCode(settings?.gstin)
  const buyer = stateCode(invoice?.customer?.gstin)
  const interState = Boolean(own && buyer && own !== buyer)

  const subtotal = Number(invoice?.subtotal) || 0
  const gstTotal = Number(invoice?.gstTotal) || 0
  const grandTotal = Number(invoice?.grandTotal) || 0
  const discount = Number(invoice?.discount) || 0

  // GST is derived, never stored per head. The invoice's gstTotal is
  // authoritative; intra-state splits it in half, inter-state charges all of it as IGST.
  const cgst = interState ? 0 : gstTotal / 2
  const sgst = interState ? 0 : gstTotal / 2
  const igst = interState ? gstTotal : 0
  const effectiveRate = subtotal > 0 ? (gstTotal / subtotal) * 100 : 0
  const paid = (invoice?.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  return (
    <Modal open={Boolean(invoiceId)} onClose={onClose} title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice details'}>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Loading full invoice…
        </div>
      ) : isError || !invoice ? (
        <p className="py-10 text-center text-sm text-red-500">Could not load this invoice.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Invoice No" value={invoice.invoiceNumber} />
            <Field label="Date" value={formatDate(invoice.date)} />
            <Field label="Customer" value={invoice.customer?.name || 'Walk-in / Counter Sale'} />
            <Field label="Customer GSTIN" value={invoice.customer?.gstin || 'Unregistered (B2C)'} />
            <Field label="Seller GSTIN" value={settings?.gstin || 'Not configured'} />
            <Field
              label="Place of Supply"
              value={interState ? `Inter-state (${buyer} ≠ ${own})` : `Intra-state (${own || 'own state'})`}
            />
            <Field label="Status" value={String(invoice.status || '')} />
            <Field label="Payment Method" value={invoice.paymentMethod ? String(invoice.paymentMethod) : 'Not recorded'} />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              How this GST amount was worked out
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Taxable value</p>
                <p className="text-sm font-bold text-royal-950 dark:text-white">{formatINR(subtotal)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Total GST @ {effectiveRate.toFixed(2)}%</p>
                <p className="text-sm font-bold text-royal-950 dark:text-white">{formatINR(gstTotal)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">CGST</p>
                <p className="text-sm font-bold text-royal-950 dark:text-white">{formatINR(cgst)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">{interState ? 'IGST' : 'SGST'}</p>
                <p className="text-sm font-bold text-royal-950 dark:text-white">{formatINR(interState ? igst : sgst)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  <Row label="Taxable value (sum of item bases)" value={formatINR(subtotal)} />
                  <Row label="Less discount" value={`- ${formatINR(discount)}`} />
                  <Row label="GST charged on this invoice" value={formatINR(gstTotal)} />
                  <Row label={interState ? '3.1(c) IGST' : '3.1(a) CGST'} value={formatINR(cgst + igst)} />
                  <Row label={interState ? '' : '3.1(b) SGST'} value={interState ? '' : formatINR(sgst)} />
                  <Row label="Invoice total" value={formatINR(grandTotal)} strong />
                </tbody>
              </table>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 self-start">
                {interState
                  ? 'The seller and buyer GSTINs start with different state codes, so the full GST amount is charged as IGST. It is reported in GSTR-1 table 4A / 4B, not in 3.1(a) + 3.1(b).'
                  : 'The seller and buyer GSTINs start with the same state code (or the buyer is unregistered), so the GST amount is split equally into CGST and SGST and reported in GSTR-1 table 3.1(a) and 3.1(b).'}
                {' '}No per-head CGST/SGST/IGST columns exist in the database — every invoice stores one flat <code>gstTotal</code> and this view derives the split.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Products on this invoice
            </h4>
            <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Making Chg</th>
                    <th className="px-3 py-2 font-medium text-right">Silver Rate</th>
                    <th className="px-3 py-2 font-medium text-right">Taxable</th>
                    <th className="px-3 py-2 font-medium text-right">GST Amt</th>
                    <th className="px-3 py-2 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-xs text-gray-500">
                        No item lines stored on this invoice.
                      </td>
                    </tr>
                  )}
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 font-medium text-royal-950 dark:text-white">{it.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{it.sku || it.product?.sku || '—'}</td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatINR(it.makingCharge)}</td>
                      <td className="px-3 py-2 text-right">{formatINR(it.silverRate)}</td>
                      <td className="px-3 py-2 text-right">{formatINR(it.baseAmount)}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">{formatINR(it.gstAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-royal-950 dark:text-white">{formatINR(it.finalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-white/5">
                    <tr className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2 font-medium text-left" colSpan={5}>Invoice totals</th>
                      <th className="px-3 py-2 font-medium text-right">{formatINR(items.reduce((s, i) => s + (Number(i.baseAmount) || 0), 0))}</th>
                      <th className="px-3 py-2 font-medium text-right">{formatINR(items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0))}</th>
                      <th className="px-3 py-2 font-medium text-right">{formatINR(items.reduce((s, i) => s + (Number(i.finalAmount) || 0), 0))}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              Per-line GST is stored on each item, so it sums back to the invoice GST total. No HSN code is shown because neither <code>Product</code> nor <code>InvoiceItem</code> stores one yet.
            </p>
          </div>

          {paid > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Payments received against this invoice: {formatINR(paid)} of {formatINR(grandTotal)}.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
