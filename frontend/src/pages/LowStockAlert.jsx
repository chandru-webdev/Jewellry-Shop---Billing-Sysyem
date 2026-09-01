import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Search, Package, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/FormControls'
import { formatINR } from '../utils/format'
import { reportsApi } from '../api/reports'
import { inventoryApi } from '../api/inventory'

export default function LowStockAlert() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [restock, setRestock] = useState(null)
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: () => reportsApi.inventory().then((r) => r.data.data),
  })

  const lowStock = (apiData?.lowStock || []).filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  const restockMutation = useMutation({
    mutationFn: (data) => inventoryApi.stockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-report'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setRestock(null)
      setQty('')
      setNote('')
      showToast('Stock added to inventory.')
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to add stock.'),
  })

  const handleRestock = (item) => {
    const amount = Number(qty)
    if (!amount || amount <= 0) {
      showToast('Enter a valid quantity.')
      return
    }
    restockMutation.mutate({ productId: item.id, quantity: amount, note: note || 'Restock from low stock alert' })
  }

  return (
    <div>
      <PageHeader title="Low Stock Alert" subtitle="Products at or below their reorder level" />

      {toast && <div className="mb-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">{toast}</div>}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>
        <Badge tone="orange">{lowStock.length} item{lowStock.length !== 1 ? 's' : ''} need reorder</Badge>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading inventory...</p>
        </Card>
      ) : lowStock.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <Package size={32} />
            <p className="text-sm">All products are above their reorder levels.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty On Hand</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Threshold</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Sell Value</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        <span className="font-medium text-royal-950 dark:text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{p.quantity} pcs</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.threshold} pcs</td>
                    <td className="px-4 py-3 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      {restock?.id === p.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            placeholder="Qty"
                            className="w-20"
                          />
                          <Button size="sm" onClick={() => handleRestock(p)} disabled={restockMutation.isPending}>
                            <Plus size={13} /> Add
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRestock(null); setQty(''); setNote('') }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => { setRestock(p); setQty(''); setNote('') }}>
                          <Plus size={13} /> Restock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}