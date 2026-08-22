import { useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Users, Mail, LogOut } from 'lucide-react'
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

export default function RateApprovals() {
  const [filter, setFilter] = useState('all')

  const requests = DEMO_REQUESTS.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const pending = DEMO_REQUESTS.filter((r) => r.status === 'PENDING').length
  const approved = DEMO_REQUESTS.filter((r) => r.status === 'APPROVED').length
  const rejected = DEMO_REQUESTS.filter((r) => r.status === 'REJECTED').length

  const handleApprove = (id) => alert(`Demo: Would approve request #${id}`)
  const handleReject = (id) => alert(`Demo: Would reject request #${id}`)

  return (
    <div>
      <PageHeader title="Rate Approvals" subtitle="Admin approval workflow for silver rate changes" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-orange-600 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Approved</p>
          <p className="text-xl font-bold text-green-600 mt-0.5">{approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Rejected</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{rejected}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total Requests</p>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{DEMO_REQUESTS.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="all">All Requests</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer {filter === 'all' ? 'bg-white text-royal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
          All
        </button>
        <button onClick={() => setFilter('PENDING')} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer {filter === 'PENDING' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
          Pending {pending}
        </button>
        <button onClick={() => setFilter('APPROVED')} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer {filter === 'APPROVED' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
          Approved {approved}
        </button>
        <button onClick={() => setFilter('REJECTED')} className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer {filter === 'REJECTED' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
          Rejected {rejected}
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">#</th>
                <th className="px-4 py-3 font-medium text-gray-600">Silver Rate (₹/gm)</th>
                <th className="px-4 py-3 font-medium text-gray-600">New Rate</th>
                <th className="px-4 py-3 font-medium text-gray-600">Requested By</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Affected Products</th>
                <th className="px-4 py-3 font-medium text-gray-600">Created At</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => (
                <tr key={r.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-medium text-royal-800">{r.id}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-600">{r.silverRate}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-royal-800">{r.newRate}</td>
                  <td className="px-4 py-2.5 text-gray-800">{r.requestedBy}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusColor[r.status]}>{statusLabel[r.status]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.quantityAffected}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{r.createdAt}</td>
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
                      <span className="text-sm text-green-600">Published</span>
                    )}
                    {r.status === 'REJECTED' && (
                      <span className="text-sm text-red-500">Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filter === 'PENDING' && (
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-[11px] uppercase tracking-wider text-amber-600 font-medium mb-2">Pending Approvals</p>
          <p className="text-sm text-amber-800">
            {pending} rate{pending !== 1 ? 's' : ''} pending approval. Super administrators will review and publish/reject the changes.
          </p>
        </div>
      )}
    </div>
  )
}