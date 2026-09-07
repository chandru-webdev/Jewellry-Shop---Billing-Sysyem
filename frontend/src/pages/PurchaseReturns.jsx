import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, RotateCw, X, Save, Plus, Copy, Check, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { purchaseReturnsApi } from '../api/purchaseReturns'
import { suppliersApi } from '../api/suppliers'
import { productsApi } from '../api/products'
import { formatINR, formatDate, formatWeight } from '../utils/format'

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

export default function PurchaseReturns() {
  const { user } = useAuth()
  const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingReturn, setEditingReturn] = useState(null)
  const [returnForm, setReturnForm] = useState({ supplierId: '', poNumber: '', reason: '', status: 'PENDING' })
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
    queryKey: ['purchase-returns', search, filterStatus],
    queryFn: () => purchaseReturnsApi.list({ search, status: filterStatus || undefined }).then((r) => r.data.data),
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
    mutationFn: (data) => purchaseReturnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      closeForm()
      alert('Purchase return created!')
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to create purchase return'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => purchaseReturnsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      closeForm()
      alert('Purchase return updated!')
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to update purchase return'),
  })

  const returns = apiData?.returns || []
  const suppliersList = apiSuppliers || []
  const productsList = apiProducts || []

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

  const calculateLineTotal = (item) => (item.rate || 0) * (item.quantity || 1)
  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0)

  const updateLineItem = (id, patch) =>
    setLineItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const toggleEdit = (id) =>
    setLineItems((prev) => prev.map((i) => (i.id === id ? { ...i, editing: !i.editing } : i)))

  const duplicateLineItem = (id) =>
    setLineItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx === -1) return prev
      const src = prev[idx]
      const copy = { ...src, id: lineIdRef.current++, quantity: 1, editing: true }
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
    })

  const removeLineItem = (id) => setLineItems((prev) => prev.filter((i) => i.id !== id))

  const handleProductChange = (id, value) => {
    const product = productsList.find((p) => p.id.toString() === value)
    if (!product) {
      updateLineItem(id, { productId: '', sku: '', name: '', weight: 0 })
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
      if (!item.productId) problems.push(`Line ${idx + 1}: no product selected`)
      if (!(item.quantity > 0)) problems.push(`Line ${idx + 1}: quantity must be at least 1`)
      if (!(item.rate > 0)) problems.push(`Line ${idx + 1}: unit price must be greater than 0`)
    })
    return problems
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingReturn(null)
    setReturnForm({ supplierId: '', poNumber: '', reason: '', status: 'PENDING' })
    setLineItems([newLineItem()])
  }

  const openNewReturn = () => {
    setEditingReturn(null)
    setReturnForm({ supplierId: '', poNumber: '', reason: '', status: 'PENDING' })
    setLineItems([newLineItem()])
    setShowForm(true)
  }

  const itemsToState = (items) =>
    (items || []).map((it) => ({
      id: lineIdRef.current++,
      productId: it.productId ? String(it.productId) : '',
      name: it.name || '',
      sku: it.sku || '',
      quantity: Number(it.quantity) || 1,
      weight: Number(it.weight) || 0,
      rate: Number(it.unitPrice) || 0,
      lineTotal: Number(it.lineTotal) || 0,
      editing: true,
    }))

  const openEditReturn = (r) => {
    setEditingReturn(r)
    setReturnForm({
      supplierId: r.supplierId ? String(r.supplierId) : '',
      poNumber: r.orderNumber || r.purchaseOrder?.poNumber || '',
      reason: r.reason || '',
      status: r.status || 'PENDING',
    })
    setLineItems(itemsToState(r.items))
    setShowForm(true)
  }

  const inputCls = `w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500 disabled:bg-gray-50 dark:disabled:bg-white/5 disabled:text-gray-500`
  const colLabel = 'block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1'

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
            <Button size="sm" onClick={openNewReturn}>
              <RotateCw size={14} /> New Return
            </Button>
            {showForm && (
              <Modal open={showForm} onClose={closeForm} title={editingReturn ? 'Edit Purchase Return' : 'New Purchase Return'} size="lg">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (!returnForm.supplierId) { alert('Please select a supplier'); return }
                  const errors = validateItems()
                  if (errors.length > 0) {
                    alert('Please fix the following before submitting:\n\n• ' + errors.join('\n• '))
                    return
                  }
                  const itemsData = lineItems.map((item) => ({
                    productId: item.productId || null,
                    sku: item.sku,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.rate,
                    weight: Number(item.weight) || 0,
                  }))
                  if (editingReturn) {
                    updateMutation.mutate({
                      id: editingReturn.id,
                      data: {
                        supplierId: returnForm.supplierId,
                        status: returnForm.status,
                        reason: returnForm.reason,
                        items: itemsData,
                      },
                    })
                  } else {
                    createMutation.mutate({
                      supplierId: returnForm.supplierId,
                      reason: returnForm.reason,
                      items: itemsData,
                    })
                  }
                }} className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Reason</label>
                    <textarea
                      value={returnForm.reason}
                      onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                      placeholder="Describe the reason for return..."
                      className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                      rows={2}
                    />
                  </div>

                  {/* Line Items */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Line Items</label>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''} added</span>
                    </div>
                    <div className="space-y-3" ref={lineItemsRef}>
                      {lineItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-gray-200 dark:border-white/[0.08] p-2 sm:grid-cols-12 sm:gap-2"
                        >
                          <div className="col-span-2 sm:col-span-4">
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
                              value={item.weight || 0}
                              onChange={(e) => { const v = e.target.value; updateLineItem(item.id, { weight: v === '' ? '' : parseFloat(v) }) }}
                              step="0.01"
                              disabled={!item.editing}
                              className={inputCls}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={colLabel}>Unit Price (₹)</label>
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => { const v = e.target.value; updateLineItem(item.id, { rate: v === '' ? '' : parseFloat(v) }) }}
                              step="0.01"
                              disabled={!item.editing}
                              className={inputCls}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={colLabel}>Total</label>
                            <span className="block pt-2 font-medium text-xs text-gray-700 dark:text-gray-300">₹{calculateLineTotal(item).toFixed(2)}</span>
                          </div>
                          <div className="sm:col-span-1">
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
                      ))}
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

                  {/* Totals */}
                  <div className="mt-4 p-3 bg-royal-50/60 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Subtotal</span>
                      <span>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-3">
                      <span>Refund Amount</span>
                      <span>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                      <X size={12} /> Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      <Save size={12} /> {editingReturn ? 'Save Changes' : 'Create Return'}
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
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Linked PO/Inv #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Supplier</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Return Date</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Products</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Weight (g)</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Reason</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Refund Amount</th>
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
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{r.orderNumber || r.purchaseOrder?.poNumber || r.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-royal-950 dark:text-white">{r.supplier?.name || (r.customer?.name || '—')}</span>
                    {r.supplier?.phone && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{r.supplier.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(r.createdAt || r.date)}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {r.items?.map((it) => it.name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{r.totalQuantity || 0}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {r.items?.reduce((sum, it) => sum + Number(it.weight || 0) * Number(it.quantity || 1), 0).toFixed(2) || '0.00'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm max-w-xs truncate">{r.reason || '—'}</td>
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
                      {canEdit && (
                        <button
                          onClick={() => openEditReturn(r)}
                          className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Return Details" size="lg">
        {selected && (
          <div className="text-sm space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · Purchase Return</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-royal-800 dark:text-gray-200 font-mono">{selected.returnNumber || selected.orderNumber}</p>
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
              </div>
              <div className="bg-royal-50/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Original PO / Invoice</p>
                <p className="font-mono text-xs text-royal-800 dark:text-gray-200">{selected.orderNumber || selected.purchaseOrder?.poNumber || selected.invoiceNumber || '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Reason</p>
              <p className="text-gray-700 dark:text-gray-300">{selected.reason || '—'}</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-700 text-white text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Qty</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Weight (g)</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Unit Price</th>
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
                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatINR(it.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1.5 border-t border-gray-100 dark:border-white/[0.05] pt-3 text-sm">
              <div className="flex justify-between font-bold text-royal-950 dark:text-white text-base border-t border-gray-200 dark:border-white/[0.08] pt-2">
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
