import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Mail, AlertTriangle, TrendingUp, Users, Package } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatDateTime } from '../utils/format'
import { notificationsApi } from '../api/notifications'

const statusColor = { SUCCESS: 'green', FAILED: 'red', WARNING: 'orange' }

function deriveStatus(type = '') {
  const t = type.toUpperCase()
  if (t.includes('FAILED')) return 'FAILED'
  if (t.includes('SUCCESS')) return 'SUCCESS'
  return 'WARNING'
}

function getEntityLabel(type = '') {
  if (type.includes('ORDER')) return 'Order'
  if (type.includes('INVENTORY')) return 'Inventory'
  if (type.includes('STOCK')) return 'Inventory'
  if (type.includes('RATE')) return 'Metal Rate'
  if (type.includes('PAYMENT')) return 'Payment'
  if (type.includes('USER')) return 'User'
  return 'System'
}

function getTypeIcon(type) {
  switch (type) {
    case 'ORDER_SYNC': return Package
    case 'PAYMENT_FAILED': return Mail
    case 'RATE_CHANGED': return TrendingUp
    case 'LOW_STOCK': return AlertTriangle
    case 'NEW_USER': return Users
    case 'INVENTORY_SYNC': return Package
    default: return AlertCircle
  }
}

export default function Notifications() {
  const [filter, setFilter] = useState('all')
  const [markedRead, setMarkedRead] = useState(new Set())

  const { data: apiNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data.data.notifications),
  })

  const notifications = (apiNotifications || []).filter((n) => filter === 'all' || deriveStatus(n.type) === filter)

  const isRead = (n) => n.isRead || markedRead.has(n.id)

  const markAsRead = (id) => {
    setMarkedRead(prev => new Set([...prev, id]))
    notificationsApi.markAsRead(id).catch(() => {})
  }

  const markAllAsRead = () => {
    setMarkedRead(new Set(notifications.map((n) => n.id)))
    notificationsApi.markAllAsRead().catch(() => {})
  }

  const counts = notifications.reduce((acc, n) => {
    const s = deriveStatus(n.type)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const unreadCount = notifications.filter((n) => !isRead(n)).length

  return (
    <div>
      <PageHeader title="Notifications" subtitle="System alerts and event log" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{notifications.length}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Unread</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{unreadCount}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Succeeded</p>
          <p className="text-xl font-bold text-green-600 mt-0.5">{counts.SUCCESS || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{counts.FAILED || 0}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="all">All Notifications</option>
          <option value="SUCCESS">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="WARNING">Warning</option>
        </select>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Mark All Read
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">#</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Title</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Entity</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n, i) => (
                <tr key={n.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{n.id}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = getTypeIcon(n.type); return <Icon size={14} className={statusColor[deriveStatus(n.type)] === 'green' ? 'text-green-500' : statusColor[deriveStatus(n.type)] === 'red' ? 'text-red-500' : 'text-orange-500'} />; })()}
                      <span className="text-sm font-medium text-royal-900 dark:text-gray-200">{n.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 truncate">{n.title}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDateTime(n.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusColor[deriveStatus(n.type)]}>
                      {deriveStatus(n.type) === 'SUCCESS' ? '✓' : deriveStatus(n.type) === 'FAILED' ? '✗' : '⚠'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{getEntityLabel(n.type)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isRead(n) ? (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Read</span>
                    ) : (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 text-royal-400 hover:text-royal-700 dark:text-gray-300 cursor-pointer text-[10px]"
                        title="Mark as read"
                      >
                        <CheckCircle2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {unreadCount > 0 && (
        <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-[11px] uppercase tracking-wider text-red-600 font-medium mb-2">You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          <p className="text-sm text-red-500">Click 'Mark All Read' above to clear</p>
        </div>
      )}
    </div>
  )
}