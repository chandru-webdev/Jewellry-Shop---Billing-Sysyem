import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu, Bell, Search, Settings, HelpCircle, LogOut, ChevronDown,
  Command, X, Loader2, Package, FileText, ShoppingCart, User,
  Check, Clock, ExternalLink, BookOpen, Keyboard, MessageCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { searchApi } from '../../api/search'
import { notificationsApi } from '../../api/notifications'
import { useSilverRate } from '../../hooks/useSilverRate'

function isDemoMode() {
  return localStorage.getItem('opal_token') === 'demo-token-opal-line'
}

const DEMO_SEARCH = {
  products: [
    { id: 1, name: 'Silver Chain', sku: 'SLV-CHN-00008', sellingPrice: 14210, category: { name: 'Chains' }, inventory: { quantity: 45 } },
    { id: 2, name: 'Silver Ring', sku: 'SLV-RNG-00021', sellingPrice: 8750, category: { name: 'Rings' }, inventory: { quantity: 4 } },
    { id: 3, name: 'Silver Bracelet', sku: 'SLV-BRC-00015', sellingPrice: 11250, category: { name: 'Bracelets' }, inventory: { quantity: 3 } },
    { id: 4, name: 'Silver Pendant', sku: 'SLV-PND-00012', sellingPrice: 9610, category: { name: 'Pendants' }, inventory: { quantity: 2 } },
    { id: 5, name: 'Silver Earrings', sku: 'SLV-ERN-00031', sellingPrice: 8520, category: { name: 'Earrings' }, inventory: { quantity: 6 } },
  ],
  invoices: [
    { id: 1, invoiceNumber: 'SI-2026-00047', customer: { name: 'Rajesh Kumar' }, grandTotal: 5230, status: 'PAID', date: '2026-08-10' },
    { id: 2, invoiceNumber: 'SI-2026-00046', customer: { name: 'Priya Sharma' }, grandTotal: 8750, status: 'PAID', date: '2026-08-10' },
    { id: 3, invoiceNumber: 'SI-2026-00045', customer: { name: 'Amit Patel' }, grandTotal: 3420, status: 'PENDING', date: '2026-08-09' },
  ],
  orders: [
    { id: 1, orderNumber: 'POS-20260810-001', customer: { name: 'Rajesh Kumar' }, totalAmount: 5230, status: 'PAID', source: 'POS', createdAt: '2026-08-10' },
    { id: 2, orderNumber: 'POS-20260810-002', customer: { name: 'Priya Sharma' }, totalAmount: 8750, status: 'PAID', source: 'POS', createdAt: '2026-08-10' },
    { id: 3, orderNumber: 'SHOPIFY-10235', customer: { name: 'Amit Patel' }, totalAmount: 3420, status: 'PENDING', source: 'SHOPIFY', createdAt: '2026-08-09' },
  ],
  customers: [
    { id: 1, name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@email.com', _count: { invoices: 5, orders: 3 } },
    { id: 2, name: 'Priya Sharma', phone: '9876543211', email: 'priya@email.com', _count: { invoices: 3, orders: 2 } },
    { id: 3, name: 'Amit Patel', phone: '9876543212', email: 'amit@email.com', _count: { invoices: 2, orders: 1 } },
  ],
}

const DEMO_NOTIFICATIONS = [
  { id: 1, type: 'RATE_CHANGED', title: 'Silver Rate Updated', message: 'Rate changed from ₹90.00/gm to ₹92.80/gm (+3.11%). 285 products updated.', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, type: 'ORDER_CREATED', title: 'New Order Created', message: 'Order POS-20260810-001 from Rajesh Kumar — ₹5,230', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, type: 'INVOICE_CREATED', title: 'New Invoice', message: 'Invoice SI-2026-00047 for Priya Sharma — ₹8,750', isRead: true, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 4, type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Silver Ring (SLV-RNG-00021) has only 4 units left — below threshold of 10', isRead: true, createdAt: new Date(Date.now() - 28800000).toISOString() },
]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function timeAgo(date) {
  const now = new Date()
  const d = new Date(date)
  const seconds = Math.floor((now - d) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const searchResultIcons = {
  products: Package,
  invoices: FileText,
  orders: ShoppingCart,
  customers: User,
}

const searchResultRoutes = {
  products: (item) => `/products`,
  invoices: (item) => `/invoices`,
  orders: (item) => `/orders`,
  customers: (item) => `/customers`,
}

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { currentRate, isLoading: rateLoading } = useSilverRate()

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const searchRef = useRef(null)
  const searchAbortRef = useRef(null)

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef(null)
  const notifPollRef = useRef(null)

  // Help state
  const [helpOpen, setHelpOpen] = useState(false)
  const helpRef = useRef(null)

  // User menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setNotifOpen(false)
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close help popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch unread count periodically
  useEffect(() => {
    const fetchCount = async () => {
      try {
        if (isDemoMode()) {
          setUnreadCount(2)
          return
        }
        const res = await notificationsApi.getUnreadCount()
        setUnreadCount(res.data.data.count)
      } catch {
        // Silent fail — will retry
      }
    }

    fetchCount()
    notifPollRef.current = setInterval(fetchCount, 30000) // Poll every 30s
    return () => clearInterval(notifPollRef.current)
  }, [])

  // Global search effect
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 1) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    // Demo mode: client-side filter of sample data
    if (isDemoMode()) {
      setSearchLoading(true)
      setSearchError(null)
      const q = debouncedSearch.trim().toLowerCase()
      const demoResults = {
        products: DEMO_SEARCH.products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
        invoices: DEMO_SEARCH.invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(q) || (i.customer?.name || '').toLowerCase().includes(q)),
        orders: DEMO_SEARCH.orders.filter((o) => o.orderNumber.toLowerCase().includes(q) || (o.customer?.name || '').toLowerCase().includes(q)),
        customers: DEMO_SEARCH.customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)),
      }
      setTimeout(() => {
        setSearchResults(demoResults)
        setSearchLoading(false)
      }, 200)
      return
    }

    // Cancel previous request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const controller = new AbortController()
    searchAbortRef.current = controller

    setSearchLoading(true)
    setSearchError(null)

    searchApi
      .search(debouncedSearch.trim(), controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setSearchResults(res.data.data)
          setSearchLoading(false)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && !err?.code?.includes('ERR_CANCELED')) {
          setSearchError('Search failed. Please try again.')
          setSearchLoading(false)
        }
      })

    return () => controller.abort()
  }, [debouncedSearch])

  // Notification panel: fetch all notifications when opened
  useEffect(() => {
    if (notifOpen) {
      setNotifLoading(true)
      if (isDemoMode()) {
        setTimeout(() => {
          setNotifications(DEMO_NOTIFICATIONS)
          setUnreadCount(DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length)
          setNotifLoading(false)
        }, 200)
        return
      }
      notificationsApi
        .list({ limit: 20 })
        .then((res) => {
          setNotifications(res.data.data.notifications)
          setUnreadCount(res.data.data.unreadCount)
        })
        .catch(() => {})
        .finally(() => setNotifLoading(false))
    }
  }, [notifOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearchResultClick = (category, item) => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults(null)
    navigate(searchResultRoutes[category](item))
  }

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    if (isDemoMode()) return
    try {
      await notificationsApi.markAsRead(id)
    } catch {
      // silent
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    if (isDemoMode()) return
    try {
      await notificationsApi.markAllAsRead()
    } catch {
      // silent
    }
  }

  const handleNotificationClick = (notif) => {
    setNotifOpen(false)
    // Mark as read if unread
    if (!notif.isRead) {
      handleMarkAsRead(notif.id)
    }
    // Navigate based on notification type
    if (notif.type === 'SILVER_RATE_REQUEST' || notif.type === 'RATE_CHANGED') {
      navigate('/metal-rates?tab=requests')
    } else if (notif.type === 'ORDER_CREATED') {
      navigate('/orders')
    } else if (notif.type === 'INVOICE_CREATED') {
      navigate('/invoices')
    } else if (notif.type === 'LOW_STOCK') {
      navigate('/inventory')
    }
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const hasResults = searchResults && Object.values(searchResults).some((arr) => arr.length > 0)
  const noResults = searchResults && !hasResults

  return (
    <>
      <header className="h-16 shrink-0 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 lg:px-6 gap-3 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-royal-700 hover:text-royal-900 p-1.5 rounded-lg hover:bg-royal-50 transition-colors cursor-pointer shrink-0"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Search trigger — wider, responsive */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3.5 py-2 w-[280px] lg:w-[360px] xl:w-[400px] transition-colors cursor-pointer group shrink-0"
          >
            <Search size={15} className="text-gray-400 group-hover:text-gray-500 shrink-0" />
            <span className="text-sm text-gray-400 flex-1 text-left truncate">Search products, invoices, orders...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded shrink-0">
              <Command size={10} />K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Silver Rate Widget */}
          <div className="hidden lg:flex items-center gap-3 mr-3 px-3 py-1.5 rounded-lg bg-royal-50 border border-royal-100">
            <div className="text-center">
              <p className="text-[9px] text-royal-400 uppercase tracking-wider font-semibold">Silver Rate (92.5)</p>
              {rateLoading ? (
                <div className="h-5 flex items-center justify-center"><span className="text-sm font-bold text-royal-900 animate-pulse">₹...</span></div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-royal-900">₹{currentRate.toFixed(2)}</span>
                  <span className="text-[10px] text-royal-400">/gm</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative" ref={helpRef}>
            <button
              onClick={() => setHelpOpen(!helpOpen)}
              className="p-2 text-gray-400 hover:text-royal-700 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer"
              title="Help"
            >
              <HelpCircle size={18} />
            </button>

            {/* Help Popover */}
            {helpOpen && (
              <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-royal-50/50">
                  <h3 className="text-sm font-semibold text-royal-950 flex items-center gap-2">
                    <HelpCircle size={14} className="text-royal-500" />
                    Opal Line ERP — Help
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Quick reference for your ERP system</p>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {/* Keyboard Shortcuts */}
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                      <Keyboard size={10} />
                      Keyboard Shortcuts
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { keys: 'Ctrl + K', action: 'Open global search' },
                        { keys: 'Escape', action: 'Close any modal/dropdown' },
                      ].map((s) => (
                        <div key={s.keys} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{s.action}</span>
                          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded">{s.keys}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Module Guide */}
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                      <BookOpen size={10} />
                      Module Guide
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { module: 'Billing (POS)', desc: 'Create sales invoices with live silver rate' },
                        { module: 'Orders', desc: 'View POS and Shopify orders, change status' },
                        { module: 'Products', desc: 'Manage catalogue, SKUs, pricing' },
                        { module: 'Inventory', desc: 'Stock levels, stock-in/out, low stock alerts' },
                        { module: 'Customers', desc: 'Customer database, contact info, GSTIN' },
                        { module: 'Metal Rates', desc: 'Update silver rate — auto-recalculates all prices' },
                        { module: 'Shopify', desc: 'Sync products, inventory, orders, prices' },
                        { module: 'Reports', desc: 'Sales, inventory, GST, and analytics reports' },
                      ].map((m) => (
                        <div key={m.module} className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-royal-700 min-w-0">{m.module}</span>
                          <span className="text-[11px] text-gray-400">— {m.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact / Support */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                      <MessageCircle size={10} />
                      Support
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      For issues or feature requests, contact your system administrator or reach out via your company's internal support channel.
                    </p>
                    <a
                      href="https://github.com/anomalyco/opencode/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-royal-600 hover:text-royal-800"
                    >
                      Report a bug <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-400 hover:text-royal-700 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-gray-400 hover:text-royal-700 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[9px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white rounded-xl border border-gray-200 shadow-2xl z-50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-royal-950">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-medium text-royal-600 hover:text-royal-800 cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="overflow-y-auto flex-1">
                  {notifLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      <Loader2 size={20} className="animate-spin mr-2" />
                      <span className="text-sm">Loading notifications...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Bell size={32} className="mb-2 opacity-30" />
                      <p className="text-sm font-medium">No notifications yet</p>
                      <p className="text-xs mt-1">You'll see alerts for orders, invoices, and stock here.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors cursor-pointer ${
                          notif.isRead ? 'bg-white hover:bg-gray-50/50' : 'bg-royal-50/30 hover:bg-royal-50/50'
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          notif.type === 'LOW_STOCK' ? 'bg-amber-50 text-amber-500' :
                          notif.type === 'RATE_CHANGED' ? 'bg-purple-50 text-purple-500' :
                          notif.type === 'ORDER_CREATED' ? 'bg-blue-50 text-blue-500' :
                          notif.type === 'INVOICE_CREATED' ? 'bg-indigo-50 text-indigo-500' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {notif.type === 'LOW_STOCK' && <Package size={14} />}
                          {notif.type === 'RATE_CHANGED' && <span className="text-xs font-bold">₹</span>}
                          {notif.type === 'ORDER_CREATED' && <ShoppingCart size={14} />}
                          {notif.type === 'INVOICE_CREATED' && <FileText size={14} />}
                          {!['LOW_STOCK', 'RATE_CHANGED', 'ORDER_CREATED', 'INVOICE_CREATED'].includes(notif.type) && (
                            <Bell size={14} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-medium leading-snug ${notif.isRead ? 'text-gray-700' : 'text-royal-950'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="shrink-0 p-0.5 text-royal-400 hover:text-royal-700 cursor-pointer"
                                title="Mark as read"
                              >
                                <Check size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
                <p className="text-[11px] text-gray-400 mt-0.5">{user?.role?.name?.replace(/_/g, ' ') || 'Super Admin'}</p>
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
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] md:pt-[15vh] bg-royal-950/40 backdrop-blur-sm"
          onClick={() => { setSearchOpen(false); setSearchQuery('') }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-xl overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              {searchLoading ? (
                <Loader2 size={18} className="text-gray-400 shrink-0 animate-spin" />
              ) : (
                <Search size={18} className="text-gray-400 shrink-0" />
              )}
              <input
                ref={searchRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, invoices, orders, customers..."
                className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults(null) }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
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
                  Type to search across products, invoices, orders, and customers...
                </div>
              ) : searchLoading ? (
                <div className="px-3 py-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </div>
              ) : searchError ? (
                <div className="px-3 py-8 text-center text-sm text-red-400">
                  {searchError}
                </div>
              ) : noResults ? (
                <div className="px-3 py-8 text-center text-sm text-gray-400">
                  <Search size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No results found for "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                Object.entries(searchResults).map(([category, items]) => {
                  if (items.length === 0) return null
                  const Icon = searchResultIcons[category] || Package
                  const label = category.charAt(0).toUpperCase() + category.slice(1)
                  return (
                    <div key={category}>
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-royal-50 rounded-lg transition-colors cursor-pointer flex items-center gap-3"
                          onClick={() => handleSearchResultClick(category, item)}
                        >
                          <Icon size={14} className="text-gray-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-royal-950 font-medium truncate">
                              {item.name || item.invoiceNumber || item.orderNumber}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {category === 'products' && `SKU: ${item.sku} — ₹${Number(item.sellingPrice).toLocaleString('en-IN')}`}
                              {category === 'invoices' && `${item.customer?.name || 'Walk-in'} — ₹${Number(item.grandTotal).toLocaleString('en-IN')} — ${item.status}`}
                              {category === 'orders' && `${item.customer?.name || 'Walk-in'} — ₹${Number(item.totalAmount).toLocaleString('en-IN')} — ${item.status}`}
                              {category === 'customers' && `${item.phone}${item.email ? ` — ${item.email}` : ''}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-300 shrink-0 capitalize">{category}</span>
                        </button>
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
