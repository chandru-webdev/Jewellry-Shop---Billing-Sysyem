import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, Zap, Package, CreditCard, Store, Settings } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Select } from '../components/ui/FormControls'
import { formatDateTime } from '../utils/format'
import { auditLogsApi } from '../api/auditLogs'

const ENTITIES = ['Product', 'Invoice', 'Payment', 'Order', 'User', 'Setting', 'MetalRate', 'RateRequest', 'Notification', 'InventoryTransaction']

const ACTIONS = [
  'INVOICE_CREATED', 'INVOICE_UPDATED',
  'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_ACTIVATED', 'PRODUCT_DEACTIVATED',
  'PAYMENT_CREATED',
  'ORDER_CREATED', 'ORDER_STATUS_CHANGED',
  'USER_CREATED', 'USER_UPDATED', 'USER_PASSWORD_RESET', 'USER_PASSWORD_SET',
  'SILVER_RATE_CHANGED', 'SETTINGS_UPDATED', 'SHOPIFY_ORDER_IMPORTED',
]

function typeForEntity(entity) {
  switch (entity) {
    case 'Product': return { label: 'Product', icon: Package, tone: 'purple' }
    case 'Invoice': return { label: 'Invoice', icon: CreditCard, tone: 'blue' }
    case 'Payment': return { label: 'Payment', icon: CreditCard, tone: 'blue' }
    case 'Order': return { label: 'Shopify', icon: Store, tone: 'blue' }
    case 'MetalRate':
    case 'RateRequest': return { label: 'Rate', icon: Zap, tone: 'gold' }
    case 'User':
    case 'Setting': return { label: 'System', icon: Settings, tone: 'gray' }
    case 'Notification': return { label: 'Alert', icon: Activity, tone: 'orange' }
    case 'InventoryTransaction': return { label: 'Stock', icon: Package, tone: 'green' }
    default: return { label: 'System', icon: Settings, tone: 'gray' }
  }
}

export default function ActivityLog() {
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [limit, setLimit] = useState(50)
  const [debounced, setDebounced] = useState('')
  const searchTimer = useRef(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', { search: debounced, entity, action, limit }],
    queryFn: () => auditLogsApi.list({ search: debounced, entity, action, limit }).then((r) => r.data.data),
    retry: false,
  })

  const items = data?.items || []
  const total = data?.total ?? 0

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Audit trail of recent system actions" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by user or action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => setDebounced(e.target.value), 350)
            }}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>
        <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All Entities</option>
          {ENTITIES.map((en) => <option key={en} value={en}>{en}</option>)}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </Select>
        <Badge tone="gray" className="ml-auto">{total} entries</Badge>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50 dark:bg-white/5 text-royal-900 dark:text-gray-200 text-left">
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">Loading activity…</td></tr>
              ) : isError ? (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-red-500">Failed to load audit log. You may need admin access to view this page.</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">No activity matches your filters.</td></tr>
              ) : (
                items.map((a) => {
                  const cfg = typeForEntity(a.entity)
                  const Icon = cfg.icon
                  const meta = a.metadata && Object.keys(a.metadata).length
                    ? Object.entries(a.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : a.entityId ? `Record #${a.entityId}` : ''
                  return (
                    <tr key={a.id} className="hover:bg-royal-50 dark:hover:bg-white/5/50">
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDateTime(a.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={cfg.tone} className="flex items-center gap-1 w-fit">
                          <Icon size={10} /> {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-royal-950 dark:text-white">{a.user?.name || 'System'}</td>
                      <td className="px-5 py-3 font-medium text-royal-950 dark:text-white">{a.action}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{meta}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {items.length < total && (
          <div className="px-5 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
            Showing {items.length} of {total} — narrow your filters to see more.
          </div>
        )}
      </Card>
    </div>
  )
}