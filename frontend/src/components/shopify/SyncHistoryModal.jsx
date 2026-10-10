import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Clock, History, Loader2, RefreshCw, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { shopifyApi } from '../../api/shopify'

const statusColor = { SUCCESS: 'green', FAILED: 'red', PENDING: 'orange' }
const statusIcon = { SUCCESS: CheckCircle2, FAILED: XCircle, PENDING: Clock }
const typeColor = { PRODUCT: 'blue', PRICE: 'purple', INVENTORY: 'gold', ORDER: 'green', CUSTOMER: 'gray' }

// History of Shopify sync runs (how many products synced / failed / pending).
// Records are only kept for the last 3 days — pruned by the backend.
export default function SyncHistoryModal({ open, onClose, type = 'PRODUCT', title }) {
  const [expanded, setExpanded] = useState(null)
  const { data: logs = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['shopify-sync-history', type],
    queryFn: () => shopifyApi.getSyncLogs({ type, limit: 100 }).then((r) => r.data.data),
    enabled: open,
  })

  // Summary reflects the LATEST run only — summing every row made a second
  // full sync of the same products look like double the work (50 -> 100).
  // For the dashboard's "ALL" view, take the latest row per type so the cards
  // cover the whole last sync (products + prices + inventory + orders) instead
  // of a single stage, and repeated syncs still don't stack up.
  const latest = logs?.[0]
  const summaryRows = useMemo(() => {
    if (type !== 'ALL') return latest ? [latest] : []
    const seen = new Set()
    const rows = []
    for (const l of logs) {
      if (seen.has(l.type)) continue
      seen.add(l.type)
      rows.push(l)
    }
    return rows
  }, [logs, type, latest])
  const summary = summaryRows.reduce(
    (acc, l) => ({
      ok: acc.ok + (l.ok ?? l.itemsProcessed ?? 0),
      failed: acc.failed + (l.failed ?? 0),
      pending: acc.pending + (l.pending ?? 0),
      total: acc.total + (l.total ?? 0),
    }),
    { ok: 0, failed: 0, pending: 0, total: 0 }
  )
  const lastSync = latest?.createdAt

  return (
    <Modal
      open={open}
      title={title || 'Sync History'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-auto">History is kept for the last 3 days only.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Synced</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{summary.ok}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Failed</p>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600 mt-0.5">{summary.failed}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Pending</p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{summary.pending}</p>
        </div>
      </div>

      {lastSync && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Last {type === 'PRODUCT' ? 'product' : 'sync'} run: {new Date(lastSync).toLocaleString()} · total {summary.total}
        </p>
      )}

      {/* Runs list */}
      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-10">
            <Loader2 size={16} className="animate-spin" /> Loading history…
          </div>
        )}
        {!isLoading && logs.length === 0 && (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">
            <History size={22} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            No sync history yet.
          </div>
        )}
        {logs.map((l) => {
          const StatusIcon = statusIcon[l.status] || Clock
          const failures = Array.isArray(l.failures) ? l.failures : []
          const isOpen = expanded === l.id
          return (
            <div key={l.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <Badge tone={typeColor[l.type] || 'gray'}>{l.type}</Badge>
                <Badge tone={statusColor[l.status] || 'gray'}>
                  <StatusIcon size={11} className="mr-1" /> {l.status}
                </Badge>
                <span className="text-sm font-semibold text-royal-950 dark:text-white">
                  {l.ok ?? l.itemsProcessed ?? 0} synced
                </span>
                {(l.failed ?? 0) > 0 && <span className="text-sm font-semibold text-red-600">{l.failed} failed</span>}
                {(l.pending ?? 0) > 0 && <span className="text-sm font-semibold text-amber-600">{l.pending} pending</span>}
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
                {failures.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setExpanded(isOpen ? null : l.id)}
                  >
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <Eye size={13} className="ml-1" /> {isOpen ? 'Hide' : 'View'} failures ({failures.length})
                  </Button>
                )}
              </div>
              {l.status === 'FAILED' && l.message && (
                <p className="px-4 pb-3 text-xs text-gray-500 dark:text-gray-400 truncate">{l.message}</p>
              )}
              {isOpen && (
                <div className="px-4 pb-3 -mt-1 space-y-1.5">
                  {failures.map((f, i) => (
                    <div key={i} className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-red-800 dark:text-red-300 min-w-0">{f.name || 'Unknown product'}</span>
                        {f.sku && <span className="text-[11px] font-mono text-red-500 dark:text-red-400">({f.sku})</span>}
                      </div>
                      {f.message && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">{f.message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}