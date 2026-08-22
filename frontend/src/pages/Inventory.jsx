import { useState } from 'react'
import { Boxes, Package, Gem, IndianRupee, AlertTriangle, XCircle, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const DEMO_INV = {
  totalProducts: 312,
  totalQuantity: 2853,
  totalWeight: 1248.70,
  inventoryValue: 2648700,
  lowStock: 18,
  outOfStock: 3,
  items: [
    { name: 'Silver Classic Ring', sku: 'SLV-RNG-00021', qty: 24, weight: 124.80, costValue: 11600, sellingValue: 14112, reorderLevel: 10, status: 'In Stock' },
    { name: 'Silver Chain 22"', sku: 'SLV-CHN-00008', qty: 5, weight: 89.50, costValue: 8300, sellingValue: 10150, reorderLevel: 12, status: 'Low Stock' },
    { name: 'Silver Bracelet', sku: 'SLV-BRC-00015', qty: 3, weight: 45.20, costValue: 4200, sellingValue: 5130, reorderLevel: 8, status: 'Low Stock' },
    { name: 'Silver Pendant', sku: 'SLV-PND-00012', qty: 2, weight: 31.60, costValue: 2930, sellingValue: 3584, reorderLevel: 6, status: 'Low Stock' },
    { name: 'Silver Earrings', sku: 'SLV-ERN-00031', qty: 6, weight: 38.40, costValue: 3560, sellingValue: 4352, reorderLevel: 15, status: 'Low Stock' },
    { name: 'Silver Anklet', sku: 'SLV-ANK-00044', qty: 18, weight: 112.30, costValue: 10420, sellingValue: 12744, reorderLevel: 8, status: 'In Stock' },
    { name: 'Silver Nose Pin', sku: 'SLV-NPS-00056', qty: 0, weight: 0, costValue: 0, sellingValue: 0, reorderLevel: 20, status: 'Out of Stock' },
    { name: 'Silver Toe Ring', sku: 'SLV-TRG-00062', qty: 42, weight: 84.60, costValue: 7840, sellingValue: 9592, reorderLevel: 10, status: 'In Stock' },
  ],
}

const statusTone = { 'In Stock': 'green', 'Low Stock': 'orange', 'Out of Stock': 'red' }

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const inv = DEMO_INV

  const filtered = inv.items.filter((item) => {
    if (search) {
      const q = search.toLowerCase()
      if (!item.name.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q)) return false
    }
    if (filterStatus && item.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <PageHeader title="Stock Overview" subtitle="Monitor inventory levels, weight and value across all products" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {[
          { icon: Package, label: 'Total Products', value: inv.totalProducts, color: 'text-royal-500 dark:text-gray-400' },
          { icon: Boxes, label: 'Total Quantity', value: `${inv.totalQuantity.toLocaleString('en-IN')} pcs`, color: 'text-blue-500' },
          { icon: Gem, label: 'Total Weight', value: `${inv.totalWeight} gm`, color: 'text-gold-500' },
          { icon: IndianRupee, label: 'Inventory Value', value: formatINR(inv.inventoryValue), color: 'text-emerald-500' },
          { icon: AlertTriangle, label: 'Low Stock', value: inv.lowStock, color: 'text-amber-500' },
          { icon: XCircle, label: 'Out of Stock', value: inv.outOfStock, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4 flex items-center gap-3">
            <s.icon size={18} className={s.color} />
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{s.label}</p>
              <p className="text-lg font-bold text-royal-950 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search product or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Qty</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Weight</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Cost Value</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Selling Value</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Reorder Level</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.sku} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-royal-950 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.sku}</td>
                  <td className="px-4 py-3 text-right font-semibold text-royal-900 dark:text-gray-200">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{item.weight.toFixed(2)} gm</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(item.costValue)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(item.sellingValue)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.reorderLevel}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
