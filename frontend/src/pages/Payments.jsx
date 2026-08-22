import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { paymentsApi } from '../api/payments'
import { formatINR, formatDate } from '../utils/format'

const DEMO_PAYMENTS = [
  { id: 1, invoice: 'SI-2026-00047', customer: 'Rajesh Kumar', amount: 5230, method: 'Razorpay', type: 'RECEIVED', reference: 'pay_Razor1234', date: '2026-08-10', status: 'COMPLETED' },
  { id: 2, invoice: 'SI-2026-00046', customer: 'Priya Sharma', amount: 8450, method: 'Razorpay', type: 'RECEIVED', reference: 'pay_Razor5678', date: '2026-08-10', status: 'COMPLETED' },
  { id: 3, invoice: 'SI-2026-00045', customer: 'Amit Patel', amount: 3200, method: 'Bank Transfer', type: 'RECEIVED', reference: 'NEFT-REF-456', date: '2026-08-09', status: 'COMPLETED' },
  { id: 4, invoice: null, customer: 'Supplier: Silver Arts', amount: 45000, method: 'Bank Transfer', type: 'SENT', reference: 'NEFT-REF-789', date: '2026-08-09', status: 'COMPLETED' },
  { id: 5, invoice: 'SI-2026-00043', customer: 'Sneha Reddy', amount: 12800, method: 'Razorpay', type: 'RECEIVED', reference: 'pay_Razor9012', date: '2026-08-08', status: 'PENDING' },
]

const statusTone = { COMPLETED: 'green', PENDING: 'orange', FAILED: 'red' }
const typeTone = { RECEIVED: 'green', SENT: 'red' }

export default function Payments() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)

  const { data: apiPayments, isError } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.list().then((r) => r.data.data),
    retry: false,
  })

  const payments = (!isError && apiPayments?.length) ? apiPayments : DEMO_PAYMENTS

  const filtered = payments.filter((p) => {
    if (filterType && p.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.customer?.toLowerCase().includes(q) && !p.invoice?.toLowerCase().includes(q) && !p.reference?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalReceived = payments.filter(p => p.type === 'RECEIVED' && p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const totalSent = payments.filter(p => p.type === 'SENT' && p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const pendingAmount = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <PageHeader title="Payments" subtitle="Track all payment transactions — Razorpay, bank transfers and more" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Received</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(totalReceived)}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Sent</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{formatINR(totalSent)}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{formatINR(pendingAmount)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Types</option>
          <option value="RECEIVED">Received</option>
          <option value="SENT">Sent</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer / Supplier</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Amount</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Method</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Reference</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-royal-700 font-semibold">{p.invoice || '—'}</td>
                  <td className="px-4 py-3 font-medium text-royal-950 dark:text-white text-xs">{p.customer}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 text-center"><Badge tone="blue">{p.method}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={typeTone[p.type]}>
                      {p.type === 'RECEIVED' ? <ArrowDownRight size={10} className="mr-0.5" /> : <ArrowUpRight size={10} className="mr-0.5" />}
                      {p.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center"><Badge tone={statusTone[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.reference}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(p.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelected(p); setViewOpen(true) }} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="View"><Eye size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={viewOpen} title="Payment Details" onClose={() => setViewOpen(false)} footer={<Button variant="ghost" onClick={() => setViewOpen(false)}>Close</Button>}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Amount</p><p className="font-bold text-royal-950 dark:text-white text-xl">{formatINR(selected.amount)}</p></div>
              <div className="bg-royal-50/60 rounded-lg p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Status</p><Badge tone={statusTone[selected.status]}>{selected.status}</Badge></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Method</p><p className="font-medium">{selected.method}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Reference</p><p className="font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{selected.reference}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Invoice</p><p className="font-medium">{selected.invoice || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Customer</p><p className="font-medium">{selected.customer}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
