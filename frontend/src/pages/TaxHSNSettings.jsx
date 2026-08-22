import { useState } from 'react'
import { FileText, Save, Plus, Trash2, Pencil, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

const INITIAL_HSN = [
  { id: 1, hsnCode: '7113', description: 'Silver jewellery articles', gstRate: 3, category: 'Silver', isActive: true },
  { id: 2, hsnCode: '7101', description: 'Pearls, natural or cultured', gstRate: 3, category: 'Pearls', isActive: true },
  { id: 3, hsnCode: '7117', description: 'Imitation jewellery', gstRate: 3, category: 'Imitation', isActive: true },
  { id: 4, hsnCode: '7106', description: 'Silver unwrought', gstRate: 3, category: 'Silver Raw', isActive: true },
  { id: 5, hsnCode: '7108', description: 'Gold unwrought', gstRate: 3, category: 'Gold Raw', isActive: true },
  { id: 6, hsnCode: '7116', description: 'Articles of precious metal', gstRate: 3, category: 'Precious Metal', isActive: true },
  { id: 7, hsnCode: '7118', description: 'Coins', gstRate: 3, category: 'Coins', isActive: true },
]

const INITIAL_SLABS = [
  { id: 1, name: '0%', rate: 0, items: 'Jewellery boxes, polishing charges, cleaning services' },
  { id: 2, name: '3%', rate: 3, items: 'Bangles, Chains, Earrings, Rings (up to 22 carat), Pendants' },
  { id: 3, name: '5%', rate: 5, items: 'Necklaces (gold), Premium gold articles' },
]

const catColor = { Silver: 'blue', Gold: 'green', Pearls: 'purple', 'Silver Raw': 'indigo', 'Gold Raw': 'emerald', 'Precious Metal': 'amber', Coins: 'orange', Imitation: 'gray' }

export default function TaxHSNSettings() {
  const [tab, setTab] = useState('hsn')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ hsnCode: '', description: '', gstRate: 3, category: '' })
  const [hsnList, setHsnList] = useState(INITIAL_HSN)
  const [slabs, setSlabs] = useState(INITIAL_SLABS)
  const [editSlab, setEditSlab] = useState(null)
  const [editSlabItems, setEditSlabItems] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const filteredHSN = hsnList.filter((h) => {
    if (!search) return true
    const q = search.toLowerCase()
    return h.hsnCode.includes(q) || h.description.toLowerCase().includes(q) || h.category.toLowerCase().includes(q)
  })

  const filteredSlabs = slabs.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.includes(q) || s.items.toLowerCase().includes(q)
  })

  const handleSaveHSN = () => {
    if (!formData.hsnCode || !formData.description) return
    const newId = Math.max(...hsnList.map((h) => h.id), 0) + 1
    setHsnList([...hsnList, { id: newId, ...formData, isActive: true }])
    setFormData({ hsnCode: '', description: '', gstRate: 3, category: '' })
    setShowForm(false)
    showToast('HSN added')
  }

  const handleDeleteHSN = (id) => {
    setHsnList(hsnList.filter((h) => h.id !== id))
    setDeleteTarget(null)
    showToast('HSN deleted')
  }

  const handleEditSlab = (slab) => { setEditSlab(slab); setEditSlabItems(slab.items) }
  const handleSaveSlab = () => {
    setSlabs(slabs.map((s) => s.id === editSlab.id ? { ...s, items: editSlabItems } : s))
    setEditSlab(null); showToast('Slab updated')
  }

  const handleDeleteSlab = (id) => { setSlabs(slabs.filter((s) => s.id !== id)); setDeleteTarget(null); showToast('Slab deleted') }

  return (
    <div>
      <PageHeader title="Tax / HSN Settings" subtitle="HSN code master and GST tax slab configuration" />
      {toast && <div className="mb-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800">{toast}</div>}

      <div className="flex items-center gap-2 mb-4">
        <select value={tab} onChange={(e) => setTab(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="hsn">HSN Master</option>
          <option value="tax">Tax Slabs</option>
        </select>
      </div>

      {tab === 'hsn' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total HSN Codes</p>
              <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{hsnList.length}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Categories</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{new Set(hsnList.map((h) => h.category)).size}</p>
            </div>
            <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Default GST Rate</p>
              <p className="text-xl font-bold text-amber-600 mt-0.5">3%</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search HSN codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add HSN'}
            </Button>
          </div>

          {showForm && (
            <Card title="Add New HSN" className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HSN Code</label>
                  <input type="text" value={formData.hsnCode} onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="e.g., 7113" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="e.g., Silver jewellery articles" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Rate (%)</label>
                  <input type="number" value={formData.gstRate} onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })} className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="e.g., Silver" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSaveHSN}><Save size={14} /> Save</Button>
              </div>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">HSN Code</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Category</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">GST Rate</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Active</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHSN.map((h, i) => (
                    <tr key={h.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-royal-800 dark:text-gray-200">{h.hsnCode}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{h.description}</td>
                      <td className="px-4 py-2.5"><Badge tone={catColor[h.category] || 'gray'}>{h.category}</Badge></td>
                      <td className="px-4 py-2.5 text-right font-medium text-royal-800 dark:text-gray-200">{h.gstRate}%</td>
                      <td className="px-4 py-2.5"><Badge tone={h.isActive ? 'green' : 'gray'}>{h.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'hsn', id: h.id, name: h.hsnCode })} title="Delete"><Trash2 size={12} className="text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'tax' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {slabs.map((s) => (
              <div key={s.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{s.name} Slab</p>
                <p className="text-lg font-bold text-royal-800 dark:text-gray-200 mt-0.5">{s.rate}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.items}</p>
              </div>
            ))}
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Slab</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Rate</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Applicable Items</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlabs.map((s, i) => (
                    <tr key={s.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-800 dark:text-gray-200">{s.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{s.rate}%</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{s.items}</td>
                      <td className="px-4 py-2.5 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditSlab(s)}><Pencil size={12} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'slab', id: s.id, name: s.name })}><Trash2 size={12} className="text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <Modal open={!!editSlab} title={`Edit ${editSlab?.name} Slab`} onClose={() => setEditSlab(null)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applicable Items</label>
            <textarea value={editSlabItems} onChange={(e) => setEditSlabItems(e.target.value)} className="w-full border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500 min-h-20" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditSlab(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveSlab}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} title="Confirm Delete" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Delete <strong>{deleteTarget?.name}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => deleteTarget?.type === 'hsn' ? handleDeleteHSN(deleteTarget.id) : handleDeleteSlab(deleteTarget.id)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}