import { cn } from '../../utils/cn'

export default function Card({ className, title, action, icon: Icon, children, noPadding }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200/80 shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-royal-500" />}
            <h3 className="font-semibold text-sm text-royal-900">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
