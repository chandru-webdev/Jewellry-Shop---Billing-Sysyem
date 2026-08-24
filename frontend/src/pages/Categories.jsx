import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Package } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { categoriesApi } from '../api/categories'

const DEMO_CATEGORIES = [
  { id: 1, name: 'Rings', description: 'Silver rings for all occasions', productCount: 45, status: 'Active' },
  { id: 2, name: 'Chains', description: 'Silver chains and necklaces', productCount: 38, status: 'Active' },
  { id: 3, name: 'Bracelets', description: 'Silver bracelets and bangles', productCount: 28, status: 'Active' },
  { id: 4, name: 'Earrings', description: 'Silver earrings and studs', productCount: 52, status: 'Active' },
  { id: 5, name: 'Pendants', description: 'Silver pendants and lockets', productCount: 34, status: 'Active' },
  { id: 6, name: 'Anklets', description: 'Silver anklets and chains', productCount: 15, status: 'Active' },
  { id: 7, name: 'Nose Pins', description: 'Silver nose pins and rings', productCount: 22, status: 'Active' },
  { id: 8, name: 'Toe Rings', description: 'Silver toe rings', productCount: 18, status: 'Active' },
]

export default function Categories() {
  const { data: apiCategories, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data.data),
    retry: false,
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [addedCategories, setAddedCategories] = useState([])
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const baseCategories = (!isError && apiCategories?.length) ? apiCategories : DEMO_CATEGORIES
  const categories = [...baseCategories, ...addedCategories]

  const handleOpenAddModal = () => { setCategoryName(''); setShowAddModal(true) }

  const handleSaveCategory = () => {
    const name = categoryName.trim()
    if (!name) return
    setAddedCategories([...addedCategories, { id: Date.now(), name, description: 'New category', productCount: 0, status: 'Active' }])
    setShowAddModal(false)
    showToast('Category added')
  }

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organize your jewellery products into collections" actions={<Button size="sm" onClick={handleOpenAddModal}><Plus size={14} /> Add Category</Button>} />

      {toast && <div className="mb-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"><Package size={14} /> {toast}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-5 hover:shadow-md hover:border-royal-300 dark:border-white/10 transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <Badge tone="green">{c.status}</Badge>
            </div>
            <h3 className="font-semibold text-royal-950 dark:text-white mb-1">{c.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-3">{c.description}</p>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.05]">
              <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{c.productCount} products</span>
              <span className="text-xs font-semibold text-royal-600 dark:text-gray-300">Manage →</span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAddModal} title="Add Category" onClose={() => setShowAddModal(false)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name</label>
            <input
              id="category-name"
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Necklaces"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
              className="w-full bg-white dark:bg-[#1a1025] border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveCategory}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
