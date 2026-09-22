import { useEffect, useRef, useState } from 'react'
import { Download, Database, FileText, CheckCircle2, Loader2, AlertTriangle, Eye, Pencil, RotateCcw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import * as XLSX from 'xlsx'
import { exportApi, backupApi } from '../api/shopify'

const EXPORT_TYPES = [
  { id: 'products', label: 'Products', icon: FileText },
  { id: 'customers', label: 'Customers', icon: FileText },
  { id: 'orders', label: 'Orders', icon: FileText },
  { id: 'inventory', label: 'Inventory', icon: Database },
  { id: 'sales', label: 'Sales Reports', icon: FileText },
  { id: 'gst', label: 'GST Reports', icon: FileText },
]

const LS_KEY = 'opalline.recentExports'

function loadLS(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value.slice(0, 10)))
  } catch { /* storage unavailable */ }
}

const statusColor = { SUCCESS: 'green', PENDING: 'orange', FAILED: 'red' }

function triggerBlobDownload(filename, blob) {
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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Parse a CSV blob into { headers, rows } for the preview modal.
function parseCsv(text) {
  try {
    const wb = XLSX.read(text, { type: 'string' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    if (!aoa.length) return { headers: [], rows: [] }
    const headers = aoa[0]
    const rows = aoa.slice(1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    return { headers, rows }
  } catch {
    return { headers: [], rows: [] }
  }
}

// Serialize headers + rows back into a CSV string (quotes fields that contain separators/newlines).
function rowsToCsv(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
}

// Build a Blob from the current edited table.
function csvBlob(headers, rows) {
  return new Blob(['\uFEFF' + rowsToCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
}

export default function DataExportBackup() {
  const [tab, setTab] = useState('export')
  const [recentExports, setRecentExports] = useState(() => loadLS(LS_KEY))
  const [busyId, setBusyId] = useState(null)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // Preview modal state: { typeId, label, headers, rows, csv }
  const [preview, setPreview] = useState(null)

  // Backups tab — server-driven backup + push history
  const [backups, setBackups] = useState([])
  const [backupError, setBackupError] = useState(null)
  const [backupLoading, setBackupLoading] = useState(true)

  useEffect(() => saveLS(LS_KEY, recentExports), [recentExports])

  useEffect(() => {
    let cancelled = false
    backupApi.list()
      .then((r) => {
        if (cancelled) return
        setBackups(r.data.data || [])
        setBackupError(null)
      })
      .catch(() => {
        if (!cancelled) setBackupError('Could not load backup history. Is the server reachable?')
      })
      .finally(() => {
        if (!cancelled) setBackupLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function handleExportType(typeId, label) {
    if (busyId) return
    setBusyId(typeId)
    try {
      const res = await exportApi.downloadCsv(typeId)
      triggerBlobDownload(`${label.toLowerCase()}_export_${Date.now()}.csv`, res.data)
      setRecentExports((prev) => [
        { id: Date.now(), name: `${label} CSV`, type: typeId, format: 'CSV', size: formatBytes(res.data.size || 0), status: 'SUCCESS', createdAt: formatTimestamp(new Date()) },
        ...prev,
      ])
      showToast(`${label} exported to CSV successfully`)
    } catch {
      showToast(`Failed to export ${label}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDownloadExport(row) {
    if (busyId) return
    setBusyId(`export-${row.id}`)
    try {
      const res = await exportApi.downloadCsv(row.type)
      triggerBlobDownload(`${row.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.csv`, res.data)
      showToast(`${row.name} downloaded`)
    } catch {
      showToast(`Failed to download ${row.name}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleView(typeId, label, editing = false) {
    if (busyId) return
    setBusyId(`view-${typeId}`)
    try {
      const res = await exportApi.downloadCsv(typeId)
      const text = typeof res.data === 'string' ? res.data : await res.data.text()
      const { headers, rows } = parseCsv(text)
      setPreview({ typeId, label, headers, rows, csv: res.data, editing })
    } catch {
      showToast(`Failed to load ${label} preview`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  function updateCell(ri, ci, value) {
    setPreview((p) => {
      if (!p) return p
      const rows = p.rows.map((row, i) => (i === ri ? row.map((cell, c) => (c === ci ? value : cell)) : row))
      return { ...p, rows }
    })
  }

  function toggleEditing() {
    setPreview((p) => (p ? { ...p, editing: !p.editing } : p))
  }

  function handleDownloadFromPreview() {
    if (!preview) return
    const blob = csvBlob(preview.headers, preview.rows)
    triggerBlobDownload(`${preview.typeId}_export_${Date.now()}.csv`, blob)
    setRecentExports((prev) => [
      { id: Date.now(), name: `${preview.label} CSV`, type: preview.typeId, format: 'CSV', size: formatBytes(blob.size), status: 'SUCCESS', createdAt: formatTimestamp(new Date()) },
      ...prev,
    ])
    showToast(`${preview.label} exported to CSV successfully`)
  }

  function handleCreateBackup() {
    setCreatingBackup(true)
    backupApi.create().then(async (res) => {
      const created = res.data.data
      await refreshBackups()
      showToast(`Backup created — ${created.counts?.products ?? 0} products, ${created.counts?.customers ?? 0} customers, ${created.counts?.invoices ?? 0} invoices captured`)
    }).catch(() => {
      showToast('Backup creation failed', 'error')
    }).finally(() => {
      setCreatingBackup(false)
    })
  }

  function handleRestore(row) {
    if (restoringId) return
    if (!window.confirm(`Re-push data from "${row.name}"? Existing records (same SKU/barcode/phone/invoice no.) will be updated; orders, items, payments and expenses will be restored.`)) return
    setRestoringId(row.id)
    backupApi.restore(row.id).then(async (res) => {
      const c = res.data?.data?.counts
      await refreshBackups()
      const summary = c ? `${c.product + c.productUpdated} products, ${c.customer} customers, ${c.invoice} invoices` : ''
      showToast(`Data re-pushed${summary ? ` (${summary})` : ''}`)
    }).catch(() => {
      showToast('Restore failed. Check server logs.', 'error')
    }).finally(() => {
      setRestoringId(null)
    })
  }

  function handleDownloadBackup(row) {
    backupApi.download(row.id).then((res) => {
      const blob = new Blob([res.data], { type: 'application/json' })
      triggerBlobDownload(`backup_${row.id}_${String(row.createdAt || '').slice(0, 10)}.json`, blob)
      showToast('Backup JSON downloaded')
    }).catch(() => {
      showToast('Download failed', 'error')
    })
  }

  async function refreshBackups() {
    try {
      const r = await backupApi.list()
      setBackups(r.data.data || [])
      setBackupError(null)
    } catch {
      setBackupError('Could not load backup history')
    }
  }

  const latestBackup = [...backups].find((b) => b.type === 'BACKUP')
  const backupCount = backups.filter((b) => b.type === 'BACKUP').length
  const pushCount = backups.filter((b) => b.type === 'RESTORE').length

  return (
    <div>
      <PageHeader title="Data Export / Backup" subtitle="Export data to CSV and manage database backups" />

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
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => handleView(t.id, t.label)} disabled={busyId === `view-${t.id}`}>
                  {busyId === `view-${t.id}` ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} View
                </Button>
                <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => handleView(t.id, t.label, true)} disabled={busyId === `view-${t.id}`}>
                  {busyId === `view-${t.id}` ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />} Edit
                </Button>
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
                  {recentExports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No exports yet. Click Export above to download real data.</td>
                    </tr>
                  )}
                  {recentExports.map((e, i) => (
                    <tr key={e.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{e.name}</td>
                      <td className="px-4 py-2.5"><Badge tone="blue">CSV</Badge></td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{e.size}</td>
                      <td className="px-4 py-2.5"><Badge tone={statusColor[e.status]}>{e.status}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{e.createdAt}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadExport(e)} disabled={busyId === `export-${e.id}`}>
                          {busyId === `export-${e.id}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
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

      {tab === 'backup' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Last Backup</p>
              <p className="text-sm font-bold text-green-600 mt-0.5">{latestBackup?.createdAt ? formatTimestamp(new Date(latestBackup.createdAt)) : 'Never'}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Backup Size</p>
              <p className="text-sm font-bold text-royal-600 dark:text-gray-300 mt-0.5">{latestBackup?.size != null ? formatBytes(latestBackup.size) : '—'}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Backups</p>
              <p className="text-sm font-bold text-royal-600 dark:text-gray-300 mt-0.5">{backupCount}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Data Re-pushes</p>
              <p className="text-sm font-bold text-royal-600 dark:text-gray-300 mt-0.5">{pushCount}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Button variant="primary" size="sm" onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {creatingBackup ? 'Capturing…' : 'Take Backup'}
            </Button>
          </div>

          <h3 className="text-sm font-semibold text-royal-800 dark:text-gray-200 mb-3">Push History</h3>
          <Card className="p-0 overflow-hidden">
            {backupError && <p className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400">{backupError}</p>}
            {backupLoading && <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"><Loader2 size={12} className="inline animate-spin mr-1" /> Loading…</p>}
            {!backupLoading && !backupError && backups.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No backups yet. Click "Take Backup" to capture a full snapshot of your data.</p>
            )}
            {backups.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">#</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Name</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Size</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Records</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Created</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={b.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{b.name}</td>
                        <td className="px-4 py-2.5">
                          {b.type === 'BACKUP'
                            ? <Badge tone="blue">Backup</Badge>
                            : <Badge tone="green">Re-push</Badge>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{b.type === 'BACKUP' ? formatBytes(b.size) : '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {b.counts ? `${b.counts.products ?? b.counts.product ?? 0} products · ${b.counts.customers ?? b.counts.customer ?? 0} customers` : (b.message || '—')}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={b.message && b.message.startsWith('Failed') ? 'red' : 'green'}>{b.message && b.message.startsWith('Failed') ? 'FAILED' : 'SUCCESS'}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatTimestamp(new Date(b.createdAt))}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {b.type === 'BACKUP' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleRestore(b)} disabled={restoringId !== null}>
                                {restoringId === b.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Re-push
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadBackup(b)}><Download size={12} /> Download</Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Backups store a full JSON snapshot (products, customers, orders, invoices, inventory, purchases, expenses, settings). Re-push upserts by natural key — duplicate-safe.</p>
        </div>
      )}

      {preview && (
        <Modal
          open
          size="2xl"
          title={`${preview.label} ${preview.editing ? 'Edit' : 'Preview'}`}
          onClose={() => setPreview(null)}
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Close</Button>
              <Button variant="outline" size="sm" onClick={toggleEditing}>
                <Pencil size={14} /> {preview.editing ? 'View Mode' : 'Edit Mode'}
              </Button>
              <Button variant="primary" size="sm" onClick={handleDownloadFromPreview}>
                <Download size={14} /> Export CSV
              </Button>
            </>
          }
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {preview.rows.length} records · {preview.headers.length} fields
              {preview.editing && <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">Editing enabled — changes are saved to this export</span>}
            </p>
          </div>
          <div className="overflow-x-auto border border-gray-200 dark:border-white/[0.08] rounded-lg">
            {preview.headers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No data to preview.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-[#1a1025]">#</th>
                    {preview.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap min-w-[120px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 200).map((row, ri) => (
                    <tr key={ri} className={`border-t border-gray-100 dark:border-white/[0.05] ${ri % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap sticky left-0 bg-white dark:bg-[#1a1025]">{ri + 1}</td>
                      {preview.headers.map((h, ci) => (
                        <td key={ci} className="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[320px] overflow-hidden">
                          {preview.editing ? (
                            <input
                              value={row[ci] ?? ''}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              className="w-full bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
                            />
                          ) : (
                            <span className="block text-ellipsis overflow-hidden" title={row[ci] || ''}>{row[ci] || ''}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {preview.rows.length > 200 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Showing first 200 of {preview.rows.length} records. Use Export CSV to download the complete file.</p>
          )}
        </Modal>
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
