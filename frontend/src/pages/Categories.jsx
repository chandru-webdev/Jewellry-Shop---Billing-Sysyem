import { useQuery } from '@tanstack/react-query'
import { Plus, Package } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
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

  const categories = (!isError && apiCategories?.length) ? apiCategories : DEMO_CATEGORIES

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organize your jewellery products into collections" actions={<Button size="sm"><Plus size={14} /> Add Category</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-5 hover:shadow-md hover:border-royal-300 transition-all cursor-pointer">
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
              <span className="text-xs font-semibold text-royal-600">Manage →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
