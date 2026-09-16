import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, CreditCard } from 'lucide-react'
import Badge from './ui/Badge'
import Button from './ui/Button'
import { customersApi } from '../api/customers'
import { invoicesApi } from '../api/invoices'
import { formatINR, formatDate, formatWeight } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const statusTone = {
  PAID: 'green',
  FINAL: 'blue',
  DRAFT: 'gray',
  VOID: 'red',
}

const paymentTone = {
  CASH: 'gray',
  UPI: 'blue',
  CARD: 'purple',
  BANK_TRANSFER: 'indigo',
  ONLINE: 'emerald',
  OTHER: 'gray',
}

// Full invoice breakdown used inside the invoice detail modal.
// Self-contained so Sales, Customers and any other page share the same UI.
export default function InvoiceDetail({ invoice }) {
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
      <div className="flex justify-between items-start pb-3 border-b border-gray-100 dark:border-white/[0.05]">
        <div>
          <h3 className="text-xl font-bold text-royal-950 dark:text-white">OPAL LINE</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Silver Jewellery · GST invoicing</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-royal-800 dark:text-gray-200 font-mono">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(invoice.date)}</p>
          <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
        </div>
      </div>

      {/* Customer & Payment info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1">
            Billed To
          </p>
          {invoice.customer ? (
            <>
              <p className="font-semibold text-royal-950 dark:text-white">{invoice.customer.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{invoice.customer.phone}</p>
              {invoice.customer.email && <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{invoice.customer.email}</p>}
              {invoice.customer.address && <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{invoice.customer.address}</p>}
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-400 dark:text-gray-500">Walk-in Customer</p>
              {canEdit && !showAddCustomer && (
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="mt-1 text-xs font-medium text-royal-600 dark:text-gray-300 hover:text-royal-800 dark:text-gray-200 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Customer
                </button>
              )}
            </>
          )}
        </div>
        <div className="bg-royal-50/60 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1">
            Payment
          </p>
          <p className="font-semibold text-royal-950 dark:text-white">
            {invoice.paymentMethod ? (
              <span className="flex items-center gap-2">
                <Badge tone={paymentTone[invoice.paymentMethod]}>{invoice.paymentMethod}</Badge>
                Paid via {invoice.paymentMethod}
              </span>
            ) : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
            {invoice.salesperson?.name && `Salesperson: ${invoice.salesperson.name}`}
          </p>
        </div>
      </div>

      {/* Add Customer inline form */}
      {showAddCustomer && (
        <div className="border border-gray-200 dark:border-white/[0.08] rounded-lg p-3 bg-gray-50 dark:bg-white/5">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search customers (name, phone)..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="flex-1 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-royal-500"
            />
            <button
              onClick={() => { setShowAddCustomer(false); setCustomerSearch(''); setSelectedCustomer(null) }}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 rounded cursor-pointer"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
          {customerSearch.length >= 2 && (
            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-[#1a1025]">
              {(customerResults || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                    selectedCustomer?.id === c.id
                      ? 'bg-royal-100 dark:bg-white/10 text-royal-900 dark:text-gray-200'
                      : 'hover:bg-gray-100 dark:bg-white/10'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{c.phone}</div>
                </button>
              ))}
              {customerSearch.length >= 2 && customerResults?.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No customers found</p>
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
        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-2">
          Items ({invoice.items?.length || 0})
        </p>
        <div className="overflow-x-auto border border-gray-100 dark:border-white/[0.05] rounded-lg">
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
                    <span className="font-medium text-royal-950 dark:text-white">{it.name}</span>
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-mono">{it.sku}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{it.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatWeight(it.weight)}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.silverRate)}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.baseAmount)}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(it.gstAmount)}</td>
                  <td className="px-3 py-2 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(it.finalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="space-y-1.5 border-t border-gray-200 dark:border-white/[0.08] pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Total Weight</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{formatWeight(invoice.totalWeight)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Subtotal</span>
          <span className="text-gray-700 dark:text-gray-300">{formatINR(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">GST Total (3%)</span>
          <span className="text-gray-700 dark:text-gray-300">{formatINR(invoice.gstTotal)}</span>
        </div>
        {Number(invoice.discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Discount</span>
            <span className="text-red-500">- {formatINR(invoice.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span className="text-royal-950 dark:text-white">Grand Total</span>
          <span className="text-royal-800 dark:text-gray-200">{formatINR(invoice.grandTotal)}</span>
        </div>
      </div>

      {/* Payment info */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-2">
            Payment History
          </p>
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/[0.05] text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard size={12} className="text-gray-400 dark:text-gray-500" />
                  <span>{p.method}</span>
                </div>
                <span className="font-medium text-royal-800 dark:text-gray-200">{formatINR(p.amount)}</span>
                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(p.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}