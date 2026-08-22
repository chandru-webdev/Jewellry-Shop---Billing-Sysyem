import { useState } from 'react'
import { RefreshCw, Upload, Download, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const DEMO_PRODUCTS = [
  { shopifyId: '#12345', title: 'Silver Chain 925 - 18 inch', sku: 'SC-925-18', price: 3200, weight: '12g', stock: 48, status: 'active', lastSync: '2026-08-10 08:30 AM', erpMapped: true },
  { shopifyId: '#12346', title: 'Silver Chain 925 - 22 inch', sku: 'SC-925-22', price: 3800, weight: '15g', stock: 36, status: 'active', lastSync: '2026-08-10 08:32 AM', erpMapped: true },
  { shopifyId: '#12347', title: 'Silver Ring Plain', sku: 'SR-PLN-8', price: 2400, weight: '6g', stock: 52, status: 'active', lastSync: '2026-08-10 09:05 AM', erpMapped: true },
  { shopifyId: '#12348', title: 'Silver Ring with Stone', sku: 'SR-STN-7', price: 4500, weight: '8g', stock: 24, status: 'active', lastSync: '2026-08-10 09:10 AM', erpMapped: true },
  { shopifyId: '#12349', title: 'Gold Pendant Small', sku: 'GP-SML-1', price: 18500, weight: '4g', stock: 18, status: 'active', lastSync: '2026-08-11 11:20 AM', erpMapped: true },
  { shopifyId: '#12350', title: 'Silver Bracelet Thin', sku: 'SB-THN-16', price: 5200, weight: '14g', stock: 30, status: 'active', lastSync: null, erpMapped: false },
  { shopifyId: '#12351', title: 'Silver Earrings Drop', sku: 'SE-DRP-2', price: 3600, weight: '7g', stock: 40, status: 'active', lastSync: '2026-08-12 02:45 PM', erpMapped: true },
  { shopifyId: '#12352', title: 'Silver Nose Ring', sku: 'SNR-1', price: 1200, weight: '2g', stock: 65, status: 'draft', lastSync: null, erpMapped: false },
]

const statusColor = { active: 'green', draft: 'gray' }

export default function ProductsSync() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = DEMO_PRODUCTS.filter((p) => {
    if (filter === 'mapped' && !p.erpMapped) return false
    if (filter === 'unmapped' && p.erpMapped) return false
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.shopifyId.toLowerCase().includes(q)
    )
  })

  const total = DEMO_PRODUCTS.length
  const active = DEMO_PRODUCTS.filter((p) => p.status === 'active').length
  const mapped = DEMO_PRODUCTS.filter((p) => p.erpMapped).length
  const unmapped = total - mapped

  return (
    <div>
      <PageHeader title="Products Sync" subtitle="Manage Shopify product sync with ERP inventory" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm"><Download size={14} /> Pull from Shopify</Button>
          <Button variant="outline" size="sm"><Upload size={14} /> Push to Shopify</Button>
          <Button variant="secondary" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Products</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{total}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Active</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{active}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">ERP Mapped</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{mapped}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Unmapped</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{unmapped}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, SKU or Shopify ID..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1025] focus:outline-none focus:ring-2 focus:ring-royal-200 focus:border-royal-300 dark:border-white/10"
          />
        </div>
        {['all', 'mapped', 'unmapped'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filter === f ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f === 'mapped' ? 'Mapped' : 'Unmapped'}
          </button>
        ))}
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Price</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-center">Weight</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">ERP Mapped</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Last Sync</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.shopifyId} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-royal-950 dark:text-white">{p.title}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{p.shopifyId}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(p.price)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.weight}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.stock}</td>
                  <td className="px-4 py-2.5"><Badge tone={statusColor[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-2.5">
                    {p.erpMapped ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">✓ Mapped</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">✕ Unmapped</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.lastSync || 'Never'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm"><RefreshCw size={12} /> Sync</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
