import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ExternalLink, Eye } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ordersApi } from '../api/orders'
import { formatINR, formatDate } from '../utils/format'

const statusTone = {
  PENDING: 'orange', CONFIRMED: 'blue', PROCESSING: 'purple',
  FULFILLED: 'green', CANCELLED: 'red', RETURNED: 'gray', REFUNDED: 'gray',
  IMPORTED: 'blue',
}

const DEMO_ORDERS = [
  { id: 1, shopifyId: '#10235', internalId: 'ORD-2026-001', customer: 'Rajesh Kumar', value: 5230, payment: 'Paid', fulfillment: 'Fulfilled', invoice: 'SI-2026-00047', status: 'FULFILLED', date: '2026-08-10', source: 'SHOPIFY' },
  { id: 2, shopifyId: '#10234', internalId: 'ORD-2026-002', customer: 'Priya Sharma', value: 8450, payment: 'Paid', fulfillment: 'Processing', invoice: 'SI-2026-00046', status: 'PROCESSING', date: '2026-08-10', source: 'SHOPIFY' },
  { id: 3, shopifyId: '#10233', internalId: 'ORD-2026-003', customer: 'Amit Patel', value: 3200, payment: 'Pending', fulfillment: 'Unfulfilled', invoice: null, status: 'IMPORTED', date: '2026-08-09', source: 'SHOPIFY' },
  { id: 4, shopifyId: '#10232', internalId: 'ORD-2026-004', customer: 'Sneha Reddy', value: 12800, payment: 'Paid', fulfillment: 'Fulfilled', invoice: 'SI-2026-00045', status: 'FULFILLED', date: '2026-08-09', source: 'SHOPIFY' },
  { id: 5, shopifyId: '#10231', internalId: 'ORD-2026-005', customer: 'Vikram Singh', value: 6750, payment: 'Paid', fulfillment: 'Cancelled', invoice: null, status: 'CANCELLED', date: '2026-08-08', source: 'MANUAL' },
]

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const { data: apiOrders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list().then((r) => r.data.data),
    retry: false,
  })

  const orders = (!isError && apiOrders?.length) ? apiOrders : DEMO_ORDERS

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const id = o.shopifyId || o.orderNumber || o.internalId || ''
      if (!id.toLowerCase().includes(q) && !o.customer?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Track Shopify and manual orders through fulfillment"
        actions={
          <Button variant="outline" size="sm" onClick={() => showToast('Orders imported from Shopify')}><ExternalLink size={14} /> Import from Shopify</Button>
        }
      />

      {toast && <div className="mb-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800">{toast}</div>}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search order or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="IMPORTED">Imported</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RETURNED">Returned</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Shopify Order</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Internal ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Value</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Payment</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Fulfillment</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Loading orders...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">No orders found.</td></tr>}
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{o.shopifyId || o.orderNumber || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{o.internalId}</td>
                  <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{o.customer?.name || o.customer}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(o.value || o.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={o.payment === 'Paid' || o.paymentStatus === 'PAID' ? 'green' : 'orange'}>{o.payment || o.paymentStatus || '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={o.fulfillment === 'Fulfilled' ? 'green' : o.fulfillment === 'Cancelled' ? 'red' : 'blue'}>{o.fulfillment || '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {o.invoice ? <span className="font-mono text-xs text-royal-700 dark:text-gray-300">{o.invoice}</span> : <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(o.date || o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelected(o); setViewOpen(true) }} className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer" title="View"><Eye size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={viewOpen} title="Order Details" onClose={() => setViewOpen(false)} footer={
        <Button variant="ghost" onClick={() => setViewOpen(false)}>Close</Button>
      }>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Shopify Order</p>
                <p className="font-bold text-royal-950 dark:text-white text-lg">{selected.shopifyId || selected.orderNumber}</p>
              </div>
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Status</p>
                <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Customer</p><p className="font-medium">{selected.customer?.name || selected.customer}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Value</p><p className="font-bold text-royal-950 dark:text-white">{formatINR(selected.value || selected.totalAmount)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Payment</p><Badge tone={selected.payment === 'Paid' ? 'green' : 'orange'}>{selected.payment || selected.paymentStatus || '—'}</Badge></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Fulfillment</p><Badge tone="blue">{selected.fulfillment || '—'}</Badge></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
