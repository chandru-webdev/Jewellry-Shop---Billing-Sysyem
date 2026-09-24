import { Eye, Edit, Printer, Download } from 'lucide-react'
import Badge from '../ui/Badge'
import { formatINR, formatDate } from '../../utils/format'
import { invoiceStatusTone, invoiceStatusLabel, paymentTone } from './statusMaps'
import { invoicesApi } from '../../api/invoices'

// Loads the full invoice (with line items) before printing/downloading so the
// generated PDF always contains the item table, regardless of source list.
const withFullInvoice = async (inv, cb) => {
  try {
    const r = await invoicesApi.get(inv.id)
    cb(r.data.data)
  } catch {
    cb(inv)
  }
}

// One invoices table shared by the Sales "Sales Invoices" tab and the dedicated
// Sales Invoices page. Same columns, labels, formatting and actions everywhere.
export default function SalesInvoicesTable({
  invoices,
  isLoading,
  onView,
  onEdit,
  onPrint,
  onDownload,
}) {
  const rows = invoices || []

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Invoice</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Shopify Order</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Customer</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Items</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Qty</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Total</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Payment</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                Loading sales invoices...
              </td>
            </tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                No invoices found.
              </td>
            </tr>
          )}
          {!isLoading &&
            rows.map((inv) => (
              <tr key={inv.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">
                  {inv.invoiceNumber}
                </td>
                <td className="px-4 py-3">
                  {inv.order?.orderNumber ? (
                    <Badge tone="blue">#{inv.order.orderNumber}</Badge>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-royal-950 dark:text-white">
                    {inv.customer?.name || 'Walk-in Customer'}
                  </span>
                  {inv.customer?.phone && (
                    <span className="block text-[11px] text-gray-400">{inv.customer.phone}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(inv.date)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{inv._count?.items || 0}</td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{inv.totalQuantity || 0}</td>
                <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">
                  {formatINR(inv.grandTotal)}
                </td>
                <td className="px-4 py-3 text-center">
                  {inv.paymentMethod ? (
                    <Badge tone={paymentTone[inv.paymentMethod] || 'gray'}>{inv.paymentMethod}</Badge>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge tone={invoiceStatusTone[inv.status] || 'gray'}>
                    {invoiceStatusLabel[inv.status] || inv.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {onView && (
                      <button
                        onClick={() => onView(inv)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="View Invoice"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(inv)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    {onPrint && (
                      <button
                        onClick={() => withFullInvoice(inv, onPrint)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Print Invoice"
                      >
                        <Printer size={14} />
                      </button>
                    )}
                    {onDownload && (
                      <button
                        onClick={() => withFullInvoice(inv, onDownload)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}