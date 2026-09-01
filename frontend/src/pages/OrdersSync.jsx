import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, ArrowDownToLine, Filter, Loader2, CreditCard, Inbox } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'
import { ordersApi } from '../api/orders'
import { formatINR } from '../utils/format'

function timeAgo(date) {
  if (!date) return '—'
  const now = new Date()
  const d = new Date(date)
  const seconds = Math.floor((now - d) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function OrdersSync() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const queryClient = useQueryClient()

  // Real orders imported from Shopify (source = SHOPIFY).
  const ordersQuery = useQuery({
    queryKey: ['orders', 'shopify', statusFilter, sourceFilter],
    queryFn: () =>
      ordersApi.list({ source: 'SHOPIFY', status: statusFilter === 'all' ? undefined : statusFilter }).then((r) => {
        const d = r.data?.data
        // list may return { items, total } or a plain array
        const list = Array.isArray(d) ? d : d?.items || []
        return { items: list, total: Array.isArray(d) ? list.length : d?.total ?? list.length }
      }),
  })

  // Order sync logs from the backend.
  const logsQuery = useQuery({
    queryKey: ['shopify-sync-logs', 'ORDER'],
    queryFn: () => shopifyApi.getSyncLogs({ type: 'ORDER', limit: 20 }).then((r) => r.data.data),
  })

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullOrders(),
    onSuccess: (res) => {
      const d = res.data?.data || {}
      queryClient.invalidateQueries({ queryKey: ['orders', 'shopify'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-sync-logs'] })
      queryClient.invalidateQueries({ queryKey: ['shopify-sync'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      const msg = `Pulled ${d.total ?? 0} order(s) • ${d.created ?? 0} new • ${d.already ?? 0} already synced${d.failed ? ` • ${d.failed} failed` : ''}`
      alert(msg)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || ''
      if (msg.includes('credentials') || msg.includes('not configured')) {
        alert('Shopify is not connected. Add your store credentials in Settings > Shopify to pull orders.')
      } else {
        alert('Pull failed: ' + msg)
      }
    },
  })

  const orders = ordersQuery.data?.items || []
  const totalCount = ordersQuery.data?.total ?? orders.length
  const logs = logsQuery.data || []
  const filtered = orders.filter((o) => sourceFilter === 'all' || (o.source || '').toUpperCase() === sourceFilter)

  return (
    <div>
      <PageHeader
        title="Orders Sync"
        subtitle="Import and manage Shopify orders in ERP"
        actions={
          <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} loading={pullMutation.isPending}>
            {pullMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
            Pull Orders from Shopify
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
            <CreditCard size={12} /> Shopify Orders in ERP
          </div>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-1">{ordersQuery.isLoading ? '—' : totalCount}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Payment Success</div>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {ordersQuery.isLoading ? '—' : orders.filter((o) => (o.paymentStatus || o.status || '').toUpperCase() === 'PAID').length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
            <Inbox size={12} /> Sync Log Entries
          </div>
          <p className="text-xl font-bold text-blue-600 mt-1">{logs.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={14} className="text-gray-400" />
        {['all', 'SHOPIFY'].map((f) => (
          <button
            key={f}
            onClick={() => setSourceFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${sourceFilter === f ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            {f === 'all' ? 'All Sources' : 'Shopify'}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />
        {['all', 'PAID', 'PENDING', 'CANCELLED'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${statusFilter === f ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            {f === 'all' ? 'All Statuses' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Order</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Items</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Source</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Synced At</th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.isLoading && (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-sm text-gray-400">
                    Loading orders...
                  </td>
                </tr>
              )}
              {!ordersQuery.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-sm text-gray-400">
                    No Shopify orders yet. Click "Pull Orders from Shopify" to import them.
                  </td>
                </tr>
              )}
              {!ordersQuery.isLoading &&
                filtered.map((o) => {
                  const qty = o._count?.items ?? (o.items || []).length
                  return (
                    <tr key={o.id} className="border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50/50 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 font-mono font-semibold text-royal-700 dark:text-gray-300">{o.orderNumber || o.id}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-royal-950 dark:text-white">{o.customer?.name || '—'}</p>
                        <p className="text-[11px] text-gray-400">{o.customer?.email || ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">{qty}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(Number(o.totalAmount || 0))}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={o.status === 'PAID' ? 'green' : o.status === 'CANCELLED' ? 'red' : 'orange'}>{o.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{o.source || 'SHOPIFY'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{timeAgo(o.createdAt)}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Sync Log" icon={RefreshCw} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Message</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-center">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Error</th>
              </tr>
            </thead>
            <tbody>
              {logsQuery.isLoading && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-400">
                    Loading logs...
                  </td>
                </tr>
              )}
              {!logsQuery.isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-400">
                    No order sync logs yet.
                  </td>
                </tr>
              )}
              {!logsQuery.isLoading &&
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 dark:border-white/[0.05]">
                    <td className="px-4 py-2.5"><Badge tone="purple">{log.type}</Badge></td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{log.message || '—'}</td>
                    <td className="px-4 py-2.5 text-center"><Badge tone={log.status === 'SUCCESS' ? 'green' : 'red'}>{log.status}</Badge></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{timeAgo(log.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-red-500 max-w-48 truncate">{log.error || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
