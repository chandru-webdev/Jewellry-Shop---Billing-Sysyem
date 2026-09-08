import { useState } from 'react'
import { Download } from 'lucide-react'
import Button from './Button'

const dateInput =
  'text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500'

export default function ExportControls({ onExport, label = 'Download All', className }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onExport({ from: from || undefined, to: to || undefined })
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <input type="date" title="From date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
      <span className="text-xs text-gray-400">to</span>
      <input type="date" title="To date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInput} />
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        <Download size={14} /> {busy ? 'Preparing…' : label}
      </Button>
    </div>
  )
}