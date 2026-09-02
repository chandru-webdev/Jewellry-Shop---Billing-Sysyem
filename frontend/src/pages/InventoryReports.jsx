import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Package, AlertTriangle, TrendingDown, Warehouse } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'
import { reportsApi } from '../api/reports'
import { inventoryApi } from '../api/inventory'

const tabs = [
  { key: 'summary', label: 'Stock Summary', icon: Warehouse },
  { key: 'movement', label: 'Stock Movement', icon: TrendingDown },
  { key: 'valuation', label: 'Valuation', icon: Package },
  { key: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
]

const statusColor = { 'In Stock': 'green', 'Low Stock': 'orange', 'Critical': 'red', 'Out of Stock': 'red' }

function stockStatus(qty, threshold) {
  if (qty === 0) return 'Out of Stock'
  if (qty <= threshold * 0.3) return 'Critical'
  if (qty <= threshold) return 'Low Stock'
  return 'In Stock'
}

export default function InventoryReports() {
  const [activeTab, setActiveTab] = useState('summary')
  const [search, setSearch] = useState('')

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory().then((r) => r.data.data),
    retry: false,
  })
  const { data: invResponse } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: () => inventoryApi.list().then((r) => r.data.data),
    retry: false,
  })
  const { data: txResponse } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => inventoryApi.transactions().then((r) => r.data.data),
    retry: false,
  })

  const rows = (invResponse || []).map((inv) => ({
    id: inv.product?.id ?? inv.id,
    name: inv.product?.name ?? '—',
    sku: inv.product?.sku ?? '—',
    category: inv.product?.category?.name ?? '—',
    quantity: inv.quantity ?? 0,
    reorderLevel: inv.product?.lowStockThreshold ?? 0,
    costPrice: Number(inv.product?.costPrice || 0),
    sellPrice: Number(inv.product?.sellingPrice || 0),
  }))

  const summary = report?.summary || { products: 0, totalUnits: 0, stockValue: 0, lowStockCount: 0 }
  const lowStock = report?.lowStock || []
  const tx = txResponse || []

  const filteredRows = rows.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  const handleExportCSV = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Quantity', 'Reorder Level', 'Status']
    const csvRows = rows.map((p) => [p.name, p.sku, p.category, p.quantity, p.reorderLevel, stockStatus(p.quantity, p.reorderLevel)])
    const csv = [headers.join(','), ...csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'stock-summary-export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totCostValue = rows.reduce((s, p) => s + p.costPrice * p.quantity, 0)
  const totSellValue = rows.reduce((s, p) => s + p.sellPrice * p.quantity, 0)

  return (
    <div>
      <PageHeader title="Inventory Reports" subtitle="Stock levels, movements, valuation and reorder alerts" actions={
        <Button variant="outline" onClick={handleExportCSV}><Download size={14} className="mr-1" /> Export CSV</Button>
      } />

      {reportLoading ? (
        <Card className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading inventory…</Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-royal-500 dark:text-gray-400" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total SKUs</p></div>
              <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{summary.products}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1"><Warehouse size={14} className="text-royal-500 dark:text-gray-400" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total Units</p></div>
              <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{summary.totalUnits}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-royal-500 dark:text-gray-400" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Stock Value</p></div>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(summary.stockValue)}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Below Reorder</p></div>
              <p className="text-xl font-bold text-red-600 mt-0.5">{summary.lowStockCount}</p>
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1 mb-5 w-fit">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${activeTab === t.key ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'summary' && (
            <Card title="Stock Summary" className="p-0 overflow-hidden">
              <div className="px-4 pt-4">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 w-72 mb-4">
                  <Package size={14} className="text-gray-400 dark:text-gray-500" />
                  <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Category</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Qty</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Reorder Level</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">No products with tracked stock.</td></tr>
                    )}
                    {filteredRows.map((p, i) => (
                      <tr key={p.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{p.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{p.sku}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.category}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">{p.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400">{p.reorderLevel}</td>
                        <td className="px-4 py-2.5"><Badge tone={statusColor[stockStatus(p.quantity, p.reorderLevel)]}>{stockStatus(p.quantity, p.reorderLevel)}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'movement' && (
            <Card title="Stock Movement Log" className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Date</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Type</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Qty</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Reference</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">No stock movements recorded yet.</td></tr>}
                    {tx.map((m, i) => {
                      const direction = (m.quantity ?? 0) >= 0 ? 'IN' : 'OUT'
                      return (
                        <tr key={m.id ?? i} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{new Date(m.createdAt).toISOString().slice(0, 10)}</td>
                          <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{m.product?.name ?? '—'}</td>
                          <td className="px-4 py-2.5"><Badge tone={direction === 'IN' ? 'green' : 'red'}>{direction}</Badge></td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{Math.abs(m.quantity ?? 0)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{m.reference || m.note || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">{m.createdBy?.name || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'valuation' && (
            <Card title="Inventory Valuation" className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Qty</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Cost Price</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Sell Price</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Cost Value</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Sell Value</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter((v) => v.costPrice > 0 || v.sellPrice > 0).length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">No priced stock to value.</td></tr>}
                    {rows.filter((v) => v.costPrice > 0 || v.sellPrice > 0).map((v, i) => {
                      const margin = v.costPrice > 0 ? ((v.sellPrice - v.costPrice) / v.costPrice) * 100 : 0
                      return (
                        <tr key={v.sku} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                          <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{v.name}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{v.sku}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{v.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">{formatINR(v.costPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">{formatINR(v.sellPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-700">{formatINR(v.costPrice * v.quantity)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">{formatINR(v.sellPrice * v.quantity)}</td>
                          <td className="px-4 py-2.5 text-right font-mono"><Badge tone="green">{margin.toFixed(1)}%</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-royal-50 dark:bg-white/5 border-t-2 border-royal-200 dark:border-white/10 font-semibold">
                      <td className="px-4 py-3 text-royal-800 dark:text-gray-200" colSpan={5}>Total</td>
                      <td className="px-4 py-3 text-right font-mono text-red-700">{formatINR(totCostValue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(totSellValue)}</td>
                      <td className="px-4 py-3 text-right font-mono"><Badge tone="green">{totCostValue > 0 ? ((totSellValue / totCostValue - 1) * 100).toFixed(1) : '—'}%</Badge></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'lowStock' && (
            <Card title="Low Stock Alerts" className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Category</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Current Qty</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Reorder Level</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Shortage</th>
                      <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Urgency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">All stock above reorder level.</td></tr>}
                    {lowStock.map((p, i) => {
                      const shortage = p.threshold - p.quantity
                      const urgency = p.quantity === 0 ? 'Out of Stock' : p.quantity <= p.threshold * 0.3 ? 'Critical' : 'Low'
                      const urgencyColor = urgency === 'Critical' || urgency === 'Out of Stock' ? 'red' : 'orange'
                      return (
                        <tr key={p.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                          <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{p.name}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{p.sku}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.category ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{p.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400">{p.threshold}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-600">{shortage}</td>
                          <td className="px-4 py-2.5"><Badge tone={urgencyColor}>{urgency}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}