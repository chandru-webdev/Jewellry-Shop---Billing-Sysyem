import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Boxes, AlertTriangle, CheckCircle2, ArrowUpDown } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { shopifyApi } from '../api/shopify'

export default function InventorySync() {
  const queryClient = useQueryClient()

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['shopify-inventory-comparison'],
    queryFn: () => shopifyApi.getInventoryComparison().then((r) => r.data.data),
  })

  const syncAllMutation = useMutation({
    mutationFn: () => import('../api/shopify').then((m) => m.shopifyApi.syncAllInventory()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-inventory-comparison'] })
    },
  })

  const total = inventory.length
  const inSync = inventory.filter((i) => i.match).length
  const mismatched = total - inSync

  return (
    <div>
      <PageHeader title="Inventory Sync" subtitle="Sync stock levels between ERP and Shopify" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending || mismatched === 0}>
            <ArrowUpDown size={14} className={syncAllMutation.isPending ? 'animate-pulse' : ''} /> Sync All
          </Button>
          <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['shopify-inventory-comparison'] })}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total SKUs</p>
            <Boxes size={16} className="text-royal-500 dark:text-gray-400" />
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
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Mismatched</p>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600 mt-0.5">{mismatched}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Last Sync Time</p>
            <RefreshCw size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-bold text-royal-800 dark:text-gray-200 mt-1">{inventory[0]?.lastSync || 'Never'}</p>
        </div>
      </div>

      <Card noPadding className="overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Product Name</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">ERP Stock</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Shopify Stock</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Difference</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Loading inventory comparison...
                  </td>
                </tr>
              )}
              {!isLoading && inventory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No products linked to Shopify. Pull products from Shopify first.
                  </td>
                </tr>
              )}
              {inventory.map((item, i) => {
                const diff = (item.shopifyStock ?? 0) - item.erpStock
                return (
                  <tr key={item.sku} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-950 dark:text-white">{item.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">{item.erpStock}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">{item.shopifyStock ?? '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${diff !== 0 ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.match === true ? (
                        <Badge tone="green"><CheckCircle2 size={11} className="mr-1" /> In Sync</Badge>
                      ) : item.match === false ? (
                        <Badge tone="red"><AlertTriangle size={11} className="mr-1" /> Mismatch</Badge>
                      ) : (
                        <Badge tone="gray">Unknown</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.lastSync || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-semibold text-sm text-royal-900 dark:text-gray-200">Sync Summary</h3>
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
