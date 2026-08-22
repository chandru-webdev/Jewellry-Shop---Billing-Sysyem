import { useState } from 'react'
import { AlertCircle, CheckCircle2, Mail, AlertTriangle, TrendingUp, Users, Package } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const DEMO_NOTIFICATIONS = [
  { id: 1, type: 'ORDER_SYNC', title: 'Order Sync Failed', message: 'Order ORD-20260810-005 failed to sync due to Shopify API rate limit', time: '2026-08-10 09:15 AM', status: 'FAILED', entity: 'Order ORD-20260810-005' },
  { id: 2, type: 'PAYMENT_FAILED', title: 'Payment Failed', message: 'Payment of ₹45,230 failed for invoice INV-2026-012 - insufficient balance', time: '2026-08-10 08:45 AM', status: 'FAILED', entity: 'Invoice INV-2026-012' },
  { id: 3, type: 'RATE_CHANGED', title: 'Silver Rate Updated', message: 'Rate changed from ₹90.00/gm to ₹92.80/gm (+3.11%)', time: '2026-08-10 06:30 AM', status: 'SUCCESS', entity: 'MetalRate' },
  { id: 4, type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Silver Ring (SLV-RNG-00021) has only 4 units left below threshold of 10', time: '2026-08-09 04:00 PM', status: 'WARNING', entity: 'Silver Ring Plain' },
  { id: 5, type: 'NEW_USER', title: 'New User Added', message: 'Staff user staff@opalline.com added by admin', time: '2026-08-09 10:00 AM', status: 'SUCCESS', entity: 'User staff@opalline.com' },
  { id: 6, type: 'INVENTORY_SYNC', title: 'Inventory Sync Completed', message: '12 products synced successfully from ERP to Shopify', time: '2026-08-09 02:30 PM', status: 'SUCCESS', entity: 'Product Catalog' },
]

const statusColor = { SUCCESS: 'green', FAILED: 'red', WARNING: 'orange' }

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
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [markedRead, setMarkedRead] = useState(new Set())

  const notifications = DEMO_NOTIFICATIONS.filter((n) => {
    if (filter === 'all') return true
    return n.status === filter
  })

  const markedReadArr = Array.from(markedRead)

  const markAsRead = (id) => {
    setMarkedRead(prev => new Set([...prev, id]))
  }

  const markAllAsRead = () => {
    setMarkedRead(new Set(DEMO_NOTIFICATIONS.map((n) => n.id)))
  }

  const unreadCount = DEMO_NOTIFICATIONS.filter((n) => !markedRead.has(n.id) && n.status !== 'SUCCESS').length

  return (
    <div>
      <PageHeader title="Notifications" subtitle="System alerts and event log" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total</p>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{DEMO_NOTIFICATIONS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Unread</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{unreadCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Succeeded</p>
          <p className="text-xl font-bold text-green-600 mt-0.5">{DEMO_NOTIFICATIONS.filter((n) => n.status === 'SUCCESS').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{DEMO_NOTIFICATIONS.filter((n) => n.status === 'FAILED').length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
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
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">#</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Entity</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n, i) => (
                <tr key={n.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-medium text-royal-800">{n.id}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = getTypeIcon(n.type); return <Icon size={14} className={n.status === 'SUCCESS' ? 'text-green-500' : n.status === 'FAILED' ? 'text-red-500' : n.status === 'WARNING' ? 'text-orange-500' : 'text-gray-400'} />; })()}
                      <span className="text-sm font-medium text-royal-900">{n.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 truncate">{n.title}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{n.time}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusColor[n.status]}>
                      {n.status === 'SUCCESS' ? '✓' : n.status === 'FAILED' ? '✗' : '⚠'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{n.entity}</td>
                  <td className="px-4 py-2.5 text-right">
                    {markedRead.has(n.id) ? (
                      <span className="text-[10px] text-gray-400">Read</span>
                    ) : (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 text-royal-400 hover:text-royal-700 cursor-pointer text-[10px]"
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