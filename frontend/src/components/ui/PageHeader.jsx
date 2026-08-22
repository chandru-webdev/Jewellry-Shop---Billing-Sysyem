export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-2">
        <img
          src="/opal-logo.png"
          alt="Opal Line"
          className="h-6 w-auto"
        />
        <h1 className="text-xl font-bold text-royal-950 dark:text-white">{title}</h1>
      </div>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      {children}
    </div>
  )
}
