import { useState } from 'react'
import { AlertTriangle, Search, Package } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'
import { mockProducts } from '../mock/products'

export default function LowStockAlert() {
  const [search, setSearch] = useState('')

  const lowStock = mockProducts
    .filter((p) => p.quantity <= p.reorderLevel)
    .filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    })
    .sort((a, b) => a.quantity - b.quantity)

  return (
    <div>
      <PageHeader title="Low Stock Alert" subtitle="Products at or below their reorder level" />

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

      {lowStock.length === 0 ? (
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
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">⚠</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty On Hand</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Reorder Level</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Cost Value</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Sell Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <AlertTriangle size={14} className="text-amber-500 mx-auto" />
                    </td>
                    <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{p.quantity} pcs</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.reorderLevel} pcs</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(p.costValue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(p.sellingPrice)}</td>
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
