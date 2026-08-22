import { cn } from '../../utils/cn'

const baseField =
  'w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500'

export function Label({ children, htmlFor, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-medium text-royal-900 dark:text-gray-300 mb-1', className)}>
      {children}
    </label>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn(baseField, className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(baseField, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(baseField, 'min-h-24', className)} {...props} />
}
