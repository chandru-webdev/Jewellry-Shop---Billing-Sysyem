import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Search, Pencil, X, Save, CreditCard, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { Input } from '../components/ui/FormControls'
import { useAuth } from '../context/AuthContext'
import { purchaseInvoicesApi } from '../api/purchaseInvoices'
import { suppliersApi } from '../api/suppliers'
import { formatINR, formatDate, formatWeight } from '../utils/format'

const statusTone = { PENDING: 'orange', PARTIALLY_PAID: 'blue', PAID: 'green', VOID: 'red' }
const statusLabel = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  VOID: 'Void',
}

function InvoiceDetail({ invoice }) {
  return (
    <div className="text-sm space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · Purchase Invoice</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-royal-800 dark:text-gray-200 font-mono">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(invoice.invoiceDate)}</p>
          <Badge tone={statusTone[invoice.status]}>{statusLabel[invoice.status] || invoice.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Supplier</p>
          <p className="font-semibold text-royal-950 dark:text-white">{invoice.supplier?.name || '—'}</p>
          {invoice.supplier?.contactPerson && <p className="text-gray-600 dark:text-gray-400 text-xs">Contact: {invoice.supplier.contactPerson}</p>}
          {invoice.supplier?.phone && <p className="text-gray-600 dark:text-gray-400 text-xs">{invoice.supplier.phone}</p>}
          {invoice.supplier?.gstin && <p className="text-gray-600 dark:text-gray-400 text-xs">GSTIN: {invoice.supplier.gstin}</p>}
        </div>
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Invoice Details</p>
          {invoice.purchaseOrder?.poNumber && (
            <p className="text-gray-600 dark:text-gray-400 text-xs">Linked PO: <span className="font-mono text-royal-700 dark:text-gray-300">{invoice.purchaseOrder.poNumber}</span></p>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-xs">Due Date: {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
          {invoice.createdById_rel?.name && <p className="text-gray-600 dark:text-gray-400 text-xs">Created by: {invoice.createdById_rel.name}</p>}
        </div>
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
          {invoice.items?.map((it) => (
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
        <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatINR(invoice.subtotal)}</span></div>
        <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>GST ({invoice.gstPercent}%)</span><span>{formatINR(invoice.gstAmount)}</span></div>
        <div className="flex justify-between font-bold text-royal-950 dark:text-white text-base border-t border-gray-200 dark:border-white/[0.08] pt-2">
          <span>Grand Total</span>
          <span>{formatINR(invoice.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-gray-500 dark:text-gray-400 pt-2"><span>Amount Paid</span><span>{formatINR(invoice.amountPaid)}</span></div>
        <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400"><span>Balance Due</span><span>{formatINR(Math.max(0, Number(invoice.totalAmount) - Number(invoice.amountPaid)))}</span></div>
      </div>

      {invoice.notes && (
        <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-semibold">Notes</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{invoice.notes}</p>
        </div>
      )}

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-emerald-800 mb-2">Payment History</p>
          <div className="space-y-1 text-xs">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{formatDate(p.createdAt)} · {p.method}</span>
                <span>{formatINR(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RecordPaymentModal({ open, onClose, invoice, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open || !invoice) return null

  const balance = Math.max(0, Number(invoice.totalAmount) - Number(invoice.amountPaid))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) return alert('Enter valid amount')
    if (amt > balance) return alert('Amount exceeds balance due')
    setSubmitting(true)
    try {
      await purchaseInvoicesApi.recordPayment(invoice.id, { amount: amt, method, reference })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Record Payment - ${invoice.invoiceNumber}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Balance Due</label>
          <Input value={formatINR(balance)} readOnly className="bg-gray-50 dark:bg-white/[0.05]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Amount *</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
          >
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reference</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque #, TXN ID, etc." />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            <X size={12} /> Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            <CreditCard size={12} /> {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditInvoiceModal({ open, onClose, invoice, onSuccess }) {
  const [items, setItems] = useState(invoice?.items?.map((it) => ({
    productId: it.productId,
    sku: it.sku,
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    weight: it.weight,
  })) || [])
  const [notes, setNotes] = useState(invoice?.notes || '')
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate ? invoice.invoiceDate.split('T')[0] : '')
  const [dueDate, setDueDate] = useState(invoice?.dueDate ? invoice.dueDate.split('T')[0] : '')
  const [subtotal, setSubtotal] = useState(invoice?.subtotal)
  const [gstPercent, setGstPercent] = useState(invoice?.gstPercent)
  const [submitting, setSubmitting] = useState(false)

  const totalAmount = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0)
  const gstAmount = totalAmount * Number(gstPercent) / 100
  const grandTotal = totalAmount + gstAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) return alert('At least one item required')
    setSubmitting(true)
    try {
      await purchaseInvoicesApi.update(invoice.id, {
        items: items.map((it) => ({ ...it, lineTotal: Number(it.quantity) * Number(it.unitPrice) })),
        notes,
        invoiceDate: invoiceDate || undefined,
        dueDate: dueDate || undefined,
        subtotal: Number(subtotal),
        gstPercent: Number(gstPercent),
      })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const addItem = () => setItems([...items, { sku: '', name: '', quantity: 1, unitPrice: 0, weight: 0 }])
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) => setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it))

  if (!open || !invoice) return null

  return (
    <Modal open={true} onClose={onClose} title={`Edit Invoice ${invoice.invoiceNumber}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Invoice Date</label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subtotal</label>
            <Input type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">GST %</label>
            <Input type="number" step="0.01" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-white/[0.08] pt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-royal-950 dark:text-white">Line Items</p>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus size={12} /> Add Item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-white/[0.03] rounded-lg">
                <Input
                  value={it.sku}
                  onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                  placeholder="SKU"
                  className="col-span-2"
                />
                <Input
                  value={it.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  placeholder="Item Name"
                  className="col-span-3"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  placeholder="Qty"
                  className="col-span-1"
                />
                <Input
                  type="number"
                  step="0.001"
                  value={it.weight || 0}
                  onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                  placeholder="Wt (g)"
                  className="col-span-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                  placeholder="Unit Price"
                  className="col-span-2"
                />
                <div className="col-span-2 text-right font-mono text-royal-800 dark:text-gray-200">
                  {formatINR(Number(it.quantity) * Number(it.unitPrice))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(idx)}
                  className="col-span-1 justify-self-end"
                >
                  <X size={12} className="text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-white/[0.08] pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="bg-royal-50/60 rounded-lg p-4 border-t border-gray-200 dark:border-white/[0.08]">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatINR(totalAmount)}</span></div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>GST ({gstPercent}%)</span><span>{formatINR(gstAmount)}</span></div>
            <div className="flex justify-between font-bold text-royal-950 dark:text-white text-lg"><span>Grand Total</span><span>{formatINR(grandTotal)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            <X size={12} /> Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            <Save size={12} /> {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function NewInvoiceModal({ open, onClose, onSuccess, suppliers }) {
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState([{ sku: '', name: '', quantity: 1, unitPrice: 0, weight: 0 }])
  const [notes, setNotes] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [gstPercent, setGstPercent] = useState(3)
  const [submitting, setSubmitting] = useState(false)

  const lineTotal = (it) => {
    const w = Number(it.weight) > 0 ? Number(it.weight) : 1
    return (Number(it.quantity) * Number(it.unitPrice || 0) * w)
  }
  const totalAmount = items.reduce((sum, it) => sum + lineTotal(it), 0)
  const gstAmount = totalAmount * Number(gstPercent) / 100
  const grandTotal = totalAmount + gstAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supplierId) return alert('Select a supplier')
    if (items.length === 0) return alert('At least one item required')
    if (items.some((it) => !it.name || !it.sku)) return alert('Each item needs a SKU and name')
    setSubmitting(true)
    try {
      await purchaseInvoicesApi.create({
        supplierId,
        items: items.map((it) => ({ ...it, lineTotal: lineTotal(it) })),
        notes,
        invoiceDate: invoiceDate || undefined,
        dueDate: dueDate || undefined,
        subtotal: Number(totalAmount),
        gstPercent: Number(gstPercent),
      })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const addItem = () => setItems([...items, { sku: '', name: '', quantity: 1, unitPrice: 0, weight: 0 }])
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) => setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it))

  if (!open) return null

  return (
    <Modal open={true} onClose={onClose} title="New Purchase Invoice" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              required
            >
              <option value="">Select supplier...</option>
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Invoice Date</label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">GST %</label>
            <Input type="number" step="0.01" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-white/[0.08] pt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-royal-950 dark:text-white">Line Items</p>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus size={12} /> Add Item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 dark:bg-white/[0.03] rounded-lg">
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
                  <Input
                    value={it.sku}
                    onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                    placeholder="SKU"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Item Name</label>
                  <Input
                    value={it.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    placeholder="Item Name"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Wt (g)</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={it.weight || 0}
                    onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                    placeholder="Weight"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-2 text-right font-mono text-royal-800 dark:text-gray-200 pb-1">
                  {formatINR(lineTotal(it))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(idx)}
                  className="col-span-1 justify-self-end"
                >
                  <X size={12} className="text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-white/[0.08] pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="bg-royal-50/60 rounded-lg p-4 border-t border-gray-200 dark:border-white/[0.08]">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatINR(totalAmount)}</span></div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>GST ({gstPercent}%)</span><span>{formatINR(gstAmount)}</span></div>
            <div className="flex justify-between font-bold text-royal-950 dark:text-white text-lg"><span>Grand Total</span><span>{formatINR(grandTotal)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            <X size={12} /> Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            <Save size={12} /> {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function PurchaseInvoices() {
  const { user } = useAuth()
  const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: invoices, isLoading, error, isError } = useQuery({
    queryKey: ['purchase-invoices', search, filterStatus],
    queryFn: () => purchaseInvoicesApi.list({ search, status: filterStatus }).then((r) => r.data.data),
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersApi.list().then((r) => r.data.data),
  })

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load purchase invoices</p>
        <p className="text-sm text-gray-500 mt-1">{error?.response?.data?.message || error?.message || 'Unknown error'}</p>
        <button className="mt-3 px-4 py-2 bg-royal-600 text-white rounded" onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    )
  }

  const displayInvoices = invoices?.invoices || []

  const filtered = displayInvoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!inv.invoiceNumber?.toLowerCase().includes(q) && !inv.supplier?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleView = (inv) => {
    setSelected(inv)
    setViewOpen(true)
  }

  const openEdit = (inv) => {
    setEditing(inv)
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setEditing(null)
  }

  const openPayment = (inv) => {
    setPayingInvoice(inv)
    setPaymentOpen(true)
  }

  const closePayment = () => {
    setPaymentOpen(false)
    setPayingInvoice(null)
  }

  const handlePaymentSuccess = () => {
    closePayment()
    queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
  }

  const handleCreateSuccess = () => {
    setCreateOpen(false)
    queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
  }

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        subtitle="Manage supplier purchase invoices and payments"
        actions={
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by invoice # or supplier..."
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
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </select>
            {canEdit && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> New Purchase Invoice
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Invoice #</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Linked PO</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Supplier</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Invoice Date</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Due Date</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Total Amount</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Amount Paid</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Balance Due</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Payment Status</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Loading purchase invoices...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No purchase invoices found.
                </td>
              </tr>
            )}
            {!isLoading && filtered.map((inv) => {
              const balance = Math.max(0, Number(inv.totalAmount) - Number(inv.amountPaid))
              return (
                <tr key={inv.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.purchaseOrder?.poNumber ? (
                      <span className="font-mono text-xs text-royal-700 dark:text-gray-300">{inv.purchaseOrder.poNumber}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-royal-950 dark:text-white">{inv.supplier?.name || '—'}</span>
                    {inv.supplier?.contactPerson && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{inv.supplier.contactPerson}</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatINR(inv.amountPaid)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">{formatINR(balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={statusTone[inv.status]}>{statusLabel[inv.status] || inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(inv)}
                          className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canEdit && inv.status !== 'VOID' && inv.status !== 'PAID' && (
                        <button
                          onClick={() => openPayment(inv)}
                          className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:bg-white/10 rounded-lg cursor-pointer"
                          title="Record Payment"
                        >
                          <CreditCard size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleView(inv)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Purchase Invoice Details" size="lg">
        {selected && <InvoiceDetail invoice={selected} />}
      </Modal>

      <NewInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        suppliers={suppliers}
      />

      <EditInvoiceModal
        open={editOpen}
        onClose={closeEdit}
        invoice={editing}
        onSuccess={handlePaymentSuccess}
      />

      <RecordPaymentModal
        open={paymentOpen}
        onClose={closePayment}
        invoice={payingInvoice}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}