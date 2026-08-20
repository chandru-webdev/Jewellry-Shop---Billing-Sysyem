import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Eye } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { expensesApi } from '../api/expenses'
import { formatINR, formatDate } from '../utils/format'

const DEMO_EXPENSES = [
  { id: 1, date: '2026-08-10', category: 'Rent', description: 'Shop rent - August', amount: 45000, paymentMethod: 'Bank Transfer', reference: 'NEFT-RENT-0826', status: 'PAID' },
  { id: 2, date: '2026-08-09', category: 'Salaries', description: 'Staff salaries - August', amount: 120000, paymentMethod: 'Bank Transfer', reference: 'SAL-AUG-001', status: 'PAID' },
  { id: 3, date: '2026-08-08', category: 'Utilities', description: 'Electricity bill', amount: 8500, paymentMethod: 'UPI', reference: 'UPI-REF-123', status: 'PAID' },
  { id: 4, date: '2026-08-07', category: 'Marketing', description: 'Social media ads', amount: 15000, paymentMethod: 'Credit Card', reference: 'CC-AD-456', status: 'PENDING' },
  { id: 5, date: '2026-08-06', category: 'Maintenance', description: 'Equipment servicing', amount: 12000, paymentMethod: 'Bank Transfer', reference: 'NEFT-MNT-789', status: 'PAID' },
  { id: 6, date: '2026-08-05', category: 'Office Supplies', description: 'Stationery and supplies', amount: 5500, paymentMethod: 'Cash', reference: 'CSH-001', status: 'PAID' },
  { id: 7, date: '2026-08-04', category: 'Insurance', description: 'Shop insurance renewal', amount: 25000, paymentMethod: 'Bank Transfer', reference: 'NEFT-INS-0826', status: 'PENDING' },
]

const statusTone = { PAID: 'green', PENDING: 'orange', CANCELLED: 'red' }
const categoryTone = { Rent: 'blue', Salaries: 'purple', Utilities: 'emerald', Marketing: 'orange', Maintenance: 'red', 'Office Supplies': 'gray', Insurance: 'indigo' }

export default function Expenses() {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState({ category: '', description: '', amount: '', paymentMethod: 'Bank Transfer', reference: '', date: new Date().toISOString().split('T')[0] })

  const { data: apiExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.list().then((r) => r.data.data),
  })

  const expenses = apiExpenses?.length ? apiExpenses : DEMO_EXPENSES

  const filtered = expenses.filter((e) => {
    if (filterCategory && e.category !== filterCategory) return false
    if (filterStatus && e.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!e.description?.toLowerCase().includes(q) && !e.category?.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const categories = [...new Set(expenses.map(e => e.category))]
  const totalExpenses = expenses.filter(e => e.status === 'PAID').reduce((s, e) => s + e.amount, 0)
  const pendingExpenses = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0)
  const thisMonth = expenses.filter(e => e.date.startsWith('2026-08')).reduce((s, e) => s + e.amount, 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    const _newExpense = {
      id: Date.now(),
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      reference: formData.reference,
      status: 'PENDING',
    }
    // In real app, call expensesApi.create(_newExpense)
    setFormOpen(false)
    setFormData({ category: '', description: '', amount: '', paymentMethod: 'Bank Transfer', reference: '', date: new Date().toISOString().split('T')[0] })
  }

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track and manage all business expenses" actions={<Button onClick={() => setFormOpen(true)}><Plus size={14} className="mr-1" /> Add Expense</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total Expenses (Paid)</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{formatINR(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">This Month</p>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{formatINR(pendingExpenses)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Description</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Method</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Reference</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={categoryTone[e.category] || 'gray'}> {e.category}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-royal-950 text-sm">{e.description}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(e.amount)}</td>
                  <td className="px-4 py-3 text-center"><Badge tone="blue">{e.paymentMethod}</Badge></td>
                  <td className="px-4 py-3 text-center"><Badge tone={statusTone[e.status]}>{e.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{e.reference}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelected(e); setViewOpen(true) }} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="View"><Eye size={14} /></button>
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
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Amount</p><p className="font-bold text-red-600 text-xl">{formatINR(selected.amount)}</p></div>
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Status</p><Badge tone={statusTone[selected.status]}>{selected.status}</Badge></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Category</p><Badge tone={categoryTone[selected.category] || 'gray'}> {selected.category}</Badge></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Payment Method</p><p className="font-medium">{selected.paymentMethod}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Reference</p><p className="font-mono text-xs text-gray-600">{selected.reference}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Date</p><p className="font-medium">{formatDate(selected.date)}</p></div>
            </div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Description</p><p className="font-medium mt-1">{selected.description}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={formOpen} title="Add Expense" onClose={() => setFormOpen(false)} footer={
        <>
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Expense</Button>
        </>
      }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required>
                <option value="">Select category</option>
                <option value="Rent">Rent</option>
                <option value="Salaries">Salaries</option>
                <option value="Utilities">Utilities</option>
                <option value="Marketing">Marketing</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Insurance">Insurance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input type="text" value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="Transaction reference / cheque no." />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}