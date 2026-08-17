import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Power, Upload, Download, RefreshCw, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProductFormModal from '../components/products/ProductFormModal'
import { productsApi } from '../api/products'
import { categoriesApi } from '../api/categories'
import { formatINR, formatWeight } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function Products() {
  const { user } = useAuth()
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role?.name)
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState('')

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? productsApi.update(editing.id, payload)
        : productsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setModalOpen(false)
      setEditing(null)
      setError('')
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to save product'),
  })

  const toggleMutation = useMutation({
    mutationFn: (product) =>
      product.isActive ? productsApi.remove(product.id) : productsApi.update(product.id, { isActive: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const filtered = (products || []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && p.category?.id !== filterCategory) return false
    if (filterStock === 'low' && (p.inventory?.quantity || 0) > (p.lowStockThreshold || 5)) return false
    if (filterStock === 'out' && (p.inventory?.quantity || 0) > 0) return false
    if (filterStock === 'in' && (p.inventory?.quantity || 0) <= 0) return false
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
              <Button variant="outline" size="sm"><Upload size={14} /> Import</Button>
              <Button variant="outline" size="sm"><Download size={14} /> Export</Button>
              <Button variant="outline" size="sm"><RefreshCw size={14} /> Sync Shopify</Button>
              <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400" />
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
          className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="">All Categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterStock}
          onChange={(e) => setFilterStock(e.target.value)}
          className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="">All Stock</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">SKU</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Purity</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Net Weight</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Making Charge</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Selling Price</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Stock</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Shopify</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                {canEdit && <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">Loading products...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">No products found. Click "Add Product" to create one.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-royal-950">{p.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{p.purity || '92.5'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatWeight(p.weight)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatINR(p.makingCharge)}/g</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(p.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge tone={p.inventory?.quantity > (p.lowStockThreshold || 5) ? 'green' : p.inventory?.quantity > 0 ? 'orange' : 'red'}>
                      {p.inventory?.quantity ?? 0} pcs
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone="blue">Synced</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(p); setModalOpen(true) }} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="Edit">
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
        categories={categories || []}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        submitting={saveMutation.isPending}
      />
    </div>
  )
}
