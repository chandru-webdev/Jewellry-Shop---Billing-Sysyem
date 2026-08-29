import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatDateTime } from '../utils/format'
import { auditLogsApi } from '../api/auditLogs'

const typeTone = { CREATED: 'green', UPDATED: 'blue', DELETED: 'red', LOGIN: 'purple', SYNCED: 'gold' }

function splitAction(action = '') {
  const idx = action.indexOf('_')
  if (idx <= 0) return { module: action, type: action }
  return { module: action.slice(0, idx), type: action.slice(idx + 1) }
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterType, setFilterType] = useState('')

  const { data: apiLogs = [] } = useQuery({
    queryKey: ['audit-logs', search],
    queryFn: () => auditLogsApi.list({ search, limit: 100 }).then((r) => r.data.data.items),
  })

  const logs = apiLogs || []

  const moduleOptions = ['All', ...new Set(logs.map((l) => splitAction(l.action).module).filter(Boolean))]
  const typeOptions = ['All', ...new Set(logs.map((l) => splitAction(l.action).type).filter(Boolean))]

  const displayed = logs.filter((log) => {
    const userText = [log.user?.name, log.user?.email].filter(Boolean).join(' ').toLowerCase()
    const { module, type } = splitAction(log.action)
    if (search) {
      const q = search.toLowerCase()
      if (!userText.includes(q) && !log.action?.toLowerCase().includes(q) && !log.entity?.toLowerCase().includes(q)) return false
    }
    if (filterModule && module !== filterModule) return false
    if (filterType && type !== filterType) return false
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
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          {typeOptions.map((t) => <option key={t} value={t === 'All' ? '' : t}>{t === 'All' ? 'All Actions' : t}</option>)}
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
              {displayed.map((log) => {
                const { module, type } = splitAction(log.action)
                return (
                  <tr key={log.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400 dark:text-gray-500" />
                        <span className="font-medium text-royal-950 dark:text-white text-xs">{log.user?.name || log.user?.email || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-royal-950 dark:text-white text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-center"><Badge tone="purple">{module}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600 dark:text-gray-400 dark:text-gray-500">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500 max-w-64 truncate">{log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '—'}</td>
                    <td className="px-4 py-3 text-center"><Badge tone={typeTone[type]}>{type}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}