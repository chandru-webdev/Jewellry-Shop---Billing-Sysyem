import { X } from 'lucide-react'

const sizeClasses = {
  sm: 'w-full sm:w-[40%] sm:max-w-md',
  md: 'w-full sm:w-[35%] sm:max-w-lg',
  lg: 'w-full sm:w-[50%] sm:max-w-3xl',
  xl: 'w-full sm:w-[65%] sm:max-w-5xl',
  '2xl': 'w-full sm:w-[78%] sm:max-w-6xl',
}

// Reusable right-side drawer (full height) with a dark backdrop.
// Width scales with the `size` prop so large forms (lg/xl) stay usable.
export default function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-royal-950/40"
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full ${sizeClasses[size] || sizeClasses.md} bg-white dark:bg-[#1a1025] shadow-2xl border-l border-gray-200 dark:border-white/[0.08] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.08] shrink-0">
          <h3 className="text-lg font-semibold text-royal-950 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer p-1 rounded-lg"
            aria-label="Close"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </>
  )
}