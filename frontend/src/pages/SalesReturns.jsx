import { useState } from 'react'
import { RotateCw, Plus, Search, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input, Select, Label } from '../components/ui/FormControls'
import { formatINR } from '../utils/format'
import { mockProducts, salesReturnHistory as initialHistory } from '../mock/products'

const statusTone = {
  Pending: 'orange',
  Approved: 'green',
  Rejected: 'red',
}

const reasonOptions = ['Defective', 'Wrong item', 'Damaged in transit', 'Changed mind', 'Other']

export default function SalesReturns() {
  const [history, setHistory] = useState(initialHistory)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [customer, setCustomer] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [toast, setToast] = useState('')

  const selectedProduct = mockProducts.find((p) => String(p.id) === product)

  const resetForm = () => {
    setProduct('')
    setQty('')
    setReason('')
    setCustomer('')
    setNote('')
    setError('')
    setSuccess('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!product || !qty || !reason || !customer) {
      setError('Please fill in all required fields.')
      return
    }
    const requested = Number(qty)
    if (Number.isNaN(requested) || requested <= 0) {
      setError('Quantity must be a positive number.')
      return
    }
    if (requested > (selectedProduct?.quantity ?? 0)) {
      setError(`Quantity cannot exceed available stock (${selectedProduct?.quantity ?? 0}).`)
      return
    }

    const refund = Math.round((selectedProduct.sellingPrice || 0) * requested)
    setHistory((prev) => [
      {
        id: Date.now(),
        returnNo: `SRN-${String(prev.length + 1).padStart(4, '0')}`,
        date: new Date().toISOString().slice(0, 10),
        customer,
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        qty: requested,
        reason,
        refund,
        status: 'Pending',
      },
      ...prev,
    ])
    setSuccess(`Sales return #SRN-${String(history.length + 1).padStart(4, '0')} created (refund: ${formatINR(refund)}).`)
    resetForm()
    setShowForm(false)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this return request?')) {
      setHistory((prev) => prev.filter((r) => r.id !== id))
      showToast('Return deleted')
    }
  }

  const filtered = history.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.customer.toLowerCase().includes(q) && !r.sku.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false
    }
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        subtitle="Process and track returned sales items"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> New Return
          </Button>
        }
      />

      {error && <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">{success}</div>}

      {showForm && (
        <Card title="New Sales Return" icon={Plus} className="mb-6">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Riya Sharma" required />
            </div>

            <div>
              <Label htmlFor="product">Product *</Label>
              <Select id="product" value={product} onChange={(e) => { setProduct(e.target.value); setError('') }} required>
                <option value="">Select product...</option>
                {mockProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — stock: {p.quantity}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="qty">Quantity *</Label>
              <Input id="qty" type="number" min="1" max={selectedProduct?.quantity ?? 1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 1" required />
            </div>

            <div>
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

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm() }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="gold" disabled={!selectedProduct}>
                Submit Return
              </Button>
            </div>
          </form>
        </Card>
      )}

      {toast && (
        <div className="mb-4 inline-block bg-royal-950 dark:bg-white/10 text-white dark:text-gray-100 text-sm rounded-lg px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      <Card title="Return Requests" icon={RotateCw} className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
            <Search size={14} className="text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search customer, SKU or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm focus:outline-none w-full"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50 dark:bg-white/5 text-royal-900 dark:text-gray-200 text-left">
                <th className="px-5 py-3 font-semibold">Return #</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold text-right">Qty</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 font-semibold text-right">Refund</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">No return requests found.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-royal-50 dark:hover:bg-white/5/50">
                    <td className="px-5 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{r.returnNo}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">{r.date}</td>
                    <td className="px-5 py-3 font-medium text-royal-950 dark:text-white">{r.customer}</td>
                    <td className="px-5 py-3">
                      <span className="text-royal-950 dark:text-white">{r.name}</span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{r.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{r.qty} pcs</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{r.reason}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-700">{formatINR(r.refund)}</td>
                    <td className="px-5 py-3 text-center"><Badge tone={statusTone[r.status] || 'gray'}>{r.status}</Badge></td>
                    <td className="px-5 py-3 text-center">
                      <button
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Delete"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
