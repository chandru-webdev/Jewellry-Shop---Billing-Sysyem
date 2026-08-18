import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Download, Eye, Calendar,
  Plus, X, CreditCard, Users, Receipt, Package, ShoppingCart,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import { customersApi } from '../api/customers'
import { ordersApi } from '../api/orders'
import { formatINR, formatDate, formatWeight } from '../utils/format'
import { downloadInvoicePDF } from '../utils/pdfInvoice'
import { useAuth } from '../context/AuthContext'

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

function isDemoMode() {
  return localStorage.getItem('opal_token') === 'demo-token-opal-line'
}

const DEMO_INVOICES = [
  {
    id: 1,
    invoiceNumber: 'INV-0001',
    date: '2025-07-01T10:00:00Z',
    status: 'PAID',
    paymentMethod: 'CASH',
    grandTotal: 4825.00,
    totalQuantity: 3,
    customer: { id: 10, name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@example.com', address: '123 Main Rd, Mumbai' },
    salesperson: { id: 1, name: 'Admin' },
    _count: { items: 2 },
    items: [],
    payments: [],
  },
  {
    id: 2,
    invoiceNumber: 'INV-0002',
    date: '2025-07-03T14:30:00Z',
    status: 'PAID',
    paymentMethod: 'UPI',
    grandTotal: 12350.00,
    totalQuantity: 5,
    customer: { id: 20, name: 'Priya Sharma', phone: '+91 91234 56789', email: 'priya@example.com', address: '45 Park St, Delhi' },
    salesperson: { id: 2, name: 'Manager' },
    _count: { items: 3 },
    items: [],
    payments: [],
  },
  {
    id: 3,
    invoiceNumber: 'INV-0003',
    date: '2025-07-05T09:15:00Z',
    status: 'PAID',
    paymentMethod: 'CARD',
    grandTotal: 8750.00,
    totalQuantity: 2,
    customer: { name: 'Walk-in Customer', phone: '' },
    salesperson: { id: 1, name: 'Admin' },
    _count: { items: 1 },
    items: [],
    payments: [],
  },
  {
    id: 4,
    invoiceNumber: 'INV-0004',
    date: '2025-07-08T16:45:00Z',
    status: 'FINAL',
    paymentMethod: 'BANK_TRANSFER',
    grandTotal: 15600.00,
    totalQuantity: 8,
    customer: { id: 30, name: 'Amit Patel', phone: '+91 99887 76655', email: 'amit@example.com', address: '78 Lake View, Bangalore' },
    salesperson: { id: 3, name: 'Staff' },
    _count: { items: 4 },
    items: [],
    payments: [],
  },
  {
    id: 5,
    invoiceNumber: 'INV-0005',
    date: '2025-07-10T11:20:00Z',
    status: 'DRAFT',
    paymentMethod: 'CASH',
    grandTotal: 3200.00,
    totalQuantity: 1,
    customer: { id: 10, name: 'Rajesh Kumar', phone: '+91 98765 43210' },
    salesperson: { id: 1, name: 'Admin' },
    _count: { items: 1 },
    items: [],
    payments: [],
  },
]

const DEMO_ORDERS = [
  {
    id: 1,
    orderNumber: 'ORD-1001',
    date: '2025-07-02T12:00:00Z',
    status: 'FULFILLED',
    totalAmount: 22500.00,
    customer: { id: 20, name: 'Priya Sharma', phone: '+91 91234 56789' },
    salesperson: { id: 1, name: 'Admin' },
    createdAt: '2025-07-02T12:00:00Z',
    _count: { items: 4 },
  },
  {
    id: 2,
    orderNumber: 'ORD-1002',
    date: '2025-07-04T15:30:00Z',
    status: 'PAID',
    totalAmount: 8900.00,
    customer: { id: 30, name: 'Amit Patel', phone: '+91 99887 76655' },
    salesperson: { id: 2, name: 'Manager' },
    createdAt: '2025-07-04T15:30:00Z',
    _count: { items: 2 },
  },
  {
    id: 3,
    orderNumber: 'ORD-1003',
    date: '2025-07-06T10:00:00Z',
    status: 'PENDING',
    totalAmount: 32000.00,
    customer: { name: 'Walk-in Customer' },
    salesperson: { id: 1, name: 'Admin' },
    createdAt: '2025-07-06T10:00:00Z',
    _count: { items: 6 },
  },
]

const DEMO_CUSTOMERS = [
  {
    id: 10,
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh@example.com',
    address: '123 Main Rd, Mumbai',
    _count: { orders: 2, invoices: 2 },
  },
  {
    id: 20,
    name: 'Priya Sharma',
    phone: '+91 91234 56789',
    email: 'priya@example.com',
    address: '45 Park St, Delhi',
    _count: { orders: 1, invoices: 1 },
  },
  {
    id: 30,
    name: 'Amit Patel',
    phone: '+91 99887 76655',
    email: 'amit@example.com',
    address: '78 Lake View, Bangalore',
    _count: { orders: 1, invoices: 1 },
  },
  {
    id: 40,
    name: 'Sneha Reddy',
    phone: '+91 90123 45678',
    email: 'sneha@example.com',
    address: '33 Sunset Blvd, Chennai',
    _count: { orders: 0, invoices: 0 },
  },
]

function InvoiceDetail({ invoice }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => invoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const { data: customerResults } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => customersApi.list({ search: customerSearch }).then((r) => r.data.data),
    enabled: !!customerSearch && customerSearch.length >= 2,
  })

  const assignCustomer = () => {
    if (!selectedCustomer) return
    updateMutation.mutate({
      id: invoice.id,
      data: { customerId: selectedCustomer.id },
    })
    setShowAddCustomer(false)
    setSelectedCustomer(null)
    setCustomerSearch('')
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
  }

  return (
    <div className="space-y-5">
      {/* Invoice header */}
      <div className="flex justify-between items-start pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-xl font-bold text-royal-950">OPAL LINE</h3>
          <p className="text-xs text-gray-400">Silver Jewellery · GST invoicing</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-royal-800 font-mono">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
          <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
        </div>
      </div>

      {/* Customer & Payment info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">
            Billed To
          </p>
          {invoice.customer ? (
            <>
              <p className="font-semibold text-royal-950">{invoice.customer.name}</p>
              <p className="text-xs text-gray-600">{invoice.customer.phone}</p>
              {invoice.customer.email && <p className="text-xs text-gray-600">{invoice.customer.email}</p>}
              {invoice.customer.address && <p className="text-xs text-gray-600">{invoice.customer.address}</p>}
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-400">Walk-in Customer</p>
              {canEdit && !showAddCustomer && (
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="mt-1 text-xs font-medium text-royal-600 hover:text-royal-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Customer
                </button>
              )}
            </>
          )}
        </div>
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">
            Payment
          </p>
          <p className="font-semibold text-royal-950">
            {invoice.paymentMethod ? (
              <span className="flex items-center gap-2">
                <Badge tone={paymentTone[invoice.paymentMethod]}>{invoice.paymentMethod}</Badge>
                Paid via {invoice.paymentMethod}
              </span>
            ) : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {invoice.salesperson?.name && `Salesperson: ${invoice.salesperson.name}`}
          </p>
        </div>
      </div>

      {/* Add Customer inline form */}
      {showAddCustomer && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search customers (name, phone)..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-royal-500"
            />
            <button
              onClick={() => { setShowAddCustomer(false); setCustomerSearch(''); setSelectedCustomer(null) }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
          {customerSearch.length >= 2 && (
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {(customerResults || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                    selectedCustomer?.id === c.id
                      ? 'bg-royal-100 text-royal-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.phone}</div>
                </button>
              ))}
              {customerSearch.length >= 2 && customerResults?.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400">No customers found</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowAddCustomer(false); setCustomerSearch(''); setSelectedCustomer(null) }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={assignCustomer}
              disabled={!selectedCustomer || updateMutation.isPending}
              loading={updateMutation.isPending}
            >
              Assign Customer
            </Button>
          </div>
        </div>
      )}

      {/* Items table */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
          Items ({invoice.items?.length || 0})
        </p>
        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-royal-700 text-white">
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Wt (g)</th>
                <th className="px-3 py-2 text-right">Silver ₹/g</th>
                <th className="px-3 py-2 text-right">Base Amt</th>
                <th className="px-3 py-2 text-right">GST (3%)</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoice.items || []).map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-royal-950">{it.name}</span>
                    <span className="block text-[10px] text-gray-400 font-mono">{it.sku}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">{it.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatWeight(it.weight)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatINR(it.silverRate)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatINR(it.baseAmount)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatINR(it.gstAmount)}</td>
                  <td className="px-3 py-2 text-right font-bold text-royal-800">{formatINR(it.finalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="space-y-1.5 border-t border-gray-200 pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Weight</span>
          <span className="text-gray-700 font-medium">{formatWeight(invoice.totalWeight)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="text-gray-700">{formatINR(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">GST Total (3%)</span>
          <span className="text-gray-700">{formatINR(invoice.gstTotal)}</span>
        </div>
        {Number(invoice.discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Discount</span>
            <span className="text-red-500">- {formatINR(invoice.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span className="text-royal-950">Grand Total</span>
          <span className="text-royal-800">{formatINR(invoice.grandTotal)}</span>
        </div>
      </div>

      {/* Payment info */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
            Payment History
          </p>
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard size={12} className="text-gray-400" />
                  <span>{p.method}</span>
                </div>
                <span className="font-medium text-royal-800">{formatINR(p.amount)}</span>
                <span className="text-gray-500">{formatDate(p.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState('invoices')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

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

  const displayInvoices = (isDemoMode() && invoicesError) ? DEMO_INVOICES : (invoices || [])
  const displayOrders = (isDemoMode() && ordersError) ? DEMO_ORDERS : (orders || [])
  const displayCustomers = (isDemoMode() && customersError) ? DEMO_CUSTOMERS : (customers || [])
  const displayReturns = (isDemoMode() && returnsError) ? DEMO_ORDERS.filter((o) => o.status === 'CANCELLED') : (returns || [])

  const fetchInvoice = async (id) => {
    if (isDemoMode()) {
      const inv = displayInvoices.find((i) => i.id === id)
      if (inv) {
        setSelectedInvoice(inv)
        setDetailOpen(true)
      }
      return
    }
    const r = await invoicesApi.get(id)
    setSelectedInvoice(r.data.data)
    setDetailOpen(true)
  }

  const downloadPdf = (inv) => {
    downloadInvoicePDF(inv)
  }

  const filteredInvoices = displayInvoices

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
            <Button size="sm" onClick={() => (window.location.href = '/billing')}>
              <Plus size={14} /> New Sale
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value)
              setSearch('')
              setFilterStatus('')
              setFilterPayment('')
              setDateFrom('')
              setDateTo('')
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.value
                ? 'border-royal-700 text-royal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters - visible for all tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400" />
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
              className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
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
              className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              <option value="">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
            </select>

            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
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
                  <tr className="bg-royal-50/80 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Invoice</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Date</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Items</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Qty</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Payment</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Sale Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                        Loading sales records...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No sales found. Click "New Sale" to create one.
                      </td>
                    </tr>
                  )}
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-royal-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-royal-700">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-royal-950">
                          {inv.customer?.name || 'Walk-in Customer'}
                        </span>
                        {inv.customer?.phone && <span className="block text-[11px] text-gray-400">{inv.customer.phone}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{inv._count?.items || 0}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{inv.totalQuantity || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(inv.grandTotal)}</td>
                      <td className="px-4 py-3 text-center">
                        {inv.paymentMethod ? (
                          <Badge tone={paymentTone[inv.paymentMethod]}>{inv.paymentMethod}</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={statusTone[inv.status]}>{statusLabel[inv.status] || inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => fetchInvoice(inv.id)}
                            className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => downloadPdf(inv)}
                            className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer"
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
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Order #</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Date</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Items</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordersLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                        Loading orders...
                      </td>
                    </tr>
                  )}
                  {!ordersLoading && displayOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No orders found.
                      </td>
                    </tr>
                  )}
                  {!ordersLoading &&
                    displayOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-royal-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700">{o.orderNumber || `#${o.id}`}</td>
                        <td className="px-4 py-3 font-medium text-royal-950">{o.customer?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{o._count?.items || 0}</td>
                        <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status] || o.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => fetchInvoice(o.id)}
                              className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer"
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
                  <tr className="bg-royal-50/80 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Contact</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Orders</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customersLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">
                        Loading customers...
                      </td>
                    </tr>
                  )}
                  {!customersLoading && displayCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No customers found.
                      </td>
                    </tr>
                  )}
                  {!customersLoading &&
                    displayCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-royal-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 text-white flex items-center justify-center text-[10px] font-bold">
                              {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                            <span className="font-medium text-royal-950">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{c._count?.invoices || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => (window.location.href = `/customers`)}
                              className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer"
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
                  <tr className="bg-royal-50/80 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Order #</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Date</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No returns found.
                      </td>
                    </tr>
                  ) : (
                    displayReturns.map((o) => (
                      <tr key={o.id} className="hover:bg-royal-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-royal-700">{o.orderNumber || `#${o.id}`}</td>
                        <td className="px-4 py-3 font-medium text-royal-950">{o.customer?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status] || o.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => null}
                              className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer"
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
    </div>
  )
}
