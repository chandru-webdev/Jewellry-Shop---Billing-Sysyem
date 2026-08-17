import { useState } from 'react'
import { ShoppingCart, Trash2, Search, Coins, Calculator, Receipt, User, CreditCard } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../api/products'
import { formatINR, formatWeight } from '../utils/format'

const DEMO_PRODUCTS = [
  { id: 1, name: 'Silver Classic Ring', sku: 'SLV-RNG-00021', weight: 5.20, makingCharge: 20, category: { name: 'Rings' } },
  { id: 2, name: 'Silver Chain 22"', sku: 'SLV-CHN-00008', weight: 25.50, makingCharge: 15, category: { name: 'Chains' } },
  { id: 3, name: 'Silver Bracelet', sku: 'SLV-BRC-00015', weight: 15.00, makingCharge: 18, category: { name: 'Bracelets' } },
  { id: 4, name: 'Silver Pendant', sku: 'SLV-PND-00012', weight: 8.40, makingCharge: 22, category: { name: 'Pendants' } },
  { id: 5, name: 'Silver Earrings', sku: 'SLV-ERN-00031', weight: 6.80, makingCharge: 25, category: { name: 'Earrings' } },
]

const SILVER_RATE = 92.80
const GST_RATE = 3

export default function Billing() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Razorpay')

  const { data: apiProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  })

  const products = apiProducts?.length ? apiProducts : DEMO_PRODUCTS

  const addItem = (product) => {
    const silverValue = product.weight * SILVER_RATE
    const makingValue = product.weight * product.makingCharge
    const subtotal = silverValue + makingValue
    const gst = subtotal * GST_RATE / 100
    const total = subtotal + gst

    setItems([...items, {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: 1,
      weight: product.weight,
      silverRate: SILVER_RATE,
      makingCharge: product.makingCharge,
      silverValue,
      makingValue,
      subtotal,
      gst,
      total,
    }])
  }

  const removeItem = (id) => setItems(items.filter((i) => i.id !== id))

  const totals = items.reduce((acc, item) => ({
    silverValue: acc.silverValue + item.silverValue,
    makingValue: acc.makingValue + item.makingValue,
    subtotal: acc.subtotal + item.subtotal,
    gst: acc.gst + item.gst,
    total: acc.total + item.total,
    weight: acc.weight + item.weight,
  }), { silverValue: 0, makingValue: 0, subtotal: 0, gst: 0, total: 0, weight: 0 })

  const filteredProducts = products.filter((p) =>
    search && (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <PageHeader
        title="POS Billing"
        subtitle="Create sales invoices for jewellery with automatic silver rate pricing"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><User size={14} /> Walk-in Customer</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Product Search + Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 flex-1 border border-gray-200">
                <Search size={15} className="text-gray-400" />
                <input type="text" placeholder="Search products by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
              </div>
              <div className="flex items-center gap-2 bg-royal-50 rounded-lg px-3 py-2 border border-royal-200">
                <Coins size={14} className="text-royal-600" />
                <span className="text-sm font-bold text-royal-800">₹{SILVER_RATE}/gm</span>
              </div>
            </div>
          </Card>

          {/* Product search results */}
          {search && filteredProducts.length > 0 && (
            <Card title="Products" className="p-0 overflow-hidden">
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => { addItem(p); setSearch('') }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-royal-50/30 transition-colors cursor-pointer text-left">
                    <div>
                      <p className="text-sm font-medium text-royal-950">{p.name}</p>
                      <p className="text-[11px] font-mono text-gray-500">{p.sku} · {formatWeight(p.weight)} · ₹{p.makingCharge}/g making</p>
                    </div>
                    <Badge tone="green">+ Add</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Cart Items */}
          <Card title={`Items (${items.length})`} icon={ShoppingCart}>
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Search and add products to begin billing</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Product</th>
                      <th className="text-center py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                      <th className="text-center py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Weight</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Silver ₹</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Making ₹</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">GST ₹</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total ₹</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5"><p className="font-medium text-royal-950">{item.name}</p><p className="text-[10px] font-mono text-gray-400">{item.sku}</p></td>
                        <td className="py-2.5 text-center"><input type="number" value={item.qty} min={1} className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-royal-500" onChange={(e) => {
                          const q = parseInt(e.target.value) || 1
                          setItems(items.map(i => i.id === item.id ? { ...i, qty: q, total: (i.subtotal + i.gst / (item.subtotal > 0 ? item.subtotal : 1) * item.subtotal) * q / item.qty } : i))
                        }} /></td>
                        <td className="py-2.5 text-center text-gray-600">{formatWeight(item.weight)}</td>
                        <td className="py-2.5 text-right text-gray-600">{formatINR(item.silverValue)}</td>
                        <td className="py-2.5 text-right text-gray-600">{formatINR(item.makingValue)}</td>
                        <td className="py-2.5 text-right text-gray-600">{formatINR(item.gst)}</td>
                        <td className="py-2.5 text-right font-bold text-royal-800">{formatINR(item.total)}</td>
                        <td className="py-2.5"><button onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          {/* Customer */}
          <Card title="Customer" icon={User}>
            <div className="space-y-3">
              <input type="text" placeholder="Search or enter customer name..." value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Phone" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
                <input type="email" placeholder="Email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              </div>
            </div>
          </Card>

          {/* Payment */}
          <Card title="Payment" icon={CreditCard}>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {['Razorpay', 'Bank', 'Cash'].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${paymentMethod === m ? 'bg-royal-700 text-white border-royal-700' : 'bg-white text-gray-600 border-gray-200 hover:border-royal-300'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Totals */}
          <Card title="Order Summary" icon={Calculator}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Total Weight</span><span>{formatWeight(totals.weight)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Silver Value</span><span>{formatINR(totals.silverValue)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Making Charges</span><span>{formatINR(totals.makingValue)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>GST (3%)</span><span>{formatINR(totals.gst)}</span></div>
              <div className="flex justify-between font-bold text-royal-950 text-base border-t border-gray-200 pt-2">
                <span>Grand Total</span><span>{formatINR(totals.total)}</span>
              </div>
            </div>
            <Button className="w-full mt-4" size="lg" disabled={items.length === 0}>
              <Receipt size={16} /> Generate Invoice
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
