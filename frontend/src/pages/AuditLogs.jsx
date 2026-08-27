import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatDateTime } from '../utils/format'
import { auditLogsApi } from '../api/auditLogs'

const actionTone = { CREATE: 'green', UPDATE: 'blue', DELETE: 'red', LOGIN: 'purple', SYNC: 'gold' }

const moduleOptions = ['All', 'Silver Rate', 'Orders', 'Invoices', 'Payments', 'Products', 'Inventory', 'Shopify', 'System']
const actionOptions = ['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SYNC']

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterAction, setFilterAction] = useState('')

  const { data: apiLogs = [] } = useQuery({
    queryKey: ['audit-logs', search, filterModule, filterAction],
    queryFn: () => auditLogsApi.list({ search, module: filterModule, action: filterAction }).then((r) => r.data.data),
  })

  const logs = apiLogs || []

  const filtered = logs.filter((log) => {
    if (search) {
      const q = search.toLowerCase()
      if (!log.user?.toLowerCase().includes(q) && !log.action?.toLowerCase().includes(q) && !log.entity?.toLowerCase().includes(q)) return false
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
                <tr key={log.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
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
