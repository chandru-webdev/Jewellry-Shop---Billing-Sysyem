import { useState } from 'react'
import { Download, Package, AlertTriangle, TrendingDown, Warehouse } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const STOCK_SUMMARY = [
  { id: 1, name: 'Silver Chain 925 (18in)', sku: 'SC-925-18', category: 'Chains', quantity: 48, reorderLevel: 10, status: 'In Stock' },
  { id: 2, name: 'Silver Chain 925 (22in)', sku: 'SC-925-22', category: 'Chains', quantity: 35, reorderLevel: 10, status: 'In Stock' },
  { id: 3, name: 'Silver Ring Plain', sku: 'SR-PLN-01', category: 'Rings', quantity: 65, reorderLevel: 15, status: 'In Stock' },
  { id: 4, name: 'Silver Ring with Stone', sku: 'SR-STN-01', category: 'Rings', quantity: 8, reorderLevel: 10, status: 'Low Stock' },
  { id: 5, name: 'Gold Pendant Small', sku: 'GP-SML-01', category: 'Pendants', quantity: 12, reorderLevel: 5, status: 'In Stock' },
  { id: 6, name: 'Silver Bracelet Thin', sku: 'SB-THN-01', category: 'Bracelets', quantity: 32, reorderLevel: 10, status: 'In Stock' },
  { id: 7, name: 'Silver Earrings Drop', sku: 'SE-DRP-01', category: 'Earrings', quantity: 42, reorderLevel: 12, status: 'In Stock' },
  { id: 8, name: 'Silver Anklet 10in', sku: 'SA-10-01', category: 'Anklets', quantity: 3, reorderLevel: 8, status: 'Critical' },
  { id: 9, name: 'Silver Nose Ring', sku: 'SNR-01', category: 'Nose Rings', quantity: 55, reorderLevel: 15, status: 'In Stock' },
  { id: 10, name: 'Gold Chain 22in', sku: 'GC-22-01', category: 'Chains', quantity: 8, reorderLevel: 3, status: 'In Stock' },
  { id: 11, name: 'Silver Toe Ring', sku: 'STR-01', category: 'Toe Rings', quantity: 45, reorderLevel: 12, status: 'In Stock' },
  { id: 12, name: 'Silver Pendant Heart', sku: 'SP-HRT-01', category: 'Pendants', quantity: 2, reorderLevel: 8, status: 'Critical' },
]

const STOCK_MOVEMENT = [
  { date: '2026-08-10', product: 'Silver Chain 925 (18in)', type: 'OUT', quantity: 5, reference: 'INV-2026-001', balance: 48 },
  { date: '2026-08-10', product: 'Silver Ring Plain', type: 'OUT', quantity: 8, reference: 'INV-2026-002', balance: 65 },
  { date: '2026-08-09', product: 'Silver Chain 925 (22in)', type: 'IN', quantity: 20, reference: 'PO-2026-015', balance: 35 },
  { date: '2026-08-09', product: 'Gold Pendant Small', type: 'OUT', quantity: 3, reference: 'INV-2026-003', balance: 12 },
  { date: '2026-08-08', product: 'Silver Earrings Drop', type: 'OUT', quantity: 6, reference: 'INV-2026-004', balance: 42 },
  { date: '2026-08-08', product: 'Silver Anklet 10in', type: 'OUT', quantity: 4, reference: 'INV-2026-005', balance: 3 },
  { date: '2026-08-07', product: 'Silver Bracelet Thin', type: 'IN', quantity: 15, reference: 'PO-2026-014', balance: 32 },
  { date: '2026-08-07', product: 'Silver Nose Ring', type: 'OUT', quantity: 10, reference: 'INV-2026-006', balance: 55 },
  { date: '2026-08-06', product: 'Silver Pendant Heart', type: 'OUT', quantity: 5, reference: 'INV-2026-007', balance: 2 },
  { date: '2026-08-06', product: 'Silver Toe Ring', type: 'IN', quantity: 25, reference: 'PO-2026-013', balance: 45 },
  { date: '2026-08-05', product: 'Silver Ring with Stone', type: 'OUT', quantity: 7, reference: 'INV-2026-008', balance: 8 },
  { date: '2026-08-05', product: 'Gold Chain 22in', type: 'IN', quantity: 5, reference: 'PO-2026-012', balance: 8 },
]

const VALUATION = [
  { name: 'Silver Chain 925 (18in)', sku: 'SC-925-18', quantity: 48, costPrice: 1800, sellPrice: 3200, costValue: 86400, sellValue: 153600, margin: 73.3 },
  { name: 'Silver Chain 925 (22in)', sku: 'SC-925-22', quantity: 35, costPrice: 2200, sellPrice: 3800, costValue: 77000, sellValue: 133000, margin: 72.7 },
  { name: 'Silver Ring Plain', sku: 'SR-PLN-01', quantity: 65, costPrice: 800, sellPrice: 1500, costValue: 52000, sellValue: 97500, margin: 87.5 },
  { name: 'Gold Pendant Small', sku: 'GP-SML-01', quantity: 12, costPrice: 15000, sellPrice: 22000, costValue: 180000, sellValue: 264000, margin: 56.7 },
  { name: 'Silver Bracelet Thin', sku: 'SB-THN-01', quantity: 32, costPrice: 1200, sellPrice: 2200, costValue: 38400, sellValue: 70400, margin: 83.3 },
  { name: 'Silver Earrings Drop', sku: 'SE-DRP-01', quantity: 42, costPrice: 600, sellPrice: 1200, costValue: 25200, sellValue: 50400, margin: 100 },
  { name: 'Silver Nose Ring', sku: 'SNR-01', quantity: 55, costPrice: 300, sellPrice: 650, costValue: 16500, sellValue: 35750, margin: 116.7 },
  { name: 'Gold Chain 22in', sku: 'GC-22-01', quantity: 8, costPrice: 45000, sellPrice: 68000, costValue: 360000, sellValue: 544000, margin: 51.1 },
]

const tabs = [
  { key: 'summary', label: 'Stock Summary', icon: Warehouse },
  { key: 'movement', label: 'Stock Movement', icon: TrendingDown },
  { key: 'valuation', label: 'Valuation', icon: Package },
  { key: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
]

const statusColor = { 'In Stock': 'green', 'Low Stock': 'orange', 'Critical': 'red' }

export default function InventoryReports() {
  const [activeTab, setActiveTab] = useState('summary')
  const [search, setSearch] = useState('')

  const totalSKUs = STOCK_SUMMARY.length
  const totalUnits = STOCK_SUMMARY.reduce((s, p) => s + p.quantity, 0)
  const totalValue = VALUATION.reduce((s, v) => s + v.sellValue, 0)
  const belowReorder = STOCK_SUMMARY.filter((p) => p.quantity <= p.reorderLevel).length

  const filteredSummary = STOCK_SUMMARY.filter((p) => {
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <PageHeader title="Inventory Reports" subtitle="Stock levels, movements, valuation and reorder alerts" actions={
        <Button variant="outline"><Download size={14} className="mr-1" /> Export CSV</Button>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total SKUs</p></div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{totalSKUs}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><Warehouse size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Units</p></div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{totalUnits}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-royal-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Value</p></div>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-500" /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Below Reorder</p></div>
          <p className="text-xl font-bold text-red-600 mt-0.5">{belowReorder}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1 mb-5 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${activeTab === t.key ? 'bg-white dark:bg-[#1a1025] text-royal-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}>
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
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Category</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Qty</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Reorder Level</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummary.map((p, i) => (
                  <tr key={p.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-medium text-royal-800">{p.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{p.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.reorderLevel}</td>
                    <td className="px-4 py-2.5"><Badge tone={statusColor[p.status] || 'gray'}>{p.status}</Badge></td>
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
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Qty</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Reference</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {STOCK_MOVEMENT.map((m, i) => (
                  <tr key={i} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{m.date}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-800">{m.product}</td>
                    <td className="px-4 py-2.5"><Badge tone={m.type === 'IN' ? 'green' : 'red'}>{m.type === 'IN' ? 'IN' : 'OUT'}</Badge></td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{m.quantity}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{m.reference}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{m.balance}</td>
                  </tr>
                ))}
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
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Qty</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Cost Price</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Sell Price</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Cost Value</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Sell Value</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {VALUATION.map((v, i) => (
                  <tr key={v.sku} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-medium text-royal-800">{v.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{v.sku}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{v.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(v.costPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(v.sellPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-700">{formatINR(v.costValue)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">{formatINR(v.sellValue)}</td>
                    <td className="px-4 py-2.5 text-right font-mono"><Badge tone="green">{v.margin.toFixed(1)}%</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-royal-50 border-t-2 border-royal-200 font-semibold">
                  <td className="px-4 py-3 text-royal-800" colSpan={5}>Total</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">{formatINR(VALUATION.reduce((s, v) => s + v.costValue, 0))}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(VALUATION.reduce((s, v) => s + v.sellValue, 0))}</td>
                  <td className="px-4 py-3 text-right font-mono"><Badge tone="green">{((VALUATION.reduce((s, v) => s + v.sellValue, 0) / VALUATION.reduce((s, v) => s + v.costValue, 0) - 1) * 100).toFixed(1)}%</Badge></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'lowStock' && (
        <div>
          <Card title="Low Stock Alerts" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Category</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Current Qty</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Reorder Level</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Shortage</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {STOCK_SUMMARY.filter((p) => p.quantity <= p.reorderLevel).map((p, i) => {
                    const shortage = p.reorderLevel - p.quantity
                    const urgency = p.quantity === 0 ? 'Out of Stock' : p.quantity <= p.reorderLevel * 0.3 ? 'Critical' : 'Low'
                    const urgencyColor = urgency === 'Critical' || urgency === 'Out of Stock' ? 'red' : 'orange'
                    return (
                      <tr key={p.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-2.5 font-medium text-royal-800">{p.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.category}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{p.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.reorderLevel}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-600">{shortage}</td>
                        <td className="px-4 py-2.5"><Badge tone={urgencyColor}>{urgency}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
