import { Check, X, Loader2, Circle } from 'lucide-react'

// Compact, colour-coded list of per-product sync outcomes. Kept on screen
// after a bulk sync finishes so the result isn't lost when the modal closes.
const ROW_STYLE = {
  done: { icon: Check, wrap: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30', Icon: 'text-emerald-600', label: 'text-royal-950 dark:text-gray-100', msg: 'text-emerald-700 dark:text-emerald-400' },
  failed: { icon: X, wrap: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30', Icon: 'text-red-600', label: 'text-royal-950 dark:text-gray-100', msg: 'text-red-700 dark:text-red-400' },
  running: { icon: Loader2, wrap: 'bg-royal-50 border-royal-200 dark:bg-royal-500/10 dark:border-royal-500/30', Icon: 'text-royal-600', label: 'text-royal-950 dark:text-gray-100', msg: 'text-royal-700 dark:text-royal-400' },
  pending: { icon: Circle, wrap: 'bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10', Icon: 'text-gray-400', label: 'text-gray-500 dark:text-gray-400', msg: 'text-gray-400 dark:text-gray-500' },
}

export default function SyncOutcomeRows({ items = [], emptyText = 'No items.' }) {
  if (!items.length) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{emptyText}</p>
  }
  return (
    <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
      {items.map((item, i) => {
        const style = ROW_STYLE[item.status] || ROW_STYLE.pending
        const Icon = style.icon
        return (
          <div key={item.key ?? `${item.label}-${i}`} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${style.wrap}`}>
            <span className="mt-0.5 shrink-0">
              <Icon size={14} className={`${style.Icon} ${item.status === 'running' ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold truncate ${style.label}`}>
                {item.label}
                {item.sku && <span className="ml-1.5 font-mono font-normal text-[10px] text-gray-400 dark:text-gray-500">{item.sku}</span>}
              </p>
              {item.message && <p className={`text-[11px] mt-0.5 break-words ${style.msg}`}>{item.message}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
