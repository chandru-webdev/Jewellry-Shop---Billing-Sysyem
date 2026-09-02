import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banknote, TrendingUp, TrendingDown, Wallet, Percent, PieChart, Package } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { formatINR, formatShortINR, formatDate } from '../utils/format'
import { reportsApi } from '../api/reports'

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

function pct(n) { return `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%` }

export default function BusinessReports() {
  const [preset, setPreset] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { from, to } = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo])

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report-business', { from, to }],
    queryFn: () => reportsApi.business({ from, to }).then((r) => r.data.data),
    retry: false,
  })

  if (isLoading) return <Card className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading business report…</Card>

  if (isError || !report) return (
    <div>
      <PageHeader title="Business Report" subtitle="Profit & loss overview" />
      <Card className="p-8 text-center text-red-500 text-sm">Failed to load business report. The endpoint may be temporarily unavailable.</Card>
    </div>
  )

  const t = report.totals
  const prev = report.prev || { revenue: 0, expenses: 0 }
  const monthly = report.monthly || []
  const topCustomers = report.topCustomers || []
  const recent = report.recent || []

  const trend = (cur, p) => (p && p > 0 ? ((cur - p) / p) * 100 : cur > 0 ? 100 : 0)
  const gpm = t.taxableRevenue > 0 ? (t.grossProfit / t.taxableRevenue) * 100 : 0
  const npm = t.taxableRevenue > 0 ? (t.netProfit / t.taxableRevenue) * 100 : 0

  const kpis = [
    { label: 'Revenue', value: formatINR(t.revenue), trend: trend(t.revenue, prev.revenue), icon: Banknote, up: true, tone: 'text-emerald-600' },
    { label: 'COGS (Cost of Goods)', value: formatINR(t.cogs || t.purchases), icon: Package, tone: 'text-royal-600', up: false },
    { label: 'Operating Expenses', value: formatINR(t.expenses), trend: trend(t.expenses, prev.expenses), icon: Wallet, up: false, tone: 'text-royal-600' },
    { label: 'Gross Profit', value: formatINR(t.grossProfit), icon: TrendingUp, tone: 'text-emerald-600', up: true },
    { label: 'Net Profit', value: formatINR(t.netProfit), icon: TrendingUp, tone: 'text-emerald-600', up: true },
    { label: 'GST Collected', value: formatINR(t.gst), icon: Percent, tone: 'text-royal-600', up: true },
  ]

  const maxCustomer = Math.max(1, ...topCustomers.map((c) => c.amount))

  return (
    <div>
      <PageHeader title="Business Report" subtitle="Profit & loss, cash flow and customer contribution" />

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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1"><k.icon size={14} className={k.tone} /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{k.label}</p></div>
            <p className="text-base font-bold text-royal-950 dark:text-white mt-0.5">{k.value}</p>
            {k.trend !== undefined && (
              <p className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${k.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {k.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {pct(k.trend)} vs prev.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card title="Monthly Revenue & Net Profit" className="lg:col-span-2 !p-4">
          {monthly.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No data in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthly} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" strokeOpacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatShortINR(v)} width={56} />
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#0e7490" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Cash Flow" className="!p-4">
          {monthly.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No cash flow yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => formatShortINR(v)} width={52} />
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" fill="url(#inGrad)" />
                  <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg py-2">
                  <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Inflow</p>
                  <p className="text-sm font-semibold text-emerald-600">{formatShortINR(monthly.reduce((s, m) => s + m.inflow, 0))}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 rounded-lg py-2">
                  <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Outflow</p>
                  <p className="text-sm font-semibold text-red-500">{formatShortINR(monthly.reduce((s, m) => s + m.outflow, 0))}</p>
                </div>
                <div className="bg-royal-50 dark:bg-white/5 rounded-lg py-2">
                  <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Net</p>
                  <p className="text-sm font-semibold text-royal-600">{formatShortINR(monthly.reduce((s, m) => s + m.inflow - m.outflow, 0))}</p>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card title="Profit & Loss (Period)" className="lg:col-span-2 !p-4">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              <tr>
                <td className="py-2.5 text-gray-600 dark:text-gray-400">Invoice Sales (exc. GST)</td>
                <td className="py-2.5 text-right font-semibold text-royal-950 dark:text-white">{formatINR(t.taxableRevenue)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-gray-600 dark:text-gray-400">GST Collected</td>
                <td className="py-2.5 text-right font-semibold text-royal-950 dark:text-white">{formatINR(t.gst)}</td>
              </tr>
              <tr className="bg-gray-50 dark:bg-white/5">
                <td className="py-2.5 font-medium text-royal-950 dark:text-white">Gross Revenue</td>
                <td className="py-2.5 text-right font-bold text-royal-950 dark:text-white">{formatINR(t.revenue)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-gray-600 dark:text-gray-400">Less: COGS (Cost of Goods Sold)</td>
                <td className="py-2.5 text-right font-semibold text-red-500">− {formatINR(t.cogs || t.purchases)}</td>
              </tr>
              <tr className="bg-emerald-50 dark:bg-emerald-500/10">
                <td className="py-2.5 font-medium text-royal-950 dark:text-white">Gross Profit <span className="text-xs text-gray-400">({gpm.toFixed(1)}% margin)</span></td>
                <td className="py-2.5 text-right font-bold text-emerald-600">{formatINR(t.grossProfit)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-gray-600 dark:text-gray-400">Less: Operating Expenses</td>
                <td className="py-2.5 text-right font-semibold text-red-500">− {formatINR(t.expenses)}</td>
              </tr>
              <tr className="bg-royal-50 dark:bg-white/5">
                <td className="py-3 font-semibold text-royal-950 dark:text-white">Net Profit <span className="text-xs text-gray-400 dark:text-gray-500">({npm.toFixed(1)}% margin)</span></td>
                <td className="py-3 text-right font-bold text-royal-700 dark:text-royal-300">{formatINR(t.netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Top Customers" className="!p-4">
          {topCustomers.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No customer data.</div>
          ) : (
            <div className="space-y-2.5 mt-1">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-medium text-gray-400">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-royal-950 dark:text-white truncate"><PieChart size={12} className="inline mr-1 text-royal-500" />{c.name}</p>
                      <span className="text-sm font-semibold text-royal-950 dark:text-white">{formatINR(c.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full flex-1 overflow-hidden">
                        <div className="h-full bg-royal-500 rounded-full" style={{ width: `${(c.amount / maxCustomer) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400">{c.invoices} inv.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {recent.length > 0 && (
        <Card title="Recent Invoices" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 text-left">
                  <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Invoice</th>
                  <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Date</th>
                  <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Customer</th>
                  <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((inv) => (
                  <tr key={inv.invoiceNumber} className="hover:bg-royal-50 dark:hover:bg-white/5">
                    <td className="px-5 py-3 font-mono text-xs text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3 font-medium text-royal-950 dark:text-white">{inv.customer}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatINR(inv.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}