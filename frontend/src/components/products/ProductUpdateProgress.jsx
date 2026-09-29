import { useEffect, useRef, useState } from 'react'
import { Check, X, Loader2, Circle } from 'lucide-react'
import { productsApi } from '../../api/products'

// Colour-coded step indicator that streams a product update's progress
// live (SSE). statuses: pending | running | done | failed | skipped
const STATUS_STYLE = {
  done: {
    icon: Check,
    ring: 'bg-emerald-500 text-white border-emerald-500',
    label: 'text-gray-800 dark:text-gray-100',
    msg: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    icon: X,
    ring: 'bg-red-500 text-white border-red-500',
    label: 'text-gray-800 dark:text-gray-100',
    msg: 'text-red-600 dark:text-red-400',
  },
  running: {
    icon: Loader2,
    ring: 'bg-royal-600 text-white border-royal-600',
    label: 'text-gray-800 dark:text-gray-100',
    msg: 'text-royal-600 dark:text-royal-400',
  },
  pending: {
    icon: Circle,
    ring: 'bg-white dark:bg-[#1a1025] text-gray-400 border-gray-300 dark:border-white/20',
    label: 'text-gray-400 dark:text-gray-500',
    msg: 'text-gray-400 dark:text-gray-500',
  },
  skipped: {
    icon: Minus,
    ring: 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/15',
    label: 'text-gray-400 dark:text-gray-500',
    msg: 'text-gray-400 dark:text-gray-500',
  },
}

function Minus({ size, className }) {
  return (
    <svg width={size || 14} height={size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M5 12h14" />
    </svg>
  )
}

export default function ProductUpdateProgress({ product, onComplete }) {
  const [steps, setSteps] = useState([])
  const [overall, setOverall] = useState('running')
  const [message, setMessage] = useState('')
  const [connecting, setConnecting] = useState(true)
  const reported = useRef(false)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const watchdog = setTimeout(() => controller.abort(), 10 * 60 * 1000)

    ;(async () => {
      try {
        await productsApi.streamSyncProgress(product.id, {
          onEvent: (p) => {
            if (cancelled) return
            setConnecting(false)
            if (p.status === 'none') {
              setOverall('success')
              setMessage('Saved locally')
              return
            }
            setOverall(p.status === 'failed' ? 'failed' : p.status === 'success' ? 'success' : 'running')
            setMessage(p.message || '')
            if (Array.isArray(p.steps) && p.steps.length) setSteps(p.steps)
          },
          signal: controller.signal,
        })
      } catch (err) {
        if (cancelled) return
        // Stream unavailable or timed out — fall back to a best-effort state.
        setConnecting(false)
        setOverall((cur) => (cur === 'running' ? 'success' : cur))
        if (!message) setMessage('Saved locally')
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(watchdog)
      controller.abort()
    }
  }, [product.id])

  // Once finished, let the user see the result briefly, then signal the parent.
  useEffect(() => {
    if ((overall === 'success' || overall === 'failed') && !reported.current) {
      reported.current = true
      const t = setTimeout(() => onComplete?.(overall, message), 1200)
      return () => clearTimeout(t)
    }
  }, [overall])

  const doneCount = steps.filter((s) => s.status === 'done').length
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0
  const isRunning = overall === 'running'

  return (
    <div className="space-y-5">
      {/* Header — overall state */}
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          overall === 'failed'
            ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
            : overall === 'success'
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
              : 'border-royal-200 bg-royal-50 dark:border-royal-500/30 dark:bg-royal-500/10'
        }`}
      >
        {isRunning ? (
          <Loader2 size={20} className="text-royal-600 dark:text-royal-400 animate-spin shrink-0" />
        ) : overall === 'failed' ? (
          <X size={20} className="text-red-500 shrink-0" />
        ) : (
          <Check size={20} className="text-emerald-500 shrink-0" />
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${overall === 'failed' ? 'text-red-700 dark:text-red-400' : overall === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-royal-800 dark:text-royal-200'}`}>
            {connecting
              ? `Opening live progress for ${product.name || product.sku || 'product'}…`
              : overall === 'failed'
                ? 'Update finished with errors'
                : overall === 'success'
                  ? 'Product updated successfully'
                  : `Updating ${product.name || product.sku || 'product'}…`}
          </p>
          {message && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{message}</p>}
        </div>
        {isRunning && !connecting && (
          <span className="ml-auto text-xs font-semibold text-royal-600 dark:text-royal-400 tabular-nums">{percent}%</span>
        )}
      </div>

      {/* Linear progress bar */}
      {isRunning && !connecting && (
        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-royal-600 transition-all duration-500"
            style={{ width: `${Math.max(percent, 8)}%` }}
          />
        </div>
      )}

      {/* Steps */}
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const style = STATUS_STYLE[step.status] || STATUS_STYLE.pending
          const Icon = style.icon
          const isLast = i === steps.length - 1
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${style.ring}`}>
                  {step.status === 'running' ? (
                    <Icon size={13} className="animate-spin" />
                  ) : (
                    <Icon size={13} strokeWidth={2.5} />
                  )}
                </span>
                {!isLast && <span className={`w-px flex-1 min-h-3 ${step.status === 'done' ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-white/10'}`} />}
              </div>
              <div className="pb-4 min-w-0">
                <p className={`text-sm font-medium ${style.label}`}>{step.label}</p>
                {step.message && <p className={`text-xs mt-0.5 truncate ${style.msg}`}>{step.message}</p>}
              </div>
            </li>
          )
        })}
        {!steps.length && (
          <li className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Waiting for progress…</li>
        )}
      </ol>
    </div>
  )
}