import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Search, Plus, Phone, Mail, Edit, Trash2, X, Save, Pause, Play } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { suppliersApi } from '../api/suppliers'
import { formatINR, formatDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function Suppliers() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' })

  const canManage = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'MANAGER'

  const { data: apiSuppliers, isLoading } = useQuery({
    queryKey: ['suppliers', search, filterActive],
    queryFn: () => suppliersApi.list({ search, isActive: filterActive }).then((r) => r.data.data),
  })

  const suppliers = apiSuppliers || []

  const createMutation = useMutation({
    mutationFn: (data) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setShowAdd(false)
      setFormData({ name: '', phone: '', email: '', address: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setEditingSupplier(null)
      setFormData({ name: '', phone: '', email: '', address: '' })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    })
  }

  const handleToggleActive = async (supplier) => {
    await suppliersApi.update(supplier.id, { isActive: !supplier.isActive })
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  }

  const handleDelete = async (supplier) => {
    if (!confirm(`Deactivate "${supplier.name}"? They will no longer appear in active supplier lists.`)) return
    await suppliersApi.update(supplier.id, { isActive: false })
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  }

  const filtered = suppliers.filter((s) => {
    if (filterActive !== '' && String(s.isActive) !== filterActive) return false
    if (search) {
      const q = search.toLowerCase()
      return (s.name || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q)
    }
    return true
  })

  const openAddForm = () => {
    setEditingSupplier(null)
    setFormData({ name: '', phone: '', email: '', address: '' })
    setShowAdd(true)
  }

  const closeForm = () => {
    setShowAdd(false)
    setEditingSupplier(null)
    setFormData({ name: '', phone: '', email: '', address: '' })
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Manage your silver jewellery suppliers"
        actions={
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-72">
              <Search size={14} className="text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>
            {filterActive !== '' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterActive('')}>
                <X size={12} /> Clear Filter
              </Button>
            )}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="text-sm bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500"
            >
              <option value="">All Suppliers</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            {canManage && (
              <Button size="sm" onClick={openAddForm}>
                <Plus size={14} /> Add Supplier
              </Button>
            )}
          </div>
        }
      />

      {showAdd && canManage && (
        <Modal open={showAdd} onClose={closeForm} title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'} size="md">
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Supplier Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                <X size={12} /> Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                <Save size={12} /> {editingSupplier ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Supplier</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Contact</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Products</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Total Purchased</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Last Purchase</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Loading suppliers...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No suppliers found.
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((s) => (
                <tr key={s.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                        <Truck size={14} />
                      </span>
                      <span className="font-medium text-royal-950 dark:text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">
                        <Phone size={10} /> {s.phone}
                      </span>
                      {s.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <Mail size={10} /> {s.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-royal-900 dark:text-gray-200">{s.products || 0}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(s.totalPurchased || 0)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">{s.lastPurchase ? formatDate(s.lastPurchase) : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={s.isActive === false ? 'red' : 'green'}>{s.isActive === false ? 'Inactive' : 'Active'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleToggleActive(s)}
                            className="p-1 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded cursor-pointer"
                            title={s.isActive === false ? 'Activate' : 'Deactivate'}
                          >
                            {s.isActive === false ? <Play size={12} /> : <Pause size={12} />}
                          </button>
                          <button
                            onClick={() => handleEdit(s)}
                            className="p-1 text-royal-600 dark:text-gray-300 hover:bg-royal-100 dark:bg-white/10 rounded cursor-pointer"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded cursor-pointer"
                            title="Deactivate"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
