import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Download } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomerDetailDrawer from '../components/CustomerDetailDrawer'
import InvoiceDetail from '../components/InvoiceDetail'
import { customersApi } from '../api/customers'
import { invoicesApi } from '../api/invoices'
import { downloadInvoicePDF } from '../utils/pdfInvoice'
import { inRange, exportCustomersExcel } from '../utils/exportExcel'
import ExportControls from '../components/ui/ExportControls'
import { CustomersTable, CustomerFormModal } from '../components/sales'

export default function Customers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  const { data: selectedInvoice } = useQuery({
    queryKey: ['invoices', selectedInvoiceId],
    queryFn: () => invoicesApi.get(selectedInvoiceId).then((r) => r.data.data),
    enabled: invoiceDetailOpen && !!selectedInvoiceId,
    retry: false,
  })

  const { data: apiCustomers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search }).then((r) => r.data.data),
    retry: false,
  })

  const customers = (apiCustomers || []).map((c) => ({
    ...c,
    orders: c.orders ?? c._count?.invoices ?? 0,
    totalSpent: c.totalSpent ?? 0,
    lastOrder: c.lastOrder ?? c.invoices?.[0]?.date ?? null,
  }))

  const handleExport = async ({ from, to }) => {
    const r = await customersApi.list({ limit: 100000 })
    const mapped = (r.data.data || []).map((c) => ({
      ...c,
      orders: c.orders ?? c._count?.invoices ?? 0,
      totalSpent: c.totalSpent ?? 0,
      lastOrder: c.lastOrder ?? c.invoices?.[0]?.date ?? null,
    }))
    const all = mapped.filter((c) => inRange(c.createdAt, from, to))
    exportCustomersExcel(all)
  }

  const openCustomerDetail = (c) => {
    setSelectedCustomerId(c.id)
    setCustomerDetailOpen(true)
  }

  const closeCustomerDetail = () => {
    setCustomerDetailOpen(false)
    setSelectedCustomerId(null)
  }

  const openCustomerForm = (c) => {
    setEditingCustomer(c)
    setCustomerFormOpen(true)
  }

  const openInvoiceDetail = (invId) => {
    setSelectedInvoiceId(invId)
    closeCustomerDetail()
    setInvoiceDetailOpen(true)
  }

  const closeInvoiceDetail = () => {
    setInvoiceDetailOpen(false)
    setSelectedInvoiceId(null)
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Manage your ecommerce customer database" actions={<div className="flex gap-2"><ExportControls onExport={handleExport} /><Button size="sm" onClick={() => openCustomerForm(null)}><Plus size={14} /> Add Customer</Button></div>} />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search by name, phone or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <CustomersTable
          customers={customers}
          isLoading={isLoading}
          onView={(c) => openCustomerDetail(c)}
          onEdit={(c) => openCustomerForm(c)}
        />
      </Card>

      <CustomerFormModal
        open={customerFormOpen}
        customer={editingCustomer}
        onClose={() => { setCustomerFormOpen(false); setEditingCustomer(null) }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
      />

      {/* Customer Details Right Drawer — full height, 30% width slide-in from right */}
      <CustomerDetailDrawer
        open={customerDetailOpen}
        customerId={selectedCustomerId}
        onClose={closeCustomerDetail}
        onInvoiceView={openInvoiceDetail}
      />

      {/* Invoice Detail Modal */}
      <Modal
        open={invoiceDetailOpen}
        title=""
        onClose={closeInvoiceDetail}
        size="xl"
        footer={
          selectedInvoice ? (
            <>
              <Button variant="ghost" size="sm" onClick={closeInvoiceDetail}>Close</Button>
              <Button size="sm" onClick={() => downloadInvoicePDF(selectedInvoice)}><Download size={14} /> Download PDF</Button>
            </>
          ) : null
        }
      >
        {selectedInvoice ? <InvoiceDetail invoice={selectedInvoice} /> : <p className="text-sm text-gray-400 text-center py-10">Loading...</p>}
      </Modal>
    </div>
  )
}