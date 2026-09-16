import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Download, Eye, Calendar, Edit,
  Plus, X, Users, Receipt, Package, ShoppingCart,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import { customersApi } from '../api/customers'
import { ordersApi } from '../api/orders'
import { formatINR, formatDate } from '../utils/format'
import { downloadInvoicePDF } from '../utils/pdfInvoice'
import { inRange } from '../utils/exportExcel'
import {
  exportSalesInvoicesExcel,
  exportSalesOrdersExcel,
  exportCustomersExcel,
  exportReturnsExcel,
} from '../utils/exportSalesExcel'
import SaleEditForm from '../components/SaleEditForm'
import CustomerDetailDrawer from '../components/CustomerDetailDrawer'
import InvoiceDetail from '../components/InvoiceDetail'
import { useAuth } from '../context/AuthContext'
import ExportControls from '../components/ui/ExportControls'

const statusTone = {
  PAID: 'green',
  FINAL: 'blue',
  DRAFT: 'gray',
  VOID: 'red',
}

const statusLabel = {
  PAID: 'Billed',
  FINAL: 'Billed',
  DRAFT: 'Draft',
  VOID: 'Returned',
}

const paymentTone = {
  CASH: 'gray',
  UPI: 'blue',
  CARD: 'purple',
  BANK_TRANSFER: 'indigo',
  ONLINE: 'emerald',
  OTHER: 'gray',
}

const orderStatusTone = {
  PENDING: 'orange',
  PAID: 'green',
  FULFILLED: 'blue',
  CANCELLED: 'red',
  REFUNDED: 'purple',
  RETURNED: 'red',
}

const orderStatusLabel = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  RETURNED: 'Returned',
}
export default function Sales() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('invoices')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState(null)
  const [invoiceEditOpen, setInvoiceEditOpen] = useState(false)
  const [pendingEditInvoice, setPendingEditInvoice] = useState(null)
  const [editConfirmOpen, setEditConfirmOpen] = useState(false)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  const { data: invoices, isLoading, error: invoicesError } = useQuery({
    queryKey: ['invoices', search, filterStatus, filterPayment, dateFrom, dateTo],
    queryFn: () =>
      invoicesApi.list({ search, status: filterStatus, paymentMethod: filterPayment, dateFrom, dateTo }).then(
        (r) => r.data.data
      ),
  })

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['orders', search],
    queryFn: () => ordersApi.list({ search }).then((r) => r.data.data),
    enabled: activeTab === 'orders',
  })

  const { data: customers, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search }).then((r) => r.data.data),
    enabled: activeTab === 'customers',
  })

  const { data: returns, error: returnsError } = useQuery({
    queryKey: ['returns', search],
    queryFn: () => ordersApi.list({ status: 'CANCELLED' }).then((r) => r.data.data),
    enabled: activeTab === 'returns',
  })

  const displayInvoices = invoices || []
  const displayOrders = orders || []
  const filteredOrders = orderStatusFilter === 'all' ? displayOrders : displayOrders.filter((o) => o.status === orderStatusFilter)
  const displayCustomers = customers || []
  const displayReturns = returns || []

  const fetchInvoice = async (id) => {
    const r = await invoicesApi.get(id)
    setSelectedInvoice(r.data.data)
    setDetailOpen(true)
  }

  const openCustomerDetail = (c) => {
    setSelectedCustomerId(c.id)
    setCustomerDetailOpen(true)
  }

  const closeCustomerDetail = () => {
    setCustomerDetailOpen(false)
    setSelectedCustomerId(null)
  }

  const downloadPdf = (inv) => {
    downloadInvoicePDF(inv)
  }

  const handleInvoiceEdit = async (inv) => {
    const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
    if (!canEdit) return alert('You do not have permission to edit invoices.')

    // Load the full invoice (with line items) so the form can be pre-filled
    try {
      const r = await invoicesApi.get(inv.id)
      const full = r.data.data
      if (full.status === 'DRAFT') {
        setSelectedInvoiceForEdit(full)
        setInvoiceEditOpen(true)
      } else {
        // Finalized invoices: ask for confirmation inside the app (no browser dialog)
        setPendingEditInvoice(full)
        setEditConfirmOpen(true)
      }
    } catch {
      alert('Could not load invoice details. Please try again.')
    }
  }

  const filteredInvoices = displayInvoices

  const handleExport = async ({ from, to }) => {
    if (activeTab === 'invoices') {
      const r = await invoicesApi.list({ limit: 100000 })
      const all = (r.data.data || []).filter((inv) => inRange(inv.date || inv.createdAt, from, to))
      const itemRows = []
      const chunk = 8
      for (let i = 0; i < all.length; i += chunk) {
        const slice = all.slice(i, i + chunk)
        const details = await Promise.all(
          slice.map((inv) => invoicesApi.get(inv.id).then((x) => x.data.data).catch(() => null))
        )
        for (let j = 0; j < slice.length; j++) {
          const full = details[j]
          if (!full?.items) continue
          for (const it of full.items) {
            itemRows.push({
              invoiceNumber: full.invoiceNumber,
              date: full.date || full.createdAt,
              name: it.name,
              sku: it.sku,
              product: it.product,
              quantity: it.quantity,
              weight: it.weight,
              makingCharge: it.makingCharge,
              silverRate: it.silverRate,
              baseAmount: it.baseAmount,
              gstAmount: it.gstAmount,
              finalAmount: it.finalAmount,
            })
          }
        }
      }
      exportSalesInvoicesExcel(all, itemRows)
    } else if (activeTab === 'orders') {
      const r = await ordersApi.list({ limit: 100000 })
      const all = (r.data.data || []).filter((o) => inRange(o.createdAt, from, to))
      exportSalesOrdersExcel(all)
    } else if (activeTab === 'customers') {
      const r = await customersApi.list({ limit: 100000 })
      const all = (r.data.data || []).filter((c) => inRange(c.createdAt, from, to))
      exportCustomersExcel(all)
    } else if (activeTab === 'returns') {
      const r = await ordersApi.list({ status: 'CANCELLED', limit: 100000 })
      const all = (r.data.data || []).filter((o) => inRange(o.createdAt, from, to))
      exportReturnsExcel(all)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('')
    setFilterPayment('')
    setDateFrom('')
    setDateTo('')
  }

  const TABS = [
    { value: 'invoices', label: 'Sales Invoices', icon: Receipt },
    { value: 'orders', label: 'Sales Orders', icon: ShoppingCart },
    { value: 'customers', label: 'Customers', icon: Users },
    { value: 'returns', label: 'Returns', icon: Package },
  ]

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Manage sales invoices, orders, customers, and returns"
        actions={
          <div className="flex gap-2">
            {(search || filterStatus || filterPayment || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={12} /> Clear
              </Button>
            )}
            <ExportControls onExport={handleExport} />
            <Button size="sm" onClick={() => (window.location.href = '/billing')}>
              <Plus size={14} /> New Sale
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-white/[0.08] mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value)
              setSearch('')
              setFilterStatus('')
              setFilterPayment('')
              setOrderStatusFilter('all')
              setDateFrom('')
              setDateTo('')
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.value
                ? 'border-royal-700 text-royal-700 dark:text-gray-300'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters - visible for all tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={
              activeTab === 'invoices'
                ? 'Search by invoice # or customer...'
                : activeTab === 'orders'
                ? 'Search orders...'
                : activeTab === 'customers'
                ? 'Search by name or phone...'
                : 'Search returns...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>

        {activeTab === 'invoices' && (
          <>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              <option value="">All Statuses</option>
              <option value="PAID">Billed</option>
              <option value="FINAL">Final</option>
              <option value="DRAFT">Draft</option>
              <option value="VOID">Returned</option>
            </select>

            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              <option value="">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
            </select>

            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
              <span className="text-gray-400 dark:text-gray-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Tab Content */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* === SALES INVOICES TAB === */}
            {activeTab === 'invoices' && (
              <>
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Invoice</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Items</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Payment</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Sale Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        Loading sales records...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No sales found. Click "New Sale" to create one.
                      </td>
                    </tr>
                  )}
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-royal-950 dark:text-white">
                          {inv.customer?.name || 'Walk-in Customer'}
                        </span>
                        {inv.customer?.phone && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{inv.customer.phone}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{inv._count?.items || 0}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{inv.totalQuantity || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(inv.grandTotal)}</td>
                      <td className="px-4 py-3 text-center">
                        {inv.paymentMethod ? (
                          <Badge tone={paymentTone[inv.paymentMethod]}>{inv.paymentMethod}</Badge>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">â€”</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={statusTone[inv.status]}>{statusLabel[inv.status] || inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
<div className="flex justify-end gap-1">
                      <button
                        onClick={() => fetchInvoice(inv.id)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleInvoiceEdit(inv)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => downloadPdf(inv)}
                        className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* === SALES ORDERS TAB === */}
            {activeTab === 'orders' && (
              <>
                <div className="px-4 pt-4 pb-2">
                  <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1 w-fit">
                    {[
                      { key: 'all', label: 'All', count: displayOrders.length },
                      { key: 'FULFILLED', label: 'Fulfilled', count: displayOrders.filter((o) => o.status === 'FULFILLED').length },
                      { key: 'PAID', label: 'Paid', count: displayOrders.filter((o) => o.status === 'PAID').length },
                      { key: 'PENDING', label: 'Pending', count: displayOrders.filter((o) => o.status === 'PENDING').length },
                      { key: 'CANCELLED', label: 'Cancelled', count: displayOrders.filter((o) => o.status === 'CANCELLED').length },
                    ].map((f) => (
                      <button key={f.key} onClick={() => setOrderStatusFilter(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${orderStatusFilter === f.key ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}>
                        {f.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${orderStatusFilter === f.key ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-200 text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>{f.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Order #</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Items</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordersLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        Loading orders...
                      </td>
                    </tr>
                  )}
                  {!ordersLoading && filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        {orderStatusFilter === 'all' ? 'No orders found.' : `No ${orderStatusFilter.toLowerCase()} orders found.`}
                      </td>
                    </tr>
                  )}
                  {!ordersLoading &&
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{o.orderNumber || `#${o.id}`}</td>
                        <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{o.customer?.name || 'â€”'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{o._count?.items || 0}</td>
                        <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status] || o.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => fetchInvoice(o.id)}
                              className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </>
            )}

            {/* === CUSTOMERS TAB (no Total Spent, no Last Order) === */}
            {activeTab === 'customers' && (
              <>
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Contact</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Orders</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customersLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        Loading customers...
                      </td>
                    </tr>
                  )}
                  {!customersLoading && displayCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No customers found.
                      </td>
                    </tr>
                  )}
                  {!customersLoading &&
                    displayCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 text-white flex items-center justify-center text-[10px] font-bold">
                              {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                            <span className="font-medium text-royal-950 dark:text-white">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{c.phone}</td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{c._count?.invoices || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openCustomerDetail(c)}
                              className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </>
            )}

            {/* === RETURNS TAB === */}
            {activeTab === 'returns' && (
              <>
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Order #</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No returns found.
                      </td>
                    </tr>
                  ) : (
                    displayReturns.map((o) => (
                      <tr key={o.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{o.orderNumber || `#${o.id}`}</td>
                        <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{o.customer?.name || 'â€”'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status] || o.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => { setSelectedOrder(o); setOrderDetailOpen(true) }}
                              className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </Card>

      {/* Full Details Modal */}
      <Modal
        open={detailOpen}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
        onClose={() => setDetailOpen(false)}
        footer={
          selectedInvoice && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
              <Button size="sm" onClick={() => downloadPdf(selectedInvoice)}>
                <Download size={14} /> Download PDF
              </Button>
            </>
          )
        }
      >
        {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
      </Modal>

      {/* Confirm editing a finalized invoice */}
      <Modal
        open={editConfirmOpen}
        title={`Edit ${pendingEditInvoice?.invoiceNumber || 'invoice'}?`}
        onClose={() => setEditConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditConfirmOpen(false)
                setSelectedInvoiceForEdit(pendingEditInvoice)
                setInvoiceEditOpen(true)
              }}
            >
              Proceed
            </Button>
          </>
        }
      >
        <div className="text-sm space-y-3">
          <p>
            This invoice is already{' '}
            <span className="font-semibold text-royal-950 dark:text-white">
              "{statusLabel[pendingEditInvoice?.status] || pendingEditInvoice?.status}"
            </span>
            .
          </p>
          <p>Changing line items, quantities, or amounts on a finalized invoice may affect:</p>
          <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
            <li>Accounting records and tax reports</li>
            <li>Stock/inventory levels</li>
            <li>Payment reconciliation and customer balances</li>
            <li>GST/GSTR-1/GSTR-3B summaries</li>
          </ul>
          <p className="font-medium text-royal-950 dark:text-white">Are you sure you want to proceed?</p>
        </div>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        open={invoiceEditOpen}
        title={`Edit Invoice ${selectedInvoiceForEdit?.invoiceNumber || ''}`}
        onClose={() => setInvoiceEditOpen(false)}
        size="xl"
      >
        {selectedInvoiceForEdit && (
          <SaleEditForm
            invoice={selectedInvoiceForEdit}
            onCancel={() => setInvoiceEditOpen(false)}
            onSaved={() => {
              setInvoiceEditOpen(false)
              setSelectedInvoiceForEdit(null)
            }}
          />
        )}
      </Modal>

      <Modal open={orderDetailOpen} title={`Order â€” ${selectedOrder?.orderNumber || ''}`} onClose={() => setOrderDetailOpen(false)} footer={
        <Button variant="ghost" onClick={() => setOrderDetailOpen(false)}>Close</Button>
      }>
        {selectedOrder && (
          <div className="text-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500 dark:text-gray-400">Order #:</span> <span className="font-semibold text-royal-950 dark:text-white">{selectedOrder.orderNumber}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Status:</span> <Badge tone={orderStatusTone[selectedOrder.status]}>{orderStatusLabel[selectedOrder.status]}</Badge></div>
              <div><span className="text-gray-500 dark:text-gray-400">Customer:</span> <span className="font-medium text-royal-950 dark:text-white">{selectedOrder.customer?.name || 'Walk-in'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Amount:</span> <span className="font-bold text-royal-800 dark:text-gray-200">{formatINR(selectedOrder.totalAmount)}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Items:</span> <span className="text-royal-950 dark:text-white">{selectedOrder._count?.items || 0}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Date:</span> <span className="text-royal-950 dark:text-white">{formatDate(selectedOrder.createdAt || selectedOrder.date)}</span></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Details Right Drawer â€” full height, 30% width slide-in from right */}
      <CustomerDetailDrawer
        open={customerDetailOpen}
        customerId={selectedCustomerId}
        onClose={closeCustomerDetail}
        onInvoiceView={(invId) => { closeCustomerDetail(); fetchInvoice(invId) }}
      />
    </div>
  )
}
