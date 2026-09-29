import { useEffect, useRef, useState } from 'react'
import { Check, X, Loader2, Circle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { shopifyApi } from '../../api/shopify'

// Colour-coded per-item status for a bulk sync job streamed over SSE.
// One row per product processed so far: running (royal spinner), done (green
// check), failed (red X). The modal closes itself once the job is finished.
const STATUS_STYLE = {
  done: { icon: Check, ring: 'bg-emerald-500 text-white border-emerald-500', label: 'text-royal-950 dark:text-gray-100', msg: 'text-emerald-600 dark:text-emerald-400', connector: 'bg-emerald-400' },
  failed: { icon: X, ring: 'bg-red-500 text-white border-red-500', label: 'text-royal-950 dark:text-gray-100', msg: 'text-red-600 dark:text-red-400', connector: 'bg-gray-200 dark:bg-white/10' },
  running: { icon: Loader2, ring: 'bg-royal-600 text-white border-royal-600', label: 'text-royal-950 dark:text-gray-100', msg: 'text-royal-600 dark:text-royal-400', connector: 'bg-royal-300 dark:bg-white/20' },
  pending: { icon: Circle, ring: 'bg-white dark:bg-[#1a1025] text-gray-400 border-gray-300 dark:border-white/20', label: 'text-gray-400 dark:text-gray-500', msg: 'text-gray-400 dark:text-gray-500', connector: 'bg-gray-200 dark:bg-white/10' },
}

export default function BulkSyncProgress({ open, jobId, title, onClose, onComplete }) {
  const [status, setStatus] = useState('running')
  const [message, setMessage] = useState('')
  const [steps, setSteps] = useState([])
  const [total, setTotal] = useState(0)
  const [done, setDone] = useState(0)
  const [summary, setSummary] = useState(null)
  const [connecting, setConnecting] = useState(true)
  const reported = useRef(false)

  useEffect(() => {
    if (!open || !jobId) return
    let cancelled = false
    const controller = new AbortController()

    ;(async () => {
      try {
        await shopifyApi.streamSyncProgress(jobId, {
          onEvent: (p) => {
            if (cancelled) return
            setConnecting(false)
            setStatus(p.status === 'failed' ? 'failed' : p.status === 'success' ? 'success' : 'running')
            setMessage(p.message || '')
            if (Array.isArray(p.steps)) setSteps(p.steps)
            if (typeof p.total === 'number') setTotal(p.total)
            if (typeof p.done === 'number') setDone(p.done)
            if (p.summary) setSummary(p.summary)
          },
          signal: controller.signal,
        })
      } catch {
        // Stream failed/timed out — treat the job as over so the modal closes.
        if (cancelled) return
        setConnecting(false)
        setStatus((cur) => (cur === 'failed' ? cur : 'success'))
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, jobId])

  const finalStatus = status === 'failed' ? 'failed' : status === 'success' ? 'success' : null
  useEffect(() => {
    if (finalStatus && !reported.current) {
      reported.current = true
      const failedCount = steps.filter((s) => s.status === 'failed').length
      const t = setTimeout(
        () => onComplete?.(finalStatus, summary || { ok: done, failed: failedCount, total }),
        1400
      )
      return () => clearTimeout(t)
    }
    // Guarded by reported.current, so it only fires once per completed job.
  }, [finalStatus, steps, done, total, summary, onComplete])

  const isRunning = status === 'running'
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Modal open={open} title={title || 'Sync Progress'} onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-5">
        {/* Overall header */}
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            status === 'failed'
              ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
              : status === 'success'
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                : 'border-royal-200 bg-royal-50 dark:border-royal-500/30 dark:bg-royal-500/10'
          }`}
        >
          {isRunning && !connecting ? (
            <Loader2 size={20} className="text-royal-600 dark:text-royal-400 animate-spin shrink-0" />
          ) : isRunning ? (
            <Loader2 size={20} className="text-royal-400 animate-spin shrink-0" />
          ) : status === 'failed' ? (
            <X size={20} className="text-red-500 shrink-0" />
          ) : (
            <Check size={20} className="text-emerald-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${status === 'failed' ? 'text-red-700 dark:text-red-400' : status === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-royal-800 dark:text-royal-200'}`}>
              {connecting
                ? 'Opening live progress…'
                : status === 'failed'
                  ? 'Sync finished with errors'
                  : status === 'success'
                    ? `${title || 'Sync'} complete`
                    : message || 'Syncing…'}
            </p>
            {isRunning && !connecting && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{message}</p>
            )}
          </div>
          {isRunning && !connecting && total > 0 && (
            <span className="ml-auto text-xs font-semibold text-royal-600 dark:text-royal-400 tabular-nums">{percent}%</span>
          )}
        </div>

        {/* Summary line on the finished state */}
        {finalStatus && summary && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.ok}</span> synced
            {summary.failed > 0 && <span className="font-semibold text-red-600 dark:text-red-400">, {summary.failed} failed</span>}
            {' '}of {summary.total}
          </p>
        )}

        {/* Linear progress bar */}
        {isRunning && !connecting && total > 0 && (
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-royal-600 transition-all duration-500" style={{ width: `${Math.max(percent, 6)}%` }} />
          </div>
        )}

        {/* Per-item list */}
        <ol className="space-y-0 max-h-[55vh] overflow-y-auto pr-1">
          {steps.map((item) => {
            const style = STATUS_STYLE[item.status] || STATUS_STYLE.pending
            const Icon = style.icon
            return (
              <li key={item.key} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${style.ring}`}>
                    {item.status === 'running' ? <Icon size={11} className="animate-spin" /> : <Icon size={11} strokeWidth={2.5} />}
                  </span>
                  <span className={`w-px flex-1 min-h-3 ${style.connector}`} />
                </div>
                <div className="pb-3 min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${style.label}`}>{item.label}</p>
                  {item.message && <p className={`text-xs mt-0.5 truncate ${style.msg}`}>{item.message}</p>}
                </div>
              </li>
            )
          })}
          {connecting && !steps.length && (
            <li className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Waiting for sync to start…</li>
          )}
          {!connecting && isRunning && total > 0 && done === total && (
            <li className="text-sm text-royal-600 dark:text-royal-400 py-2 text-center font-medium">Finishing up…</li>
          )}
        </ol>
      </div>
    </Modal>
  )
}