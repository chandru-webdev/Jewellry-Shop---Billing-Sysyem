import { useState } from 'react'
import { Download, Upload, Database, FileText, Clock, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const DEMO_EXPORTS = [
  { id: 1, name: 'Products CSV', type: 'products', format: 'CSV', size: '124 KB', rows: 245, status: 'SUCCESS', createdAt: '2026-08-10 09:00 AM' },
  { id: 2, name: 'Customers CSV', type: 'customers', format: 'CSV', size: '89 KB', rows: 120, status: 'SUCCESS', createdAt: '2026-08-10 08:30 AM' },
  { id: 3, name: 'Sales Report (Aug)', type: 'sales', format: 'PDF', size: '2.1 MB', rows: 0, status: 'SUCCESS', createdAt: '2026-08-09 05:00 PM' },
  { id: 4, name: 'Inventory Snapshot', type: 'inventory', format: 'CSV', size: '67 KB', rows: 180, status: 'PENDING', createdAt: '2026-08-09 04:15 PM' },
  { id: 5, name: 'GST Report GSTR-1', type: 'gst', format: 'PDF', size: '1.5 MB', rows: 0, status: 'SUCCESS', createdAt: '2026-08-08 10:00 AM' },
]

const DEMO_BACKUPS = [
  { id: 1, name: 'Full Database Backup', size: '45 MB', status: 'SUCCESS', createdAt: '2026-08-10 06:00 AM', type: 'auto' },
  { id: 2, name: 'Full Database Backup', size: '44 MB', status: 'SUCCESS', createdAt: '2026-08-09 06:00 AM', type: 'auto' },
  { id: 3, name: 'Manual Backup (Pre-update)', size: '43 MB', status: 'SUCCESS', createdAt: '2026-08-08 02:00 PM', type: 'manual' },
  { id: 4, name: 'Full Database Backup', size: '42 MB', status: 'SUCCESS', createdAt: '2026-08-07 06:00 AM', type: 'auto' },
]

const EXPORT_TYPES = [
  { id: 'products', label: 'Products', icon: FileText, count: 245 },
  { id: 'customers', label: 'Customers', icon: FileText, count: 120 },
  { id: 'orders', label: 'Orders', icon: FileText, count: 89 },
  { id: 'inventory', label: 'Inventory', icon: Database, count: 180 },
  { id: 'sales', label: 'Sales Reports', icon: FileText, count: 0 },
  { id: 'gst', label: 'GST Reports', icon: FileText, count: 0 },
]

const statusColor = { SUCCESS: 'green', PENDING: 'orange', FAILED: 'red' }

export default function DataExportBackup() {
  const [tab, setTab] = useState('export')

  return (
    <div>
      <PageHeader title="Data Export / Backup" subtitle="Export data to CSV/PDF and manage database backups" />

      <div className="flex items-center gap-2 mb-4">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value)}
          className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="export">Data Export</option>
          <option value="backup">Database Backup</option>
        </select>
      </div>

      {tab === 'export' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {EXPORT_TYPES.map((t) => (
              <div key={t.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4 hover:border-royal-300 dark:border-white/10 cursor-pointer transition-all">
                <t.icon size={20} className="text-royal-500 dark:text-gray-400 mb-2" />
                <p className="text-sm font-medium text-royal-800 dark:text-gray-200">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{t.count > 0 ? `${t.count} records` : 'Report'}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full"><Download size={12} /> Export</Button>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-royal-800 dark:text-gray-200 mb-3">Recent Exports</h3>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">#</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Export Name</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Format</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Size</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Created</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_EXPORTS.map((e, i) => (
                    <tr key={e.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{e.id}</td>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{e.name}</td>
                      <td className="px-4 py-2.5"><Badge tone={e.format === 'CSV' ? 'blue' : 'red'}>{e.format}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{e.size}</td>
                      <td className="px-4 py-2.5"><Badge tone={statusColor[e.status]}>{e.status}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.createdAt}</td>
                      <td className="px-4 py-2.5 text-right">
                        {e.status === 'SUCCESS' && (
                          <Button variant="ghost" size="sm"><Download size={12} /> Download</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'backup' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Last Backup</p>
              <p className="text-sm font-bold text-green-600 mt-0.5">Today 06:00 AM</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Backup Size</p>
              <p className="text-sm font-bold text-royal-600 dark:text-gray-300 mt-0.5">45 MB</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Backups</p>
              <p className="text-sm font-bold text-royal-600 dark:text-gray-300 mt-0.5">{DEMO_BACKUPS.length}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Button variant="primary" size="sm"><Download size={14} /> Create Manual Backup</Button>
            <Button variant="outline" size="sm"><Upload size={14} /> Restore Backup</Button>
          </div>

          <h3 className="text-sm font-semibold text-royal-800 dark:text-gray-200 mb-3">Backup History</h3>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">#</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Backup Name</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Size</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Created</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_BACKUPS.map((b, i) => (
                    <tr key={b.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{b.id}</td>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{b.name}</td>
                      <td className="px-4 py-2.5"><Badge tone={b.type === 'auto' ? 'blue' : 'amber'}>{b.type}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{b.size}</td>
                      <td className="px-4 py-2.5"><Badge tone={statusColor[b.status]}>{b.status}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{b.createdAt}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm"><Download size={12} /> Download</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}