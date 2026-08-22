import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-royal-700 hover:bg-royal-800 text-white shadow-sm',
  secondary: 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10',
  outline: 'border border-royal-300 dark:border-royal-500/30 text-royal-700 dark:text-royal-300 hover:bg-royal-50 dark:hover:bg-royal-500/10 bg-white dark:bg-transparent',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost: 'text-royal-700 dark:text-royal-300 hover:bg-royal-50 dark:hover:bg-white/10',
  gold: 'bg-gold-500 hover:bg-gold-600 text-royal-950 shadow-sm',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
