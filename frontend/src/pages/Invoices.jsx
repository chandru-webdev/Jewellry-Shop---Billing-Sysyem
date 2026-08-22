import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, Printer, Download, Receipt, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import { formatINR, formatWeight, formatDate } from '../utils/format'
import printInvoice from '../utils/printInvoice'

const statusTone = { PAID: 'green', DRAFT: 'gray', FINAL: 'blue', VOID: 'red', PENDING: 'orange' }

function InvoiceDetail({ invoice }) {
  return (
    <div className="text-sm space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · GST invoicing</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-royal-800 font-mono">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(invoice.date)}</p>
          <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Billed To</p>
          <p className="font-semibold text-royal-950 dark:text-white">{invoice.customer?.name || 'Walk-in Customer'}</p>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{invoice.customer?.phone}</p>
          {invoice.customer?.email && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{invoice.customer.email}</p>}
        </div>
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-semibold">Payment Info</p>
          <p className="font-semibold text-royal-950 dark:text-white">{invoice.paymentMethod || '—'}</p>
          {invoice.salesperson?.name && <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">Salesperson: {invoice.salesperson.name}</p>}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-royal-700 text-white text-left">
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Item</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Qty</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Weight</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">₹/g</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Base</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">GST</th>
            <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Total</th>
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
              <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.silverRate)}</td>
              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.baseAmount)}</td>
              <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.gstAmount)}</td>
              <td className="px-3 py-2 text-right font-semibold text-royal-800">{formatINR(it.finalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1.5 border-t border-gray-100 dark:border-white/[0.05] pt-3 text-sm">
        <div className="flex justify-between text-gray-500 dark:text-gray-400 dark:text-gray-500"><span>Total Weight</span><span>{formatWeight(invoice.totalWeight)}</span></div>
        <div className="flex justify-between text-gray-500 dark:text-gray-400 dark:text-gray-500"><span>Silver Value</span><span>{formatINR(invoice.subtotal)}</span></div>
        <div className="flex justify-between text-gray-500 dark:text-gray-400 dark:text-gray-500"><span>GST (3%)</span><span>{formatINR(invoice.gstTotal)}</span></div>
        {Number(invoice.discount) > 0 && (
          <div className="flex justify-between text-gray-500 dark:text-gray-400 dark:text-gray-500"><span>Discount</span><span className="text-red-500">- {formatINR(invoice.discount)}</span></div>
        )}
        <div className="flex justify-between font-bold text-royal-950 dark:text-white text-base border-t border-gray-200 dark:border-white/[0.08] pt-2">
          <span>Grand Total</span><span>{formatINR(invoice.grandTotal)}</span>
        </div>
      </div>

      {invoice.paymentMethod && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Receipt size={14} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Payment via {invoice.paymentMethod}</p>
            <p className="text-[11px] text-emerald-600">Paid · {invoice.invoiceNumber}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Invoices() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list().then((r) => r.data.data),
  })

  const filtered = (invoices || []).filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!inv.invoiceNumber?.toLowerCase().includes(q) && !inv.customer?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Sales Invoices"
        subtitle="View and manage all sales invoices"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
            <Receipt size={14} /> New Billing
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search invoice or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="DRAFT">Draft</option>
          <option value="FINAL">Final</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Shopify Order</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Amount</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Payment</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Loading invoices...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">No invoices found.</td></tr>}
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-royal-700 font-semibold">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    {inv.orderNumber ? <Badge tone="blue">#{inv.orderNumber}</Badge> : <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{inv.customer?.name || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(inv.grandTotal)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={inv.paymentMethod ? 'green' : 'gray'}>{inv.paymentMethod || '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelected(inv); setViewOpen(true) }} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="View"><Eye size={14} /></button>
                      <button onClick={() => printInvoice(inv)} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="Print"><Printer size={14} /></button>
                      <button className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="Download"><Download size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={viewOpen} title={`Invoice — ${selected?.invoiceNumber || ''}`} onClose={() => setViewOpen(false)} footer={
        selected && <>
          <Button variant="ghost" onClick={() => setViewOpen(false)}>Close</Button>
          <Button onClick={() => printInvoice(selected)}><Printer size={14} /> Print / PDF</Button>
        </>
      }>
        {selected && <InvoiceDetail invoice={selected} />}
      </Modal>
    </div>
  )
}
