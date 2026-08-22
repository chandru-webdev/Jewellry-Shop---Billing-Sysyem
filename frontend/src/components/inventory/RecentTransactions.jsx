import { useQuery } from '@tanstack/react-query'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { inventoryApi } from '../../api/inventory'
import { formatDateTime } from '../../utils/format'

const toneForType = {
  STOCK_IN: 'green',
  STOCK_OUT: 'red',
  SALE: 'purple',
  RETURN: 'blue',
  ADJUSTMENT: 'gray',
}

// Recent ledger entries. Optional `type` filters to one direction.
export default function RecentTransactions({ type, title = 'Recent Transactions' }) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['inventory-transactions', type || 'all'],
    queryFn: () => inventoryApi.transactions(type ? { type } : {}).then((r) => r.data.data),
  })

  return (
    <Card title={title} className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-royal-50 dark:bg-white/5 text-royal-900 text-left">
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold text-right">Qty</th>
              <th className="px-5 py-3 font-semibold">By</th>
              <th className="px-5 py-3 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && transactions?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-400">No transactions yet.</td></tr>
            )}
            {transactions?.map((t) => (
              <tr key={t.id} className="hover:bg-royal-50 dark:hover:bg-white/5/50">
                <td className="px-5 py-3 text-gray-500 text-xs">{formatDateTime(t.createdAt)}</td>
                <td className="px-5 py-3 font-medium text-royal-950">{t.product.name}</td>
                <td className="px-5 py-3"><Badge tone={toneForType[t.type]}>{t.type}</Badge></td>
                <td className="px-5 py-3 text-right font-semibold">
                  <span className={t.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{t.createdBy?.name || 'System'}</td>
                <td className="px-5 py-3 text-gray-500">{t.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
