import { useState } from 'react'
import { RefreshCw, Users, Download, Search, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const DEMO_CUSTOMERS = [
  { shopifyId: '#95123', name: 'Rajesh Kumar', email: 'rajesh@gmail.com', phone: '9876543210', orders: 12, totalSpent: 85600, status: 'Synced', syncedAt: '2026-08-10 08:15 AM', erpId: 'CUST-001' },
  { shopifyId: '#95124', name: 'Priya Sharma', email: 'priya@gmail.com', phone: '9876543211', orders: 8, totalSpent: 62300, status: 'Synced', syncedAt: '2026-08-10 08:15 AM', erpId: 'CUST-002' },
  { shopifyId: '#95125', name: 'Amit Patel', email: 'amit@gmail.com', phone: '9876543212', orders: 5, totalSpent: 34500, status: 'Synced', syncedAt: '2026-08-09 06:00 PM', erpId: 'CUST-003' },
  { shopifyId: '#95126', name: 'Sneha Reddy', email: 'sneha@gmail.com', phone: '9876543213', orders: 15, totalSpent: 128900, status: 'Synced', syncedAt: '2026-08-09 06:00 PM', erpId: 'CUST-004' },
  { shopifyId: '#95127', name: 'Vikram Singh', email: 'vikram@gmail.com', phone: '9876543214', orders: 3, totalSpent: 22100, status: 'Synced', syncedAt: '2026-08-09 02:00 PM', erpId: 'CUST-005' },
  { shopifyId: '#95128', name: 'Neha Gupta', email: 'neha@gmail.com', phone: '9876543215', orders: 0, totalSpent: 0, status: 'Pending', syncedAt: null, erpId: null },
  { shopifyId: '#95129', name: 'Ravi Mehta', email: 'ravi@gmail.com', phone: '9876543216', orders: 6, totalSpent: 45000, status: 'Synced', syncedAt: '2026-08-08 12:00 PM', erpId: 'CUST-006' },
  { shopifyId: '#95130', name: 'Ananya Desai', email: 'ananya@gmail.com', phone: '9876543217', orders: 2, totalSpent: 15000, status: 'Failed', syncedAt: null, erpId: null },
]

const statusColor = { Synced: 'green', Pending: 'orange', Failed: 'red' }

export default function CustomersSync() {
  const [search, setSearch] = useState('')

  const filtered = DEMO_CUSTOMERS.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.shopifyId.toLowerCase().includes(q)
    )
  })

  const synced = DEMO_CUSTOMERS.filter((c) => c.status === 'Synced').length
  const pending = DEMO_CUSTOMERS.filter((c) => c.status === 'Pending').length
  const failed = DEMO_CUSTOMERS.filter((c) => c.status === 'Failed').length

  return (
    <div>
      <PageHeader title="Customers Sync" subtitle="Sync Shopify customers with ERP" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm"><Download size={14} /> Pull from Shopify</Button>
          <Button variant="outline" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total Customers</p>
            <Users size={14} className="text-royal-400" />
          </div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{DEMO_CUSTOMERS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Synced</p>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{synced}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{failed}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or Shopify ID..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-royal-200 focus:border-royal-300"
          />
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Total Spent</th>
                <th className="px-4 py-3 font-medium text-gray-600">ERP ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Last Synced</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.shopifyId} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-royal-950">{c.name}</p>
                    <p className="text-[11px] text-gray-400">{c.email}</p>
                    <p className="text-[11px] font-mono text-gray-400">Shopify {c.shopifyId}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-600">{c.phone}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">{c.orders}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800">{formatINR(c.totalSpent)}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-royal-700">{c.erpId || '—'}</td>
                  <td className="px-4 py-2.5"><Badge tone={statusColor[c.status]}>{c.status}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.syncedAt || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {c.status === 'Failed' && <Button variant="ghost" size="sm"><RefreshCw size={12} /> Retry</Button>}
                    {c.status === 'Pending' && <Button variant="ghost" size="sm"><Download size={12} /> Import</Button>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-sm text-gray-400">No customers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
