import { Link } from 'react-router-dom'
import {
  IndianRupee, TrendingUp, ShoppingCart, FileText, AlertTriangle,
  Receipt, Clock, Coins, Package, Users, Truck, Boxes, CreditCard,
  ArrowRight, BarChart3, Gem, CircleDollarSign, Activity, Store,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

// --- DEMO DATA (removed when backend APIs are ready) ---
const DEMO = {
  silverRate: 92.80,
  silverRateChange: 2.80,
  silverRatePct: 3.11,
  silverRateUpdated: 'Aug 10, 2026 09:00 AM',

  todaySales: 124560,
  todaySalesTrend: 18.6,
  todayOrders: 32,
  todayOrdersTrend: 9.7,
  todayInvoices: 47,
  todayInvoicesTrend: 15.2,
  grossProfit: 39330,
  grossProfitTrend: 21.3,
  outstanding: 112450,
  outstandingInvoices: 5,
  lowStockItems: 18,

  totalProducts: 312,
  totalCustomers: 186,
  totalSuppliers: 24,
  totalStockQty: 2853,
  totalStockWeight: 1248.70,
  todayExpenses: 12450,
  pendingPayments: 112450,

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
    { name: 'Silver Chain', sku: 'SLV-CHN-00008', qty: 135, weight: 189.00, revenue: 18900, icon: '⛓️' },
    { name: 'Silver Ring', sku: 'SLV-RNG-00021', qty: 98, weight: 142.10, revenue: 14210, icon: '💍' },
    { name: 'Silver Bracelet', sku: 'SLV-BRC-00015', qty: 75, weight: 111.25, revenue: 11250, icon: '⌚' },
    { name: 'Silver Pendant', sku: 'SLV-PND-00012', qty: 62, weight: 79.60, revenue: 9610, icon: '📿' },
    { name: 'Silver Earrings', sku: 'SLV-ERN-00031', qty: 58, weight: 68.20, revenue: 8520, icon: '✨' },
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

  lowStock: [
    { name: 'Silver Ring', sku: 'SLV-RNG-00021', current: 4, reorder: 10 },
    { name: 'Silver Bracelet', sku: 'SLV-BRC-00015', current: 3, reorder: 8 },
    { name: 'Silver Chain', sku: 'SLV-CHN-00008', current: 5, reorder: 12 },
    { name: 'Silver Pendant', sku: 'SLV-PND-00012', current: 2, reorder: 6 },
    { name: 'Silver Earrings', sku: 'SLV-ERN-00031', current: 6, reorder: 15 },
  ],

  recentActivities: [
    { type: 'rate', icon: Coins, color: 'text-gold-500', msg: 'Silver rate updated to ₹92.80 / gm', by: 'Admin', time: 'Today, 09:00 AM' },
    { type: 'order', icon: Store, color: 'text-blue-500', msg: 'Shopify Order #10235 imported', by: 'System', time: 'Today, 08:45 AM' },
    { type: 'invoice', icon: FileText, color: 'text-royal-500', msg: 'Invoice SI-2026-00047 created', by: 'System', time: 'Today, 08:44 AM' },
    { type: 'payment', icon: CreditCard, color: 'text-emerald-500', msg: 'Payment received via Razorpay — ₹5,230', by: 'System', time: 'Today, 08:30 AM' },
    { type: 'product', icon: Package, color: 'text-amber-500', msg: 'Product Silver Chain updated', by: 'Admin', time: 'Today, 08:15 AM' },
  ],
}

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

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-royal-950">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your ecommerce business today.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-600 font-medium">Aug 04, 2026 — Aug 10, 2026</span>
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-royal-700 hover:bg-royal-50 transition-colors cursor-pointer">
            <BarChart3 size={16} />
          </button>
        </div>
      </div>

      <SystemStatusStrip />
      <QuickActionBar />

      {/* Primary KPI Row - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { icon: IndianRupee, label: "Today's Sales", value: formatINR(DEMO.todaySales), trend: 'up', trendValue: `▲ ${DEMO.todaySalesTrend}% vs yesterday`, accent: 'purple' },
          { icon: ShoppingCart, label: "Today's Orders", value: DEMO.todayOrders, trend: 'up', trendValue: `▲ ${DEMO.todayOrdersTrend}% vs yesterday`, accent: 'blue' },
          { icon: FileText, label: "Today's Invoices", value: DEMO.todayInvoices, trend: 'up', trendValue: `▲ ${DEMO.todayInvoicesTrend}% vs yesterday`, accent: 'indigo' },
          { icon: TrendingUp, label: 'Gross Profit', value: formatINR(DEMO.grossProfit), trend: 'up', trendValue: `▲ ${DEMO.grossProfitTrend}% vs yesterday`, accent: 'green' },
          { icon: Clock, label: 'Outstanding', value: formatINR(DEMO.outstanding), sub: `${DEMO.outstandingInvoices} invoices`, accent: 'amber' },
          { icon: AlertTriangle, label: 'Low Stock Items', value: DEMO.lowStockItems, sub: 'Needs Reorder', accent: 'red' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.accent === 'purple' ? 'from-royal-500 to-royal-700' : kpi.accent === 'blue' ? 'from-blue-500 to-blue-600' : kpi.accent === 'indigo' ? 'from-indigo-500 to-indigo-600' : kpi.accent === 'green' ? 'from-emerald-500 to-emerald-600' : kpi.accent === 'amber' ? 'from-amber-500 to-orange-500' : 'from-red-500 to-red-600'} flex items-center justify-center mb-3`}>
              <kpi.icon size={16} className="text-white" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-lg font-bold text-royal-950 mt-0.5">{kpi.value}</p>
            <div className="mt-1.5">
              {kpi.trend === 'up' && (
                <span className="text-[11px] font-semibold text-emerald-600">{kpi.trendValue}</span>
              )}
              {kpi.sub && !kpi.trend && (
                <span className="text-[11px] text-gray-400">{kpi.sub}</span>
              )}
              {kpi.trend !== 'up' && kpi.sub && (
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
            { icon: Package, label: 'Total Products', value: DEMO.totalProducts, sub: 'Active', color: 'text-royal-500' },
            { icon: Users, label: 'Total Customers', value: DEMO.totalCustomers, sub: 'Active', color: 'text-blue-500' },
            { icon: Truck, label: 'Total Suppliers', value: DEMO.totalSuppliers, sub: 'Active', color: 'text-emerald-500' },
            { icon: Boxes, label: 'Total Stock (Qty)', value: `${DEMO.totalStockQty.toLocaleString('en-IN')} pcs`, color: 'text-amber-500' },
            { icon: Gem, label: 'Total Stock (Weight)', value: `${DEMO.totalStockWeight} gm`, color: 'text-gold-500' },
            { icon: Receipt, label: "Today's Expenses", value: formatINR(DEMO.todayExpenses), color: 'text-red-500' },
            { icon: CreditCard, label: 'Pending Payments', value: formatINR(DEMO.pendingPayments), color: 'text-orange-500' },
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
            <select className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-royal-500">
              <option>This Week</option>
              <option>Today</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO.salesOverview} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RIGHT: Payment Status */}
        <Card title="Payment Status" icon={CircleDollarSign}>
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEMO.paymentStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {DEMO.paymentStatus.map((entry, _i) => (
                      <Cell key={_i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Total</p>
                <p className="text-lg font-bold text-royal-950">{formatINR(DEMO.paymentTotal)}</p>
              </div>
            </div>
            <div className="w-full space-y-2 mt-4">
              {DEMO.paymentStatus.map((s) => (
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
              {DEMO.topProducts.map((p) => (
                <tr key={p.sku} className="border-b border-gray-50 last:border-0 hover:bg-royal-50/30">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{p.icon}</span>
                      <span className="font-medium text-royal-950">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-gray-500">{p.sku}</td>
                  <td className="py-2.5 text-right font-semibold text-royal-900">{p.qty}</td>
                  <td className="py-2.5 text-right text-gray-600">{p.weight.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-bold text-royal-800">{formatINR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Second Dashboard Row - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Silver Rate History */}
        <Card
          title="Silver Rate History (92.5)"
          icon={Coins}
          action={
            <span className="text-xs font-semibold text-royal-700 bg-royal-50 px-2.5 py-1 rounded-lg">
              Today: ₹{DEMO.silverRate} / gm
            </span>
          }
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO.silverRateHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rate" name="Rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
              </LineChart>
            </ResponsiveContainer>
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
                {DEMO.lowStock.map((p) => (
                  <tr key={p.sku} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-medium text-royal-950 text-xs">{p.name}</td>
                    <td className="py-2 font-mono text-[10px] text-gray-500">{p.sku}</td>
                    <td className="py-2 text-right">
                      <Badge tone={p.current <= 3 ? 'red' : 'orange'}>{p.current} pcs</Badge>
                    </td>
                    <td className="py-2 text-right text-xs text-gray-500">{p.reorder} pcs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card title="Recent Activities" icon={Activity}>
          <div className="space-y-0">
            {DEMO.recentActivities.map((a, i) => (
              <div key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 ${a.color}`}>
                  <a.icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-royal-950 leading-snug">{a.msg}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">by {a.by} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Analytics Strip - 6 compact cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Total Sales (This Month)', value: formatINR(DEMO.monthSales), trend: 'up', trendVal: `▲ ${DEMO.monthSalesTrend}%` },
          { label: 'Total Orders (This Month)', value: DEMO.monthOrders, trend: 'up', trendVal: `▲ ${DEMO.monthOrdersTrend}%` },
          { label: 'Average Order Value', value: formatINR(DEMO.avgOrderValue), trend: 'up', trendVal: `▲ ${DEMO.avgOrderTrend}%` },
          { label: 'Return Rate', value: `${DEMO.returnRate}%`, trend: 'down', trendVal: `▼ ${Math.abs(DEMO.returnRateTrend)}%` },
          { label: 'Gross Profit Margin', value: `${DEMO.profitMargin}%`, trend: 'up', trendVal: `▲ ${DEMO.profitMarginTrend}%` },
          { label: 'Inventory Value', value: formatINR(DEMO.inventoryValue), trend: null },
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
