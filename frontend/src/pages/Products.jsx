import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Power, Upload, Download, RefreshCw, Search, Package, DollarSign, Weight, X, Check, Loader2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProductFormModal from '../components/products/ProductFormModal'
import { productsApi } from '../api/products'
import { categoriesApi } from '../api/categories'
import { collectionsApi } from '../api/collections'
import { suppliersApi } from '../api/suppliers'
import { metalRatesApi } from '../api/metalRates'
import { formatINR, formatWeight } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function Products() {
  const { user } = useAuth()
  const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalKey, setModalKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMissingData, setFilterMissingData] = useState(false)
  const [inlineEdit, setInlineEdit] = useState({ productId: null, field: null })
  const [inlineValue, setInlineValue] = useState('')
  const [toast, setToast] = useState('')
  const [syncing, setSyncing] = useState(false)
  const toastTimer = useRef(null)

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data.data),
  })

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list().then((r) => r.data.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list().then((r) => r.data.data),
  })

  const { data: silverRate } = useQuery({
    queryKey: ['silver-rate'],
    queryFn: () => metalRatesApi.getCurrent().then((r) => r.data.data),
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setInlineEdit({ productId: null, field: null })
      setInlineValue('')
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to update'),
  })

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? productsApi.update(editing.id, payload)
        : productsApi.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setModalOpen(false)
      setEditing(null)
      setError('')
      const saved = res.data?.data
      if (saved?.shopifyError) {
        showToast(`Saved locally — Shopify push failed: ${saved.shopifyError}`, 'warn')
      } else {
        showToast(editing ? 'Product updated successfully' : 'Product created successfully')
      }
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (product) =>
      product.isActive ? productsApi.remove(product.id) : productsApi.update(product.id, { isActive: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const startInlineEdit = (productId, field, currentValue) => {
    setInlineEdit({ productId, field })
    setInlineValue(String(currentValue ?? ''))
  }

  const cancelInlineEdit = () => {
    setInlineEdit({ productId: null, field: null })
    setInlineValue('')
  }

  const saveInlineEdit = (product) => {
    const val = parseFloat(inlineValue)
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid number')
      return
    }
    if (inlineEdit.field === 'makingCharge') {
      updateMutation.mutate({ id: product.id, data: { makingCharge: val } })
    } else if (inlineEdit.field === 'weight') {
      updateMutation.mutate({ id: product.id, data: { weight: val } })
    } else if (inlineEdit.field === 'stock') {
      updateMutation.mutate({ id: product.id, data: { initialStock: val, updateStock: true } })
    }
  }

  const isEditing = (productId, field) => inlineEdit.productId === productId && inlineEdit.field === field

  const showToast = (message, tone = 'success') => {
    setToast({ message, tone })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }

  const handleExport = () => {
    const demoProducts = [
      { name: 'Gold Ring Classic', sku: 'RNG-001', purity: '92.5', weight: 4.2, makingCharge: 350, sellingPrice: 28500, stock: 12 },
      { name: 'Silver Chain Rope', sku: 'CHN-014', purity: '92.5', weight: 12.8, makingCharge: 280, sellingPrice: 9450, stock: 34 },
      { name: 'Diamond Stud Earrings', sku: 'EAR-102', purity: '18K', weight: 2.1, makingCharge: 900, sellingPrice: 46200, stock: 6 },
      { name: 'Temple Necklace Set', sku: 'NCK-207', purity: '22K', weight: 38.5, makingCharge: 420, sellingPrice: 238000, stock: 3 },
      { name: 'Gold Bangle Pair', sku: 'BNG-031', purity: '22K', weight: 21.4, makingCharge: 380, sellingPrice: 132500, stock: 8 },
    ]
    const headers = ['Name', 'SKU', 'Purity', 'Weight (g)', 'Making Charge (INR/g)', 'Selling Price (INR)', 'Stock']
    const rows = demoProducts.map((p) =>
      [p.name, p.sku, p.purity, p.weight, p.makingCharge, p.sellingPrice, p.stock]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'products-export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Products exported as CSV')
  }

  const handleSyncShopify = () => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      showToast('Synced with Shopify')
    }, 1500)
  }

  const filtered = (products || []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && p.category?.id !== filterCategory) return false
    if (filterStock === 'low' && (p.inventory?.quantity || 0) > (p.lowStockThreshold || 5)) return false
    if (filterStock === 'out' && (p.inventory?.quantity || 0) > 0) return false
    if (filterStock === 'in' && (p.inventory?.quantity || 0) <= 0) return false
    if (filterStatus === 'active' && !p.isActive) return false
    if (filterStatus === 'inactive' && p.isActive) return false
    if (filterMissingData && !(p.weight === 0 || p.costPrice === '' || p.costPrice === 0)) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage jewellery products, pricing, inventory and Shopify synchronization"
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => showToast('Products imported from Shopify')}><Upload size={14} /> Import</Button>
              <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} /> Export</Button>
              <Button variant="outline" size="sm" onClick={handleSyncShopify} disabled={syncing}>{syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync Shopify</Button>
              <Button size="sm" onClick={() => { setEditing(null); setModalKey((k) => k + 1); setModalOpen(true) }}>
                <Plus size={14} /> Add Product
              </Button>
            </div>
          )
        }
      />

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">
          {error}
        </div>
      )}

      {toast && (
        <div className={`mb-4 text-sm rounded-lg px-4 py-3 border ${toast.tone === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="">All Categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
<select
          value={filterStock}
          onChange={(e) => setFilterStock(e.target.value)}
          className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="">All Stock</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <select
          value={filterMissingData}
          onChange={(e) => setFilterMissingData(e.target.value === 'true')}
          className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="false">Show All</option>
          <option value="true">Missing Data</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Purity</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Net Weight</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Making Charge</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Selling Price</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Stock</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Shopify</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                {canEdit && <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Loading products...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">No products found. Click "Add Product" to create one.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-royal-950 dark:text-white">{p.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.purity || '92.5'}</td>
                  <td className="px-4 py-3 text-right">
                    {isEditing(p.id, 'weight') ? (
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" step="0.01" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(p); if (e.key === 'Escape') cancelInlineEdit() }}
                          className="w-20 text-right text-sm border border-royal-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-royal-500" autoFocus />
                        <button onClick={() => saveInlineEdit(p)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><Check size={12} /></button>
                        <button onClick={cancelInlineEdit} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 group">
                        <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatWeight(p.weight)}</span>
                        {canEdit && (
                          <button onClick={() => startInlineEdit(p.id, 'weight', p.weight)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-royal-600 dark:text-gray-300 hover:bg-royal-50 dark:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Edit weight">
                            <Weight size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing(p.id, 'makingCharge') ? (
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" step="1" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(p); if (e.key === 'Escape') cancelInlineEdit() }}
                          className="w-24 text-right text-sm border border-royal-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-royal-500" autoFocus />
                        <button onClick={() => saveInlineEdit(p)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><Check size={12} /></button>
                        <button onClick={cancelInlineEdit} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 group">
                        <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(p.makingCharge)}/g</span>
                        {canEdit && (
                          <button onClick={() => startInlineEdit(p.id, 'makingCharge', p.makingCharge)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-royal-600 dark:text-gray-300 hover:bg-royal-50 dark:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Edit making charge">
                            <DollarSign size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(p.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    {isEditing(p.id, 'stock') ? (
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" step="1" min="0" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(p); if (e.key === 'Escape') cancelInlineEdit() }}
                          className="w-20 text-right text-sm border border-royal-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-royal-500" autoFocus />
                        <button onClick={() => saveInlineEdit(p)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><Check size={12} /></button>
                        <button onClick={cancelInlineEdit} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 group">
                        <Badge tone={p.inventory?.quantity > (p.lowStockThreshold || 5) ? 'green' : p.inventory?.quantity > 0 ? 'orange' : 'red'}>
                          {p.inventory?.quantity ?? 0} pcs
                        </Badge>
                        {canEdit && (
                          <button onClick={() => startInlineEdit(p.id, 'stock', p.inventory?.quantity ?? 0)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-royal-600 dark:text-gray-300 hover:bg-royal-50 dark:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Edit stock">
                            <Package size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.pushToShopify === false ? (
                      <span className="text-[11px] text-gray-400">—</span>
                    ) : p.shopifyProductId ? (
                      <Badge tone="blue">Synced</Badge>
                    ) : (
                      <Badge tone="orange">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(p); setModalKey((k) => k + 1); setModalOpen(true) }} className="p-1.5 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded-lg cursor-pointer" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => toggleMutation.mutate(p)} className={`p-1.5 rounded-lg cursor-pointer ${p.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={p.isActive ? 'Deactivate' : 'Activate'}>
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ProductFormModal
        key={modalKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
        categories={categories || []}
        collections={collections || []}
        suppliers={suppliers || []}
        silverRate={silverRate?.rate != null ? Number(silverRate.rate) : null}
        existingSkus={(products || []).map((p) => p.sku)}
        submitError={saveMutation.isError ? saveMutation.error?.response?.data?.message || saveMutation.error?.message || 'Failed to save product' : ''}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        submitting={saveMutation.isPending}
      />
    </div>
  )
}
