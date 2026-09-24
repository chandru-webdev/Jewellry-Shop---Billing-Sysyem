import { Eye, Edit } from 'lucide-react'
import Badge from '../ui/Badge'
import { formatINR, formatDate } from '../../utils/format'
import { orderStatusTone, orderStatusLabel, paymentTone } from './statusMaps'

// One orders table shared by the Sales "Sales Orders" tab and the dedicated
// Sales Orders page. Payment comes from the linked invoice so it is never blank.
export default function SalesOrdersTable({ orders, isLoading, onView, onEdit }) {
  const rows = orders || []

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Order #</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Customer</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Date</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Items</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Total</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Payment</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                Loading orders...
              </td>
            </tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                No orders found.
              </td>
            </tr>
          )}
          {!isLoading &&
            rows.map((o) => (
              <tr key={o.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">
                  {o.orderNumber || '—'}
                </td>
                <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">
                  {o.customer?.name || 'Walk-in'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{o._count?.items || 0}</td>
                <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">
                  {formatINR(o.totalAmount)}
                </td>
                <td className="px-4 py-3 text-center">
                  {o.invoice?.paymentMethod || o.paymentMethod ? (
                    <Badge tone={paymentTone[o.invoice?.paymentMethod || o.paymentMethod] || 'green'}>
                      {o.invoice?.paymentMethod || o.paymentMethod}
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge tone={orderStatusTone[o.status] || 'gray'}>
                    {orderStatusLabel[o.status] || o.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {onView && (
                      <button
                        onClick={() => onView(o)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="View Order"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {onEdit && o.invoice?.id && (
                      <button
                        onClick={() => onEdit(o)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Edit Order"
                      >
                        <Edit size={14} />
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