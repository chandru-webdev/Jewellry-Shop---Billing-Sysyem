export default function ModulePlaceholder({ title = 'Coming Soon' }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 dark:text-gray-500 text-sm">{title}</p>
    </div>
  )
}
