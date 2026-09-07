import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Package, X, Save, Pencil, Truck, Check, Copy, Trash2, Plus, Clock, Filter } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { purchaseOrdersApi } from '../api/purchaseOrders'
import { suppliersApi } from '../api/suppliers'
import { formatINR, formatDate, formatWeight } from '../utils/format'
import { productsApi } from '../api/products'
import { useAuth } from '../context/AuthContext'

const statusTone = {
  DRAFT: 'orange',
  PENDING: 'orange',
  CONFIRMED: 'blue',
  PROCESSING: 'purple',
  RECEIVED: 'green',
  CANCELLED: 'red',
  RETURNED: 'gray',
}

const statusLabel = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  CONFIRMED: 'Approved',
  PROCESSING: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

export default function PurchaseOrders() {
  const { user } = useAuth()
  const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [showNewPO, setShowNewPO] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [poForm, setPOForm] = useState({ supplierId: '', notes: '', status: 'DRAFT', orderDate: '', expectedDelivery: '', gstPercent: 3 })
  const lineIdRef = useRef(1)
  const newLineItem = () => ({
    id: lineIdRef.current++,
    productId: '',
    name: '',
    sku: '',
    quantity: 1,
    weight: 0,
    rate: 0,
    lineTotal: 0,
    editing: true,
  })
  const [lineItems, setLineItems] = useState([newLineItem()])
  const lineItemsRef = useRef(null)
  const queryClient = useQueryClient()

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, filterStatus],
    queryFn: () => purchaseOrdersApi.list({ search, status: filterStatus || undefined }).then((r) => r.data.data),
  })

  const { data: apiSuppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersApi.list().then((r) => r.data.data),
  })

  const { data: apiProducts } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setShowNewPO(false)
      setEditingOrder(null)
      setPOForm({ supplierId: '', notes: '', gstPercent: 3 })
      setLineItems([newLineItem()])
      alert('Purchase order created!')
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to create purchase order'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => purchaseOrdersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setShowNewPO(false)
      setEditingOrder(null)
      setPOForm({ supplierId: '', notes: '', gstPercent: 3 })
      setLineItems([newLineItem()])
      alert('Purchase order updated!')
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to update purchase order'),
  })

  const openNewPO = () => {
    setEditingOrder(null)
    setPOForm({ supplierId: '', notes: '', status: 'DRAFT', orderDate: '', expectedDelivery: '', gstPercent: 3 })
    setLineItems([newLineItem()])
    setShowNewPO(true)
  }

  // Map a fetched record's saved line items back into the editable line-item state.
  const itemsToState = (items) =>
    (items || []).map((it) => ({
      id: lineIdRef.current++,
      productId: it.productId ? String(it.productId) : '',
      name: it.name || '',
      sku: it.sku || '',
      quantity: Number(it.quantity) || 1,
      weight: Number(it.weight) || 0,
      rate: it.rate !== undefined ? Number(it.rate) : Number(it.unitPrice) || 0,
      lineTotal: Number(it.lineTotal) || 0,
      editing: true,
    }))

  const openEditPO = (order) => {
    setEditingOrder(order)
    setPOForm({
      supplierId: order.supplierId ? String(order.supplierId) : '',
      notes: order.notes || '',
      status: order.status || 'DRAFT',
      orderDate: order.orderDate || '',
      expectedDelivery: order.expectedDelivery || '',
      gstPercent: 3,
    })
    setLineItems(itemsToState(order.items))
    setShowNewPO(true)
  }

  const closePOForm = () => {
    setShowNewPO(false)
    setEditingOrder(null)
  }

  const orders = apiData?.orders || []
  const suppliersList = apiSuppliers || []
  const productsList = apiProducts || []

  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const num = o.poNumber || o.orderNumber || o.shopifyId || o.internalId || ''
      return num.toLowerCase().includes(q) || o.supplier?.name?.toLowerCase().includes(q)
    }
    return true
  })

  const handleView = (order) => {
    setSelected(order)
    setViewOpen(true)
  }

  const handleReceiveStock = (order) => {
    // Mark all items as received by updating PO status to RECEIVED
    // and optionally update inventory - for now, just update the PO status
    if (confirm(`Mark PO #${order.poNumber || `#${order.id}`} as Received? This will update the status to "Received".`)) {
      purchaseOrdersApi.updateStatus(order.id, 'RECEIVED').then(() => {
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        alert('Purchase order marked as received')
      }).catch((err) => {
        alert(err.response?.data?.message || 'Failed to update status')
      })
    }
  }

  const handleMarkPending = (order) => {
    if (confirm(`Mark PO #${order.poNumber || `#${order.id}`} as Pending? This will update the status to "Pending".`)) {
      purchaseOrdersApi.updateStatus(order.id, 'PENDING').then(() => {
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        alert('Purchase order marked as pending')
      }).catch((err) => {
        alert(err.response?.data?.message || 'Failed to update status')
      })
    }
  }

  const calculateLineTotal = (item) => {
    const qty = item.quantity || 1
    const rate = item.rate || 0
    const weight = item.weight || 0
    const perUnit = weight > 0 ? weight * rate : rate
    return perUnit * qty
  }
  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const calculateGST = () => calculateSubtotal() * ((poForm.gstPercent || 0) / 100)
  const calculateTotal = () => calculateSubtotal() + calculateGST()

  const updateLineItem = (id, patch) =>
    setLineItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const toggleEdit = (id) =>
    setLineItems((prev) => prev.map((i) => (i.id === id ? { ...i, editing: !i.editing } : i)))

  const duplicateLineItem = (id) =>
    setLineItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx === -1) return prev
      const src = prev[idx]
      // Keep product/weight/rate so it's easy to tweak, but reset quantity so the
      // user adjusts it — duplicating usually means "same product, different qty".
      const copy = { ...src, id: lineIdRef.current++, quantity: 1, editing: true }
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
    })

  const removeLineItem = (id) => setLineItems((prev) => prev.filter((i) => i.id !== id))

  const handleProductChange = (id, value) => {
    const product = productsList.find((p) => p.id.toString() === value)
    if (!product) {
      updateLineItem(id, { productId: '', sku: '', name: '' })
      return
    }
    updateLineItem(id, {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      weight: Number(product.weight) || 0,
      rate: Number(product.costPrice) || Number(product.silverRateUsed) || 0,
    })
  }

  const validateItems = () => {
    const problems = []
    lineItems.forEach((item, idx) => {
      if (!item.productId) {
        problems.push(`Line ${idx + 1}: no product selected`)
      } else if (!item.quantity || Number(item.quantity) <= 0) {
        problems.push(`Line ${idx + 1} (${item.name}): quantity must be greater than 0`)
      }
    })
    return problems
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
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Approved</option>
              <option value="PROCESSING">Partially Received</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURNED">Returned</option>
            </select>
            <Button size="sm" onClick={openNewPO}>
              <Package size={14} /> New PO
            </Button>
            {showNewPO && (
              <Modal open={showNewPO} onClose={closePOForm} title={editingOrder ? 'Edit Purchase Order' : 'New Purchase Order'} size="lg">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (!poForm.supplierId) { alert('Please select a supplier'); return }

                  // Validate line items before submit
                  const errors = validateItems()
                  if (errors.length > 0) {
                    alert('Please fix the following before submitting:\n\n• ' + errors.join('\n• '))
                    return
                  }
                  const lineItemsData = lineItems.map(item => ({
                    productId: item.productId || null,
                    sku: item.sku,
                    name: item.name,
                    quantity: item.quantity,
                    weight: item.weight,
                    rate: item.rate,
                    unitPrice: item.rate || 0,
                    lineTotal: calculateLineTotal(item),
                  }))
                  
                  // Calculate totals
                  const subtotal = calculateSubtotal()
                  const gst = calculateGST()
                  const total = calculateTotal()

                  if (editingOrder) {
                    updateMutation.mutate({
                      id: editingOrder.id,
                      data: {
                        supplierId: poForm.supplierId,
                        notes: poForm.notes,
                        status: poForm.status,
                        orderDate: poForm.orderDate,
                        expectedDelivery: poForm.expectedDelivery,
                        gstPercent: poForm.gstPercent,
                        subtotal,
                        totalAmount: total,
                        items: lineItemsData,
                      },
                    })
                  } else {
                    const status = poForm.status === 'DRAFT' ? 'DRAFT' : 'PENDING'
                    createMutation.mutate({
                      supplierId: poForm.supplierId,
                      notes: poForm.notes,
                      status,
                      items: lineItemsData,
                      orderDate: poForm.orderDate,
                      expectedDelivery: poForm.expectedDelivery,
                      subtotal,
                      gstPercent: poForm.gstPercent,
                      totalAmount: total,
                    })
                  }
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
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Order Date *</label>
                    <input
                      type="date"
                      value={poForm.orderDate || ''}
                      onChange={(e) => setPOForm({ ...poForm, orderDate: e.target.value })}
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={poForm.expectedDelivery || ''}
                      onChange={(e) => setPOForm({ ...poForm, expectedDelivery: e.target.value })}
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                    />
                  </div>
                  {editingOrder && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Status</label>
                      <select
                        value={poForm.status}
                        onChange={(e) => setPOForm({ ...poForm, status: e.target.value })}
                        className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                      >
                        {['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'RECEIVED', 'CANCELLED', 'RETURNED'].map((s) => (
                          <option key={s} value={s}>{statusLabel[s] || s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Line Items Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Line Items</label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(() => { const n = lineItems.filter((i) => i.productId).length; return `${n} item${n === 1 ? '' : 's'} added` })()}
                      </span>
                    </div>
                    <div className="space-y-3" ref={lineItemsRef}>
                      {lineItems.map((item) => {
                        const inputCls = `w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500 disabled:bg-gray-50 dark:disabled:bg-white/5 disabled:text-gray-500`
                        const colLabel = 'block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1'
                        return (
                          <div
                            key={item.id}
                            className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-gray-200 dark:border-white/[0.08] p-2 sm:grid-cols-12 sm:gap-2"
                          >
                            <div className="col-span-2 sm:col-span-3">
                              <label className={colLabel}>Product</label>
                              <select
                                value={item.productId || ''}
                                onChange={(e) => handleProductChange(item.id, e.target.value)}
                                disabled={!item.editing}
                                className={inputCls}
                              >
                                <option value="">Select product</option>
                                {productsList.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className={colLabel}>Qty</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => { const v = e.target.value; updateLineItem(item.id, { quantity: v === '' ? '' : parseFloat(v) }) }}
                                min="1"
                                disabled={!item.editing}
                                className={inputCls}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={colLabel}>Weight (g)</label>
                              <input
                                type="number"
                                value={item.weight}
                                onChange={(e) => { const v = e.target.value; updateLineItem(item.id, { weight: v === '' ? '' : parseFloat(v) }) }}
                                step="0.01"
                                disabled={!item.editing}
                                className={inputCls}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={colLabel}>Rate (₹/g)</label>
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => { const v = e.target.value; updateLineItem(item.id, { rate: v === '' ? '' : parseFloat(v) }) }}
                                step="0.01"
                                disabled={!item.editing}
                                className={inputCls}
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className={colLabel}>Total</label>
                              <span className="block pt-2 font-medium text-xs text-gray-700 dark:text-gray-300">₹{calculateLineTotal(item).toFixed(2)}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <label className={colLabel}>&nbsp;</label>
                              <div className="flex gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleEdit(item.id)}
                                  aria-label={item.editing ? 'Done editing' : 'Edit line item'}
                                  title={item.editing ? 'Done editing' : 'Edit line item'}
                                  className={`p-1.5 rounded hover:bg-royal-100 dark:bg-white/10 cursor-pointer ${item.editing ? 'text-green-600 dark:text-green-400' : 'text-royal-600 dark:text-gray-300'}`}
                                >
                                  {item.editing ? <Check size={14} /> : <Pencil size={14} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => duplicateLineItem(item.id)}
                                  aria-label="Duplicate line item"
                                  title="Duplicate line item"
                                  className="p-1.5 rounded text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 cursor-pointer"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(item.id)}
                                  aria-label="Remove line item"
                                  title="Remove line item"
                                  className="p-1.5 rounded text-red-600 dark:text-gray-300 hover:bg-red-100 dark:bg-white/10 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setLineItems((prev) => [...prev, newLineItem()])}
                          className="inline-flex items-center gap-1 text-sm text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded px-2 py-1"
                        >
                          <Plus size={14} /> Add Another Item
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Totals Section */}
                  <div className="mt-4 p-3 bg-royal-50/60 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
      <span>Subtotal</span>
      <span>₹{calculateSubtotal().toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-sm mb-2">
      <span>GST %</span>
      <input
        type="number"
        value={poForm.gstPercent || 0}
        onChange={(e) => setPOForm({ ...poForm, gstPercent: parseFloat(e.target.value) || 0 })}
        min="0"
        step="0.01"
        className="w-24 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
      />
      <span>₹{calculateGST().toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-lg font-bold border-t pt-3">
      <span>Total Amount</span>
      <span>₹{calculateTotal().toFixed(2)}</span>
    </div>
  </div>
  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" onClick={closePOForm}>
                      <X size={12} /> Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      {editingOrder ? (
                        <>
                          <Save size={12} /> Save Changes
                        </>
                      ) : poForm.status === 'DRAFT' ? (
                        <>
                          <Save size={12} /> Save as Draft
                        </>
                      ) : (
                        <>
                          <Save size={12} /> Submit PO
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Modal>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={14} className="text-gray-400" />
        {[{ value: '', label: 'All Statuses' }, ...['DRAFT', 'PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED'].map((s) => ({ value: s, label: statusLabel[s] || s }))].map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filterStatus === f.value ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">PO #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Supplier</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Order Date</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Expected Delivery</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Items</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Weight (g)</th>
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
                  <span className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{o.poNumber || `#${o.id}`}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-royal-950 dark:text-white">{o.supplier?.name || (o.customer?.name || '—')}</span>
                  {o.supplier?.phone && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{o.supplier.phone}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(o.orderDate || o.createdAt || o.date)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{o.expectedDelivery ? formatDate(o.expectedDelivery) : '—'}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{o.totalItems || o._count?.items || 0}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{o.totalQuantity || 0}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{o.totalWeight || 0}</td>
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
                    {canEdit && (
                      <>
                        <button
                          onClick={() => openEditPO(o)}
                          className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleReceiveStock(o)}
                          className="p-1.5 text-green-600 dark:text-gray-300 hover:bg-green-100 dark:bg-white/10 rounded-lg cursor-pointer"
                          title="Receive Stock"
                        >
                          <Truck size={14} />
                        </button>
                        <button
                          onClick={() => handleMarkPending(o)}
                          className="p-1.5 text-amber-600 dark:text-gray-300 hover:bg-amber-100 dark:bg-white/10 rounded-lg cursor-pointer"
                          title="Mark as Pending"
                        >
                          <Clock size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Purchase Order Details" size="lg">
        {selected && (
          <div className="text-sm space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · Purchase Management</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-royal-800 dark:text-gray-200 font-mono">{selected.poNumber}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(selected.createdAt)}</p>
                <Badge tone={statusTone[selected.status] || 'gray'}>{statusLabel[selected.status] || selected.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Supplier</p>
                <p className="font-semibold text-royal-950 dark:text-white">{selected.supplier?.name || '—'}</p>
                {selected.supplier?.contactPerson && <p className="text-gray-600 dark:text-gray-400 text-xs">Contact: {selected.supplier.contactPerson}</p>}
                {selected.supplier?.phone && <p className="text-gray-600 dark:text-gray-400 text-xs">{selected.supplier.phone}</p>}
                {selected.supplier?.gstin && <p className="text-gray-600 dark:text-gray-400 text-xs">GSTIN: {selected.supplier.gstin}</p>}
                {selected.supplier?.address && <p className="text-gray-600 dark:text-gray-400 text-xs">{selected.supplier.address}</p>}
              </div>
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Order Details</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Order Date: {selected.orderDate ? formatDate(selected.orderDate) : '—'}</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Expected Delivery: {selected.expectedDelivery ? formatDate(selected.expectedDelivery) : '—'}</p>
                {selected.createdById_rel?.name && <p className="text-gray-600 dark:text-gray-400 text-xs">Created by: {selected.createdById_rel.name}</p>}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-700 text-white text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Qty</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Weight (g)</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Rate (₹/g)</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selected.items?.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">
                      <span className="font-medium text-royal-950 dark:text-white">{it.name}</span>
                      <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-mono">{it.sku}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{it.quantity}</td>
                    <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{formatWeight(it.weight)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatINR(it.rate || it.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1.5 border-t border-gray-100 dark:border-white/[0.05] pt-3 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatINR(selected.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>GST ({selected.gstPercent}%)</span><span>{formatINR(Number(selected.subtotal) * Number(selected.gstPercent) / 100)}</span></div>
              <div className="flex justify-between font-bold text-royal-950 dark:text-white text-base border-t border-gray-200 dark:border-white/[0.08] pt-2">
                <span>Grand Total</span>
                <span>{formatINR(selected.totalAmount)}</span>
              </div>
            </div>

            {selected.notes && (
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Notes</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
