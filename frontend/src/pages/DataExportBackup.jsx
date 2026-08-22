import { useRef, useState } from 'react'
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

const CSV_TEMPLATES = {
  products: {
    headers: ['id', 'name', 'sku', 'category', 'price', 'stock'],
    rows: [
      ['1', 'Wireless Mouse', 'WM-001', 'Electronics', '799.00', '45'],
      ['2', 'Mechanical Keyboard', 'MK-002', 'Electronics', '2499.00', '12'],
      ['3', 'Office Chair', 'OC-003', 'Furniture', '5499.00', '8'],
    ],
  },
  customers: {
    headers: ['id', 'name', 'email', 'phone', 'city', 'total_orders'],
    rows: [
      ['1', 'Rahul Sharma', 'rahul@example.com', '+91 98765 43210', 'Mumbai', '14'],
      ['2', 'Priya Patel', 'priya@example.com', '+91 98123 45678', 'Ahmedabad', '9'],
      ['3', 'Amit Verma', 'amit@example.com', '+91 99887 76655', 'Delhi', '21'],
    ],
  },
  orders: {
    headers: ['id', 'order_no', 'customer', 'date', 'amount', 'status'],
    rows: [
      ['1', 'INV-2026-0112', 'Rahul Sharma', '2026-08-01', '12599.00', 'PAID'],
      ['2', 'INV-2026-0113', 'Priya Patel', '2026-08-03', '5499.00', 'PENDING'],
      ['3', 'INV-2026-0114', 'Amit Verma', '2026-08-05', '8299.00', 'PAID'],
    ],
  },
  inventory: {
    headers: ['id', 'product', 'warehouse', 'quantity', 'reorder_level', 'last_updated'],
    rows: [
      ['1', 'Wireless Mouse', 'Main Warehouse', '45', '20', '2026-08-08'],
      ['2', 'Mechanical Keyboard', 'Main Warehouse', '12', '15', '2026-08-07'],
      ['3', 'Office Chair', 'Branch Warehouse', '8', '5', '2026-08-06'],
    ],
  },
  sales: {
    headers: ['month', 'revenue', 'orders', 'avg_order_value', 'growth'],
    rows: [
      ['Jun 2026', '482000.00', '112', '4303.57', '+6.2%'],
      ['Jul 2026', '512400.00', '121', '4234.71', '+6.3%'],
      ['Aug 2026', '268900.00', '68', '3954.41', '-'],
    ],
  },
  gst: {
    headers: ['gstin', 'period', 'taxable_value', 'cgst', 'sgst', 'total_tax'],
    rows: [
      ['27ABCDE1234F1Z5', 'Jul 2026', '512400.00', '46116.00', '46116.00', '92232.00'],
      ['27ABCDE1234F1Z5', 'Jun 2026', '482000.00', '43380.00', '43380.00', '86760.00'],
    ],
  },
}

function buildCsvContent(headers, rows) {
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function triggerCsvDownload(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0')
  let h = date.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(h)}:${pad(date.getMinutes())} ${ampm}`
}

export default function DataExportBackup() {
  const [tab, setTab] = useState('export')
  const [recentExports, setRecentExports] = useState(DEMO_EXPORTS)
  const [backups, setBackups] = useState(DEMO_BACKUPS)
  const [busyId, setBusyId] = useState(null)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  function nextId(list) {
    return list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1
  }

  function handleExportType(typeId, label) {
    if (busyId) return
    setBusyId(typeId)
    setTimeout(() => {
      const tpl = CSV_TEMPLATES[typeId]
      triggerCsvDownload(`${typeId}_export_${Date.now()}.csv`, buildCsvContent(tpl.headers, tpl.rows))
      setRecentExports((prev) => [
        {
          id: nextId(prev),
          name: `${label} CSV`,
          type: typeId,
          format: 'CSV',
          size: `${Math.floor(Math.random() * 90 + 40)} KB`,
          rows: tpl.rows.length,
          status: 'SUCCESS',
          createdAt: formatTimestamp(new Date()),
        },
        ...prev,
      ])
      setBusyId(null)
      showToast(`${label} exported to CSV successfully`)
    }, 900)
  }

  function handleDownloadExport(row) {
    if (busyId) return
    setBusyId(`export-${row.id}`)
    setTimeout(() => {
      const tpl = CSV_TEMPLATES[row.type] || CSV_TEMPLATES.sales
      triggerCsvDownload(`${row.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.csv`, buildCsvContent(tpl.headers, tpl.rows))
      setBusyId(null)
      showToast(`${row.name} downloaded`)
    }, 700)
  }

  function handleCreateBackup() {
    if (creatingBackup) return
    setCreatingBackup(true)
    setTimeout(() => {
      setBackups((prev) => [
        {
          id: nextId(prev),
          name: 'Manual Backup',
          size: '45 MB',
          status: 'SUCCESS',
          createdAt: formatTimestamp(new Date()),
          type: 'manual',
        },
        ...prev,
      ])
      setCreatingBackup(false)
      showToast('Manual backup created successfully')
    }, 1200)
  }

  function handleRestore() {
    showToast('Restore started: using latest successful backup (demo)', 'info')
  }

  function handleDownloadBackup(backup) {
    if (busyId) return
    setBusyId(`backup-${backup.id}`)
    setTimeout(() => {
      const content = buildCsvContent(
        ['backup_id', 'name', 'type', 'size', 'status', 'created_at'],
        [[backup.id, backup.name, backup.type, backup.size, backup.status, backup.createdAt]]
      )
      triggerCsvDownload(`backup_${backup.id}_${backup.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.csv`, content)
      setBusyId(null)
      showToast(`${backup.name} downloaded`)
    }, 700)
  }

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
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => handleExportType(t.id, t.label)} disabled={busyId === t.id}>
                  {busyId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export
                </Button>
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
                  {recentExports.map((e, i) => (
                    <tr key={e.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{e.id}</td>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{e.name}</td>
                      <td className="px-4 py-2.5"><Badge tone={e.format === 'CSV' ? 'blue' : 'red'}>{e.format}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{e.size}</td>
                      <td className="px-4 py-2.5"><Badge tone={statusColor[e.status]}>{e.status}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.createdAt}</td>
                      <td className="px-4 py-2.5 text-right">
                        {e.status === 'SUCCESS' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadExport(e)} disabled={busyId === `export-${e.id}`}>
                            {busyId === `export-${e.id}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                          </Button>
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
              <p className="text-sm font-bold text-royal-600 dark:text-gray-300 mt-0.5">{backups.length}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Button variant="primary" size="sm" onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Create Manual Backup
            </Button>
            <Button variant="outline" size="sm" onClick={handleRestore}><Upload size={14} /> Restore Backup</Button>
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
                  {backups.map((b, i) => (
                    <tr key={b.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{b.id}</td>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{b.name}</td>
                      <td className="px-4 py-2.5"><Badge tone={b.type === 'auto' ? 'blue' : 'amber'}>{b.type}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{b.size}</td>
                      <td className="px-4 py-2.5"><Badge tone={statusColor[b.status]}>{b.status}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{b.createdAt}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadBackup(b)} disabled={busyId === `backup-${b.id}`}>
                          {busyId === `backup-${b.id}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg shadow-lg px-4 py-3 text-sm text-royal-800 dark:text-gray-200">
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertTriangle size={16} className="text-orange-500" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
