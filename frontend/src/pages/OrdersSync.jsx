import { useState } from 'react'
import { RefreshCw, ArrowDownToLine, Filter } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const DEMO_ORDERS = [
  { shopifyId: '#10235', customer: 'Rajesh Kumar', email: 'rajesh@gmail.com', items: 3, amount: 46350, payment: 'paid', status: 'Synced', syncedAt: '2026-08-10 08:45 AM', source: 'Online Store' },
  { shopifyId: '#10234', customer: 'Priya Sharma', email: 'priya@gmail.com', items: 2, amount: 62000, payment: 'paid', status: 'Synced', syncedAt: '2026-08-10 08:42 AM', source: 'Online Store' },
  { shopifyId: '#10233', customer: 'Amit Patel', email: 'amit@gmail.com', items: 1, amount: 34500, payment: 'paid', status: 'Synced', syncedAt: '2026-08-09 11:30 PM', source: 'Online Store' },
  { shopifyId: '#10232', customer: 'Sneha Reddy', email: 'sneha@gmail.com', items: 4, amount: 128900, payment: 'refunded', status: 'Synced', syncedAt: '2026-08-09 06:15 PM', source: 'Online Store' },
  { shopifyId: '#10231', customer: 'Vikram Singh', email: 'vikram@gmail.com', items: 2, amount: 22100, payment: 'paid', status: 'Synced', syncedAt: '2026-08-09 02:30 PM', source: 'POS' },
  { shopifyId: '#10230', customer: 'Neha Gupta', email: 'neha@gmail.com', items: 1, amount: 18500, payment: 'pending', status: 'Pending', syncedAt: null, source: 'Online Store' },
  { shopifyId: '#10229', customer: 'Ravi Mehta', email: 'ravi@gmail.com', items: 3, amount: 89000, payment: 'paid', status: 'Failed', syncedAt: null, source: 'Online Store', error: 'Customer not found in ERP' },
  { shopifyId: '#10228', customer: 'Ananya Desai', email: 'ananya@gmail.com', items: 2, amount: 56000, payment: 'paid', status: 'Synced', syncedAt: '2026-08-08 10:00 AM', source: 'Online Store' },
]

const paymentColor = { paid: 'green', refunded: 'orange', pending: 'gray' }
const statusColor = { Synced: 'green', Pending: 'orange', Failed: 'red' }

export default function OrdersSync() {
  const [filter, setFilter] = useState('all')

  const filtered = DEMO_ORDERS.filter((o) => {
    if (filter === 'all') return true
    return o.status === filter
  })

  const synced = DEMO_ORDERS.filter((o) => o.status === 'Synced').length
  const pending = DEMO_ORDERS.filter((o) => o.status === 'Pending').length
  const failed = DEMO_ORDERS.filter((o) => o.status === 'Failed').length

  return (
    <div>
      <PageHeader title="Orders Sync" subtitle="Import and manage Shopify orders in ERP" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm"><ArrowDownToLine size={14} /> Pull Orders</Button>
          <Button variant="outline" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total Orders</p>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{DEMO_ORDERS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Synced</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{synced}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{failed}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-gray-400" />
        {['all', 'Synced', 'Pending', 'Failed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filter === f ? 'bg-royal-100 text-royal-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Order ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Items</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Synced At</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.shopifyId} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-mono font-semibold text-royal-700">{o.shopifyId}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-royal-950">{o.customer}</p>
                    <p className="text-[11px] text-gray-400">{o.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">{o.items}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800">{formatINR(o.amount)}</td>
                  <td className="px-4 py-2.5"><Badge tone={paymentColor[o.payment]}>{o.payment}</Badge></td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{o.source}</td>
                  <td className="px-4 py-2.5"><Badge tone={statusColor[o.status]}>{o.status}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{o.syncedAt || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {o.status === 'Failed' && <Button variant="ghost" size="sm"><RefreshCw size={12} /> Retry</Button>}
                    {o.status === 'Pending' && <Button variant="ghost" size="sm"><ArrowDownToLine size={12} /> Import</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
