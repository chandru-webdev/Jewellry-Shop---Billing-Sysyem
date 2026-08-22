import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Package, DollarSign, Boxes, AlertCircle, CreditCard, ShoppingBag, Users } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'
import { formatINR } from '../utils/format'

const SYNC_STATS = [
  { label: 'Orders Today', value: 32, icon: ShoppingBag, accent: 'from-blue-500 to-blue-600', change: '+8' },
  { label: 'Orders Synced', value: 31, icon: RefreshCw, accent: 'from-emerald-500 to-emerald-600', change: '96.9%' },
  { label: 'Products Synced', value: 312, icon: Package, accent: 'from-royal-500 to-royal-700', change: '+12' },
  { label: 'Sync Failures', value: 1, icon: AlertCircle, accent: 'from-red-500 to-red-600', change: '-2' },
]

const HEALTH_CARDS = [
  { label: 'Inventory Sync', value: 'Healthy', icon: Boxes, color: 'emerald' },
  { label: 'Price Sync', value: 'Pending Approval', icon: DollarSign, color: 'amber' },
  { label: 'Razorpay Payments', value: formatINR(124560), icon: CreditCard, color: 'blue' },
  { label: 'Customer Sync', value: 'Active', icon: Users, color: 'purple' },
]

const WEEKLY_ORDERS = [
  { day: 'Mon', orders: 28, synced: 27 },
  { day: 'Tue', orders: 35, synced: 34 },
  { day: 'Wed', orders: 22, synced: 22 },
  { day: 'Thu', orders: 41, synced: 40 },
  { day: 'Fri', orders: 38, synced: 37 },
  { day: 'Sat', orders: 45, synced: 44 },
  { day: 'Sun', orders: 32, synced: 31 },
]

const RECENT_ORDERS = [
  { id: '#10235', customer: 'Rajesh Kumar', amount: 4635, status: 'paid', time: '08:45 AM' },
  { id: '#10234', customer: 'Priya Sharma', amount: 6386, status: 'paid', time: '08:42 AM' },
  { id: '#10233', customer: 'Amit Patel', amount: 3554, status: 'paid', time: 'Yesterday' },
  { id: '#10232', customer: 'Sneha Reddy', amount: 13184, status: 'refunded', time: 'Yesterday' },
  { id: '#10231', customer: 'Vikram Singh', amount: 2276, status: 'paid', time: '2 days ago' },
]

const statusColor = { paid: 'green', refunded: 'orange', pending: 'gray' }
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

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullProducts(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-sync'] })
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

  return (
    <div>
      <PageHeader title="Shopify Dashboard" subtitle="Monitor ecommerce synchronization, health and recent activity" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} loading={pullMutation.isPending}>
            <RefreshCw size={14} /> Sync All
          </Button>
        </div>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {SYNC_STATS.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}>
              <c.icon size={16} className="text-white" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{c.label}</p>
            <div className="flex items-end justify-between mt-0.5">
              <p className="text-xl font-bold text-royal-950">{c.value}</p>
              <span className="text-xs text-emerald-600 font-medium">{c.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {HEALTH_CARDS.map((h) => (
          <div key={h.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${h.color}-50 flex items-center justify-center`}>
              <h.icon size={18} className={`text-${h.color}-500`} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{h.label}</p>
              <p className={`text-sm font-bold ${h.color === 'emerald' ? 'text-emerald-600' : h.color === 'amber' ? 'text-amber-600' : h.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`}>{h.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="Weekly Sync Trend" className="lg:col-span-2 p-0 overflow-hidden">
          <div className="h-64 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEKLY_ORDERS} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
                <Line type="monotone" dataKey="synced" name="Synced" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Connection Status">
          <div className="space-y-3">
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
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Webhooks Active</p>
                <p className="text-[11px] text-emerald-600">6 webhooks registered</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Shopify Orders">
        <div className="space-y-3">
          {RECENT_ORDERS.map((o) => (
            <div key={o.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingBag size={16} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-royal-950">{o.id}</p>
                  <Badge tone={statusColor[o.status]}>{o.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">{o.customer}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-royal-800">{formatINR(o.amount)}</p>
                <p className="text-[11px] text-gray-400">{o.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
