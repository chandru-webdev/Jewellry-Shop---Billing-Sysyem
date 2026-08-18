import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, RefreshCw, Package, DollarSign, Boxes, AlertCircle, CheckCircle2, XCircle, Clock, RotateCw, CreditCard, Download, ShoppingBag } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'
import { formatINR } from '../utils/format'

const DEMO_SYNC = {
  ordersToday: 32,
  ordersSynced: 31,
  syncFailures: 1,
  productsSynced: 312,
  inventorySync: 'Healthy',
  priceSync: 'Pending Approval',
  razorpayPayments: 124560,
}

const DEMO_LOGS = [
  { entity: 'Order', shopifyId: '#10235', direction: 'Shopify → ERP', action: 'Imported', status: 'SUCCESS', time: 'Today, 08:45 AM', error: null },
  { entity: 'Order', shopifyId: '#10234', direction: 'Shopify → ERP', action: 'Imported', status: 'SUCCESS', time: 'Today, 08:42 AM', error: null },
  { entity: 'Product', shopifyId: '#12345', direction: 'ERP → Shopify', action: 'Price Update', status: 'SUCCESS', time: 'Today, 08:30 AM', error: null },
  { entity: 'Inventory', shopifyId: '#78945', direction: 'ERP → Shopify', action: 'Stock Update', status: 'FAILED', time: 'Today, 08:28 AM', error: 'Timeout: Shopify API rate limit exceeded' },
  { entity: 'Customer', shopifyId: '#95123', direction: 'Shopify → ERP', action: 'Imported', status: 'SUCCESS', time: 'Today, 08:15 AM', error: null },
  { entity: 'Product', shopifyId: '#12389', direction: 'ERP → Shopify', action: 'Stock Update', status: 'SUCCESS', time: 'Today, 08:10 AM', error: null },
  { entity: 'Order', shopifyId: '#10233', direction: 'Shopify → ERP', action: 'Imported', status: 'SUCCESS', time: 'Yesterday, 11:30 PM', error: null },
]

const statusIcon = { SUCCESS: CheckCircle2, FAILED: XCircle, PENDING: Clock }
const statusBadge = { SUCCESS: 'green', FAILED: 'red', PENDING: 'orange' }

export default function ShopifySync() {
  const [tab, setTab] = useState('dashboard')
  const queryClient = useQueryClient()

  const syncQuery = useQuery({
    queryKey: ['shopify-sync'],
    queryFn: () => shopifyApi.getSyncStatus().then((r) => r.data.data),
  })

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullProducts(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-sync'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      alert(`Done! Created ${res.data.data.created}, Updated ${res.data.data.updated}, Failed ${res.data.data.failed}`)
    },
    onError: (err) => alert('Pull failed: ' + (err.response?.data?.message || err.message)),
  })

  return (
    <div>
      <PageHeader
        title="Shopify Dashboard"
        subtitle="Monitor Shopify ecommerce synchronization and health"
        actions={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} loading={pullMutation.isPending}>
              <Download size={14} /> Pull from Shopify
            </Button>
            <Button variant="outline" size="sm"><RefreshCw size={14} /> Force Sync All</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {['dashboard', 'sync-logs'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === t ? 'border-royal-700 text-royal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'dashboard' ? 'Dashboard' : 'Sync Logs'}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { icon: ShoppingBag, label: 'Shopify Orders Today', value: DEMO_SYNC.ordersToday, accent: 'from-blue-500 to-blue-600' },
              { icon: RefreshCw, label: 'Orders Synced', value: DEMO_SYNC.ordersSynced, accent: 'from-emerald-500 to-emerald-600' },
              { icon: AlertCircle, label: 'Sync Failures', value: DEMO_SYNC.syncFailures, accent: 'from-red-500 to-red-600' },
              { icon: Package, label: 'Products Synced', value: DEMO_SYNC.productsSynced, accent: 'from-royal-500 to-royal-700' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}>
                  <c.icon size={16} className="text-white" />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{c.label}</p>
                <p className="text-xl font-bold text-royal-950 mt-0.5">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Inventory Sync', value: DEMO_SYNC.inventorySync, icon: Boxes, color: 'emerald' },
              { label: 'Price Sync', value: DEMO_SYNC.priceSync, icon: DollarSign, color: 'amber' },
              { label: 'Razorpay Payments', value: formatINR(DEMO_SYNC.razorpayPayments), icon: CreditCard, color: 'blue' },
            ].map((h) => (
              <div key={h.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${h.color}-50 flex items-center justify-center`}>
                  <h.icon size={18} className={`text-${h.color}-500`} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{h.label}</p>
                  <p className={`text-sm font-bold ${h.color === 'emerald' ? 'text-emerald-600' : h.color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>{h.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Connection Status */}
          <Card title="Connection Status" icon={Store}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Shopify Connected</p>
                  <p className="text-[11px] text-emerald-600">opalline.myshopify.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Razorpay Connected</p>
                  <p className="text-[11px] text-emerald-600">Live mode active</p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {tab === 'sync-logs' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50/80 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Entity</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Shopify ID</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Direction</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Action</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Error</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEMO_LOGS.map((log, i) => {
                  const StatusIcon = statusIcon[log.status]
                  return (
                    <tr key={i} className="hover:bg-royal-50/30 transition-colors">
                      <td className="px-4 py-3"><Badge tone="purple">{log.entity}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700">{log.shopifyId}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.direction}</td>
                      <td className="px-4 py-3 text-gray-600">{log.action}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={statusBadge[log.status]}>
                          <StatusIcon size={10} className="mr-1" /> {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.time}</td>
                      <td className="px-4 py-3 text-xs text-red-500 max-w-48 truncate">{log.error || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'FAILED' && (
                          <Button variant="ghost" size="sm"><RotateCw size={12} /> Retry</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}


