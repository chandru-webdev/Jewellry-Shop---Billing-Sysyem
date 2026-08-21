import { useState } from 'react'
import { RefreshCw, Boxes, AlertTriangle, CheckCircle2, ArrowUpDown } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'


const DEMO_INVENTORY = [
  { sku: 'SC-925-18', name: 'Silver Chain 925 (18in)', erpStock: 48, shopifyStock: 48, match: true, lastSync: '2026-08-10 08:30 AM' },
  { sku: 'SC-925-22', name: 'Silver Chain 925 (22in)', erpStock: 35, shopifyStock: 30, match: false, lastSync: '2026-08-09 06:00 PM' },
  { sku: 'SR-PLN-01', name: 'Silver Ring Plain', erpStock: 65, shopifyStock: 65, match: true, lastSync: '2026-08-10 08:30 AM' },
  { sku: 'SR-STN-01', name: 'Silver Ring with Stone', erpStock: 8, shopifyStock: 12, match: false, lastSync: '2026-08-09 02:00 PM' },
  { sku: 'GP-SML-01', name: 'Gold Pendant Small', erpStock: 12, shopifyStock: 12, match: true, lastSync: '2026-08-10 08:30 AM' },
  { sku: 'SB-THN-01', name: 'Silver Bracelet Thin', erpStock: 32, shopifyStock: 32, match: true, lastSync: '2026-08-09 06:00 PM' },
  { sku: 'SE-DRP-01', name: 'Silver Earrings Drop', erpStock: 42, shopifyStock: 40, match: false, lastSync: '2026-08-09 06:00 PM' },
  { sku: 'SNR-01', name: 'Silver Nose Ring', erpStock: 55, shopifyStock: 55, match: true, lastSync: '2026-08-08 12:00 PM' },
]

export default function InventorySync() {
  const [inventory, setInventory] = useState(DEMO_INVENTORY)
  const [syncing, setSyncing] = useState(false)

  const total = inventory.length
  const inSync = inventory.filter((i) => i.match).length
  const mismatched = total - inSync
  const lastSync = '2026-08-10 08:30 AM'

  const syncItem = (sku) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.sku === sku ? { ...i, shopifyStock: i.erpStock, match: true, lastSync: 'Just now' } : i
      )
    )
  }

  const syncAll = () => {
    setSyncing(true)
    setTimeout(() => {
      setInventory((prev) =>
        prev.map((i) => ({ ...i, shopifyStock: i.erpStock, match: true, lastSync: 'Just now' }))
      )
      setSyncing(false)
    }, 800)
  }

  return (
    <div>
      <PageHeader title="Inventory Sync" subtitle="Sync stock levels between ERP and Shopify" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={syncAll} disabled={syncing || mismatched === 0}>
            <ArrowUpDown size={14} className={syncing ? 'animate-pulse' : ''} /> Sync All
          </Button>
          <Button variant="secondary" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Total SKUs</p>
            <Boxes size={16} className="text-royal-500" />
          </div>
          <p className="text-xl font-bold text-royal-600 mt-0.5">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">In Sync</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{inSync}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Mismatched</p>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600 mt-0.5">{mismatched}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Last Sync Time</p>
            <RefreshCw size={16} className="text-gray-400" />
          </div>
          <p className="text-sm font-bold text-royal-800 mt-1">{lastSync}</p>
        </div>
      </div>

      <Card noPadding className="overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600">Product Name</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">ERP Stock</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Shopify Stock</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Difference</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Last Sync</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, i) => {
                const diff = item.shopifyStock - item.erpStock
                return (
                  <tr key={item.sku} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-950">{item.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">{item.erpStock}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">{item.shopifyStock}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${diff !== 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.match ? (
                        <Badge tone="green"><CheckCircle2 size={11} className="mr-1" /> In Sync</Badge>
                      ) : (
                        <Badge tone="red"><AlertTriangle size={11} className="mr-1" /> Mismatch</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{item.lastSync}</td>
                    <td className="px-4 py-2.5 text-right">
                      {!item.match && (
                        <Button variant="ghost" size="sm" onClick={() => syncItem(item.sku)}>
                          <RefreshCw size={12} /> Sync
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-semibold text-sm text-royal-900">Sync Summary</h3>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className="inline-flex items-center gap-2 text-emerald-700 font-semibold">
              <CheckCircle2 size={15} /> Items Synced: <span className="font-bold">{inSync}</span> of {total}
            </span>
            <span className="inline-flex items-center gap-2 text-red-600 font-semibold">
              <AlertTriangle size={15} /> Mismatched: <span className="font-bold">{mismatched}</span> of {total}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
