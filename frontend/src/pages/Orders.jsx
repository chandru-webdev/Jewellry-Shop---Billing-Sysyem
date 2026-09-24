import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ExternalLink } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { ordersApi } from '../api/orders'
import { exportOrdersExcel, inRange } from '../utils/exportExcel'
import ExportControls from '../components/ui/ExportControls'
import {
  SalesOrdersTable,
  OrderDetailModal,
  InvoiceEditModal,
} from '../components/sales'
import { useInvoiceEditor } from '../components/sales/useInvoiceEditor'
import { orderStatusLabel } from '../components/sales/statusMaps'

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const { invoice: editInvoice, editorOpen, openEditor, closeEditor, handleSaved } = useInvoiceEditor()

  const { data: apiOrders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list().then((r) => r.data.data),
    retry: false,
  })

  const orders = apiOrders || []

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const id = o.orderNumber || o.id || ''
      if (!id.toLowerCase().includes(q) && !o.customer?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleExport = async ({ from, to }) => {
    const r = await ordersApi.list({ limit: 100000 })
    const all = (r.data.data || []).filter((o) => inRange(o.createdAt, from, to))
    exportOrdersExcel(all)
  }

  const openOrderDetail = (o) => {
    setSelectedOrderId(o.id)
    setViewOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Track Shopify and manual orders through fulfillment"
        actions={
          <div className="flex gap-2">
            <ExportControls onExport={handleExport} />
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/shopify/orders-sync'}><ExternalLink size={14} /> Import from Shopify</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search order or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          {['PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{orderStatusLabel[s]}</option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <SalesOrdersTable
          orders={filtered}
          isLoading={isLoading}
          onView={(o) => openOrderDetail(o)}
          onEdit={(o) => openEditor(o.invoice)}
        />
      </Card>

      <OrderDetailModal
        open={viewOpen}
        orderId={selectedOrderId}
        onClose={() => { setViewOpen(false); setSelectedOrderId(null) }}
      />

      <InvoiceEditModal
        open={editorOpen}
        invoice={editInvoice}
        onClose={closeEditor}
        onSaved={handleSaved}
      />
    </div>
  )
}