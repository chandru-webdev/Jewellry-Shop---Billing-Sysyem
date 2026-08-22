import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, Download, Receipt, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import { formatINR, formatDate, formatWeight } from '../utils/format'

const statusTone = { PAID: 'green', DRAFT: 'gray', FINAL: 'blue', VOID: 'red', PENDING: 'orange' }

const statusLabel = {
  PAID: 'Paid',
  FINAL: 'Finalized',
  DRAFT: 'Draft',
  VOID: 'Void',
  PENDING: 'Pending',
}

const DEMO_PURCHASE_INVOICES = [
  {
    id: 1,
    invoiceNumber: 'PI-2026-001',
    date: '2026-08-10T00:00:00Z',
    status: 'PAID',
    paymentMethod: 'BANK_TRANSFER',
    grandTotal: 225000.00,
    totalQuantity: 120,
    customer: { name: 'Royal Crafts Ltd.', phone: '+91 98765 12345', email: 'info@royalcrafts.com', address: '123 Industrial Area, Mumbai' },
    salesperson: { name: 'Admin' },
    _count: { items: 4 },
    createdAt: '2026-08-10T00:00:00Z',
  },
  {
    id: 2,
    invoiceNumber: 'PI-2026-002',
    date: '2026-08-08T00:00:00Z',
    status: 'FINAL',
    paymentMethod: 'CASH',
    grandTotal: 89000.00,
    totalQuantity: 45,
    customer: { name: 'Silver Arts Co.', phone: '+91 91234 56789', email: 'sales@silverarts.com' },
    salesperson: { name: 'Admin' },
    _count: { items: 2 },
    createdAt: '2026-08-08T00:00:00Z',
  },
  {
    id: 3,
    invoiceNumber: 'PI-2026-003',
    date: '2026-08-05T00:00:00Z',
    status: 'DRAFT',
    paymentMethod: 'CASH',
    grandTotal: 156000.00,
    totalQuantity: 85,
    customer: { name: 'Golden Threads', phone: '+91 99887 76655' },
    salesperson: { name: 'Manager' },
    _count: { items: 3 },
    createdAt: '2026-08-05T00:00:00Z',
  },
]

function isDemoMode() {
  return localStorage.getItem('opal_token') === 'demo-token-opal-line'
}

function InvoiceDetail({ invoice }) {
  return (
    <div className="text-sm space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · Purchase Invoice</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-royal-800 dark:text-gray-200 font-mono">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(invoice.date)}</p>
          <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Billed From</p>
          <p className="font-semibold text-royal-950 dark:text-white">{invoice.customer?.name || '—'}</p>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{invoice.customer?.phone}</p>
          {invoice.customer?.email && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{invoice.customer.email}</p>}
          {invoice.customer?.address && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{invoice.customer.address}</p>}
        </div>
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Payment Info</p>
          <p className="font-semibold text-royal-950 dark:text-white">{invoice.paymentMethod || '—'}</p>
          {invoice.salesperson?.name && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">Received by: {invoice.salesperson.name}</p>}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-royal-700 text-white text-left">
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Item</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Qty</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Weight (g)</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Rate</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.items?.map((it) => (
            <tr key={it.id}>
              <td className="px-3 py-2">
                <span className="font-medium text-royal-950 dark:text-white">{it.name}</span>
                <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-mono">{it.sku}</span>
              </td>
              <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{it.quantity}</td>
              <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatWeight(it.weight)}</td>
              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.silverRate)}</td>
              <td className="px-3 py-2 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(it.finalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1.5 border-t border-gray-100 dark:border-white/[0.05] pt-3 text-sm">
        <div className="flex justify-between text-gray-500 dark:text-gray-400 dark:text-gray-500"><span>Total Weight</span><span>{formatWeight(invoice.totalWeight)}</span></div>
        <div className="flex justify-between font-bold text-royal-950 dark:text-white text-base border-t border-gray-200 dark:border-white/[0.08] pt-2">
          <span>Grand Total</span>
          <span>{formatINR(invoice.grandTotal)}</span>
        </div>
      </div>

      {invoice.paymentMethod && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Receipt size={14} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Paid via {invoice.paymentMethod}</p>
            <p className="text-[11px] text-emerald-600">Invoice {invoice.invoiceNumber}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PurchaseInvoices() {
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['purchase-invoices', search, filterStatus],
    queryFn: () => invoicesApi.list({ search, status: filterStatus }).then((r) => r.data.data),
  })

  const displayInvoices = (isDemoMode() && error) ? DEMO_PURCHASE_INVOICES : (invoices || [])

  const filtered = displayInvoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!inv.invoiceNumber?.toLowerCase().includes(q) && !inv.customer?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleView = (inv) => {
    setSelected(inv)
    setViewOpen(true)
  }

  const handleDownload = () => {
    window.print()
  }

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        subtitle="Manage purchase invoices from suppliers"
        actions={
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by invoice # or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              <option value="">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="FINAL">Finalized</option>
              <option value="DRAFT">Draft</option>
              <option value="VOID">Void</option>
            </select>
            <Button size="sm" onClick={() => (window.location.href = '/billing')}>
              <Receipt size={14} /> New Purchase Invoice
            </Button>
          </div>
        }
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Invoice</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Supplier</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Items</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Total</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Payment</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Loading purchase invoices...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No purchase invoices found.
                </td>
              </tr>
            )}
            {!isLoading && filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-royal-950 dark:text-white">{inv.customer?.name || '—'}</span>
                  {inv.customer?.phone && <span className="block text-[11px] text-gray-400 dark:text-gray-500">{inv.customer.phone}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatDate(inv.date)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{inv._count?.items || 0}</td>
                <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(inv.grandTotal)}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{inv.paymentMethod || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <Badge tone={statusTone[inv.status]}>{statusLabel[inv.status] || inv.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                      <button
                      onClick={handleDownload}
                      className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleView(inv)}
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
        </table>
      </Card>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Purchase Invoice Details" size="lg">
        {selected && <InvoiceDetail invoice={selected} />}
      </Modal>
    </div>
  )
}
