import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Eye, RotateCw, X, Save } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ordersApi } from '../api/orders'
import { suppliersApi } from '../api/suppliers'
import { formatINR, formatDate } from '../utils/format'

const statusTone = {
  PENDING: 'orange',
  APPROVED: 'blue',
  PROCESSING: 'purple',
  COMPLETED: 'green',
  REJECTED: 'red',
  RETURNED: 'gray',
}

const statusLabel = {
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  RETURNED: 'Returned',
}

const DEMO_PURCHASE_RETURNS = [
  {
    id: 1,
    returnNumber: 'PR-2026-001',
    orderNumber: 'PO-2026-001',
    supplier: { id: 1, name: 'Royal Crafts Ltd.', phone: '+91 98765 12345' },
    date: '2026-08-12T00:00:00Z',
    reason: 'Quality issue - stone missing',
    totalItems: 2,
    totalQuantity: 5,
    totalAmount: 8750.00,
    status: 'APPROVED',
    createdAt: '2026-08-12T00:00:00Z',
  },
  {
    id: 2,
    returnNumber: 'PR-2026-002',
    orderNumber: 'PO-2026-003',
    supplier: { id: 5, name: 'Golden Threads', phone: '+91 99887 76655' },
    date: '2026-08-09T00:00:00Z',
    reason: 'Damaged during transport',
    totalItems: 1,
    totalQuantity: 3,
    totalAmount: 4200.00,
    status: 'COMPLETED',
    createdAt: '2026-08-09T00:00:00Z',
  },
  {
    id: 3,
    returnNumber: 'PR-2026-003',
    orderNumber: 'PO-2026-002',
    supplier: { id: 2, name: 'Silver Arts Co.', phone: '+91 91234 56789' },
    date: '2026-08-07T00:00:00Z',
    reason: 'Wrong item delivered',
    totalItems: 3,
    totalQuantity: 12,
    totalAmount: 3200.00,
    status: 'PENDING',
    createdAt: '2026-08-07T00:00:00Z',
  },
]

const DEMO_SUPPLIERS_FOR_RETURN = [
  { id: 1, name: 'Royal Crafts Ltd.' },
  { id: 2, name: 'Silver Arts Co.' },
  { id: 5, name: 'Golden Threads' },
]

function isDemoMode() {
  return localStorage.getItem('opal_token') === 'demo-token-opal-line'
}

export default function PurchaseReturns() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [showNewReturn, setShowNewReturn] = useState(false)
  const [returnForm, setReturnForm] = useState({ supplierId: '', poNumber: '', reason: '' })

  const { data: apiReturns, isLoading, error } = useQuery({
    queryKey: ['purchase-returns', search, filterStatus],
    queryFn: () => ordersApi.list({ search, status: 'CANCELLED' }).then((r) => r.data.data),
  })

  const { data: apiSuppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersApi.list().then((r) => r.data.data),
  })

  const returns = (isDemoMode() && error) ? DEMO_PURCHASE_RETURNS : (apiReturns || [])
  const suppliersList = (isDemoMode() && error) ? DEMO_SUPPLIERS_FOR_RETURN : (apiSuppliers || [])

  const filtered = returns.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const num = r.returnNumber || r.orderNumber || `#${r.id}`
      return num.toLowerCase().includes(q) || r.supplier?.name?.toLowerCase()?.includes(q)
    }
    return true
  })

  const handleView = (item) => {
    setSelected(item)
    setViewOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Purchase Returns"
        subtitle="Manage returns and replacements for purchase orders"
        actions={
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by return # or supplier..."
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
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Button size="sm" onClick={() => setShowNewReturn(true)}>
              <RotateCw size={14} /> New Return
            </Button>
            {showNewReturn && (
              <Modal open={showNewReturn} onClose={() => setShowNewReturn(false)} title="New Purchase Return" size="md">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (!returnForm.supplierId) { alert('Please select a supplier'); return }
                  if (isDemoMode()) {
                    alert(`Return created for supplier #${returnForm.supplierId}\nPO: ${returnForm.poNumber || '—'}\nReason: ${returnForm.reason || '—'}\n\n(In demo mode, this is not saved to database)`)
                  } else {
                    alert(`Return created for supplier #${returnForm.supplierId}\nPO: ${returnForm.poNumber || '—'}\nReason: ${returnForm.reason || '—'})`)
                  }
                  setShowNewReturn(false)
                  setReturnForm({ supplierId: '', poNumber: '', reason: '' })
                }} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Supplier *</label>
                    <select
                      value={returnForm.supplierId}
                      onChange={(e) => setReturnForm({ ...returnForm, supplierId: e.target.value })}
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
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">PO Number</label>
                    <input
                      type="text"
                      value={returnForm.poNumber}
                      onChange={(e) => setReturnForm({ ...returnForm, poNumber: e.target.value })}
                      placeholder="e.g. PO-2026-001"
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Reason</label>
                    <textarea
                      value={returnForm.reason}
                      onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                      placeholder="Describe the reason for return..."
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewReturn(false)}>
                      <X size={12} /> Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      <Save size={12} /> Create Return
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
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Return #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Supplier</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">PO #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Items</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Amount</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Loading returns...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No returns found.
                </td>
              </tr>
            )}
            {!isLoading && filtered.map((r) => (
                <tr key={r.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{r.returnNumber || r.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-royal-950 dark:text-white">{r.supplier?.name || (r.customer?.name || '—')}</span>
                    {r.supplier?.phone && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{r.supplier.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500 font-mono text-xs">{r.orderNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(r.createdAt || r.date)}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{r.totalItems || r._count?.items || 0}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={statusTone[r.status] || 'gray'}>{statusLabel[r.status] || r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleView(r)}
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

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Return Details" size="lg">
        {selected && (
          <div className="text-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · Purchase Return</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-royal-800 dark:text-gray-200 font-mono">{selected.returnNumber || selected.orderNumber}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(selected.createdAt)}</p>
                <Badge tone={statusTone[selected.status] || 'gray'}>{statusLabel[selected.status] || selected.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Supplier</p>
                <p className="font-semibold text-royal-950 dark:text-white">{selected.supplier?.name || (selected.customer?.name || '—')}</p>
                {selected.supplier?.phone && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{selected.supplier.phone}</p>}
              </div>
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Original PO</p>
                <p className="font-mono text-xs text-royal-800 dark:text-gray-200">{selected.orderNumber || '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Reason</p>
              <p className="text-gray-700 dark:text-gray-300">{selected.reason || '—'}</p>
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
                <span>Refund Amount</span>
                <span>{formatINR(selected.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
