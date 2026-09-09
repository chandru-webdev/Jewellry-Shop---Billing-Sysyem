import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Trash2, Search, Coins, Calculator, Receipt, User, CreditCard } from 'lucide-react'
import Card from './ui/Card'
import Button from './ui/Button'
import Badge from './ui/Badge'
import { productsApi } from '../api/products'
import { invoicesApi } from '../api/invoices'
import { metalRatesApi } from '../api/metalRates'
import { formatINR, formatWeight } from '../utils/format'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FINAL', label: 'Billed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Returned' },
]

const buildInitialItems = (invoiceItems) =>
  (invoiceItems || [])
    .map((it) => ({
      id: it.id,
      productId: it.productId,
      name: it.name,
      sku: it.sku,
      qty: it.quantity,
      weight: Number(it.weight),
      silverRate: Number(it.silverRate) || 0,
      makingCharge: Number(it.makingCharge),
      base: Number(it.baseAmount),
      gst: Number(it.gstAmount),
      total: Number(it.finalAmount),
    }))
    .filter((i) => i.productId)

export default function SaleEditForm({ invoice, onCancel, onSaved }) {
  const queryClient = useQueryClient()

  const { data: apiProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
    retry: false,
  })

  const { data: metalRates, isError: ratesError } = useQuery({
    queryKey: ['metal-rates'],
    queryFn: () => metalRatesApi.getCurrent().then((r) => r.data.data),
    retry: false,
  })

  const silverRate = (!ratesError && metalRates?.rate) || 92.80
  const products = apiProducts || []
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const [search, setSearch] = useState('')
  const [discount, setDiscount] = useState(Number(invoice.discount) || 0)
  const [paymentMethod, setPaymentMethod] = useState(invoice.paymentMethod || 'CASH')
  const [status, setStatus] = useState(invoice.status || 'DRAFT')
  const [customer, setCustomer] = useState({
    name: invoice.customer?.name || '',
    phone: invoice.customer?.phone || '',
    email: invoice.customer?.email || '',
    address: invoice.customer?.address || '',
    gstin: invoice.customer?.gstin || '',
  })
  const [error, setError] = useState('')

  // Pre-fill the cart immediately from the invoice's stored line items —
  // no dependency on the product catalog query loading.
  const [items, setItems] = useState(() => buildInitialItems(invoice.items))

  const addItem = (product) => {
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      setItems(items.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)))
    } else {
      setItems([
        ...items,
        {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          qty: 1,
          weight: product.weight,
          silverRate,
          makingCharge: product.makingCharge,
          base: Number(product.baseAmount),
          gst: Number(product.gstAmount),
          total: Number(product.sellingPrice),
        },
      ])
    }
    setSearch('')
  }

  const removeItem = (id) => setItems(items.filter((i) => i.id !== id))

  const updateQty = (id, newQty) => {
    const q = Math.max(1, parseInt(newQty) || 1)
    setItems(items.map((i) => (i.id === id ? { ...i, qty: q } : i)))
  }

  const totals = items.reduce(
    (acc, item) => ({
      base: acc.base + item.base * item.qty,
      gst: acc.gst + item.gst * item.qty,
      total: acc.total + item.total * item.qty,
      weight: acc.weight + item.weight * item.qty,
    }),
    { base: 0, gst: 0, total: 0, weight: 0 }
  )

  const discountValue = Math.max(0, Number(discount) || 0)
  const grandTotal = Math.max(0, totals.base + totals.gst - discountValue)

  const saveMutation = useMutation({
    mutationFn: () =>
      invoicesApi.update(invoice.id, {
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          address: customer.address || undefined,
          gstin: customer.gstin || undefined,
        },
        items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
        discount: discountValue,
        paymentMethod,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      if (onSaved) onSaved()
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to update invoice')
    },
  })

  const save = () => {
    setError('')
    if (items.length === 0) {
      setError('Please add at least one item')
      return
    }
    if (!customer.name || !customer.phone) {
      setError('Customer name and phone are required')
      return
    }
    saveMutation.mutate()
  }

  const filteredProducts = products.filter((p) =>
    search && (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200 flex items-center gap-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Product Search + Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 flex-1 border border-gray-200 dark:border-white/[0.08]">
                <Search size={15} className="text-gray-400 dark:text-gray-500" />
                <input type="text" placeholder="Search products to add..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
              </div>
              <div className="flex items-center gap-2 bg-royal-50 dark:bg-white/5 rounded-lg px-3 py-2 border border-royal-200 dark:border-white/10">
                <Coins size={14} className="text-royal-600 dark:text-gray-300" />
                <span className="text-sm font-bold text-royal-800 dark:text-gray-200">₹{silverRate}/gm</span>
              </div>
            </div>
          </Card>

          {search && filteredProducts.length > 0 && (
            <Card title="Products" className="p-0 overflow-hidden">
              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors cursor-pointer text-left">
                    <div>
                      <p className="text-sm font-medium text-royal-950 dark:text-white">{p.name}</p>
                      <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">{p.sku} · {formatWeight(p.weight)} · ₹{p.makingCharge}/g making</p>
                    </div>
                    <Badge tone="green">+ Add</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card title={`Items (${items.length})`} icon={ShoppingCart}>
            {items.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <ShoppingCart size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Search and add products to begin editing the invoice</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                      <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Product</th>
                      <th className="text-center py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="text-center py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Weight</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Base ₹</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">GST ₹</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total ₹</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5"><p className="font-medium text-royal-950 dark:text-white">{item.name}</p><p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{item.sku}</p></td>
                        <td className="py-2.5 text-center"><input type="number" value={item.qty} min={1} className="w-14 text-center border border-gray-200 dark:border-white/[0.08] rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-royal-500" onChange={(e) => updateQty(item.id, e.target.value)} /></td>
                        <td className="py-2.5 text-center text-gray-600 dark:text-gray-400">{formatWeight(item.weight * item.qty)}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{formatINR(item.base * item.qty)}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{formatINR(item.gst * item.qty)}</td>
                        <td className="py-2.5 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(item.total * item.qty)}</td>
                        <td className="py-2.5"><button onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Customer, Payment, Summary */}
        <div className="space-y-4">
          <Card title="Customer" icon={User}>
            <div className="space-y-3">
              <input type="text" placeholder="Customer name *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              <input type="text" placeholder="Phone *" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              <input type="email" placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              <input type="text" placeholder="Address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              <input type="text" placeholder="GSTIN (optional)" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.trim().toUpperCase() })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500 font-mono" />
            </div>
          </Card>

          <Card title="Payment & Status" icon={CreditCard}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1">Payment Method</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value)} className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${paymentMethod === m.value ? 'bg-royal-700 text-white border-royal-700' : 'bg-white dark:bg-[#1a1025] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.08] hover:border-royal-300 dark:border-white/10'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1">Status</p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-white/[0.08] bg-white dark:bg-[#1a1025] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Card>

          <Card title="Order Summary" icon={Calculator}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Silver + Making</span><span>{formatINR(totals.base)}</span></div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>GST</span><span>{formatINR(totals.gst)}</span></div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Total Weight</span><span>{formatWeight(totals.weight)}</span></div>
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <span>Discount ₹</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 text-right border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-royal-500"
                />
              </div>
              <div className="flex justify-between font-bold text-royal-950 dark:text-white text-base border-t border-gray-200 dark:border-white/[0.08] pt-2">
                <span>Grand Total</span><span>{formatINR(grandTotal)}</span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                Totals are recalculated at current rates when you save — original sale prices are not preserved.
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" size="md" className="flex-1" disabled={saveMutation.isPending} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-royal-600 text-white hover:bg-royal-700"
                size="md"
                loading={saveMutation.isPending}
                disabled={saveMutation.isPending}
                onClick={save}
              >
                <Receipt size={16} /> Save Changes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}