import { useQuery } from '@tanstack/react-query'
import { X, Eye } from 'lucide-react'
import Badge from './ui/Badge'
import { customersApi } from '../api/customers'
import { formatINR, formatDate } from '../utils/format'

const statusTone = {
  PAID: 'green',
  FINAL: 'blue',
  DRAFT: 'gray',
  VOID: 'red',
}

const statusLabel = {
  PAID: 'Billed',
  FINAL: 'Billed',
  DRAFT: 'Draft',
  VOID: 'Returned',
}

// Right-side drawer (full height, 30% width) showing a customer's
// contact details, stats and recent invoices. onInvoiceView lets the
// parent open an invoice detail view; otherwise the rows show no button.
export default function CustomerDetailDrawer({ open, customerId, onClose, onInvoiceView }) {
  const { data: customerDetail } = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => customersApi.get(customerId).then((r) => r.data.data),
    enabled: open && !!customerId,
    retry: false,
  })

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-royal-950/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[30%] max-w-md bg-white dark:bg-[#1a1025] shadow-2xl border-l border-gray-200 dark:border-white/[0.08] transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.08] shrink-0">
          <h3 className="text-lg font-semibold text-royal-950 dark:text-white">Customer Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer p-1 rounded-lg" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!customerDetail && <p className="text-sm text-gray-400 text-center pt-10">Loading...</p>}
          {customerDetail && (
            <div className="space-y-5">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <span className="w-14 h-14 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 text-white flex items-center justify-center text-lg font-bold shrink-0">
                  {customerDetail.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-royal-950 dark:text-white truncate">{customerDetail.name}</p>
                  <p className="text-xs text-gray-400">Customer #{customerDetail.id}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">Contact</p>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-royal-950 dark:text-white">{customerDetail.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</p>
                  <p className="text-sm font-medium text-royal-950 dark:text-white break-all">{customerDetail.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Address</p>
                  <p className="text-sm font-medium text-royal-950 dark:text-white">{customerDetail.address || '—'}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-royal-50/60 dark:bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-royal-900 dark:text-gray-100">{customerDetail._count?.invoices || 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Invoices</p>
                </div>
                <div className="bg-royal-50/60 dark:bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-royal-900 dark:text-gray-100">{customerDetail._count?.payments || 0}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Payments</p>
                </div>
                <div className="bg-royal-50/60 dark:bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-royal-900 dark:text-gray-100">
                    {customerDetail.invoices?.length ? formatINR(customerDetail.invoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0)) : '—'}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Spent</p>
                </div>
              </div>

              {/* Recent invoices */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2">
                  Recent Invoices
                </p>
                {customerDetail.invoices?.length ? (
                  <div className="border border-gray-100 dark:border-white/[0.08] rounded-lg divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {customerDetail.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div>
                          <p className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-gray-400">{formatDate(inv.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold text-royal-800 dark:text-gray-200">{formatINR(inv.grandTotal)}</p>
                            <Badge tone={statusTone[inv.status]}>{statusLabel[inv.status] || inv.status}</Badge>
                          </div>
                          {onInvoiceView && (
                            <button
                              onClick={() => onInvoiceView(inv.id)}
                              className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                              title="View Invoice"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No invoices yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}