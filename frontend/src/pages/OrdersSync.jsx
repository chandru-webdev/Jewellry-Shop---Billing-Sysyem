import { useState } from 'react'
import { RefreshCw, ArrowDownToLine, Filter, CheckCircle2, Loader2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const INITIAL_ORDERS = [
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
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const now = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  const handlePull = () => {
    setLoading('pull')
    setTimeout(() => {
      setOrders(orders.map((o) => o.status !== 'Synced'
        ? { ...o, status: 'Synced', syncedAt: now() }
        : o))
      setLoading(null)
      showToast('Pulled all orders from Shopify')
    }, 1500)
  }

  const handleRefresh = () => {
    setLoading('refresh')
    setTimeout(() => { setLoading(null); showToast('Refreshed') }, 800)
  }

  const handleRetry = (shopifyId) => {
    setLoading(`retry-${shopifyId}`)
    setTimeout(() => {
      setOrders(orders.map((o) => o.shopifyId === shopifyId
        ? { ...o, status: 'Synced', syncedAt: now() }
        : o))
      setLoading(null)
      showToast('Order synced')
    }, 1200)
  }

  const handleImport = (shopifyId) => {
    setLoading(`import-${shopifyId}`)
    setTimeout(() => {
      setOrders(orders.map((o) => o.shopifyId === shopifyId
        ? { ...o, status: 'Synced', syncedAt: now() }
        : o))
      setLoading(null)
      showToast('Order imported')
    }, 1200)
  }

  const filtered = orders.filter((o) => filter === 'all' || o.status === filter)
  const synced = orders.filter((o) => o.status === 'Synced').length
  const pending = orders.filter((o) => o.status === 'Pending').length
  const failed = orders.filter((o) => o.status === 'Failed').length

  return (
    <div>
      <PageHeader title="Orders Sync" subtitle="Import and manage Shopify orders in ERP" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handlePull} disabled={!!loading}>
            {loading === 'pull' ? <><Loader2 size={14} className="animate-spin" /> Pulling...</> : <><ArrowDownToLine size={14} /> Pull Orders</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={!!loading}>
            {loading === 'refresh' ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={14} /> Refresh</>}
          </Button>
        </div>
      } />

      {toast && <div className="mb-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"><CheckCircle2 size={14} /> {toast}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total Orders</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{orders.length}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Synced</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{synced}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{failed}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-gray-400" />
        {['all', 'Synced', 'Pending', 'Failed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filter === f ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Order ID</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Items</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Payment</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Source</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Synced At</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.shopifyId} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-mono font-semibold text-royal-700 dark:text-gray-300">{o.shopifyId}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-royal-950 dark:text-white">{o.customer}</p>
                    <p className="text-[11px] text-gray-400">{o.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">{o.items}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(o.amount)}</td>
                  <td className="px-4 py-2.5"><Badge tone={paymentColor[o.payment]}>{o.payment}</Badge></td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{o.source}</td>
                  <td className="px-4 py-2.5"><Badge tone={statusColor[o.status]}>{o.status}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{o.syncedAt || '\u2014'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {o.status === 'Failed' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRetry(o.shopifyId)} disabled={!!loading}>
                        {loading === `retry-${o.shopifyId}` ? <Loader2 size={12} className="animate-spin" /> : <><RefreshCw size={12} /> Retry</>}
                      </Button>
                    )}
                    {o.status === 'Pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleImport(o.shopifyId)} disabled={!!loading}>
                        {loading === `import-${o.shopifyId}` ? <Loader2 size={12} className="animate-spin" /> : <><ArrowDownToLine size={12} /> Import</>}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="px-4 py-10 text-center text-sm text-gray-400">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}