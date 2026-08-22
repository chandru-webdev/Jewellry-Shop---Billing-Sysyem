import { useState } from 'react'
import { Activity, Search, Zap, Package, CreditCard, Store, Settings } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Select } from '../components/ui/FormControls'
import { formatDateTime } from '../utils/format'
import { activityLog as initialLog } from '../mock/products'

const typeConfig = {
  rate: { label: 'Rate', icon: Zap, tone: 'gold' },
  stock: { label: 'Stock', icon: Package, tone: 'green' },
  alert: { label: 'Alert', icon: Activity, tone: 'orange' },
  product: { label: 'Product', icon: Package, tone: 'purple' },
  price: { label: 'Price', icon: CreditCard, tone: 'blue' },
  shopify: { label: 'Shopify', icon: Store, tone: 'blue' },
  system: { label: 'System', icon: Settings, tone: 'gray' },
}

export default function ActivityLog() {
  const [log] = useState(initialLog)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  const filtered = log.filter((a) => {
    if (filterType && a.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.user.toLowerCase().includes(q) && !a.action.toLowerCase().includes(q)) return false
    }
    return true
  })

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
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </Select>
        <Badge tone="gray" className="ml-auto">{filtered.length} entries</Badge>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">No activity matches your filters.</td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const cfg = typeConfig[a.type] || typeConfig.system
                  const Icon = cfg.icon
                  return (
                    <tr key={a.id} className="hover:bg-royal-50 dark:hover:bg-white/5/50">
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">{formatDateTime(a.time)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={cfg.tone} className="flex items-center gap-1 w-fit">
                          <Icon size={10} /> {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-royal-950 dark:text-white">{a.user}</td>
                      <td className="px-5 py-3 font-medium text-royal-950 dark:text-white">{a.action}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{a.detail}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
