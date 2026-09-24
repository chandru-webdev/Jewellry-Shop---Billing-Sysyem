import { Eye, Edit, Phone, Mail } from 'lucide-react'
import { formatINR, formatDate } from '../../utils/format'

// One customers table shared by the Sales "Customers" tab and the dedicated
// Customers page. Always shows orders + total spent + last order + Edit.
export default function CustomersTable({ customers, isLoading, onView, onEdit }) {
  const rows = customers || []

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Customer</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Contact</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Orders</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Total Spent</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Last Order</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                Loading customers...
              </td>
            </tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                No customers found.
              </td>
            </tr>
          )}
          {!isLoading &&
            rows.map((c) => (
              <tr key={c.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 text-white flex items-center justify-center text-[10px] font-bold">
                      {c.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="font-medium text-royal-950 dark:text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Phone size={10} /> {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Mail size={10} /> {c.email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-royal-900 dark:text-gray-200">
                  {c.orders ?? c._count?.invoices ?? 0}
                </td>
                <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">
                  {formatINR(c.totalSpent ?? 0)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {c.lastOrder ? formatDate(c.lastOrder) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {onView && (
                      <button
                        onClick={() => onView(c)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="View Customer"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(c)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Edit Customer"
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