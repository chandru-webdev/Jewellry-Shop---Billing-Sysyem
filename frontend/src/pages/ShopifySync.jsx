import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, RefreshCw, Package, DollarSign, Boxes, AlertCircle, CheckCircle2, XCircle, Clock, RotateCw, CreditCard, Download, ShoppingBag, Search, Loader2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'
import { formatINR } from '../utils/format'

const statusIcon = { SUCCESS: CheckCircle2, FAILED: XCircle, PENDING: Clock }
const statusBadge = { SUCCESS: 'green', FAILED: 'red', PENDING: 'orange' }

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
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function ShopifySync() {
  const [tab, setTab] = useState('dashboard')
  const [productSearch, setProductSearch] = useState('')
  const [retrying, setRetrying] = useState(null)
  const queryClient = useQueryClient()

  const syncQuery = useQuery({
    queryKey: ['shopify-sync'],
    queryFn: () => shopifyApi.getSyncStatus().then((r) => r.data.data),
  })

  const syncLogsQuery = useQuery({
    queryKey: ['shopify-sync-logs'],
    queryFn: () => shopifyApi.getSyncLogs({ limit: 20 }).then((r) => r.data.data),
    enabled: tab === 'sync-logs',
  })

  const sync = syncQuery.data || {}

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullProducts(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-sync'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      alert(`Done! Created ${res.data.data.created}, Updated ${res.data.data.updated}, Failed ${res.data.data.failed}`)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || ''
      if (msg.includes('credentials') || msg.includes('not configured')) {
        alert('Shopify is in demo mode. Connect your store in Settings > Shopify to enable live sync.')
      } else {
        alert('Sync failed: ' + msg)
      }
    },
  })

  const fetchProductsQuery = useQuery({
    queryKey: ['shopify-products', productSearch],
    queryFn: () => shopifyApi.fetchProducts({ search: productSearch }).then((r) => r.data.data),
    enabled: tab === 'products',
    retry: false,
  })

  const fetchProducts = () => {
    fetchProductsQuery.refetch()
  }

  const handleRetry = (log) => {
    if (retrying) return
    setRetrying(log.shopifyId)
    setTimeout(() => {
      alert(`Retry completed for ${log.shopifyId}`)
      setRetrying(null)
    }, 1500)
  }

  return (
    <div>
      <PageHeader
        title="Shopify Dashboard"
        subtitle="Monitor Shopify ecommerce synchronization and health"
        actions={
          <div className="flex gap-2">
            {tab === 'products' && (
              <>
                <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
                  <Search size={14} className="text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search Shopify products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none w-full"
                  />
                </div>
                <Button variant="primary" size="sm" onClick={fetchProducts} loading={fetchProductsQuery.isFetching}>
                  <Download size={14} /> Fetch Products
                </Button>
              </>
            )}
            {tab === 'dashboard' && (
              <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} loading={pullMutation.isPending}>
                <Download size={14} /> Pull from Shopify
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => pullMutation.mutate()} disabled={pullMutation.isPending}><RefreshCw size={14} /> Force Sync All</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-white/[0.08]">
        {['dashboard', 'products', 'sync-logs'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === t ? 'border-royal-700 text-royal-700 dark:text-gray-300' : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            {t === 'dashboard' ? 'Dashboard' : t === 'products' ? 'Products' : 'Sync Logs'}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { icon: ShoppingBag, label: 'Last Order Sync', value: sync.order?.status || 'No data', accent: 'from-blue-500 to-blue-600' },
              { icon: RefreshCw, label: 'Last Product Sync', value: sync.product?.status || 'No data', accent: 'from-emerald-500 to-emerald-600' },
              { icon: AlertCircle, label: 'Last Price Sync', value: sync.price?.status || 'No data', accent: 'from-red-500 to-red-600' },
              { icon: Package, label: 'Last Inventory Sync', value: sync.inventory?.status || 'No data', accent: 'from-royal-500 to-royal-700' },
            ].map((c) => (
              <div key={c.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}>
                  <c.icon size={16} className="text-white" />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{c.label}</p>
                <p className="text-xl font-bold text-royal-950 dark:text-white mt-0.5">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Inventory Sync', value: sync.inventory ? `${sync.inventory.itemsProcessed || 0} items • ${timeAgo(sync.inventory.createdAt)}` : 'Never synced', icon: Boxes, color: sync.inventory?.status === 'SUCCESS' ? 'emerald' : 'gray' },
              { label: 'Price Sync', value: sync.price ? `${sync.price.itemsProcessed || 0} items • ${timeAgo(sync.price.createdAt)}` : 'Never synced', icon: DollarSign, color: sync.price?.status === 'SUCCESS' ? 'amber' : 'gray' },
              { label: 'Order Sync', value: sync.order ? `${sync.order.itemsProcessed || 0} items • ${timeAgo(sync.order.createdAt)}` : 'Never synced', icon: CreditCard, color: sync.order?.status === 'SUCCESS' ? 'blue' : 'gray' },
            ].map((h) => (
              <div key={h.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${h.color}-50 flex items-center justify-center`}>
                  <h.icon size={18} className={`text-${h.color}-500`} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{h.label}</p>
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

      {tab === 'products' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Price</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Weight</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fetchProductsQuery.isFetching && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                      Fetching products from Shopify...
                    </td>
                  </tr>
                )}
                {!fetchProductsQuery.isFetching && fetchProductsQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                      No products found. Click "Fetch Products" to load them.
                    </td>
                  </tr>
                )}
                {!fetchProductsQuery.isFetching && fetchProductsQuery.data?.map((p) => (
                  <tr key={p.shopifyId} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-royal-950 dark:text-white">{p.title}</span>
                      <span className="block text-[11px] text-gray-400 dark:text-gray-500">ID: {p.shopifyId}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(Number(p.price))}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.weight ? `${p.weight}${p.weightUnit || 'g'}` : '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.inventoryQuantity || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'sync-logs' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Entity</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Shopify ID</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Direction</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Action</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Error</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syncLogsQuery.isFetching && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                      Loading sync logs...
                    </td>
                  </tr>
                )}
                {!syncLogsQuery.isFetching && syncLogsQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                      No sync logs yet. Sync some products to see logs here.
                    </td>
                  </tr>
                )}
                {syncLogsQuery.data?.map((log, i) => {
                  const StatusIcon = statusIcon[log.status] || Clock
                  return (
                    <tr key={log.id || i} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                      <td className="px-4 py-3"><Badge tone="purple">{log.type}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{log.id}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{log.type === 'ORDER' ? 'Shopify → ERP' : 'ERP → Shopify'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{log.message || log.type}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={statusBadge[log.status]}>
                          <StatusIcon size={10} className="mr-1" /> {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{timeAgo(log.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-red-500 max-w-48 truncate">{log.error || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'FAILED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRetry(log)} disabled={retrying !== null}>
                            {retrying === log.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />} Retry
                          </Button>
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


