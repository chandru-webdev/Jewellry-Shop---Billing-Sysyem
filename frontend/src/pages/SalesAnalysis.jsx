import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TicketPercent, Receipt, Banknote, Target } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatINR, formatShortINR, formatDate } from '../utils/format'
import { reportsApi } from '../api/reports'

const PIE_COLORS = ['#0e7490', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#64748b']

const presets = [
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
]

function iso(d) { return d.toISOString().slice(0, 10) }

function rangeFor(preset, customFrom, customTo) {
  const today = new Date()
  if (preset === '30d') return { from: iso(new Date(today.getTime() - 30 * 86400000)), to: iso(today) }
  if (preset === 'month') return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) }
  if (preset === 'quarter') {
    const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
    return { from: iso(qStart), to: iso(today) }
  }
  if (preset === 'year') return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) }
  return { from: customFrom || iso(new Date(today.getTime() - 30 * 86400000)), to: customTo || iso(today) }
}

export default function SalesAnalysis() {
  const [preset, setPreset] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { from, to } = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo])

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-sales', { from, to }],
    queryFn: () => reportsApi.sales({ from, to }).then((r) => r.data.data),
    retry: false,
  })
  const { data: products } = useQuery({
    queryKey: ['report-products', { from, to }],
    queryFn: () => reportsApi.products({ from, to, limit: 8 }).then((r) => r.data.data),
    retry: false,
  })

  const totals = report?.totals || { invoices: 0, revenue: 0, gst: 0, discount: 0 }
  const daily = report?.daily || []
  const methods = report?.methods || []
  const salespeople = report?.salespeople || []
  const recent = report?.recent || []
  const top = products?.top || []

  const maxRevenue = Math.max(1, ...top.map((p) => p.revenue))
  const avgInvoice = totals.invoices > 0 ? totals.revenue / totals.invoices : 0

  const kpis = [
    { label: 'Total Revenue', value: formatINR(totals.revenue), icon: Banknote, tone: 'text-emerald-600' },
    { label: 'GST Collected', value: formatINR(totals.gst), icon: Receipt, tone: 'text-royal-600' },
    { label: 'Invoices', value: String(totals.invoices), icon: Target, tone: 'text-purple-600' },
    { label: 'Avg. Invoice', value: formatINR(avgInvoice), icon: TrendingUp, tone: 'text-amber-600' },
    { label: 'Discounts', value: formatINR(totals.discount), icon: TicketPercent, tone: 'text-red-500' },
  ]

  return (
    <div>
      <PageHeader title="Sales Analysis" subtitle="Revenue, GST, payment methods and salesperson performance" />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {presets.map((p) => (
          <button key={p.key} onClick={() => setPreset(p.key)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${preset === p.key ? 'bg-royal-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-royal-100 dark:hover:bg-white/20'}`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-xs" />
            <span className="text-gray-400">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-xs" />
          </div>
        )}
        <span className="ml-auto text-xs text-gray-400">{formatDate(from)} — {formatDate(to)}</span>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading sales data…</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1"><k.icon size={14} className={k.tone} /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{k.label}</p></div>
                <p className={`text-lg font-bold text-royal-950 dark:text-white mt-0.5 ${k.label === 'Total Revenue' ? 'text-emerald-600' : ''}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <Card title="Revenue Over Time" className="lg:col-span-2 !p-4">
              {daily.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No sales in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={daily} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0e7490" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0e7490" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" strokeOpacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatShortINR(v)} width={56} />
                    <Tooltip formatter={(v) => [formatINR(v), 'Revenue']} labelFormatter={(l) => formatDate(l)} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#0e7490" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Sales by Payment Method" className="!p-4">
              {methods.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No payments yet.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={methods} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2}>
                        {methods.map((m, i) => <Cell key={m.method} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {methods.slice(0, 6).map((m, i) => (
                      <div key={m.method} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-600 dark:text-gray-400 truncate flex-1">{m.method}</span>
                        <span className="font-medium text-royal-950 dark:text-white">{formatShortINR(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <Card title="Salesperson Performance" className="!p-4">
              {salespeople.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No sales attributed to salespeople.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salespeople} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatShortINR(v)} width={56} />
                    <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Top Products" className="!p-4">
              {top.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No product sales in this period.</div>
              ) : (
                <div className="space-y-2 mt-1">
                  {top.map((p, i) => (
                    <div key={p.sku} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-medium text-gray-400" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-royal-950 dark:text-white truncate">{p.name}</p>
                          <span className="text-sm font-semibold text-emerald-600">{formatINR(p.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full flex-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(p.revenue / maxRevenue) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                          <span className="text-[11px] text-gray-400">{p.units} units</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Recent Invoices" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Invoice</th>
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Date</th>
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Customer</th>
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Method</th>
                    <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">No invoices yet.</td></tr>}
                  {recent.map((inv) => (
                    <tr key={inv.invoiceNumber} className="hover:bg-royal-50 dark:hover:bg-white/5">
                      <td className="px-5 py-3 font-mono text-xs text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.date)}</td>
                      <td className="px-5 py-3 font-medium text-royal-950 dark:text-white">{inv.customer}</td>
                      <td className="px-5 py-3"><Badge tone="blue">{inv.method}</Badge></td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatINR(inv.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}