import { cn } from '../../utils/cn'
import { TrendingUp, TrendingDown } from 'lucide-react'

const accents = {
  purple: 'bg-gradient-to-br from-royal-500 to-royal-700',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-500',
  red: 'bg-gradient-to-br from-red-500 to-red-600',
  gold: 'bg-gradient-to-br from-gold-400 to-gold-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
}

export default function StatCard({ icon: Icon, label, value, sub, trend, trendValue, accent = 'purple' }) {
  return (
    <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all p-4 flex items-start gap-3.5">
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        accents[accent]
      )}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-royal-950 dark:text-white mt-0.5 truncate">{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {trend === 'up' && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
              <TrendingUp size={12} /> {trendValue}
            </span>
          )}
          {trend === 'down' && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-500">
              <TrendingDown size={12} /> {trendValue}
            </span>
          )}
          {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
        </div>
      </div>
    </div>
  )
}
