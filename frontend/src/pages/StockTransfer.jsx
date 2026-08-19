import { useState } from 'react'
import { ArrowRight, Package, History, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input, Select, Label } from '../components/ui/FormControls'
import { mockProducts, locations, transferHistory as initialHistory } from '../mock/products'
import { formatDateTime } from '../utils/format'

function cloneProducts() {
  return mockProducts.map((p) => ({ ...p, locations: { ...p.locations } }))
}

export default function StockTransfer() {
  const [products, setProducts] = useState(cloneProducts())
  const [history, setHistory] = useState(initialHistory)
  const [search, setSearch] = useState('')

  const [product, setProduct] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedProduct = products.find((p) => String(p.id) === product)
  const availableQty = selectedProduct?.locations[from] ?? 0

  const resetForm = () => {
    setProduct('')
    setFrom('')
    setTo('')
    setQty('')
    setNote('')
    setError('')
    setSuccess('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!product || !from || !to || !qty) {
      setError('Please fill in all fields.')
      return
    }
    if (from === to) {
      setError('Source and destination must be different.')
      return
    }
    const requested = Number(qty)
    if (Number.isNaN(requested) || requested <= 0) {
      setError('Quantity must be a positive number.')
      return
    }
    if (requested > availableQty) {
      setError(`Only ${availableQty} unit(s) available at ${locations.find((l) => l.id === from)?.name}.`)
      return
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (String(p.id) !== product) return p
        const updated = { ...p, locations: { ...p.locations } }
        updated.locations[from] = Math.max(0, (updated.locations[from] ?? 0) - requested)
        updated.locations[to] = (updated.locations[to] ?? 0) + requested
        updated.quantity = Object.values(updated.locations).reduce((a, b) => a + b, 0)
        return updated
      })
    )

    const prodName = products.find((p) => String(p.id) === product)?.name ?? ''
    const fromName = locations.find((l) => l.id === from)?.name ?? from
    const toName = locations.find((l) => l.id === to)?.name ?? to
    setHistory((prev) => [
      {
        id: `TRF-${Date.now()}`,
        date: new Date().toISOString(),
        sku: selectedProduct?.sku ?? '',
        name: prodName,
        from,
        to,
        qty: requested,
        by: 'Admin',
        note: note || '',
      },
      ...prev,
    ])
    setSuccess(`Transferred ${requested} pcs of "${prodName}" from ${fromName} to ${toName}.`)
    resetForm()
  }

  const filteredHistory = history.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.sku.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <PageHeader title="Stock Transfer" subtitle="Move stock between warehouse locations" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Form */}
        <Card title="New Transfer" icon={ArrowRight} className="xl:col-span-1">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>
          )}
          {success && (
            <div className="mb-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">{success}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="product">Product</Label>
              <Select id="product" value={product} onChange={(e) => { setProduct(e.target.value); setError(''); setSuccess('') }} required>
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — qty: {p.quantity}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-5 items-end gap-2">
              <div className="col-span-2">
                <Label htmlFor="from">From</Label>
                <Select id="from" value={from} onChange={(e) => setFrom(e.target.value)} required>
                  <option value="">Source</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.id === to}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-1 flex justify-center">
                <ArrowRight size={18} className="text-gray-400" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="to">To</Label>
                <Select id="to" value={to} onChange={(e) => setTo(e.target.value)} required>
                  <option value="">Destination</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.id === from}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="qty">Quantity</Label>
              <div className="flex items-end gap-2">
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  max={availableQty}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={selectedProduct ? `Max: ${availableQty}` : 'Enter qty'}
                  required
                />
                <span className="text-xs text-gray-500 pb-2">available: {availableQty}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Re-stock retail floor" />
            </div>

            <Button type="submit" variant="gold" className="w-full">
              Transfer Stock
            </Button>
          </form>
        </Card>

        {/* Current location summary for selected product */}
        {selectedProduct && (
          <Card title={`Current stock: ${selectedProduct.name}`} icon={Package} className="xl:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {locations.map((l) => (
                <div key={l.id} className="bg-royal-50/60 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{l.name}</p>
                  <p className="text-2xl font-bold text-royal-950 mt-1">{selectedProduct.locations[l.id] ?? 0}</p>
                  <Badge tone={selectedProduct.locations[l.id] > 0 ? 'green' : 'gray'}>
                    {selectedProduct.locations[l.id] > 0 ? 'In stock' : 'Empty'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Transfer history */}
        <Card title="Transfer History" icon={History} className="xl:col-span-3">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by product, SKU or transfer ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50 text-royal-900 text-left">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">ID</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">From → To</th>
                  <th className="px-5 py-3 font-semibold text-right">Qty</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-gray-400">
                      No transfers recorded.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((t) => (
                    <tr key={t.id} className="hover:bg-royal-50/50">
                      <td className="px-5 py-3 text-gray-500 text-xs">{formatDateTime(t.date)}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-gray-500">{t.id}</td>
                      <td className="px-5 py-3 font-medium text-royal-950">{t.name}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {locations.find((l) => l.id === t.from)?.name ?? t.from} → {locations.find((l) => l.id === t.to)?.name ?? t.to}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">+{t.qty}</td>
                      <td className="px-5 py-3 text-gray-600">{t.by}</td>
                      <td className="px-5 py-3 text-gray-500">{t.note || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
