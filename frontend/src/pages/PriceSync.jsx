import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'
import { shopifyApi } from '../api/shopify'

const statusTone = {
  Synced: 'green',
  'Pending Approval': 'orange',
}

export default function PriceSync() {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopify-price-comparison'],
    queryFn: () => shopifyApi.getPriceComparison().then((r) => r.data.data),
  })

  const syncAllMutation = useMutation({
    mutationFn: () => shopifyApi.syncAllPrices(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopify-price-comparison'] }),
  })

  const total = items.length
  const inSync = items.filter((i) => i.match).length
  const mismatches = items.filter((i) => i.match === false).length

  return (
    <div>
      <PageHeader title="Price Sync" subtitle="Sync product prices between ERP and Shopify" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending || mismatches === 0}>
            <RefreshCw size={14} className={syncAllMutation.isPending ? 'animate-spin' : ''} /> Sync All Prices
          </Button>
          <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['shopify-price-comparison'] })}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
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
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Loading price comparison...
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No products linked to Shopify.
                  </td>
                </tr>
              )}
              {items.map((item, i) => {
                const diff = (item.shopifyPrice ?? 0) - item.erpPrice
                return (
                  <tr key={item.sku} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-royal-950 dark:text-white">{item.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(item.erpPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{item.shopifyPrice != null ? formatINR(item.shopifyPrice) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${diff !== 0 ? 'text-red-600 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                      {item.shopifyPrice != null ? formatINR(diff) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.match === true ? (
                        <Badge tone="green"><CheckCircle2 size={11} className="mr-1" /> In Sync</Badge>
                      ) : item.match === false ? (
                        <Badge tone="orange"><AlertTriangle size={11} className="mr-1" /> Mismatch</Badge>
                      ) : (
                        <Badge tone="gray">Unknown</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
