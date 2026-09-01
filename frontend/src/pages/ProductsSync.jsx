import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Upload, Download, Search, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR, formatDateTime } from '../utils/format'
import { shopifyApi } from '../api/shopify'
import { productsApi } from '../api/products'

const statusColor = { active: 'green', draft: 'gray', archived: 'gray' }

export default function ProductsSync() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const previewQuery = useQuery({
    queryKey: ['shopify-preview'],
    queryFn: () => shopifyApi.fetchProducts({ limit: 250 }).then((r) => r.data.data),
    retry: false,
  })

  const erpQuery = useQuery({
    queryKey: ['erp-products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
    retry: false,
  })

  // The ERP Product and Shopify Product are treated as "mapped" when their SKU
  // lines up. Imported products created via pull-products keep the Shopify sku.
  const erpBySku = useMemo(() => {
    const map = new Map()
    ;(erpQuery.data || []).forEach((p) => {
      if (p.sku) map.set(String(p.sku).trim().toLowerCase(), p)
    })
    return map
  }, [erpQuery.data])

  const products = useMemo(() => {
    return (previewQuery.data || []).map((p) => {
      const erp = erpBySku.get(String(p.sku || '').trim().toLowerCase())
      return { ...p, erpId: erp?.id || null, erpMapped: Boolean(erp) }
    })
  }, [previewQuery.data, erpBySku])

  const refreshAll = () => {
    previewQuery.refetch()
    erpQuery.refetch()
  }

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullProducts(),
    onSuccess: (res) => {
      const r = res.data.data
      showToast(`Pulled ${r.created ?? 0} new, updated ${r.updated ?? 0}${r.failed ? `, failed ${r.failed}` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['shopify-preview'] })
      queryClient.invalidateQueries({ queryKey: ['erp-products'] })
    },
    onError: (err) => showToast(err.response?.data?.message || err.message || 'Pull failed', 'error'),
  })

  const pushMutation = useMutation({
    mutationFn: () => shopifyApi.syncAllProducts(),
    onSuccess: (res) => {
      const r = res.data.data
      showToast(`Pushed ${r.ok ?? 0} products to Shopify${r.failed ? `, failed ${r.failed}` : ''}`)
      refreshAll()
    },
    onError: (err) => showToast(err.response?.data?.message || err.message || 'Push failed', 'error'),
  })

  const syncMutation = useMutation({
    mutationFn: (erpId) => shopifyApi.syncProduct(erpId),
    onSuccess: () => {
      showToast('Product synced to Shopify')
      refreshAll()
    },
    onError: (err) => showToast(err.response?.data?.message || err.message || 'Sync failed', 'error'),
  })

  const configError = previewQuery.isError
    ? (previewQuery.error.response?.data?.message || previewQuery.error.message || '')
    : ''

  const filtered = products.filter((p) => {
    if (filter === 'mapped' && !p.erpMapped) return false
    if (filter === 'unmapped' && p.erpMapped) return false
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      String(p.shopifyId).includes(q)
    )
  })

  const total = products.length
  const active = products.filter((p) => p.status === 'active').length
  const mapped = products.filter((p) => p.erpMapped).length
  const unmapped = total - mapped
  const busy = pullMutation.isPending || pushMutation.isPending

  return (
    <div>
      <PageHeader title="Products Sync" subtitle="Manage Shopify product sync with ERP inventory" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} disabled={busy}>
            {pullMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Pulling...</> : <><Download size={14} /> Pull from Shopify</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => pushMutation.mutate()} disabled={busy}>
            {pushMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Pushing...</> : <><Upload size={14} /> Push to Shopify</>}
          </Button>
          <Button variant="secondary" size="sm" onClick={refreshAll} disabled={busy}>
            {previewQuery.isFetching || erpQuery.isFetching ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={14} /> Refresh</>}
          </Button>
        </div>
      } />

      {toast && (
        <div className={`mb-3 text-sm rounded-lg px-4 py-2 border flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {toast.message}
        </div>
      )}

      {configError && (
        <div className="mb-3 text-sm rounded-lg px-4 py-2 border flex items-center gap-2 bg-amber-50 text-amber-800 border-amber-200">
          <AlertTriangle size={14} />
          Shopify is unreachable or not configured: {configError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total on Shopify</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{total}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Active</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{active}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">ERP Mapped</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{mapped}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Unmapped</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{unmapped}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, SKU or Shopify ID..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1025] focus:outline-none focus:ring-2 focus:ring-royal-200 focus:border-royal-300" />
        </div>
        {['all', 'mapped', 'unmapped'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filter === f ? 'bg-royal-100 dark:bg-white/10 text-royal-700 dark:text-gray-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
            {f === 'all' ? 'All' : f === 'mapped' ? 'Mapped' : 'Unmapped'}
          </button>
        ))}
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Product</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Price</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-center">Weight</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">ERP Mapped</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Last Update</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {previewQuery.isLoading && (
                <tr><td colSpan="9" className="px-4 py-10 text-center text-sm text-gray-400"><Loader2 size={16} className="inline animate-spin mr-2" />Loading products from Shopify...</td></tr>
              )}
              {!previewQuery.isLoading && filtered.map((p, i) => (
                <tr key={p.shopifyId} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-royal-950 dark:text-white">{p.title}</p>
                    <p className="text-[11px] text-gray-400 font-mono">#{p.shopifyId}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{p.sku || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(p.price)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{p.weight ? `${p.weight} ${p.weightUnit || 'g'}` : '—'}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-gray-600 dark:text-gray-400">{p.inventoryQuantity ?? '—'}</td>
                  <td className="px-4 py-2.5"><Badge tone={statusColor[p.status] || 'gray'}>{p.status}</Badge></td>
                  <td className="px-4 py-2.5">
                    {p.erpMapped ? (
                      <span className="text-emerald-600 text-xs font-semibold">Mapped</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-semibold">Unmapped</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{p.updatedAt ? formatDateTime(p.updatedAt) : '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {p.erpMapped ? (
                      <Button variant="ghost" size="sm" onClick={() => syncMutation.mutate(p.erpId)} disabled={busy || (syncMutation.isPending && syncMutation.variables === p.erpId)}>
                        {syncMutation.isPending && syncMutation.variables === p.erpId ? <Loader2 size={12} className="animate-spin" /> : <><RefreshCw size={12} /> Sync</>}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-gray-400">Needs SKU match</span>
                    )}
                  </td>
                </tr>
              ))}
              {!previewQuery.isLoading && filtered.length === 0 && (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-400">{configError ? 'Unable to load products from Shopify' : 'No products found'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}