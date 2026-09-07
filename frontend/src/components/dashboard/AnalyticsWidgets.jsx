import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, Wallet, Scale, PieChart as PieIcon,
  Calendar, ChevronDown, Check,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import Card from '../ui/Card'
import { analyticsApi } from '../../api/analytics'
import { formatINR } from '../../utils/format'
import { cn } from '../../utils/cn'

const REVENUE_COLOR = '#8b5cf6'
const INCOME_COLOR = '#10b981'
const EXPENSE_COLOR = '#ef4444'
const DONUT_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6', '#ec4899']

const DEFAULT_BLANK = [
  { label: 'Sep', revenue: 0, income: 0, expense: 0 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="capitalize">{p.name}:</span> {formatINR(p.value)}
        </p>
      ))}
    </div>
  )
}

function PeriodDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find((o) => o.value === value)?.label || options[0]?.label
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:border-royal-300 transition-colors cursor-pointer"
      >
        <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
        <span className="font-medium">{selected}</span>
        <ChevronDown size={12} className="text-gray-400 dark:text-gray-500" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-xl py-1.5 z-40">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setIsOpen(false) }}
                className={cn(
                  'w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between',
                  value === o.value
                    ? 'text-royal-700 dark:text-gray-200 bg-royal-50 dark:bg-white/5 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-white/5'
                )}
              >
                {o.label}
                {value === o.value && <Check size={13} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChartEmpty({ icon: Icon, message }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <Icon size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-[240px]">{message}</p>
    </div>
  )
}

function NetRevenueWidget({ data }) {
  const [period, setPeriod] = useState('12m')
  const rows = data?.data || DEFAULT_BLANK
  const sliced =
    period === '6m' ? rows.slice(-6)
      : period === 'thisYear' ? rows.filter((r) => r.year === new Date().getFullYear())
        : rows
  const total = sliced.reduce((s, r) => s + (r.revenue || 0), 0)

  return (
    <Card
      title="Net Revenue"
      icon={TrendingUp}
      action={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            {formatINR(total)} total
          </span>
          <PeriodDropdown
            value={period}
            onChange={setPeriod}
            options={[
              { value: '12m', label: 'Last 12 Months' },
              { value: '6m', label: 'Last 6 Months' },
              { value: 'thisYear', label: 'This Year' },
            ]}
          />
        </div>
      }
    >
      <div className="h-64">
        {sliced.some((r) => r.revenue) ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sliced} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Net Revenue" stroke={REVENUE_COLOR} strokeWidth={2.5} fill="url(#netRevGrad)" dot={{ r: 3, fill: REVENUE_COLOR, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty icon={TrendingUp} message="Create invoices or sync Shopify orders to see your net revenue." />
        )}
      </div>
    </Card>
  )
}

function ReceivablesWidget({ data }) {
  const rows = data?.data || [{ name: 'Current', value: 0 }]
  return (
    <Card title="Receivable Summary" icon={Wallet}>
      <div className="h-64">
        {data?.hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f5ff' }} />
              <Bar dataKey="value" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty icon={Wallet} message="Create invoices to view your total amount owed." />
        )}
      </div>
    </Card>
  )
}

function IncomeExpenseWidget({ data }) {
  const rows = data?.data || DEFAULT_BLANK
  const income = data?.incomeTotal ?? 0
  const expense = data?.expenseTotal ?? 0
  return (
    <Card
      title="Income and Expense"
      icon={Scale}
      action={
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: INCOME_COLOR }} /> Income
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: EXPENSE_COLOR }} /> Expense
          </span>
          <span className="text-[11px] font-semibold text-royal-700 dark:text-gray-300 bg-royal-50 dark:bg-white/5 px-2 py-1 rounded-lg">
            {formatINR(income)} in / {formatINR(expense)} out
          </span>
        </div>
      }
    >
      <div className="h-64">
        {rows.some((r) => r.income || r.expense) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f5ff' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty icon={Scale} message="Record sales and expenses to see your profit and loss trend." />
        )}
      </div>
    </Card>
  )
}

function TopExpensesWidget({ data: sharedData }) {
  const [period, setPeriod] = useState('12m')

  const { data } = useQuery({
    queryKey: ['analytics-top-expenses', period],
    queryFn: () => analyticsApi.overview({ months: period === '3m' ? 3 : period === '6m' ? 6 : 12 }).then((r) => r.data.data.topExpenses),
    staleTime: 30 * 1000,
    retry: 1,
  })

  const aggregate = data || sharedData || {}
  const rows = (aggregate.data || []).slice(0, 7)
  const total = aggregate.total ?? 0

  const renderLegend = () => (
    <div className="w-full space-y-1.5 mt-3">
      {rows.map((entry, i) => (
        <div key={entry.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{entry.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-xs font-bold text-royal-950 dark:text-white">{formatINR(entry.value)}</span>
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
              {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Card
      title="Top Expenses"
      icon={PieIcon}
      action={
        <PeriodDropdown
          value={period}
          onChange={setPeriod}
          options={[{ value: '12m', label: 'Last 12 Months' }, { value: '6m', label: 'Last 6 Months' }, { value: '3m', label: 'Last 3 Months' }]}
        />
      }
    >
      {aggregate?.hasData ? (
        <div className="flex items-center gap-4">
          <div className="relative w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {rows.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Total</p>
              <p className="text-sm font-bold text-royal-950 dark:text-white">{formatINR(total)}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">{renderLegend()}</div>
        </div>
      ) : (
        <div className="h-56">
          <ChartEmpty icon={PieIcon} message="No expenses recorded yet. Add expenses to see the category breakdown." />
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsWidgets() {
  const { data } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.overview().then((r) => r.data.data),
    staleTime: 30 * 1000,
    retry: 1,
  })

  const d = data || {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <NetRevenueWidget data={d.netRevenue} />
      <ReceivablesWidget data={d.receivables} />
      <IncomeExpenseWidget data={d.incomeExpense} />
      <TopExpensesWidget data={d.topExpenses} />
    </div>
  )
}