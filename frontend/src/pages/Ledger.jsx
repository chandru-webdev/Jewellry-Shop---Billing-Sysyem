import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, Calculator, BookOpen } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ledgerApi } from '../api/ledger'
import { formatINR } from '../utils/format'

const DEMO_LEDGER_ACCOUNTS = [
  { id: 1, code: '1000', name: 'Cash in Hand', type: 'Asset', subType: 'Current Asset', openingBalance: 50000, currentBalance: 75000, isActive: true },
  { id: 2, code: '1100', name: 'HDFC Current Account', type: 'Asset', subType: 'Bank', openingBalance: 2000000, currentBalance: 2500000, isActive: true },
  { id: 3, code: '1101', name: 'ICICI Savings Account', type: 'Asset', subType: 'Bank', openingBalance: 500000, currentBalance: 850000, isActive: true },
  { id: 4, code: '1200', name: 'Accounts Receivable', type: 'Asset', subType: 'Current Asset', openingBalance: 150000, currentBalance: 225000, isActive: true },
  { id: 5, code: '1300', name: 'Inventory - Silver', type: 'Asset', subType: 'Inventory', openingBalance: 5000000, currentBalance: 6200000, isActive: true },
  { id: 6, code: '1301', name: 'Inventory - Gold', type: 'Asset', subType: 'Inventory', openingBalance: 12000000, currentBalance: 14500000, isActive: true },
  { id: 7, code: '2000', name: 'Accounts Payable', type: 'Liability', subType: 'Current Liability', openingBalance: 300000, currentBalance: 450000, isActive: true },
  { id: 8, code: '2100', name: 'SBI Cash Credit', type: 'Liability', subType: 'Bank Loan', openingBalance: 0, currentBalance: -1500000, isActive: true },
  { id: 9, code: '2101', name: 'Axis Bank OD', type: 'Liability', subType: 'Bank Loan', openingBalance: 0, currentBalance: -500000, isActive: true },
  { id: 10, code: '3000', name: 'Capital Account', type: 'Equity', subType: 'Capital', openingBalance: 15000000, currentBalance: 15000000, isActive: true },
  { id: 11, code: '3100', name: 'Retained Earnings', type: 'Equity', subType: 'Reserves', openingBalance: 2500000, currentBalance: 4200000, isActive: true },
  { id: 12, code: '4000', name: 'Sales Revenue', type: 'Income', subType: 'Operating Revenue', openingBalance: 0, currentBalance: -18500000, isActive: true },
  { id: 13, code: '4100', name: 'Other Income', type: 'Income', subType: 'Non-Operating', openingBalance: 0, currentBalance: -250000, isActive: true },
  { id: 14, code: '5000', name: 'Cost of Goods Sold', type: 'Expense', subType: 'Direct Cost', openingBalance: 0, currentBalance: 12500000, isActive: true },
  { id: 14, code: '5100', name: 'Salaries & Wages', type: 'Expense', subType: 'Employee Cost', openingBalance: 0, currentBalance: 2400000, isActive: true },
  { id: 15, code: '5200', name: 'Rent Expense', type: 'Expense', subType: 'Operating Expense', openingBalance: 0, currentBalance: 360000, isActive: true },
  { id: 16, code: '5300', name: 'Utilities', type: 'Expense', subType: 'Operating Expense', openingBalance: 0, currentBalance: 180000, isActive: true },
  { id: 17, code: '5400', name: 'Marketing', type: 'Expense', subType: 'Operating Expense', openingBalance: 0, currentBalance: 450000, isActive: true },
]

const typeTone = { Asset: 'blue', Liability: 'red', Equity: 'purple', Income: 'green', Expense: 'orange' }

export default function Ledger() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [view, setView] = useState('accounts')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)

  const { data: apiAccounts, isError: accountsError } = useQuery({
    queryKey: ['ledger-accounts'],
    queryFn: () => ledgerApi.accounts().then((r) => r.data.data),
    retry: false,
  })

  const { data: trialBalance } = useQuery({
    queryKey: ['ledger-trial-balance'],
    queryFn: () => ledgerApi.trialBalance().then((r) => r.data.data),
    retry: false,
  })

  const accounts = (!accountsError && apiAccounts?.length) ? apiAccounts : DEMO_LEDGER_ACCOUNTS

  const filtered = accounts.filter((a) => {
    if (filterType && a.type !== filterType) return false
    if (filterStatus && String(a.isActive) !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.name?.toLowerCase().includes(q) && !a.code?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const types = [...new Set(accounts.map(a => a.type))]
  const totalAssets = accounts.filter(a => a.type === 'Asset').reduce((s, a) => s + a.currentBalance, 0)
  const totalLiabilities = Math.abs(accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + a.currentBalance, 0))
  const totalEquity = accounts.filter(a => a.type === 'Equity').reduce((s, a) => s + a.currentBalance, 0)

  const trialBalanceData = trialBalance || accounts.map(a => ({
    code: a.code,
    name: a.name,
    type: a.type,
    debit: ['Asset', 'Expense'].includes(a.type) && a.currentBalance > 0 ? a.currentBalance : 0,
    credit: ['Liability', 'Equity', 'Income'].includes(a.type) && a.currentBalance < 0 ? Math.abs(a.currentBalance) : (['Liability', 'Equity', 'Income'].includes(a.type) ? a.currentBalance : 0),
  }))

  const totalDebits = trialBalanceData.reduce((s, a) => s + a.debit, 0)
  const totalCredits = trialBalanceData.reduce((s, a) => s + a.credit, 0)

  return (
    <div>
      <PageHeader title="General Ledger" subtitle="Chart of accounts, trial balance, and financial position" actions={
        <div className="flex gap-2">
          <Button variant="outline"><Download size={14} className="mr-1" /> Export</Button>
          <Button><Calculator size={14} className="mr-1" /> Trial Balance</Button>
        </div>
      } />

      <div className="mb-5">
        <div className="flex gap-2 border-b border-gray-200 dark:border-white/[0.08]">
          <button onClick={() => setView('accounts')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'accounts' ? 'border-royal-600 text-royal-700' : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}>Chart of Accounts</button>
          <button onClick={() => setView('trial')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'trial' ? 'border-royal-600 text-royal-700' : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}>Trial Balance</button>
        </div>
      </div>

      {view === 'accounts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Assets</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{formatINR(totalAssets)}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Liabilities</p>
              <p className="text-xl font-bold text-red-600 mt-0.5">{formatINR(totalLiabilities)}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Equity</p>
              <p className="text-xl font-bold text-purple-600 mt-0.5">{formatINR(totalEquity)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input type="text" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Code</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Account Name</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Sub-Type</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Opening</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Current Balance</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-royal-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-royal-700 font-semibold">{a.code}</td>
                      <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{a.name}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={typeTone[a.type] || 'gray'}> {a.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{a.subType}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatINR(a.openingBalance)}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span className={a.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatINR(a.currentBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(a); setViewOpen(true) }} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="View"><BookOpen size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {view === 'trial' && (
        <Card title="Trial Balance" icon={Calculator}>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">As of {new Date().toLocaleDateString('en-IN')}</p>
            <Button variant="outline"><Download size={14} className="mr-1" /> Export PDF</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Account Name</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Debit (₹)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trialBalanceData.map((a) => (
                  <tr key={a.code} className="hover:bg-royal-50/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[10px] text-royal-700">{a.code}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-950 dark:text-white">{a.name}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-blue-600">{a.debit > 0 ? formatINR(a.debit) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600">{a.credit > 0 ? formatINR(a.credit) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-white/5 border-t-2 border-gray-300">
                  <td className="px-4 py-3 font-bold text-gray-900" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">{formatINR(totalDebits)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(totalCredits)}</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-white/5">
                  <td className="px-4 py-3 font-bold text-gray-900" colSpan={2}>
                    {totalDebits === totalCredits ? '✓ Balanced' : '✗ Imbalanced'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600" colSpan={2}>
                    {totalDebits === totalCredits ? 'Trial Balance Tallied' : `Difference: ${formatINR(Math.abs(totalDebits - totalCredits))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={viewOpen} title="Account Details" onClose={() => { setViewOpen(false); setSelected(null) }} footer={<Button variant="ghost" onClick={() => { setViewOpen(false); setSelected(null) }}>Close</Button>}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Code</p><p className="font-bold text-royal-950 dark:text-white">{selected.code}</p></div>
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Type</p><Badge tone={typeTone[selected.type] || 'gray'}> {selected.type}</Badge></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Sub-Type</p><p className="font-medium">{selected.subType}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Status</p><Badge tone={selected.isActive ? 'green' : 'gray'}>{selected.isActive ? 'Active' : 'Inactive'}</Badge></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Opening Balance</p><p className="font-bold text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(selected.openingBalance)}</p></div>
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Current Balance</p><p className="font-bold text-royal-950 dark:text-white text-xl">{formatINR(selected.currentBalance)}</p></div>
            </div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Account Name</p><p className="font-medium text-lg mt-1">{selected.name}</p></div>
          </div>
        )}
      </Modal>
    </div>
  )
}