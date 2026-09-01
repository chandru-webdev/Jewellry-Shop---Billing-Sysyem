import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Package, DollarSign, Boxes, AlertCircle, ShoppingBag, AlertTriangle, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'
import { ordersApi } from '../api/orders'
import { formatINR, formatDateTime } from '../utils/format'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HEALTH_DEFS = [
  { key: 'product', label: 'Product Sync', Icon: Package, iconWrap: 'bg-blue-50', iconCls: 'text-blue-600' },
  { key: 'price', label: 'Price Sync', Icon: DollarSign, iconWrap: 'bg-amber-50', iconCls: 'text-amber-600' },
  { key: 'inventory', label: 'Inventory Sync', Icon: Boxes, iconWrap: 'bg-emerald-50', iconCls: 'text-emerald-600' },
  { key: 'order', label: 'Order Sync', Icon: ShoppingBag, iconWrap: 'bg-royal-50', iconCls: 'text-royal-600' },
]

const healthTone = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  red: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
}

const orderStatusColor = { PAID: 'green', FULFILLED: 'blue', PENDING: 'gray', CANCELLED: 'red', REFUNDED: 'orange' }

const healthOf = (entry) => {
  if (!entry) return { text: 'Not synced', tone: 'gray' }
  if (entry.status === 'SUCCESS') return { text: 'Healthy', tone: 'emerald' }
  if (entry.status === 'FAILED') return { text: 'Failed', tone: 'red' }
  return { text: entry.status || 'Pending', tone: 'amber' }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function ShopifyDashboard() {
  const queryClient = useQueryClient()
  const statusKey = { queryKey: ['shopify-status'] }
  const logsKey = { queryKey: ['shopify-logs'] }
  const ordersKey = { queryKey: ['orders', 'shopify'] }

  const { data: syncStatus = {}, refetch } = useQuery({
    queryKey: ['shopify-status'],
    queryFn: () => shopifyApi.getSyncStatus().then((r) => r.data.data),
    retry: false,
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['shopify-logs'],
    queryFn: () => shopifyApi.getSyncLogs({ limit: 50 }).then((r) => r.data.data),
    retry: false,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'shopify'],
    queryFn: () => ordersApi.list({ source: 'SHOPIFY', limit: 5 }).then((r) => r.data.data),
    retry: false,
  })

  const { data: probeOk = false } = useQuery({
    queryKey: ['shopify-probe'],
    queryFn: async () => {
      await shopifyApi.fetchProducts({ limit: 1 })
      return true
    },
    retry: false,
  })

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullProducts(),
    onSuccess: () => {
      queryClient.invalidateQueries(statusKey)
      queryClient.invalidateQueries(logsKey)
      queryClient.invalidateQueries(ordersKey)
      queryClient.invalidateQueries({ queryKey: ['shopify-probe'] })
      refetch()
    },
  })

  const failedCount = logs.filter((l) => l.status === 'FAILED').length

  const stats = useMemo(() => [
    { label: 'Orders Synced', value: syncStatus.order?.itemsProcessed ?? 0, sub: syncStatus.order?.createdAt ? `Latest ${formatDateTime(syncStatus.order.createdAt)}` : 'No sync yet', Icon: ShoppingBag, accent: 'from-blue-500 to-blue-600' },
    { label: 'Products Synced', value: syncStatus.product?.itemsProcessed ?? 0, sub: syncStatus.product?.createdAt ? `Latest ${formatDateTime(syncStatus.product.createdAt)}` : 'No sync yet', Icon: Package, accent: 'from-royal-500 to-royal-700' },
    { label: 'Prices Synced', value: syncStatus.price?.itemsProcessed ?? 0, sub: syncStatus.price?.createdAt ? `Latest ${formatDateTime(syncStatus.price.createdAt)}` : 'No sync yet', Icon: DollarSign, accent: 'from-emerald-500 to-emerald-600' },
    { label: 'Sync Failures', value: failedCount, sub: 'In last 50 log entries', Icon: AlertCircle, accent: 'from-red-500 to-red-600' },
  ], [syncStatus, failedCount])

  const weekData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - i)
      const end = new Date(start.getTime() + 86400000)
      const inDay = (l) => {
        const t = new Date(l.createdAt)
        return t >= start && t < end
      }
      const sum = (l) => l.itemsProcessed || 0
      days.push({
        day: DAY_LABELS[start.getDay()],
        Orders: logs.filter((l) => l.type === 'ORDER' && inDay(l)).reduce((s, l) => s + sum(l), 0),
        Products: logs.filter((l) => l.type === 'PRODUCT' && inDay(l)).reduce((s, l) => s + sum(l), 0),
      })
    }
    return days
  }, [logs])

  const connectionRows = [
    { label: 'Shopify API', ok: Boolean(probeOk), okText: 'Connected', warnText: 'Not configured / demo', sub: 'Set credentials in Settings > Shopify' },
    { label: 'Latest Product Sync', ok: Boolean(syncStatus.product), okText: syncStatus.product?.createdAt ? formatDateTime(syncStatus.product.createdAt) : 'Never', warnText: 'Never', sub: 'Products synced to Shopify' },
    { label: 'Latest Order Sync', ok: Boolean(syncStatus.order), okText: syncStatus.order?.createdAt ? formatDateTime(syncStatus.order.createdAt) : 'Never', warnText: 'Never', sub: 'Orders pulled into ERP' },
    { label: 'Recent Sync Failures', ok: failedCount === 0, okText: 'None', warnText: `${failedCount} failed`, sub: 'In last 50 log entries' },
  ]

  const apiNotConfigured = !probeOk ? (
    <div className="mb-3 text-sm rounded-lg px-4 py-2 border flex items-center gap-2 bg-amber-50 text-amber-800 border-amber-200">
      <AlertTriangle size={14} />
      Shopify is not configured or unreachable. Connect the store in Settings {'>'} Shopify to enable live sync.
    </div>
  ) : null

  return (
    <div>
      <PageHeader title="Shopify Dashboard" subtitle="Monitor ecommerce synchronization, health and recent activity" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} loading={pullMutation.isPending}>
            {pullMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Pulling...</> : <><RefreshCw size={14} /> Sync All</>}
          </Button>
        </div>
      } />

      {apiNotConfigured}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map((c) => (
          <div key={c.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}>
              <c.Icon size={16} className="text-white" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{c.label}</p>
            <p className="text-xl font-bold text-royal-950 dark:text-white mt-0.5">{c.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {HEALTH_DEFS.map((h) => {
          const state = healthOf(syncStatus[h.key])
          const tone = healthTone[state.tone]
          return (
            <div key={h.key} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${h.iconWrap} flex items-center justify-center`}>
                <h.Icon size={18} className={h.iconCls} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{h.label}</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                  <p className={`text-sm font-bold ${tone.text}`}>{state.text}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="Weekly Sync Trend" className="lg:col-span-2 p-0 overflow-hidden">
          <div className="h-64 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Orders" name="Orders" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
                <Line type="monotone" dataKey="Products" name="Products" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Connection Status">
          <div className="space-y-3">
            {connectionRows.map((row) => (
              <div key={row.label} className={`flex items-center gap-3 p-3 rounded-lg border ${row.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`w-3 h-3 rounded-full ${row.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{row.label}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{row.ok ? row.okText : row.warnText}</p>
                  <p className="text-[10px] text-gray-400">{row.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Recent Shopify Orders">
        <div className="space-y-3">
          {orders.length === 0 && (
            <p className="text-sm text-gray-400 py-3">No Shopify orders yet — orders appear here after the webhook or a manual pull.</p>
          )}
          {orders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-white/[0.05] last:border-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingBag size={16} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-royal-950 dark:text-white">{o.orderNumber}</p>
                  <Badge tone={orderStatusColor[o.status] || 'gray'}>{o.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{o.customer?.name || 'Walk-in customer'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-royal-800 dark:text-gray-200">{formatINR(o.totalAmount)}</p>
                <p className="text-[11px] text-gray-400">{o.createdAt ? formatDateTime(o.createdAt) : '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}