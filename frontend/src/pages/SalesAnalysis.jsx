import { useState } from 'react'
import { Download, TrendingUp, ShoppingCart, IndianRupee, RotateCcw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { formatINR } from '../utils/format'

const DAILY_SALES = Array.from({ length: 30 }, (_, i) => ({
  day: `Aug ${i + 1}`,
  sales: 65000 + Math.floor(Math.random() * 85000),
  orders: 3 + Math.floor(Math.random() * 8),
}))

const PAYMENT_METHODS = [
  { name: 'CASH', value: 380000, color: '#10b981' },
  { name: 'UPI', value: 520000, color: '#8b5cf6' },
  { name: 'Card', value: 290000, color: '#f59e0b' },
  { name: 'Bank Transfer', value: 410000, color: '#3b82f6' },
  { name: 'Shopify', value: 250000, color: '#ec4899' },
]

const TOP_PRODUCTS = [
  { name: 'Silver Chain 925', revenue: 345000, qty: 48 },
  { name: 'Silver Ring Plain', revenue: 280000, qty: 65 },
  { name: 'Gold Pendant', revenue: 225000, qty: 12 },
  { name: 'Silver Bracelet', revenue: 195000, qty: 32 },
  { name: 'Silver Earrings', revenue: 175000, qty: 42 },
  { name: 'Gold Chain', revenue: 165000, qty: 8 },
  { name: 'Silver Anklet', revenue: 145000, qty: 38 },
  { name: 'Silver Nose Ring', revenue: 120000, qty: 55 },
  { name: 'Gold Bangle', revenue: 110000, qty: 6 },
  { name: 'Silver Toe Ring', revenue: 95000, qty: 45 },
]

const CATEGORY_SALES = [
  { category: 'Silver Chains', quantity: 156, revenue: 1250000, avgPrice: 8013 },
  { category: 'Silver Rings', quantity: 210, revenue: 980000, avgPrice: 4667 },
  { category: 'Gold Jewellery', quantity: 42, revenue: 890000, avgPrice: 21190 },
  { category: 'Silver Bracelets', quantity: 98, revenue: 650000, avgPrice: 6633 },
  { category: 'Silver Earrings', quantity: 135, revenue: 520000, avgPrice: 3852 },
  { category: 'Silver Anklets', quantity: 88, revenue: 380000, avgPrice: 4318 },
  { category: 'Silver Nose Rings', quantity: 165, revenue: 340000, avgPrice: 2061 },
  { category: 'Gold Chains', quantity: 18, revenue: 290000, avgPrice: 16111 },
]

const SALESPERSONS = [
  { name: 'Rajesh K.', orders: 85, revenue: 1450000, avgOrder: 17059 },
  { name: 'Priya S.', orders: 72, revenue: 1180000, avgOrder: 16389 },
  { name: 'Amit P.', orders: 58, revenue: 920000, avgOrder: 15862 },
  { name: 'Sneha R.', orders: 45, revenue: 680000, avgOrder: 15111 },
  { name: 'Vikram S.', orders: 32, revenue: 490000, avgOrder: 15313 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.name === 'orders' ? p.value : formatINR(p.value)}</p>
      ))}
    </div>
  )
}

export default function SalesAnalysis() {
  const [dateFrom, setDateFrom] = useState('2026-08-01')
  const [dateTo, setDateTo] = useState('2026-08-31')

  const totalSales = DAILY_SALES.reduce((s, d) => s + d.sales, 0)
  const totalOrders = DAILY_SALES.reduce((s, d) => s + d.orders, 0)
  const avgOrderValue = totalSales / totalOrders
  const returnRate = 2.3

  return (
    <div>
      <PageHeader title="Sales Analysis" subtitle="Revenue trends, product performance and sales insights" actions={
        <Button variant="outline"><Download size={14} className="mr-1" /> Export PDF</Button>
      } />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">From:</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
          <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">To:</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><IndianRupee size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Sales</p></div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(totalSales)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600"><TrendingUp size={12} /> +14.2%</div>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><ShoppingCart size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Avg Order Value</p></div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(avgOrderValue)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600"><TrendingUp size={12} /> +5.8%</div>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><ShoppingCart size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Orders</p></div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{totalOrders}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600"><TrendingUp size={12} /> +11.3%</div>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><RotateCcw size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Return Rate</p></div>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{returnRate}%</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-red-600"><TrendingUp size={12} /> +0.3%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="Daily Sales Trend" className="lg:col-span-2 p-0 overflow-hidden">
          <div className="h-72 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DAILY_SALES} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Sales by Payment Method">
          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PAYMENT_METHODS} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {PAYMENT_METHODS.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {PAYMENT_METHODS.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.name}</span>
                <span className="font-semibold ml-auto">{formatINR(p.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="Top 10 Products by Revenue" className="p-0 overflow-hidden">
          <div className="h-80 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_PRODUCTS} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Sales by Category">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 text-left">
                  <th className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Category</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Qty</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Revenue</th>
                  <th className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_SALES.map((c, i) => (
                  <tr key={c.category} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2.5 font-medium text-royal-800">{c.category}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{c.quantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-royal-800">{formatINR(c.revenue)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(c.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Sales by Salesperson">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">#</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Salesperson</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Orders</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Revenue</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Avg Order</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Performance</th>
              </tr>
            </thead>
            <tbody>
              {SALESPERSONS.map((s, i) => {
                const maxRevenue = SALESPERSONS[0].revenue
                const pct = (s.revenue / maxRevenue) * 100
                return (
                  <tr key={s.name} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 dark:text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-800">{s.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{s.orders}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800">{formatINR(s.revenue)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(s.avgOrder)}</td>
                    <td className="px-4 py-2.5">
                      <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2">
                        <div className="bg-royal-500 rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
