import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Receipt, Search, Calendar, Download } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { invoicesApi } from '../api/invoices'
import printInvoice from '../utils/printInvoice'
import { downloadInvoicePDF } from '../utils/pdfInvoice'
import InvoiceDetail from '../components/InvoiceDetail'
import {
  SalesInvoicesTable,
  InvoiceEditModal,
} from '../components/sales'
import { useInvoiceEditor } from '../components/sales/useInvoiceEditor'

export default function Invoices() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const { invoice: editInvoice, editorOpen, openEditor, closeEditor, handleSaved } = useInvoiceEditor()

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', filterStatus, filterPayment, dateFrom, dateTo, search],
    queryFn: () =>
      invoicesApi.list({ status: filterStatus, paymentMethod: filterPayment, dateFrom, dateTo, search }).then(
        (r) => r.data.data
      ),
  })

  const { data: selectedInvoice } = useQuery({
    queryKey: ['invoices', 'detail', selectedId],
    queryFn: () => invoicesApi.get(selectedId).then((r) => r.data.data),
    enabled: viewOpen && !!selectedId,
    retry: false,
  })

  const openDetail = (inv) => {
    setSelectedId(inv.id)
    setViewOpen(true)
  }

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
        title="Sales Invoices"
        subtitle="View and manage all sales invoices"
        actions={
          <div className="flex gap-2">
            {(search || filterStatus || filterPayment || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
              <Receipt size={14} /> New Billing
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search invoice or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Statuses</option>
          <option value="PAID">Billed</option>
          <option value="FINAL">Final</option>
          <option value="DRAFT">Draft</option>
          <option value="VOID">Returned</option>
        </select>
        <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Payments</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="ONLINE">Online</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" />
          <span className="text-gray-400 dark:text-gray-500">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <SalesInvoicesTable
          invoices={invoices}
          isLoading={isLoading}
          onView={(inv) => openDetail(inv)}
          onEdit={openEditor}
          onPrint={printInvoice}
          onDownload={downloadInvoicePDF}
        />
      </Card>

      <Modal
        open={viewOpen}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
        onClose={() => setViewOpen(false)}
        size="xl"
        footer={
          selectedInvoice && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setViewOpen(false)}>Close</Button>
              <Button size="sm" onClick={() => downloadInvoicePDF(selectedInvoice)}><Download size={14} /> Download PDF</Button>
            </>
          )
        }
      >
        {selectedInvoice ? <InvoiceDetail invoice={selectedInvoice} /> : <p className="text-sm text-gray-400 text-center py-10">Loading...</p>}
      </Modal>

      <InvoiceEditModal
        open={editorOpen}
        invoice={editInvoice}
        onClose={closeEditor}
        onSaved={handleSaved}
      />
    </div>
  )
}