import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Download, Calendar, X, Users, Receipt, Plus,
  ShoppingCart, Package,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import { customersApi } from '../api/customers'
import { ordersApi } from '../api/orders'
import { formatINR } from '../utils/format'
import { downloadInvoicePDF } from '../utils/pdfInvoice'
import printInvoice from '../utils/printInvoice'
import { inRange } from '../utils/exportExcel'
import {
  exportSalesInvoicesExcel,
  exportSalesOrdersExcel,
  exportCustomersExcel,
  exportReturnsExcel,
} from '../utils/exportSalesExcel'
import CustomerDetailDrawer from '../components/CustomerDetailDrawer'
import InvoiceDetail from '../components/InvoiceDetail'
import {
  SalesInvoicesTable,
  SalesOrdersTable,
  CustomersTable,
  ReturnsTable,
  OrderDetailModal,
  CustomerFormModal,
  InvoiceEditModal,
} from '../components/sales'
import { useInvoiceEditor } from '../components/sales/useInvoiceEditor'
import ExportControls from '../components/ui/ExportControls'

export default function Sales() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('invoices')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [confirmReturn, setConfirmReturn] = useState(null)

  const { invoice: editInvoice, editorOpen, openEditor, closeEditor, handleSaved } = useInvoiceEditor()

  const refundMutation = useMutation({
    mutationFn: (id) => ordersApi.updateStatus(id, 'REFUNDED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setConfirmReturn(null)
    },
  })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', search, filterStatus, filterPayment, dateFrom, dateTo],
    queryFn: () =>
      invoicesApi.list({ search, status: filterStatus, paymentMethod: filterPayment, dateFrom, dateTo }).then(
        (r) => r.data.data
      ),
  })

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', search],
    queryFn: () => ordersApi.list({ search }).then((r) => r.data.data),
    enabled: activeTab === 'orders',
  })

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search }).then((r) => r.data.data),
    enabled: activeTab === 'customers',
  })

  const { data: returns, isLoading: returnsLoading } = useQuery({
    queryKey: ['orders', 'returns'],
    queryFn: () => ordersApi.list({ limit: 100 }).then((r) => r.data.data),
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

  const openEditCustomer = (c) => {
    setEditingCustomer(c)
    setCustomerFormOpen(true)
  }

  const openOrderDetail = (o) => {
    setSelectedOrderId(o.id)
    setOrderDetailOpen(true)
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
      const r = await ordersApi.list({ limit: 100000 })
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
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
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
        {activeTab === 'invoices' && (
          <SalesInvoicesTable
            invoices={filteredInvoices}
            isLoading={isLoading}
            onView={(inv) => fetchInvoice(inv.id)}
            onEdit={openEditor}
            onPrint={printInvoice}
            onDownload={downloadInvoicePDF}
          />
        )}

        {activeTab === 'orders' && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1 w-fit overflow-x-auto">
              {[
                { key: 'all', label: 'All', count: displayOrders.length },
                { key: 'FULFILLED', label: 'Fulfilled', count: displayOrders.filter((o) => o.status === 'FULFILLED').length },
                { key: 'PAID', label: 'Paid', count: displayOrders.filter((o) => o.status === 'PAID').length },
                { key: 'PENDING', label: 'Pending', count: displayOrders.filter((o) => o.status === 'PENDING').length },
                { key: 'CANCELLED', label: 'Cancelled', count: displayOrders.filter((o) => o.status === 'CANCELLED').length },
                { key: 'REFUNDED', label: 'Refunded', count: displayOrders.filter((o) => o.status === 'REFUNDED').length },
              ].map((f) => (
                <button key={f.key} onClick={() => setOrderStatusFilter(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${orderStatusFilter === f.key ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}>
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${orderStatusFilter === f.key ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-200 text-gray-500 dark:text-gray-400'}`}>{f.count}</span>
                </button>
              ))}
            </div>
            <SalesOrdersTable
              orders={filteredOrders}
              isLoading={ordersLoading}
              onView={(o) => openOrderDetail(o)}
              onEdit={(o) => openEditor(o.invoice)}
            />
          </div>
        )}

        {activeTab === 'customers' && (
          <CustomersTable
            customers={displayCustomers}
            isLoading={customersLoading}
            onView={(c) => openCustomerDetail(c)}
            onEdit={(c) => openEditCustomer(c)}
          />
        )}

        {activeTab === 'returns' && (
          <ReturnsTable
            orders={displayReturns}
            isLoading={returnsLoading}
            onView={(o) => openOrderDetail(o)}
            onRefund={(o) => setConfirmReturn(o)}
          />
        )}
      </Card>

      {/* Invoice detail modal */}
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
              <Button size="sm" onClick={() => downloadInvoicePDF(selectedInvoice)}>
                <Download size={14} /> Download PDF
              </Button>
            </>
          )
        }
      >
        {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
      </Modal>

      {/* Order detail modal (shared with Sales Orders page) */}
      <OrderDetailModal
        open={orderDetailOpen}
        orderId={selectedOrderId}
        onClose={() => { setOrderDetailOpen(false); setSelectedOrderId(null) }}
      />

      {/* Invoice edit (shared with dedicated pages) */}
      <InvoiceEditModal
        open={editorOpen}
        invoice={editInvoice}
        onClose={closeEditor}
        onSaved={handleSaved}
      />

      {/* Customer detail drawer */}
      <CustomerDetailDrawer
        open={customerDetailOpen}
        customerId={selectedCustomerId}
        onClose={closeCustomerDetail}
        onInvoiceView={(invId) => { closeCustomerDetail(); fetchInvoice(invId) }}
      />

      {/* Customer add/edit modal (shared with dedicated page) */}
      <CustomerFormModal
        open={customerFormOpen}
        customer={editingCustomer}
        onClose={() => { setCustomerFormOpen(false); setEditingCustomer(null) }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
      />

      {/* Refund confirm (matches Sales Returns page) */}
      <Modal
        open={Boolean(confirmReturn)}
        title="Confirm Refund"
        onClose={() => setConfirmReturn(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReturn(null)}>Cancel</Button>
            <Button size="sm" variant="gold" onClick={() => refundMutation.mutate(confirmReturn.id)} disabled={refundMutation.isPending}>
              {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </>
        }
      >
        {confirmReturn && (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              Refund order <span className="font-semibold text-royal-950 dark:text-white">{confirmReturn.orderNumber || `#${confirmReturn.id}`}</span> for{' '}
              <span className="font-semibold text-emerald-700">{formatINR(confirmReturn.totalAmount)}</span>?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This will return all items to stock and void the linked invoice{' '}
              {confirmReturn.invoice?.invoiceNumber ? `(${confirmReturn.invoice.invoiceNumber})` : ''}. This action is permanent.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}