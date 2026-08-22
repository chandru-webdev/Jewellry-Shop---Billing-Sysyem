import { useState } from 'react'
import { DollarSign, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const DEMO_PRICE_SYNC = [
  { sku: 'SC-925-18', name: 'Silver Chain 925 (18in)', erpPrice: 3200, shopifyPrice: 3200, match: true, status: 'Synced', lastSync: '2026-08-10 08:30 AM', pendingChange: null },
  { sku: 'SC-925-22', name: 'Silver Chain 925 (22in)', erpPrice: 3800, shopifyPrice: 3500, match: false, status: 'Pending Approval', lastSync: '2026-08-09 06:00 PM', pendingChange: { oldPrice: 3500, newPrice: 3800 } },
  { sku: 'SR-PLN-01', name: 'Silver Ring Plain', erpPrice: 1500, shopifyPrice: 1500, match: true, status: 'Synced', lastSync: '2026-08-10 08:30 AM', pendingChange: null },
  { sku: 'SR-STN-01', name: 'Silver Ring with Stone', erpPrice: 2200, shopifyPrice: 2000, match: false, status: 'Pending Approval', lastSync: '2026-08-09 02:00 PM', pendingChange: { oldPrice: 2000, newPrice: 2200 } },
  { sku: 'GP-SML-01', name: 'Gold Pendant Small', erpPrice: 22000, shopifyPrice: 22000, match: true, status: 'Synced', lastSync: '2026-08-10 08:30 AM', pendingChange: null },
  { sku: 'SB-THN-01', name: 'Silver Bracelet Thin', erpPrice: 2200, shopifyPrice: 2200, match: true, status: 'Synced', lastSync: '2026-08-09 06:00 PM', pendingChange: null },
  { sku: 'SE-DRP-01', name: 'Silver Earrings Drop', erpPrice: 1200, shopifyPrice: 1100, match: false, status: 'Pending Approval', lastSync: '2026-08-09 06:00 PM', pendingChange: { oldPrice: 1100, newPrice: 1200 } },
  { sku: 'SNR-01', name: 'Silver Nose Ring', erpPrice: 650, shopifyPrice: 650, match: true, status: 'Synced', lastSync: '2026-08-08 12:00 PM', pendingChange: null },
]

const statusTone = {
  Synced: 'green',
  'Pending Approval': 'orange',
}

export default function PriceSync() {
  const [items, setItems] = useState(DEMO_PRICE_SYNC)
  const [syncing, setSyncing] = useState(false)

  const total = items.length
  const inSync = items.filter((i) => i.status === 'Synced').length
  const pending = items.filter((i) => i.status === 'Pending Approval').length
  const mismatches = items.filter((i) => !i.match).length

  const approve = (sku) => {
    setItems((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? {
              ...item,
              status: 'Synced',
              match: true,
              shopifyPrice: item.pendingChange.newPrice,
              pendingChange: null,
              lastSync: new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            }
          : item
      )
    )
  }

  const reject = (sku) => {
    setItems((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? { ...item, status: 'Synced', match: true, pendingChange: null }
          : item
      )
    )
  }

  const syncAll = () => {
    setSyncing(true)
    setTimeout(() => {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'Synced',
          match: true,
          shopifyPrice: item.erpPrice,
          pendingChange: null,
          lastSync: new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        }))
      )
      setSyncing(false)
    }, 800)
  }

  return (
    <div>
      <PageHeader title="Price Sync" subtitle="Sync product prices between ERP and Shopify with approval workflow" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={syncAll} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync All Prices
          </Button>
          <Button variant="secondary" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Products</p>
            <DollarSign size={16} className="text-royal-400" />
          </div>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{total}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">In Sync</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{inSync}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Pending Approval</p>
            <Clock size={16} className="text-orange-500" />
          </div>
          <p className="text-xl font-bold text-orange-600 mt-0.5">{pending}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Price Mismatches</p>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600 mt-0.5">{mismatches}</p>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product Name</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">ERP Price</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Shopify Price</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Difference</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Last Sync</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const diff = item.shopifyPrice - item.erpPrice
                return (
                  <tr key={item.sku} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-950 dark:text-white">{item.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(item.erpPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(item.shopifyPrice)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${diff !== 0 ? 'text-red-600 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                      {formatINR(diff)}
                    </td>
                    <td className="px-4 py-2.5"><Badge tone={statusTone[item.status]}>{item.status}</Badge></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.lastSync}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {item.status === 'Pending Approval' && item.pendingChange ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 mr-1">
                            {formatINR(item.pendingChange.oldPrice)} → {formatINR(item.pendingChange.newPrice)}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => approve(item.sku)} className="text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle2 size={12} /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => reject(item.sku)} className="text-red-600 hover:bg-red-50">
                            <XCircle size={12} /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 size={12} /> Up to date
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
