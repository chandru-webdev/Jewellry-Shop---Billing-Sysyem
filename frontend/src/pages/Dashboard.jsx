import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IndianRupee, TrendingUp, ShoppingCart, FileText, AlertTriangle,
  Receipt, Clock, Coins, Package, Users, Truck, Boxes, CreditCard,
  ArrowRight, BarChart3, Gem, CircleDollarSign, Store,
  Calendar, ChevronDown,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'
import { dashboardApi } from '../api/dashboard'

function isDemoMode() {
  return localStorage.getItem('opal_token') === 'demo-token-opal-line'
}

const DEMO_DATA = {
  dateRange: { filter: 'last7days', start: new Date(Date.now() - 6 * 86400000).toISOString(), end: new Date().toISOString() },

  periodRevenue: 785460,
  periodSalesCount: 247,
  periodOrdersCount: 247,
  salesTrend: 18.6,
  ordersTrend: 9.7,

  revenue: { today: 124560, month: 1875230, total: 48250000 },
  sales: { today: 47, month: 486 },
  orders: { pending: 5, today: 32 },

  customers: 186,
  suppliers: 24,
  products: { total: 312, active: 285 },

  stock: { totalQuantity: 2853, totalWeight: 1248.70 },

  silverRate: { rate: 92.80, updatedAt: new Date().toISOString(), updatedBy: 'Admin' },

  lowStock: {
    count: 18,
    items: [
      { id: 1, sku: 'SLV-RNG-00021', name: 'Silver Ring', category: 'Rings', quantity: 4, threshold: 10 },
      { id: 2, sku: 'SLV-BRC-00015', name: 'Silver Bracelet', category: 'Bracelets', quantity: 3, threshold: 8 },
      { id: 3, sku: 'SLV-CHN-00008', name: 'Silver Chain', category: 'Chains', quantity: 5, threshold: 12 },
      { id: 4, sku: 'SLV-PND-00012', name: 'Silver Pendant', category: 'Pendants', quantity: 2, threshold: 6 },
      { id: 5, sku: 'SLV-ERN-00031', name: 'Silver Earrings', category: 'Earrings', quantity: 6, threshold: 15 },
    ],
  },

  recentInvoices: [
    { id: 1, invoiceNumber: 'SI-2026-00047', customer: { name: 'Rajesh Kumar' }, grandTotal: 5230, status: 'PAID' },
    { id: 2, invoiceNumber: 'SI-2026-00046', customer: { name: 'Priya Sharma' }, grandTotal: 8750, status: 'PAID' },
    { id: 3, invoiceNumber: 'SI-2026-00045', customer: { name: 'Amit Patel' }, grandTotal: 3420, status: 'PENDING' },
    { id: 4, invoiceNumber: 'SI-2026-00044', customer: { name: 'Neha Gupta' }, grandTotal: 12800, status: 'PAID' },
    { id: 5, invoiceNumber: 'SI-2026-00043', customer: { name: 'Vikram Singh' }, grandTotal: 6540, status: 'PAID' },
    { id: 6, invoiceNumber: 'SI-2026-00042', customer: { name: 'Anjali Mehta' }, grandTotal: 4180, status: 'VOID' },
  ],

  recentOrders: [],

  salesOverview: [
    { date: 'Mon 04', revenue: 85200, orders: 24 },
    { date: 'Tue 05', revenue: 112400, orders: 31 },
    { date: 'Wed 06', revenue: 98700, orders: 28 },
    { date: 'Thu 07', revenue: 134500, orders: 36 },
    { date: 'Fri 08', revenue: 121800, orders: 33 },
    { date: 'Sat 09', revenue: 108300, orders: 29 },
    { date: 'Sun 10', revenue: 124560, orders: 32 },
  ],

  topProducts: [
    { name: 'Silver Chain', sku: 'SLV-CHN-00008', qty: 135, weight: 189.00, revenue: 18900 },
    { name: 'Silver Ring', sku: 'SLV-RNG-00021', qty: 98, weight: 142.10, revenue: 14210 },
    { name: 'Silver Bracelet', sku: 'SLV-BRC-00015', qty: 75, weight: 111.25, revenue: 11250 },
    { name: 'Silver Pendant', sku: 'SLV-PND-00012', qty: 62, weight: 79.60, revenue: 9610 },
    { name: 'Silver Earrings', sku: 'SLV-ERN-00031', qty: 58, weight: 68.20, revenue: 8520 },
  ],

  paymentStatus: [
    { name: 'Paid', value: 235600, pct: 67, color: '#10b981' },
    { name: 'Pending', value: 112450, pct: 32, color: '#f59e0b' },
    { name: 'Failed / Overdue', value: 5870, pct: 1, color: '#ef4444' },
  ],
  paymentTotal: 353920,

  silverRateHistory: [
    { date: '04 Aug', rate: 89.50 },
    { date: '05 Aug', rate: 90.20 },
    { date: '06 Aug', rate: 91.10 },
    { date: '07 Aug', rate: 89.80 },
    { date: '08 Aug', rate: 91.50 },
    { date: '09 Aug', rate: 92.00 },
    { date: '10 Aug', rate: 92.80 },
  ],

  outstanding: 112450,
  outstandingInvoices: 5,
  todayExpenses: 12450,

  monthSales: 1875230,
  monthSalesTrend: 24.5,
  monthOrders: 486,
  monthOrdersTrend: 19.8,
  avgOrderValue: 3865,
  avgOrderTrend: 15.4,
  returnRate: 2.35,
  returnRateTrend: -0.65,
  profitMargin: 21.45,
  profitMarginTrend: 2.15,
  inventoryValue: 2648700,
}

const DATE_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
]

const quickActions = [
  { label: 'Sales Invoice', icon: FileText, to: '/billing' },
  { label: 'Sales Order', icon: ShoppingCart, to: '/orders' },
  { label: 'Product', icon: Package, to: '/products' },
  { label: 'Customer', icon: Users, to: '/customers' },
  { label: 'Silver Rate', icon: Coins, to: '/metal-rates' },
  { label: 'Expense', icon: Receipt, to: '/expenses' },
  { label: 'Stock Transfer', icon: Boxes, to: '/stock-transfer' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
  { label: 'Shopify', icon: Store, to: '/shopify' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.name === 'revenue' || p.name === 'Revenue' ? formatINR(p.value) : p.name === 'rate' || p.name === 'Rate' ? `₹${p.value}/gm` : p.value}
        </p>
      ))}
    </div>
  )
}

function DateFilterDropdown({ value, onChange, customStart, customEnd, onCustomStartChange, onCustomEndChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedLabel = DATE_FILTERS.find((f) => f.value === value)?.label || 'Last 7 Days'

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-royal-300 transition-colors"
        >
          <Calendar size={14} className="text-gray-400" />
          <span className="text-gray-700 font-medium">{selectedLabel}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-40">
            {DATE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  onChange(filter.value)
                  if (filter.value !== 'custom') setIsOpen(false)
                }}
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer ${
                  value === filter.value
                    ? 'text-royal-700 bg-royal-50 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </>
      )}

      {value === 'custom' && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs font-medium text-royal-600 hover:text-royal-800 px-2 py-1.5"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

function SystemStatusStrip() {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {[
        { label: 'Shopify', status: 'Connected', color: 'bg-emerald-400' },
        { label: 'Razorpay', status: 'Connected', color: 'bg-emerald-400' },
        { label: 'System', status: 'Healthy', color: 'bg-emerald-400' },
      ].map((s) => (
        <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200/80 rounded-lg px-3 py-1.5">
          <div className={`w-2 h-2 rounded-full ${s.color}`} />
          <span className="text-[11px] font-medium text-gray-600">{s.label}</span>
          <span className="text-[11px] font-semibold text-emerald-600">{s.status}</span>
        </div>
      ))}
    </div>
  )
}

function QuickActionBar() {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {quickActions.map((a) => (
        <Link
          key={a.label}
          to={a.to}
          className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-royal-300 hover:bg-royal-50 text-gray-700 hover:text-royal-700 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
        >
          <a.icon size={13} />
          {a.label}
        </Link>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
            <div className="w-9 h-9 rounded-lg bg-gray-200 animate-pulse mb-3" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/80 shadow-sm h-80 animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm h-80 animate-pulse" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState('last7days')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handleFilterChange = useCallback((value) => {
    setDateFilter(value)
  }, [])

  const queryParams = {
    filter: dateFilter,
    ...(dateFilter === 'custom' && customStart ? { startDate: customStart } : {}),
    ...(dateFilter === 'custom' && customEnd ? { endDate: customEnd } : {}),
  }

  const { data: res, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', dateFilter, customStart, customEnd],
    queryFn: () => dashboardApi.getStats(queryParams),
    staleTime: 30 * 1000,
    retry: 1,
  })

  const d = isDemoMode() && (error || !res?.data?.data) ? DEMO_DATA : res?.data?.data

  if (isLoading) return <LoadingSkeleton />

  if (!d) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertTriangle size={40} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">Failed to load dashboard data</p>
        <p className="text-xs mt-1 mb-4">Check your connection and try again</p>
        <button
          onClick={() => refetch()}
          className="text-xs font-medium text-royal-600 hover:text-royal-800 px-4 py-2 bg-royal-50 rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }

  const dateRangeLabel = (() => {
    const fmt = (dt) => new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    if (d.dateRange?.start && d.dateRange?.end) {
      return `${fmt(d.dateRange.start)} — ${fmt(d.dateRange.end)}`
    }
    return 'Last 7 Days'
  })()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-royal-950">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your ecommerce business today.</p>
        </div>
        <DateFilterDropdown
          value={dateFilter}
          onChange={handleFilterChange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      <SystemStatusStrip />
      <QuickActionBar />

      {/* Primary KPI Row - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            icon: IndianRupee,
            label: 'Period Sales',
            value: formatINR(d.periodRevenue),
            trend: d.salesTrend >= 0 ? 'up' : 'down',
            trendValue: `${d.salesTrend >= 0 ? '▲' : '▼'} ${Math.abs(d.salesTrend)}% vs prev period`,
            accent: 'purple',
          },
          {
            icon: ShoppingCart,
            label: 'Period Orders',
            value: d.periodOrdersCount,
            trend: d.ordersTrend >= 0 ? 'up' : 'down',
            trendValue: `${d.ordersTrend >= 0 ? '▲' : '▼'} ${Math.abs(d.ordersTrend)}% vs prev period`,
            accent: 'blue',
          },
          {
            icon: FileText,
            label: 'Period Invoices',
            value: d.periodSalesCount,
            trend: d.salesTrend >= 0 ? 'up' : 'down',
            trendValue: `${d.salesTrend >= 0 ? '▲' : '▼'} ${Math.abs(d.salesTrend)}% vs prev period`,
            accent: 'indigo',
          },
          {
            icon: TrendingUp,
            label: 'Gross Profit',
            value: formatINR(d.periodRevenue * (d.profitMargin / 100)),
            trend: 'up',
            trendValue: `${d.profitMargin}% margin`,
            accent: 'green',
          },
          {
            icon: Clock,
            label: 'Outstanding',
            value: formatINR(d.outstanding),
            sub: `${d.outstandingInvoices} invoices`,
            accent: 'amber',
          },
          {
            icon: AlertTriangle,
            label: 'Low Stock Items',
            value: d.lowStock.count,
            sub: 'Needs Reorder',
            accent: 'red',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${
              kpi.accent === 'purple' ? 'from-royal-500 to-royal-700' :
              kpi.accent === 'blue' ? 'from-blue-500 to-blue-600' :
              kpi.accent === 'indigo' ? 'from-indigo-500 to-indigo-600' :
              kpi.accent === 'green' ? 'from-emerald-500 to-emerald-600' :
              kpi.accent === 'amber' ? 'from-amber-500 to-orange-500' :
              'from-red-500 to-red-600'
            } flex items-center justify-center mb-3`}>
              <kpi.icon size={16} className="text-white" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-lg font-bold text-royal-950 mt-0.5">{kpi.value}</p>
            <div className="mt-1.5">
              {kpi.trend === 'up' && (
                <span className="text-[11px] font-semibold text-emerald-600">{kpi.trendValue}</span>
              )}
              {kpi.trend === 'down' && (
                <span className="text-[11px] font-semibold text-red-500">{kpi.trendValue}</span>
              )}
              {kpi.sub && !kpi.trend && (
                <span className="text-[11px] text-gray-400">{kpi.sub}</span>
              )}
              {kpi.trend !== 'up' && kpi.trend !== 'down' && kpi.sub && (
                <span className="text-[11px] text-gray-400">{kpi.sub}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Business Summary Strip */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm px-5 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {[
            { icon: Package, label: 'Total Products', value: d.products.active, sub: 'Active', color: 'text-royal-500' },
            { icon: Users, label: 'Total Customers', value: d.customers, sub: 'Active', color: 'text-blue-500' },
            { icon: Truck, label: 'Total Suppliers', value: d.suppliers, sub: 'Active', color: 'text-emerald-500' },
            { icon: Boxes, label: 'Total Stock (Qty)', value: `${(d.stock.totalQuantity || 0).toLocaleString('en-IN')} pcs`, color: 'text-amber-500' },
            { icon: Gem, label: 'Total Stock (Weight)', value: `${Number(d.stock.totalWeight || 0).toFixed(2)} gm`, color: 'text-gold-500' },
            { icon: Receipt, label: "Today's Expenses", value: formatINR(d.todayExpenses), color: 'text-red-500' },
            { icon: CreditCard, label: 'Pending Payments', value: formatINR(d.outstanding), color: 'text-orange-500' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 min-w-0">
              <s.icon size={15} className={`${s.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium truncate">{s.label}</p>
                <p className="text-sm font-bold text-royal-950 truncate">{s.value}</p>
                {s.sub && <p className="text-[10px] text-emerald-600 font-medium">{s.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dashboard Grid - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Sales Overview Chart */}
        <Card
          title="Sales Overview"
          icon={BarChart3}
          className="lg:col-span-2"
          action={
            <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              {dateRangeLabel}
            </span>
          }
        >
          <div className="h-72">
            {d.salesOverview && d.salesOverview.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.salesOverview} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data for this period</div>
            )}
          </div>
        </Card>

        {/* RIGHT: Payment Status */}
        <Card title="Payment Status" icon={CircleDollarSign}>
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.paymentStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {d.paymentStatus.map((entry, _i) => (
                      <Cell key={_i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Total</p>
                <p className="text-lg font-bold text-royal-950">{formatINR(d.paymentTotal)}</p>
              </div>
            </div>
            <div className="w-full space-y-2 mt-4">
              {d.paymentStatus.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs font-medium text-gray-600">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-royal-950">{formatINR(s.value)}</span>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-center text-xs font-semibold text-royal-600 hover:text-royal-800 py-2 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer">
              View Details
            </button>
          </div>
        </Card>
      </div>

      {/* Top Selling Products */}
      <Card
        title="Top Selling Products"
        icon={Gem}
        action={
          <Link to="/products" className="text-xs font-semibold text-royal-600 hover:text-royal-800 flex items-center gap-1">
            View All <ArrowRight size={12} />
          </Link>
        }
      >
        <div className="overflow-x-auto">
          {d.topProducts && d.topProducts.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">SKU</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Weight (gm)</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {d.topProducts.map((p) => (
                  <tr key={p.sku} className="border-b border-gray-50 last:border-0 hover:bg-royal-50/30">
                    <td className="py-2.5 font-medium text-royal-950">{p.name}</td>
                    <td className="py-2.5 font-mono text-[11px] text-gray-500">{p.sku}</td>
                    <td className="py-2.5 text-right font-semibold text-royal-900">{p.qty}</td>
                    <td className="py-2.5 text-right text-gray-600">{Number(p.weight).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-royal-800">{formatINR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">No sales in this period</div>
          )}
        </div>
      </Card>

      {/* Second Dashboard Row - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Silver Rate History */}
        <Card
          title="Silver Rate History (92.5)"
          icon={Coins}
          action={
            d.silverRate && (
              <span className="text-xs font-semibold text-royal-700 bg-royal-50 px-2.5 py-1 rounded-lg">
                Today: ₹{d.silverRate.rate} / gm
              </span>
            )
          }
        >
          <div className="h-48">
            {d.silverRateHistory && d.silverRateHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.silverRateHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="rate" name="Rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No rate changes in this period</div>
            )}
          </div>
        </Card>

        {/* Low Stock Alert */}
        <Card
          title="Low Stock Alert"
          icon={AlertTriangle}
          action={
            <Link to="/inventory" className="text-xs font-semibold text-royal-600 hover:text-royal-800 flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          }
        >
          <div className="overflow-x-auto">
            {d.lowStock.items && d.lowStock.items.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Product</th>
                    <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">SKU</th>
                    <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Stock</th>
                    <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {d.lowStock.items.map((p) => (
                    <tr key={p.sku} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium text-royal-950 text-xs">{p.name}</td>
                      <td className="py-2 font-mono text-[10px] text-gray-500">{p.sku}</td>
                      <td className="py-2 text-right">
                        <Badge tone={p.quantity <= 3 ? 'red' : 'orange'}>{p.quantity} pcs</Badge>
                      </td>
                      <td className="py-2 text-right text-xs text-gray-500">{p.threshold} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">All products are well stocked</div>
            )}
          </div>
        </Card>

        {/* Recent Invoices */}
        <Card title="Recent Invoices" icon={FileText}>
          <div className="space-y-0">
            {d.recentInvoices && d.recentInvoices.length > 0 ? (
              d.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-royal-950 truncate">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-gray-400 truncate">{inv.customer?.name || 'Walk-in'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold text-royal-800">{formatINR(inv.grandTotal)}</p>
                    <Badge tone={inv.status === 'PAID' ? 'green' : inv.status === 'VOID' ? 'red' : 'orange'}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">No recent invoices</div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Analytics Strip - 6 compact cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total Sales (Period)', value: formatINR(d.periodRevenue), trend: d.salesTrend >= 0 ? 'up' : 'down', trendVal: `${d.salesTrend >= 0 ? '▲' : '▼'} ${Math.abs(d.salesTrend)}%` },
          { label: 'Total Orders (Period)', value: d.periodOrdersCount, trend: d.ordersTrend >= 0 ? 'up' : 'down', trendVal: `${d.ordersTrend >= 0 ? '▲' : '▼'} ${Math.abs(d.ordersTrend)}%` },
          { label: 'Average Order Value', value: formatINR(d.avgOrderValue), trend: d.avgOrderTrend >= 0 ? 'up' : 'down', trendVal: `${d.avgOrderTrend >= 0 ? '▲' : '▼'} ${Math.abs(d.avgOrderTrend)}%` },
          { label: 'Return Rate', value: `${d.returnRate}%`, trend: d.returnRateTrend <= 0 ? 'down' : 'up', trendVal: `▼ ${Math.abs(d.returnRateTrend)}%` },
          { label: 'Gross Profit Margin', value: `${d.profitMargin}%`, trend: 'up', trendVal: `Margin` },
          { label: 'Inventory Value', value: formatINR(d.inventoryValue), trend: null },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{c.label}</p>
            <p className="text-base font-bold text-royal-950 mt-0.5">{c.value}</p>
            {c.trend === 'up' && <span className="text-[11px] font-semibold text-emerald-600">{c.trendVal}</span>}
            {c.trend === 'down' && <span className="text-[11px] font-semibold text-emerald-600">{c.trendVal}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
