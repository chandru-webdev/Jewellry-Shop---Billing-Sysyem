import { useState } from 'react'
import { Search, User } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatDateTime } from '../utils/format'

const DEMO_LOGS = [
  { id: 1, timestamp: '2026-08-10T09:00:00', user: 'Admin', action: 'Updated Silver Rate', module: 'Silver Rate', entity: 'Silver Rate', changes: '₹90.00 → ₹92.80', type: 'UPDATE' },
  { id: 2, timestamp: '2026-08-10T08:45:00', user: 'System', action: 'Shopify Order Imported', module: 'Orders', entity: '#10235', changes: 'Created from Shopify', type: 'CREATE' },
  { id: 3, timestamp: '2026-08-10T08:44:00', user: 'System', action: 'Invoice Created', module: 'Invoices', entity: 'SI-2026-00047', changes: 'Auto-generated from order', type: 'CREATE' },
  { id: 4, timestamp: '2026-08-10T08:30:00', user: 'System', action: 'Payment Received', module: 'Payments', entity: 'Razorpay #pay_1234', changes: '₹5,230 for SI-2026-00046', type: 'CREATE' },
  { id: 5, timestamp: '2026-08-10T08:15:00', user: 'Admin', action: 'Product Updated', module: 'Products', entity: 'Silver Chain (SLV-CHN-00008)', changes: 'Weight updated: 25g → 28g', type: 'UPDATE' },
  { id: 6, timestamp: '2026-08-10T08:00:00', user: 'Admin', action: 'User Login', module: 'System', entity: 'rajesh@opalline.in', changes: 'Logged in from Windows', type: 'LOGIN' },
  { id: 7, timestamp: '2026-08-09T17:30:00', user: 'Priya', action: 'Stock Updated', module: 'Inventory', entity: 'Silver Ring (SLV-RNG-00021)', changes: 'Quantity: 28 → 24', type: 'UPDATE' },
  { id: 8, timestamp: '2026-08-09T16:45:00', user: 'Admin', action: 'Invoice Voided', module: 'Invoices', entity: 'SI-2026-00044', changes: 'Status: FINAL → VOID', type: 'UPDATE' },
  { id: 9, timestamp: '2026-08-09T15:00:00', user: 'System', action: 'Shopify Sync Completed', module: 'Shopify', entity: 'Products', changes: '312 products synced', type: 'SYNC' },
  { id: 10, timestamp: '2026-08-09T14:20:00', user: 'Deepak', action: 'Shopify Product Updated', module: 'Shopify', entity: 'SLV-BRC-00015', changes: 'Price synced: ₹780', type: 'SYNC' },
]

const actionTone = { CREATE: 'green', UPDATE: 'blue', DELETE: 'red', LOGIN: 'purple', SYNC: 'gold' }

const moduleOptions = ['All', 'Silver Rate', 'Orders', 'Invoices', 'Payments', 'Products', 'Inventory', 'Shopify', 'System']
const actionOptions = ['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SYNC']

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterAction, setFilterAction] = useState('')

  const filtered = DEMO_LOGS.filter((log) => {
    if (search) {
      const q = search.toLowerCase()
      if (!log.user.toLowerCase().includes(q) && !log.action.toLowerCase().includes(q) && !log.entity.toLowerCase().includes(q)) return false
    }
    if (filterModule && log.module !== filterModule) return false
    if (filterAction && log.type !== filterAction) return false
    return true
  })

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Track all system activities, changes and user actions" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          {moduleOptions.map((m) => <option key={m} value={m === 'All' ? '' : m}>{m === 'All' ? 'All Modules' : m}</option>)}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          {actionOptions.map((a) => <option key={a} value={a === 'All' ? '' : a}>{a === 'All' ? 'All Actions' : a}</option>)}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Action</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Module</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Entity</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Changes</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-gray-400 dark:text-gray-500" />
                      <span className="font-medium text-royal-950 dark:text-white text-xs">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-royal-950 dark:text-white text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-center"><Badge tone="purple">{log.module}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-600 dark:text-gray-400 dark:text-gray-500">{log.entity}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500 max-w-64 truncate">{log.changes}</td>
                  <td className="px-4 py-3 text-center"><Badge tone={actionTone[log.type]}>{log.type}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
