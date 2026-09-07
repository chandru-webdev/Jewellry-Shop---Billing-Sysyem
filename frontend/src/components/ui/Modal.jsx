import { X } from 'lucide-react'

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

// Reusable popup window with a dark backdrop.
export default function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/60 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-[#1a1025] rounded-xl shadow-2xl w-full ${sizeClasses[size] || sizeClasses.md} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.08]">
          <h3 className="text-lg font-semibold text-royal-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
