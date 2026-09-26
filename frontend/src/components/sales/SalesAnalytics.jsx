import { TrendingUp, Receipt, Users, ArrowLeftRight, BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import Card from '../ui/Card'
import { formatINR } from '../../utils/format'
import { invoiceStatusLabel } from './statusMaps'

const DONUT_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6', '#ec4899']

const GRANULARITY_LABEL = { daily: 'per day', weekly: 'per week', monthly: 'per month' }

const pretty = (label) =>
  String(label || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const SalesTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      <p className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: payload[0]?.color }} />
        Revenue: {formatINR(value)}
      </p>
      {payload[0]?.payload?.orders != null && (
        <p className="text-white/70 mt-0.5">Orders: {payload[0].payload.orders}</p>
      )}
    </div>
  )
}

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{pretty(d.label)}</p>
      <p>{d.count} order(s)</p>
      <p className="mt-0.5">{formatINR(d.total)}</p>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <span className="p-1.5 rounded-lg bg-royal-50 dark:bg-white/10 text-royal-700 dark:text-gray-300">
          <Icon size={14} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-royal-950 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </Card>
  )
}

function DonutCard({ title, icon: Icon, data, empty, formatValue = (d) => formatINR(d.total) }) {
  return (
    <Card title={title} icon={Icon}>
      {data.length === 0 ? (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">{empty}</p>
      ) : (
        <div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (
                    <span className="text-gray-700 dark:text-gray-300">{pretty(value)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {data.map((d, i) => (
              <li key={d.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="truncate">{pretty(d.label)}</span>
                </span>
                <span className="shrink-0 text-gray-500 dark:text-gray-500">{d.count}</span>
                <span className="shrink-0 font-semibold text-royal-900 dark:text-gray-200">{formatValue(d)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

export default function SalesAnalytics({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { kpis, trend, payments, statuses, topCustomers, source } = data

  if (kpis.orderCount === 0) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          No invoices match the current filters. Adjust the date range, status, or payment filters to see sales analytics.
        </p>
      </Card>
    )
  }

  const statusData = statuses.map((s) => ({
    ...s,
    label: invoiceStatusLabel[s.label] || pretty(s.label),
    displayLabel: invoiceStatusLabel[s.label] || s.label,
  }))

  const maxSource = Math.max(source.shopify.total || 0, source.direct.total || 0)

  return (
    <div className="space-y-4 mb-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp} label="Total Sales" value={formatINR(kpis.totalSales)} sub={`${kpis.orderCount} invoice(s)`} />
        <KpiCard icon={Receipt} label="Total Orders" value={kpis.orderCount} />
        <KpiCard icon={BarChart3} label="Avg Order Value" value={formatINR(kpis.avgOrderValue)} />
        <KpiCard icon={Users} label="Items Sold" value={kpis.totalItems} />
      </div>

      {/* Trend + payment donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          title="Sales Trend"
          icon={TrendingUp}
          className="lg:col-span-2"
          action={
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{GRANULARITY_LABEL[trend.granularity] || 'over time'}</span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={42}
                />
                <Tooltip content={<SalesTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#salesRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <DonutCard title="Payment Methods" icon={Users} data={payments} empty="No payment data" />
      </div>

      {/* Status donut + top customers + shopify vs direct */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutCard title="Sales Status" icon={Receipt} data={statusData} empty="No status data" />

        <Card title="Top Customers" icon={Users}>
          {topCustomers.length === 0 ? (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">No customer data</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {topCustomers.map((c, i) => (
                <div key={c.customerId} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-royal-50 dark:bg-white/10 text-[10px] font-bold text-royal-700 dark:text-gray-300 flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium text-royal-950 dark:text-white">{c.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-royal-800 dark:text-gray-200">{formatINR(c.total)}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{c.orders} order(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Shopify vs Direct" icon={ArrowLeftRight}>
          <div className="space-y-4">
            {[
              { key: 'shopify', label: 'Shopify Orders', a: source.shopify, color: '#8b5cf6' },
              { key: 'direct', label: 'Direct (ERP/POS)', a: source.direct, color: '#10b981' },
            ].map(({ key, label, a, color }) => (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{a.count} order(s)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: maxSource > 0 ? `${Math.max(2, (a.total / maxSource) * 100)}%` : '0%', background: color }}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-royal-900 dark:text-gray-200">{formatINR(a.total)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}