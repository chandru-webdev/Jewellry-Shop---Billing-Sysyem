import { useState } from 'react'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { formatINR } from '../utils/format'

const MONTHLY_REVENUE = [
  { month: 'Feb', revenue: 1850000, expense: 1420000, profit: 430000 },
  { month: 'Mar', revenue: 1980000, expense: 1510000, profit: 470000 },
  { month: 'Apr', revenue: 2100000, expense: 1560000, profit: 540000 },
  { month: 'May', revenue: 2250000, expense: 1620000, profit: 630000 },
  { month: 'Jun', revenue: 2380000, expense: 1680000, profit: 700000 },
  { month: 'Jul', revenue: 2520000, expense: 1750000, profit: 770000 },
  { month: 'Aug', revenue: 2650000, expense: 1800000, profit: 850000 },
]

const CASH_FLOW = [
  { month: 'Feb', inflow: 1920000, outflow: 1500000 },
  { month: 'Mar', inflow: 2050000, outflow: 1580000 },
  { month: 'Apr', inflow: 2180000, outflow: 1640000 },
  { month: 'May', inflow: 2320000, outflow: 1700000 },
  { month: 'Jun', inflow: 2450000, outflow: 1760000 },
  { month: 'Jul', inflow: 2580000, outflow: 1830000 },
  { month: 'Aug', inflow: 2710000, outflow: 1880000 },
]

const TOP_CUSTOMERS = [
  { name: 'Rajesh Kumar Jewellers', invoices: 48, amount: 485000 },
  { name: 'Meena Gold Palace', invoices: 36, amount: 392000 },
  { name: 'Sharma & Sons', invoices: 29, amount: 318000 },
  { name: 'Lakshmi Silks & Jewels', invoices: 22, amount: 264000 },
  { name: 'Gupta Ornament House', invoices: 18, amount: 197000 },
]

const PNL_ITEMS = [
  {
    section: 'Revenue',
    items: [
      { label: 'Silver Sales', amount: 2250000 },
      { label: 'Gold Sales', amount: 380000 },
      { label: 'Other Income', amount: 20000 },
    ],
  },
  {
    section: 'Cost of Goods Sold',
    items: [
      { label: 'Silver Purchase', amount: 1650000 },
      { label: 'Gold Purchase', amount: 280000 },
      { label: 'Making Charges', amount: 120000 },
    ],
  },
  {
    section: 'Operating Expenses',
    items: [
      { label: 'Salaries', amount: 240000 },
      { label: 'Rent', amount: 45000 },
      { label: 'Utilities', amount: 12000 },
      { label: 'Marketing', amount: 15000 },
      { label: 'Maintenance', amount: 8000 },
    ],
  },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function BusinessReports() {
  const [fromDate, setFromDate] = useState('2026-02-01')
  const [toDate, setToDate] = useState('2026-08-31')

  const totalRevenue = PNL_ITEMS[0].items.reduce((s, i) => s + i.amount, 0)
  const totalCOGS = PNL_ITEMS[1].items.reduce((s, i) => s + i.amount, 0)
  const totalExpenses = PNL_ITEMS[2].items.reduce((s, i) => s + i.amount, 0)
  const grossProfit = totalRevenue - totalCOGS
  const netProfit = grossProfit - totalExpenses

  const kpis = [
    { label: 'Total Revenue', value: totalRevenue, trend: '+12.4%', up: true, good: true },
    { label: 'Gross Profit', value: grossProfit, trend: '+9.6%', up: true, good: true },
    { label: 'Total Expenses', value: totalCOGS + totalExpenses, trend: '-2.8%', up: false, good: true },
    { label: 'Net Profit', value: netProfit, trend: '+14.2%', up: true, good: true },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports"
        subtitle="Profit & loss, cash flow and business performance overview"
        actions={
          <>
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
              />
            </div>
            <Button onClick={() => window.print()}>
              <Download size={15} />
              Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4 hover:shadow-md transition-all">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-xl font-bold text-royal-950 dark:text-white mt-1">{formatINR(kpi.value)}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {kpi.up ? (
                <TrendingUp size={13} className={kpi.good ? 'text-emerald-600' : 'text-red-500'} />
              ) : (
                <TrendingDown size={13} className={kpi.good ? 'text-emerald-600' : 'text-red-500'} />
              )}
              <span className={`text-[11px] font-semibold ${kpi.good ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.trend} vs last period
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Revenue vs Expenses" action={<span className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5">Feb – Aug 2026</span>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Expense" fill="#c4b5fd" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Net Profit Trend" action={<span className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5">Feb – Aug 2026</span>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#6d28d9" strokeWidth={2.5} dot={{ r: 3, fill: '#6d28d9', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#5b21b6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Cash Flow" action={<span className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5">Feb – Aug 2026</span>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CASH_FLOW} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="inflow" name="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="outflow" name="Outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Customers" action={<span className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5">By purchase value</span>}>
          <div className="space-y-3">
            {TOP_CUSTOMERS.map((c, idx) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-gold-500/20 text-gold-600' :
                  idx === 1 ? 'bg-royal-100 text-royal-700' :
                  idx === 2 ? 'bg-amber-50 text-amber-600' :
                  'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 dark:text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-royal-950 dark:text-white truncate">{c.name}</p>
                    <p className="text-sm font-bold text-royal-800 shrink-0">{formatINR(c.amount)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-royal-400 to-royal-600"
                        style={{ width: `${(c.amount / TOP_CUSTOMERS[0].amount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{c.invoices} invoices</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Profit & Loss Statement"
        action={<span className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5">{fromDate} to {toDate}</span>}
      >
        <div className="max-w-2xl">
          {PNL_ITEMS.map((section, sIdx) => {
            const sectionTotal = section.items.reduce((s, i) => s + i.amount, 0)
            return (
              <div key={section.section} className={sIdx > 0 ? 'mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]' : ''}>
                <div className="flex items-center justify-between py-1.5">
                  <h4 className="text-sm font-bold text-royal-900 dark:text-gray-200">{section.section}</h4>
                </div>
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 pl-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-royal-900 dark:text-gray-200">{formatINR(item.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 mt-1 border-t border-gray-100 dark:border-white/[0.05]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Total {section.section}</span>
                  <span className="text-sm font-bold text-royal-800">{formatINR(sectionTotal)}</span>
                </div>
              </div>
            )
          })}

          <div className="mt-6 pt-4 border-t-2 border-royal-200 space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-semibold text-royal-900 dark:text-gray-200">Gross Profit</span>
              <span className="text-sm font-bold text-emerald-600">{formatINR(grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-semibold text-royal-900 dark:text-gray-200">Less: Operating Expenses</span>
              <span className="text-sm font-semibold text-red-500">-{formatINR(totalExpenses)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-4 bg-royal-50 rounded-lg">
              <span className="text-sm font-bold text-royal-950 dark:text-white">Net Profit</span>
              <span className="text-base font-bold text-royal-950 dark:text-white">{formatINR(netProfit)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
