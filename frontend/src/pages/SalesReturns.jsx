import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, RotateCcw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select, Label } from '../components/ui/FormControls'
import { formatINR } from '../utils/format'
import { ordersApi } from '../api/orders'
import { ReturnsTable, OrderDetailModal } from '../components/sales'
import { orderStatusLabel, RETURNABLE_STATUSES } from '../components/sales/statusMaps'

const reasonOptions = ['Defective', 'Wrong item', 'Damaged in transit', 'Changed mind', 'Other']

export default function SalesReturns() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [confirmOrder, setConfirmOrder] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const { data: apiOrders, isLoading } = useQuery({
    queryKey: ['orders', 'returns'],
    queryFn: () => ordersApi.list({ limit: 100 }).then((r) => r.data.data),
  })

  const orders = apiOrders || []
  const returnable = orders.filter((o) => RETURNABLE_STATUSES.includes(o.status))

  const refundMutation = useMutation({
    mutationFn: (id) => ordersApi.updateStatus(id, 'REFUNDED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'returns'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setConfirmOrder(null)
      setShowForm(false)
      setOrderId('')
      setReason('')
      setNote('')
      setError('')
      showToast('Order refunded. Stock returned and invoice voided.')
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to process return.')
      setConfirmOrder(null)
    },
  })

  const handleOpenForm = () => {
    setError('')
    setOrderId('')
    setReason('')
    setNote('')
    setShowForm(true)
  }

  const selectedOrder = orders.find((o) => String(o.id) === String(orderId))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!orderId || !reason) {
      setError('Please select an order and a reason.')
      return
    }
    const order = orders.find((o) => String(o.id) === String(orderId))
    if (!order) return
    setConfirmOrder(order)
  }

  const handleRefund = () => {
    refundMutation.mutate(confirmOrder.id)
  }

  const handleRefundDirect = (order) => {
    setError('')
    setConfirmOrder(order)
  }

  const openView = (o) => {
    setSelectedOrderId(o.id)
    setViewOpen(true)
  }

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const ref = o.orderNumber || o.shopifyId || `#${o.id}`
      const customer = o.customer?.name || ''
      const item = o.items?.[0]?.name || ''
      if (!String(ref).toLowerCase().includes(q) && !customer.toLowerCase().includes(q) && !item.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        subtitle="Process refunds and return stock to inventory for paid orders"
        actions={
          <Button size="sm" onClick={handleOpenForm} disabled={returnable.length === 0}>
            <Plus size={14} /> New Return
          </Button>
        }
      />

      {error && <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {toast && (
        <div className="mb-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">{toast}</div>
      )}

      {showForm && (
        <Card title="New Sales Return" icon={Plus} className="mb-6">
          {returnable.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 p-2">
              No paid orders are eligible for a refund right now. Sales that are paid or fulfilled can be returned.
            </div>
          ) : (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <div className="md:col-span-2">
                <Label htmlFor="order">Order *</Label>
                <Select id="order" value={orderId} onChange={(e) => { setOrderId(e.target.value); setError('') }} required>
                  <option value="">Select paid order...</option>
                  {returnable.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber || `#${o.id}`} — {o.customer?.name || 'Walk-in'} ({formatINR(o.totalAmount)})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="reason">Reason *</Label>
                <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
                  <option value="">Select reason...</option>
                  {reasonOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional details" />
              </div>

              {selectedOrder && (
                <div className="md:col-span-2 bg-royal-50/60 border border-gray-200 dark:border-white/[0.08] rounded-lg p-4 text-sm">
                  <p className="font-medium text-royal-950 dark:text-white">
                    Refund {formatINR(selectedOrder.totalAmount)} for {selectedOrder.items?.length ?? 0} item(s)?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Processing restocks the items and voids the linked invoice.
                  </p>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" variant="gold" disabled={!orderId || !reason}>Submit Return</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Confirmation modal */}
      <Modal open={Boolean(confirmOrder)} title="Confirm Refund" onClose={() => { setConfirmOrder(null); setShowForm(false) }}>
        {confirmOrder && (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              Refund order <span className="font-semibold text-royal-950 dark:text-white">{confirmOrder.orderNumber || `#${confirmOrder.id}`}</span> for{' '}
              <span className="font-semibold text-emerald-700">{formatINR(confirmOrder.totalAmount)}</span>?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This will return all items to stock and void the linked invoice{' '}
              {confirmOrder.invoice?.invoiceNumber ? `(${confirmOrder.invoice.invoiceNumber})` : ''}. This action is permanent.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmOrder(null)}>Cancel</Button>
              <Button size="sm" variant="gold" onClick={handleRefund} disabled={refundMutation.isPending}>
                {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Card title="Sales Orders" icon={RotateCcw} className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
            <Search size={14} className="text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search order, customer or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm focus:outline-none w-full"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {['PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED'].map((s) => (
              <option key={s} value={s}>{orderStatusLabel[s]}</option>
            ))}
          </Select>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 ml-auto">
            <RotateCcw size={13} /> Refunded orders have stock returned automatically
          </div>
        </div>
        <ReturnsTable
          orders={filtered}
          isLoading={isLoading}
          onView={(o) => openView(o)}
          onRefund={(o) => handleRefundDirect(o)}
        />
      </Card>

      <OrderDetailModal
        open={viewOpen}
        orderId={selectedOrderId}
        onClose={() => { setViewOpen(false); setSelectedOrderId(null) }}
      />
    </div>
  )
}