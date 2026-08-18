import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Search, Download, Eye, Calendar, Users,
  IndianRupee, Plus, X, CreditCard, ShoppingCart,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import { customersApi } from '../api/customers'
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
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', search, filterStatus, filterPayment, dateFrom, dateTo],
    queryFn: () =>
      invoicesApi.list({ search, status: filterStatus, paymentMethod: filterPayment, dateFrom, dateTo }).then(
        (r) => r.data.data
      ),
  })

  const fetchInvoice = async (id) => {
    const r = await invoicesApi.get(id)
    setSelectedInvoice(r.data.data)
    setDetailOpen(true)
  }

  const downloadPdf = (inv) => {
    downloadInvoicePDF(inv)
  }

  const filtered = invoices || []

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('')
    setFilterPayment('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="All sales invoices and billing records"
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

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>

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
      </div>

      {/* Sales Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No sales found. Click "New Sale" to create one.
                  </td>
                </tr>
              )}
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-royal-700">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-royal-950">
                      {inv.customer?.name || 'Walk-in Customer'}
                    </span>
                    {inv.customer?.phone && (
                      <span className="block text-[11px] text-gray-400">{inv.customer.phone}</span>
                    )}
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
