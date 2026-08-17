import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, Settings, HelpCircle, LogOut, ChevronDown, Command, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const searchGroups = [
  { label: 'Products', items: ['Silver Ring', 'Silver Chain', 'Silver Bracelet', 'Silver Pendant', 'Silver Earrings'] },
  { label: 'Invoices', items: ['SI-2026-00047', 'SI-2026-00046', 'SI-2026-00045'] },
  { label: 'Orders', items: ['#10235', '#10234', '#10233'] },
  { label: 'Customers', items: ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel'] },
]

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const searchRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <header className="h-16 shrink-0 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 lg:px-6 gap-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-royal-700 hover:text-royal-900 p-1.5 rounded-lg hover:bg-royal-50 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3.5 py-2 w-80 transition-colors cursor-pointer group"
          >
            <Search size={15} className="text-gray-400 group-hover:text-gray-500" />
            <span className="text-sm text-gray-400 flex-1 text-left">Search products, invoices, orders...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded">
              <Command size={10} />K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Silver Rate Widget */}
          <div className="hidden lg:flex items-center gap-3 mr-3 px-3 py-1.5 rounded-lg bg-royal-50 border border-royal-100">
            <div className="text-center">
              <p className="text-[9px] text-royal-400 uppercase tracking-wider font-semibold">Silver Rate (92.5)</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-royal-900">₹92.80</span>
                <span className="text-[10px] text-royal-400">/gm</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">+2.80 (3.11%)</span>
              </div>
            </div>
          </div>

          <button className="p-2 text-gray-400 hover:text-royal-700 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer" title="Help">
            <HelpCircle size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-royal-700 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer" title="Settings">
            <Settings size={18} />
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-royal-700 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer" title="Notifications">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-600 to-royal-800 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {initials}
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-royal-950 leading-none">{user?.name || 'Admin'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{user?.role?.name || 'Super Admin'}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-50">
                <div className="px-3.5 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-royal-950">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-400">{user?.email || 'admin@opalline.in'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-royal-950/40 backdrop-blur-sm"
          onClick={() => { setSearchOpen(false); setSearchQuery('') }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, invoices, orders, customers..."
                className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded">
                ESC
              </kbd>
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery === '' ? (
                <div className="px-3 py-8 text-center text-sm text-gray-400">
                  Type to search across all modules...
                </div>
              ) : (
                searchGroups.map((group) => (
                  <div key={group.label}>
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
                    {group.items.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                      <button
                        key={item}
                        className="w-full text-left px-3 py-2 text-sm text-royal-950 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer"
                        onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
