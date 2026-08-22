import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Users, Mail, LogOut } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const DEMO_REQUESTS = [
  { id: 1, silverRate: 9280, newRate: 9450, requestedBy: 'staff@opalline.com', status: 'PENDING', createdAt: '2026-08-10 10:30 AM', silverType: '925', quantityAffected: 245, affectedProducts: 12, note: 'Rate increase of ₹170/gm, will affect all silver products' },
  { id: 2, silverRate: 9280, newRate: 9380, requestedBy: 'admin@opalline.com', status: 'APPROVED', createdAt: '2026-08-09 04:15 PM', silverType: '925', quantityAffected: 180, affectedProducts: 8, note: 'Approved and published - all prices recalculated', approvedAt: '2026-08-09 05:00 PM' },
  { id: 3, silverRate: 9280, newRate: 9520, requestedBy: 'staff@opalline.com', status: 'REJECTED', createdAt: '2026-08-08 02:00 PM', silverType: '925', quantityAffected: 310, affectedProducts: 15, note: 'Rejected - volatility too high, rate unchanged' },
]

const statusColor = { PENDING: 'orange', APPROVED: 'green', REJECTED: 'red' }
const statusLabel = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const hours24 = date.getHours()
  const hours12 = hours24 % 12 || 12
  const meridiem = hours24 >= 12 ? 'PM' : 'AM'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hours12)}:${pad(date.getMinutes())} ${meridiem}`
}

export default function RateApprovals() {
  const [requests, setRequests] = useState(DEMO_REQUESTS)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const pending = requests.filter((r) => r.status === 'PENDING').length
  const approved = requests.filter((r) => r.status === 'APPROVED').length
  const rejected = requests.filter((r) => r.status === 'REJECTED').length

  const handleApprove = (id) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'APPROVED', approvedAt: formatTimestamp(), note: 'Approved and published - all prices recalculated' } : r
      )
    )
    setToast({ type: 'success', message: `Request #${id} approved and published` })
  }

  const handleReject = (id) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'REJECTED', note: 'Rejected - rate unchanged' } : r
      )
    )
    setToast({ type: 'error', message: `Request #${id} rejected` })
  }

  return (
    <div>
      <PageHeader title="Rate Approvals" subtitle="Admin approval workflow for silver rate changes" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Pending</p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Approved</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">{approved}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Rejected</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">{rejected}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total Requests</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{requests.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="all">All Requests</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${filter === 'all' ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          All
        </button>
        <button onClick={() => setFilter('PENDING')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${filter === 'PENDING' ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          Pending {pending}
        </button>
        <button onClick={() => setFilter('APPROVED')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${filter === 'APPROVED' ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          Approved {approved}
        </button>
        <button onClick={() => setFilter('REJECTED')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${filter === 'REJECTED' ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          Rejected {rejected}
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">#</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Silver Rate (₹/gm)</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">New Rate</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Requested By</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Affected Products</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Created At</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r, i) => (
                <tr key={r.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50 dark:bg-transparent'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{r.id}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">{r.silverRate}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-gray-800 dark:text-gray-200">{r.newRate}</td>
                  <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{r.requestedBy}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusColor[r.status]}>{statusLabel[r.status]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r.quantityAffected}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{r.createdAt}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.status === 'PENDING' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id)}>
                          ✓ Approve
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleReject(r.id)}>
                          ✗ Reject
                        </Button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <span className="text-sm text-green-600 dark:text-green-400">Published</span>
                    )}
                    {r.status === 'REJECTED' && (
                      <span className="text-sm text-red-500 dark:text-red-400">Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filter === 'PENDING' && (
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
          <p className="text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-2">Pending Approvals</p>
          <p className="text-sm text-amber-800 dark:text-amber-200/90">
            {pending} rate{pending !== 1 ? 's' : ''} pending approval. Super administrators will review and publish/reject the changes.
          </p>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
          }`}
          role="status"
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
