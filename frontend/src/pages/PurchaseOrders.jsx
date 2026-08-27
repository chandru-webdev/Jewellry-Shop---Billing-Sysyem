import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Package, X, Save } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { purchaseOrdersApi } from '../api/purchaseOrders'
import { suppliersApi } from '../api/suppliers'
import { formatINR, formatDate } from '../utils/format'

const statusTone = {
  PENDING: 'orange',
  CONFIRMED: 'blue',
  PROCESSING: 'purple',
  RECEIVED: 'green',
  CANCELLED: 'red',
  RETURNED: 'gray',
}

const statusLabel = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

export default function PurchaseOrders() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [showNewPO, setShowNewPO] = useState(false)
  const [poForm, setPOForm] = useState({ supplierId: '', notes: '' })
  const queryClient = useQueryClient()

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, filterStatus],
    queryFn: () => purchaseOrdersApi.list({ search, status: filterStatus || undefined }).then((r) => r.data.data),
  })

  const { data: apiSuppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersApi.list().then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setShowNewPO(false)
      setPOForm({ supplierId: '', notes: '' })
      alert('Purchase order created!')
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to create purchase order'),
  })

  const orders = apiData?.orders || []
  const suppliersList = apiSuppliers || []

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const num = o.orderNumber || o.shopifyId || o.internalId || ''
      return num.toLowerCase().includes(q) || o.supplier?.name?.toLowerCase().includes(q)
    }
    return true
  })

  const handleView = (order) => {
    setSelected(order)
    setViewOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders from suppliers"
        actions={
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by PO # or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURNED">Returned</option>
            </select>
            <Button size="sm" onClick={() => setShowNewPO(true)}>
              <Package size={14} /> New PO
            </Button>
            {showNewPO && (
              <Modal open={showNewPO} onClose={() => setShowNewPO(false)} title="New Purchase Order" size="md">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (!poForm.supplierId) { alert('Please select a supplier') ; return }
                  createMutation.mutate({ supplierId: poForm.supplierId, notes: poForm.notes, items: [] })
                }} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Supplier *</label>
                    <select
                      value={poForm.supplierId}
                      onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })}
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                      required
                    >
                      <option value="">Select a supplier</option>
                      {suppliersList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Notes</label>
                    <textarea
                      value={poForm.notes}
                      onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                      placeholder="Optional notes for this PO..."
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewPO(false)}>
                      <X size={12} /> Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      <Save size={12} /> Create PO
                    </Button>
                  </div>
                </form>
              </Modal>
            )}
          </div>
        }
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">PO #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Supplier</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Items</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Total</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Loading purchase orders...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No purchase orders found.
                </td>
              </tr>
            )}
            {!isLoading && filtered.map((o) => (
              <tr key={o.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{o.orderNumber || `#${o.id}`}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-royal-950 dark:text-white">{o.supplier?.name || (o.customer?.name || '—')}</span>
                  {o.supplier?.phone && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{o.supplier.phone}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(o.createdAt || o.date)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{o.totalItems || o._count?.items || 0}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{o.totalQuantity || 0}</td>
                <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(o.totalAmount)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge tone={statusTone[o.status] || 'gray'}>{statusLabel[o.status] || o.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleView(o)}
                      className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                      title="View"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Purchase Order Details" size="lg">
        {selected && (
          <div className="text-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · Purchase Management</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-royal-800 dark:text-gray-200 font-mono">{selected.orderNumber}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(selected.createdAt)}</p>
                <Badge tone={statusTone[selected.status] || 'gray'}>{statusLabel[selected.status] || selected.status}</Badge>
              </div>
            </div>

            <div className="bg-royal-50/60 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Supplier</p>
              <p className="font-semibold text-royal-950 dark:text-white">{selected.supplier?.name || (selected.customer?.name || '—')}</p>
              {selected.supplier?.phone && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{selected.supplier.phone}</p>}
            </div>

            <div className="space-y-2 border-t border-gray-100 dark:border-white/[0.05] pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Total Items</span>
                <span className="font-medium">{selected.totalItems || selected._count?.items || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Total Quantity</span>
                <span className="font-medium">{selected.totalQuantity || 0}</span>
              </div>
              <div className="flex justify-between font-bold text-royal-950 dark:text-white border-t pt-2">
                <span>Grand Total</span>
                <span>{formatINR(selected.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
