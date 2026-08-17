import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { navGroups } from '../../config/nav'
import { cn } from '../../utils/cn'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const location = useLocation()
  const { hasPermission } = useAuth()
  const isCollapsed = collapsed

  // Filter nav groups and items based on user permissions
  const filteredGroups = navGroups
    .map((group) => {
      // If group has a permission requirement, check it
      if (group.permission && !hasPermission(group.permission)) return null
      // Filter items within the group
      const filteredItems = group.items.filter((item) => !item.permission || hasPermission(item.permission))
      if (filteredItems.length === 0) return null
      return { ...group, items: filteredItems }
    })
    .filter(Boolean)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-royal-950/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 flex flex-col',
          'bg-gradient-to-b from-[#1a0a3e] via-[#12083a] to-[#0d0530]',
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[72px]' : 'w-64',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className={cn(
          'flex items-center h-16 border-b border-white/[0.08] shrink-0',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <img src="/opal-logo.png" alt="Opal Line" className="w-9 h-9 rounded-lg object-contain" />
              <div className="min-w-0">
                <p className="font-bold text-white text-sm leading-none tracking-wide">OPAL LINE</p>
                <p className="text-[9px] uppercase tracking-[0.2em] text-gold-400/80 mt-1 font-medium">
                  Jewellery Billing ERP
                </p>
              </div>
            </div>
          ) : (
            <img src="/opal-logo.png" alt="Opal Line" className="w-9 h-9 rounded-lg object-contain" />
          )}

          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex text-white/40 hover:text-white/70 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {isCollapsed && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex text-white/40 hover:text-white/70 p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer absolute -right-3 top-5 bg-[#1a0a3e] border border-white/10"
                aria-label="Expand sidebar"
              >
                <ChevronRight size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white lg:hidden p-1 cursor-pointer"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Silver Rate Widget */}
        {!isCollapsed && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gold-500/20 flex items-center justify-center">
                <span className="text-gold-400 text-xs font-bold">Ag</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Silver Rate (92.5)</p>
                <p className="text-sm font-bold text-gold-400">₹92.80 <span className="text-[10px] font-medium text-white/30">/ gm</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={cn(
          'flex-1 overflow-y-auto py-3 space-y-4',
          isCollapsed ? 'px-2' : 'px-3'
        )}>
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to) && !(item.to === '/' && location.pathname !== '/')

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg text-[13px] transition-all duration-150',
                          isCollapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2',
                          isActive
                            ? 'bg-royal-600/40 text-white font-medium shadow-sm shadow-royal-600/20'
                            : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                        )}
                      >
                        <item.icon size={17} className={cn(
                          'shrink-0',
                          isActive ? 'text-gold-400' : 'text-white/40'
                        )} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom user/logout area */}
        {!isCollapsed && (
          <div className="p-3 border-t border-white/[0.08]">
            <div className="flex items-center gap-2 px-2 py-1.5 text-white/30 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>v1.0.0 • 92.5 Sterling Silver</span>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
