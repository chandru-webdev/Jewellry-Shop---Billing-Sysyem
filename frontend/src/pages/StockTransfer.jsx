import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Package, History, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input, Select, Label } from '../components/ui/FormControls'
import { productsApi } from '../api/products'
import { inventoryApi } from '../api/inventory'
import { formatDateTime } from '../utils/format'
import { locations } from '../mock/products'

const parseTransfer = (tx) => {
  // Ledger entries created by stock-transfer: notes look like
  // "Transfer OUT to <to> — <note>" or "Transfer IN from <from> — <note>"
  const note = tx.note || ''
  const outMatch = note.match(/^Transfer OUT to (.+?)(?: — |$)/)
  const inMatch = note.match(/^Transfer IN from (.+?)(?: — |$)/)
  return { kind: outMatch ? 'OUT' : inMatch ? 'IN' : null, location: (outMatch?.[1] || inMatch?.[1] || '').trim() }
}

export default function StockTransfer() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const [productId, setProductId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: apiProducts = [] } = useQuery({
    queryKey: ['products', 'transfer'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  })

  const { data: apiTransactions = [] } = useQuery({
    queryKey: ['inventory-transactions', 'transfer'],
    queryFn: () => inventoryApi.transactions({ limit: 100 }).then((r) => r.data.data),
  })

  const products = apiProducts || []
  const selectedProduct = products.find((p) => String(p.id) === String(productId))
  const availableQty = selectedProduct?.inventory?.quantity ?? 0

  const transferMutation = useMutation({
    mutationFn: (data) => inventoryApi.stockTransfer(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions', 'transfer'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'transfer'] })
      const d = res.data.data
      const p = products.find((pr) => pr.id === d.productId)
      const fromName = locations.find((l) => l.name === d.from || l.id === d.from)?.name || d.from
      const toName = locations.find((l) => l.name === d.to || l.id === d.to)?.name || d.to
      setSuccess(`Transferred ${d.quantity} pcs of "${p?.name || ''}" from ${fromName} to ${toName}.`)
      setProductId('')
      setFrom('')
      setTo('')
      setQty('')
      setNote('')
      setError('')
    },
    onError: (err) => setError(err.response?.data?.message || 'Transfer failed.'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!productId || !from || !to || !qty) {
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
      setError(`Only ${availableQty} unit(s) available at ${from}.`)
      return
    }

    transferMutation.mutate({ productId: Number(productId), quantity: requested, from, to, note })
  }

  // Build a readable transfer history from real ledger entries
  const transfers = (apiTransactions || [])
    .map((tx) => ({ tx, parsed: parseTransfer(tx) }))
    .filter((t) => t.parsed.kind)
    .map(({ tx, parsed }) => ({
      id: tx.id,
      date: tx.createdAt,
      name: tx.product?.name || '',
      sku: tx.product?.sku || '',
      location: parsed.location,
      kind: parsed.kind,
      qty: Math.abs(tx.quantity),
      by: tx.createdBy?.name || 'Admin',
      note: tx.note || '',
    }))

  const filteredHistory = transfers.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (t.sku || '').toLowerCase().includes(q) ||
      (t.name || '').toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q)
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
              <Select id="product" value={productId} onChange={(e) => { setProductId(e.target.value); setError(''); setSuccess('') }} required>
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — qty: {p.inventory?.quantity ?? 0}
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
                    <option key={l.id} value={l.name} disabled={l.name === to}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-1 flex justify-center">
                <ArrowRight size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="to">To</Label>
                <Select id="to" value={to} onChange={(e) => setTo(e.target.value)} required>
                  <option value="">Destination</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.name} disabled={l.name === from}>
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
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 pb-2">available: {availableQty}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Re-stock retail floor" />
            </div>

            <Button type="submit" variant="gold" className="w-full" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? 'Transferring...' : 'Transfer Stock'}
            </Button>
          </form>
        </Card>

        {/* Current location summary for selected product */}
        {selectedProduct && (
          <Card title={`Current stock: ${selectedProduct.name}`} icon={Package} className="xl:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locations.map((l) => (
                <div key={l.id} className="bg-royal-50/60 border border-gray-200 dark:border-white/[0.08] rounded-lg p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{l.name}</p>
                  <Badge tone={availableQty > 0 ? 'green' : 'gray'}>
                    {availableQty > 0 ? 'In stock' : 'Empty'}
                  </Badge>
                </div>
              ))}
              <div className="bg-royal-950/5 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg p-4 text-center md:col-span-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total available</p>
                <p className="text-2xl font-bold text-royal-950 dark:text-white mt-1">{availableQty} pcs</p>
              </div>
            </div>
          </Card>
        )}

        {/* Transfer history */}
        <Card title="Transfer History" icon={History} className="xl:col-span-3">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by product, SKU or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50 dark:bg-white/5 text-royal-900 dark:text-gray-200 text-left">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Direction</th>
                  <th className="px-5 py-3 font-semibold text-right">Qty</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">
                      No transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((t) => (
                    <tr key={t.id} className="hover:bg-royal-50 dark:hover:bg-white/5/50">
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">{formatDateTime(t.date)}</td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-royal-950 dark:text-white">{t.name}</span>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{t.sku}</p>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {t.kind === 'IN' ? (
                          <span className="text-emerald-600">+{t.qty} → {t.location}</span>
                        ) : (
                          <span className="text-amber-600">{t.location} → −{t.qty}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">{t.qty}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{t.by}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500">{t.note || '—'}</td>
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
