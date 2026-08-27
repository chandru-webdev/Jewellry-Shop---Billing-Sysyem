import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, CheckCircle2, XCircle, Clock, Filter, Download, Loader2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'

const statusColor = { SUCCESS: 'green', FAILED: 'red', PENDING: 'orange' }
const entityColor = { Order: 'blue', Product: 'purple', Inventory: 'gold', Customer: 'green' }
const statusIcon = { SUCCESS: CheckCircle2, FAILED: XCircle, PENDING: Clock }

const entityOptions = ['All', 'Order', 'Product', 'Inventory', 'Customer']
const statusOptions = ['All', 'SUCCESS', 'FAILED', 'PENDING']

export default function SyncLogs() {
  const [filterEntity, setFilterEntity] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')

  const { data: apiLogs = [], refetch } = useQuery({
    queryKey: ['shopify-sync-logs', filterEntity, filterStatus],
    queryFn: () => shopifyApi.getSyncLogs({
      ...(filterEntity !== 'All' ? { type: filterEntity } : {}),
      ...(filterStatus !== 'All' ? { status: filterStatus } : {}),
    }).then((r) => r.data.data),
  })

  const logs = (apiLogs || []).map((l) => ({
    ...l,
    entity: l.type || l.entity || 'Unknown',
    shopifyId: l.shopifyId || l.entityId || '—',
    entityName: l.entityName || l.message || '—',
    direction: l.direction || (l.type === 'Order' || l.type === 'Customer' ? 'Shopify → ERP' : 'ERP → Shopify'),
    action: l.action || l.type || 'Sync',
    time: l.createdAt,
    duration: l.duration || '—',
  }))

  const synced = logs.filter((l) => l.status === 'SUCCESS').length
  const failed = logs.filter((l) => l.status === 'FAILED').length
  const pending = logs.filter((l) => l.status === 'PENDING').length
  const lastSync = logs.find((l) => l.status === 'SUCCESS')

  const filtered = logs.filter((log) => {
    if (search && !log.shopifyId?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const exportCSV = () => {
    const header = ['ID', 'Entity', 'Shopify ID', 'Entity Name', 'Direction', 'Action', 'Status', 'Time', 'Duration', 'Error']
    const rows = filtered.map((l) => [l.id, l.entity, l.shopifyId, l.entityName, l.direction, l.action, l.status, l.time, l.duration, l.error || ''])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sync-logs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    refetch()
  }

  return (
    <div>
      <PageHeader title="Sync Logs" subtitle="Detailed Shopify ↔ ERP synchronization history" actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={14} /> Export CSV</Button>
          <Button variant="primary" size="sm" onClick={handleRefresh}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Synced</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{synced}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{failed}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Last Sync Time</p>
          <p className="text-sm font-bold text-royal-700 dark:text-gray-300 mt-1">{lastSync ? lastSync.time : '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Filter size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search by Shopify ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          {entityOptions.map((e) => <option key={e} value={e}>{e === 'All' ? 'All Entities' : e}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          {statusOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Entity</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Shopify ID</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Entity Name</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Direction</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Action</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Duration</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Error</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const StatusIcon = statusIcon[log.status]
                return (
                  <tr key={log.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'} hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors`}>
                    <td className="px-4 py-2.5"><Badge tone={entityColor[log.entity]}>{log.entity}</Badge></td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-royal-700 dark:text-gray-300 text-xs">{log.shopifyId}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-950 dark:text-white text-xs max-w-52 truncate">{log.entityName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">{log.direction}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{log.action}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={statusColor[log.status]}>
                        <StatusIcon size={11} className="mr-1" /> {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">{log.time}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{log.duration}</td>
                    <td className="px-4 py-2.5 text-xs max-w-48 truncate">
                      {log.error ? <span className="text-red-600">{log.error}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {log.status === 'FAILED' && <Button variant="ghost" size="sm" onClick={() => showToast(`Retrying sync for ${log.shopifyId}...`)}><RefreshCw size={12} /> Retry</Button>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No sync logs match your filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Showing 1-{filtered.length} of {filtered.length} entries</p>
          <div className="flex gap-1">
            <button disabled className="px-3 py-1 text-xs rounded-md bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] text-gray-400 dark:text-gray-500 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 text-xs rounded-md bg-royal-700 text-white cursor-pointer">1</button>
            <button disabled className="px-3 py-1 text-xs rounded-md bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] text-gray-400 dark:text-gray-500 cursor-not-allowed">Next</button>
          </div>
        </div>
      </Card>

    </div>
  )
}
