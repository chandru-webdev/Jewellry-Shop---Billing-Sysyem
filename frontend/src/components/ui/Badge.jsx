import { cn } from '../../utils/cn'

const tones = {
  gold: 'bg-amber-50 text-amber-700 border border-amber-200',
  purple: 'bg-royal-50 text-royal-700 border border-royal-200',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  red: 'bg-red-50 text-red-700 border border-red-200',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200',
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  orange: 'bg-orange-50 text-orange-700 border border-orange-200',
}

export default function Badge({ tone = 'gray', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold leading-5',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
