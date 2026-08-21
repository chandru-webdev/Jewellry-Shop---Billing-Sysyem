import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { bankAccountsApi } from '../api/bankAccounts'
import { formatINR, formatDate } from '../utils/format'

const DEMO_BANK_ACCOUNTS = [
  { id: 1, name: 'HDFC Current Account', accountNumber: '50200012345678', ifsc: 'HDFC0001234', type: 'Current', bank: 'HDFC Bank', balance: 2500000, isActive: true, openingBalance: 2000000, openingDate: '2025-01-01' },
  { id: 2, name: 'ICICI Savings Account', accountNumber: '629101234567', ifsc: 'ICIC0001234', type: 'Savings', bank: 'ICICI Bank', balance: 850000, isActive: true, openingBalance: 500000, openingDate: '2025-03-15' },
  { id: 3, name: 'SBI Cash Credit', accountNumber: '31234567890', ifsc: 'SBIN0001234', type: 'Cash Credit', bank: 'State Bank of India', balance: -1500000, isActive: true, openingBalance: 0, openingDate: '2025-06-01' },
  { id: 4, name: 'Axis Bank OD', accountNumber: '916020012345678', ifsc: 'UTIB0001234', type: 'Overdraft', bank: 'Axis Bank', balance: -500000, isActive: true, openingBalance: 0, openingDate: '2025-07-01' },
  { id: 5, name: 'Kotak Current Account', accountNumber: '1212345678', ifsc: 'KKBK0001234', type: 'Current', bank: 'Kotak Mahindra Bank', balance: 1200000, isActive: false, openingBalance: 1000000, openingDate: '2024-11-01' },
]

const typeTone = { Current: 'blue', Savings: 'green', 'Cash Credit': 'orange', Overdraft: 'red' }

export default function BankAccounts() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ name: '', bank: '', accountNumber: '', ifsc: '', type: 'Current', openingBalance: '', openingDate: new Date().toISOString().split('T')[0] })

  const { data: apiAccounts, isError } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => bankAccountsApi.list().then((r) => r.data.data),
    retry: false,
  })

  const accounts = (!isError && apiAccounts?.length) ? apiAccounts : DEMO_BANK_ACCOUNTS

  const filtered = accounts.filter((a) => {
    if (filterType && a.type !== filterType) return false
    if (filterStatus && String(a.isActive) !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.name?.toLowerCase().includes(q) && !a.bank?.toLowerCase().includes(q) && !a.accountNumber?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalBalance = accounts.filter(a => a.isActive).reduce((s, a) => s + a.balance, 0)
  const activeAccounts = accounts.filter(a => a.isActive).length
  const totalAccounts = accounts.length

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editing) {
      // Update existing
      // In real app: bankAccountsApi.update(editing.id, formData)
    } else {
      // Create new
      // In real app: bankAccountsApi.create(formData)
    }
    setFormOpen(false)
    setEditing(null)
    setFormData({ name: '', bank: '', accountNumber: '', ifsc: '', type: 'Current', openingBalance: '', openingDate: new Date().toISOString().split('T')[0] })
  }

  const handleEdit = (account) => {
    setEditing(account)
    setFormData({
      name: account.name,
      bank: account.bank,
      accountNumber: account.accountNumber,
      ifsc: account.ifsc,
      type: account.type,
      openingBalance: account.openingBalance.toString(),
      openingDate: account.openingDate,
    })
    setFormOpen(true)
  }

  const handleDelete = (_id) => {
    if (confirm('Delete this bank account?')) {
      // bankAccountsApi.delete(id)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({ name: '', bank: '', accountNumber: '', ifsc: '', type: 'Current', openingBalance: '', openingDate: new Date().toISOString().split('T')[0] })
  }

  return (
    <div>
      <PageHeader title="Bank Accounts" subtitle="Manage all bank accounts and balances" actions={<Button onClick={() => { resetForm(); setFormOpen(true) }}><Plus size={14} className="mr-1" /> Add Account</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total Balance</p>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(totalBalance)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Active Accounts</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{activeAccounts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total Accounts</p>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{totalAccounts}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Types</option>
          <option value="Current">Current</option>
          <option value="Savings">Savings</option>
          <option value="Cash Credit">Cash Credit</option>
          <option value="Overdraft">Overdraft</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Account Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Bank</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Type</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Balance</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Account No.</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">IFSC</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-royal-950">{a.name}</td>
                  <td className="px-4 py-3 text-gray-700">{a.bank}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={typeTone[a.type] || 'gray'}> {a.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-right">
                    <span className={a.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatINR(a.balance)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{a.accountNumber}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{a.ifsc}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(a)} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={viewOpen} title="Account Details" onClose={() => { setViewOpen(false); setSelected(null) }} footer={<Button variant="ghost" onClick={() => { setViewOpen(false); setSelected(null) }}>Close</Button>}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Current Balance</p><p className="font-bold text-royal-950 text-xl">{formatINR(selected.balance)}</p></div>
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Status</p><Badge tone={selected.isActive ? 'green' : 'gray'}>{selected.isActive ? 'Active' : 'Inactive'}</Badge></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Type</p><Badge tone={typeTone[selected.type] || 'gray'}> {selected.type}</Badge></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Opening Balance</p><p className="font-medium">{formatINR(selected.openingBalance)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Account No.</p><p className="font-mono text-sm">{selected.accountNumber}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">IFSC</p><p className="font-mono text-sm">{selected.ifsc}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Bank</p><p className="font-medium">{selected.bank}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Opened On</p><p className="font-medium">{formatDate(selected.openingDate)}</p></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={formOpen} title={editing ? 'Edit Account' : 'Add Bank Account'} onClose={() => { setFormOpen(false); resetForm() }} footer={
        <>
          <Button variant="ghost" onClick={() => { setFormOpen(false); resetForm() }}>Cancel</Button>
          <Button onClick={handleSubmit}>{editing ? 'Update' : 'Save'}</Button>
        </>
      }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank *</label>
              <input type="text" value={formData.bank} onChange={(e) => setFormData({...formData, bank: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required>
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Cash Credit">Cash Credit</option>
                <option value="Overdraft">Overdraft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Date *</label>
              <input type="date" value={formData.openingDate} onChange={(e) => setFormData({...formData, openingDate: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
              <input type="text" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code *</label>
              <input type="text" value={formData.ifsc} onChange={(e) => setFormData({...formData, ifsc: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
              <input type="number" step="0.01" value={formData.openingBalance} onChange={(e) => setFormData({...formData, openingBalance: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}