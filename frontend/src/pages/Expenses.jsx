import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Eye, Edit, Paperclip, Loader2, X, CalendarClock, RefreshCw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { expensesApi } from '../api/expenses'
import { suppliersApi } from '../api/suppliers'
import { bankAccountsApi } from '../api/bankAccounts'
import { formatINR, formatDate } from '../utils/format'
import { exportExpensesExcel, inRange } from '../utils/exportExcel'
import ExportControls from '../components/ui/ExportControls'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

const statusTone = { PAID: 'green', PENDING: 'orange', CANCELLED: 'red' }
const categoryTone = { Rent: 'blue', Salaries: 'purple', Utilities: 'emerald', Marketing: 'orange', Maintenance: 'red', 'Office Supplies': 'gray', Insurance: 'indigo' }
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cheque']
const RECURRING = ['None', 'Weekly', 'Monthly']

const initialForm = () => ({
  category: '',
  description: '',
  amount: '',
  paymentMethod: 'Bank Transfer',
  reference: '',
  date: new Date().toISOString().split('T')[0],
  status: 'PAID',
  pendingAmount: '',
  vendor: '',
  supplierId: '',
  attachmentUrl: '',
  gstApplicable: false,
  gstAmount: '',
  bankAccountId: '',
  recurring: 'None',
  dueDate: '',
  notes: '',
})

export default function Expenses() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [uploading, setUploading] = useState(false)

  const queryClient = useQueryClient()

  const { data: apiExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.list().then((r) => r.data.data),
    retry: false,
  })

  const { data: apiSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ limit: 100 }).then((r) => r.data.data),
    retry: false,
  })

  const { data: apiBankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => bankAccountsApi.list({ isActive: true }).then((r) => r.data.data),
    retry: false,
  })

  const expenses = apiExpenses || []
  const suppliers = apiSuppliers || []
  const bankAccounts = apiBankAccounts || []

  const resetForm = () => {
    setEditing(null)
    setFormData(initialForm())
  }

  const handleExport = async ({ from, to }) => {
    const r = await expensesApi.list({ limit: 100000 })
    const all = (r.data.data || []).filter((e) => inRange(e.date, from, to))
    exportExpensesExcel(all)
  }

  const createMutation = useMutation({
    mutationFn: (data) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setFormOpen(false)
      resetForm()
    },
    onError: (err) => {
      alert(err?.response?.data?.message || 'Failed to save expense. Please try again.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setFormOpen(false)
      resetForm()
    },
    onError: (err) => {
      alert(err?.response?.data?.message || 'Failed to update expense. Please try again.')
    },
  })

  const recurringMutation = useMutation({
    mutationFn: () => expensesApi.processRecurring(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      alert(res?.data?.message || 'Recurring expenses processed.')
    },
    onError: (err) => alert(err?.response?.data?.message || 'Failed to process recurring expenses'),
  })

  const handleEdit = (e) => {
    setEditing(e)
    setFormData({
      category: e.category,
      description: e.description,
      amount: e.amount.toString(),
      paymentMethod: e.paymentMethod,
      reference: e.reference || '',
      date: e.date?.split('T')[0] || '',
      status: e.status || 'PAID',
      pendingAmount: e.pendingAmount ? e.pendingAmount.toString() : '',
      vendor: e.vendor || '',
      supplierId: e.supplierId ? String(e.supplierId) : '',
      attachmentUrl: e.attachmentUrl || '',
      gstApplicable: Boolean(e.gstApplicable),
      gstAmount: e.gstAmount ? e.gstAmount.toString() : '',
      bankAccountId: e.bankAccountId ? String(e.bankAccountId) : '',
      recurring: e.recurring || 'None',
      dueDate: e.dueDate?.split('T')[0] || '',
      notes: e.notes || '',
    })
    setFormOpen(true)
  }

  const filtered = expenses.filter((e) => {
    if (filterCategory && e.category !== filterCategory) return false
    if (filterStatus && e.status !== filterStatus) return false
    if (filterMethod && e.paymentMethod !== filterMethod) return false
    if (search) {
      const q = search.toLowerCase()
      if (!e.description?.toLowerCase().includes(q) && !e.category?.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q) && !e.vendor?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const categories = [...new Set(expenses.map(e => e.category))]
  const methods = [...new Set(expenses.map(e => e.paymentMethod))]
  const totalExpenses = expenses.filter(e => e.status === 'PAID').reduce((s, e) => s + Number(e.amount), 0)
  const pendingExpenses = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + Number(e.pendingAmount || e.amount), 0)
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonth = expenses.filter(e => e.date.startsWith(thisMonthKey)).reduce((s, e) => s + Number(e.amount), 0)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post('/upload/media', formData)
      const url = res.data?.data?.url
      if (url) setFormData((f) => ({ ...f, attachmentUrl: url }))
      else alert('Upload failed: no URL returned')
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    if (!formData.category || !formData.description || !formData.date || !(amount > 0)) {
      alert('Please fill in all required fields with a valid amount')
      return
    }
    const payload = {
      ...formData,
      amount,
      supplierId: formData.supplierId ? Number(formData.supplierId) : null,
      bankAccountId: formData.bankAccountId ? Number(formData.bankAccountId) : null,
      gstApplicable: Boolean(formData.gstApplicable),
      gstAmount: formData.gstApplicable ? Number(formData.gstAmount) || 0 : 0,
      vendor: formData.vendor || null,
      attachmentUrl: formData.attachmentUrl || null,
      dueDate: formData.dueDate || null,
      notes: formData.notes || null,
    }
    if (payload.status === 'PENDING') {
      const pa = Number(payload.pendingAmount)
      payload.pendingAmount = pa > 0 ? pa : amount
    } else {
      payload.pendingAmount = 0
    }
    delete payload.bankAccountName
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const vendorName = (e) => e.vendor || e.supplier?.name

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track and manage all business expenses" actions={<div className="flex gap-2">
        <Button variant="ghost" onClick={() => recurringMutation.mutate()} title="Generate due recurring expenses"><RefreshCw size={14} className="mr-1" /> Process Recurring</Button>
        <ExportControls onExport={handleExport} />
        <Button onClick={() => { resetForm(); setFormOpen(true) }}><Plus size={14} className="mr-1" /> Add Expense</Button>
      </div>} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Expenses (Paid)</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{formatINR(totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">This Month</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{formatINR(thisMonth)}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{formatINR(pendingExpenses)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Methods</option>
          {methods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Vendor</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Amount</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Pending</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Method</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Reference</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={categoryTone[e.category] || 'gray'}> {e.category}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-royal-950 dark:text-white text-sm">
                    {e.description}
                    {e.attachmentUrl && <span title="Attachment" className="ml-1.5 inline-flex text-royal-500 dark:text-gray-400"><Paperclip size={12} /></span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{vendorName(e) || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(e.amount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-600">{e.status === 'PENDING' ? formatINR(e.pendingAmount) : '—'}</td>
                  <td className="px-4 py-3 text-center"><Badge tone="blue">{e.paymentMethod}</Badge></td>
                  <td className="px-4 py-3 text-center"><Badge tone={statusTone[e.status]}>{e.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.reference}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelected(e); setViewOpen(true) }} className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer" title="View"><Eye size={14} /></button>
                      <button onClick={() => handleEdit(e)} className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer" title="Edit"><Edit size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={viewOpen} title="Expense Details" onClose={() => { setViewOpen(false); setSelected(null) }} footer={<Button variant="ghost" onClick={() => { setViewOpen(false); setSelected(null) }}>Close</Button>}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Amount</p><p className="font-bold text-red-600 text-xl">{formatINR(selected.amount)}</p></div>
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Status</p><Badge tone={statusTone[selected.status]}>{selected.status}</Badge></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Category</p><Badge tone={categoryTone[selected.category] || 'gray'}> {selected.category}</Badge></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Payment Method</p><p className="font-medium">{selected.paymentMethod}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Vendor / Payee</p><p className="font-medium">{vendorName(selected) || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Date</p><p className="font-medium">{formatDate(selected.date)}</p></div>
            </div>
            {selected.dueDate && (
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Due Date</p><p className="font-medium flex items-center gap-1"><CalendarClock size={13} /> {formatDate(selected.dueDate)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Recurring</p><p className="font-medium">{selected.recurring || 'None'}</p></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Reference</p><p className="font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{selected.reference || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Added By</p><p className="font-medium">{selected.createdBy?.name || '—'}</p></div>
            </div>
            {selected.gstApplicable && (
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">GST (Input / ITC)</p><p className="font-medium text-emerald-600">{formatINR(selected.gstAmount)}</p></div>
            )}
            {selected.bankAccount && (
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Bank Account</p><p className="font-medium">{selected.bankAccount.name} ({selected.bankAccount.bank})</p></div>
            )}
            {selected.attachmentUrl && (
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Attachment</p><a href={selected.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-royal-600 dark:text-royal-400 font-medium"><Paperclip size={13} /> View receipt / bill</a></div>
            )}
            {selected.notes && (
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Notes</p><p className="font-medium mt-1 whitespace-pre-wrap">{selected.notes}</p></div>
            )}
            <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Description</p><p className="font-medium mt-1">{selected.description}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={formOpen} title={editing ? 'Edit Expense' : 'Add Expense'} size="lg" onClose={() => { setFormOpen(false); resetForm() }} footer={
        <>
          <Button variant="ghost" onClick={() => { setFormOpen(false); resetForm() }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editing ? 'Update Expense' : 'Save Expense'}</Button>
        </>
      }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" required>
                <option value="">Select category</option>
                {['Rent', 'Salaries', 'Utilities', 'Marketing', 'Maintenance', 'Office Supplies', 'Insurance', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
              <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" required></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
              <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Payee</label>
              <input type="text" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="Free text, or pick a supplier below" />
              {suppliers.length > 0 && (
                <select value={formData.supplierId} onChange={(e) => {
                  const sid = e.target.value
                  const sup = suppliers.find((s) => String(s.id) === sid)
                  setFormData((f) => ({ ...f, supplierId: sid, vendor: sid ? (sup?.name || f.vendor) : f.vendor }))
                }} className="w-full mt-2 rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
                  <option value="">Link supplier (optional)</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <select value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {formData.paymentMethod === 'Bank Transfer' && bankAccounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Account</label>
                <select value={formData.bankAccountId} onChange={(e) => setFormData({...formData, bankAccountId: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
                  <option value="">Select account</option>
                  {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.bank})</option>)}
                </select>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Balance will be deducted from this account.</p>
              </div>
            )}
            {formData.status === 'PENDING' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pending Amount *</label>
                <input type="number" step="0.01" value={formData.pendingAmount} onChange={(e) => setFormData({...formData, pendingAmount: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="Amount still to be paid" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurring</label>
              <select value={formData.recurring} onChange={(e) => setFormData({...formData, recurring: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
                {RECURRING.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">GST Applicable <span className="text-[11px] text-gray-400 dark:text-gray-500">(input tax / ITC for GST Reports)</span></label>
              <input type="checkbox" checked={formData.gstApplicable} onChange={(e) => setFormData({...formData, gstApplicable: e.target.checked})} className="h-4 w-4 rounded accent-royal-600 cursor-pointer" />
            </div>
            {formData.gstApplicable && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Amount</label>
                <input type="number" step="0.01" min="0" value={formData.gstAmount} onChange={(e) => setFormData({...formData, gstAmount: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="Input GST amount" />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment (Receipt / Bill)</label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm bg-royal-50 dark:bg-white/10 text-royal-700 dark:text-gray-200 border border-royal-200 dark:border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-royal-100 dark:hover:bg-white/15">
                  <Paperclip size={14} /> {uploading ? 'Uploading…' : 'Upload Image / PDF'}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {uploading && <Loader2 size={14} className="animate-spin text-royal-500" />}
                {formData.attachmentUrl && (
                  <span className="inline-flex items-center gap-1 text-xs text-royal-600 dark:text-royal-400">
                    <a href={formData.attachmentUrl} target="_blank" rel="noreferrer" className="underline">View file</a>
                    <button type="button" onClick={() => setFormData({...formData, attachmentUrl: ''})} className="text-gray-400 hover:text-red-500 cursor-pointer" title="Remove"><X size={13} /></button>
                  </span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label>
              <input type="text" value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="Transaction reference / cheque no." />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="Optional notes"></textarea>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            Added By: <span className="font-medium text-gray-600 dark:text-gray-300">{editing?.createdBy?.name || user?.name || '—'}</span>
            {editing && !editing.createdBy?.name && <span> (assigned to current user on save)</span>}
          </div>
        </form>
      </Modal>
    </div>
  )
}