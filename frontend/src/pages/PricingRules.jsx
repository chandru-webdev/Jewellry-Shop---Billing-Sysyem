import { useState } from 'react'
import { DollarSign, RefreshCw, CheckCircle2, XCircle, Pencil, Trash2, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

const INITIAL_RULES = [
  { id: 1, name: 'Silver Making Charge %', type: '%', value: 15, description: 'Percentage of silver rate added as making charge' },
  { id: 2, name: 'Gold Making Charge %', type: '%', value: 12, description: 'Percentage of gold rate added as making charge' },
  { id: 3, name: 'Diamond Making Charge (Fixed)', type: 'fixed', value: 500, description: 'Fixed amount for diamond studded jewellery' },
  { id: 4, name: 'Gemstone Making Charge', type: 'fixed', value: 300, description: 'Per stone making charge' },
  { id: 5, name: 'Minimum Making Charge', type: 'fixed', value: 100, description: 'Minimum charge per invoice' },
  { id: 6, name: 'GST on Making Charge', type: '%', value: 3, description: 'GST percentage applicable on making charge' },
]

const INITIAL_SLABS = [
  { id: 1, name: '3%', slabs: ['Bangles, Chains, Ear rings', 'Rings up to 22 carat'] },
  { id: 2, name: '5%', slabs: ['Necklaces, Pendants', 'Lockets'] },
  { id: 3, name: '0%', slabs: ['Jewellery boxes, polishing charges'] },
]

export default function PricingRules() {
  const [tab, setTab] = useState('pricing')
  const [search, setSearch] = useState('')
  const [rules, setRules] = useState(INITIAL_RULES)
  const [slabs, setSlabs] = useState(INITIAL_SLABS)
  const [editRule, setEditRule] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const filteredRules = rules.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  })

  const filteredSlabs = slabs.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.includes(q) || s.slabs.join(' ').toLowerCase().includes(q)
  })

  const handleRefresh = () => { setSearch(''); showToast('Refreshed') }

  const handleEditRule = (rule) => { setEditRule(rule); setEditValue(String(rule.value)) }
  const handleSaveRule = () => {
    setRules(rules.map((r) => r.id === editRule.id ? { ...r, value: Number(editValue) } : r))
    setEditRule(null); showToast('Rule updated')
  }

  const handleDeleteRule = (id) => { setRules(rules.filter((r) => r.id !== id)); setDeleteTarget(null); showToast('Rule deleted') }
  const handleDeleteSlab = (id) => { setSlabs(slabs.filter((s) => s.id !== id)); setDeleteTarget(null); showToast('Slab deleted') }

  return (
    <div>
      <PageHeader title="Pricing Rules" subtitle="Making charge %/fixed rates and pricing rule configuration" />
      {toast && <div className="mb-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800">{toast}</div>}

      <div className="flex items-center gap-2 mb-4">
        <select value={tab} onChange={(e) => setTab(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="pricing">Pricing Rules</option>
          <option value="tax">Tax / HSN Settings</option>
        </select>
      </div>

      {tab === 'pricing' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {rules.map((r) => (
              <div key={r.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{r.name}</p>
                  <p className="text-sm font-medium text-royal-800 dark:text-gray-200">{r.value}{r.type}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{r.description}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search pricing rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <Button variant="primary" size="sm" onClick={handleRefresh}><RefreshCw size={14} /> Refresh</Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Rule</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Type</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Value</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((r, i) => (
                    <tr key={r.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="px-3 py-2 font-medium text-royal-800 dark:text-gray-200">{r.name}</td>
                      <td className="px-3 py-2"><Badge tone={r.type === '%' ? 'blue' : 'amber'}>{r.type}</Badge></td>
                      <td className="px-3 py-2 text-right font-medium text-royal-800 dark:text-gray-200">{r.value}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.description}</td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditRule(r)} title="Edit"><Pencil size={12} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'rule', id: r.id, name: r.name })} title="Delete"><Trash2 size={12} className="text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'tax' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {slabs.map((t) => (
              <div key={t.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{t.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.slabs.join(', ')}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search tax slabs..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <Button variant="primary" size="sm" onClick={handleRefresh}><RefreshCw size={14} /> Refresh</Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Tax Slab</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlabs.map((t, i) => (
                    <tr key={t.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="px-3 py-2 font-medium text-royal-800 dark:text-gray-200">{t.name}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.slabs.join(', ')}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'slab', id: t.id, name: t.name })} title="Delete"><Trash2 size={12} className="text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal open={!!deleteTarget} title="Confirm Delete" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Delete <strong>{deleteTarget?.name}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => deleteTarget?.type === 'rule' ? handleDeleteRule(deleteTarget.id) : handleDeleteSlab(deleteTarget.id)}>Delete</Button>
        </div>
      </Modal>

      <Modal open={!!editRule} title="Edit Rule" onClose={() => setEditRule(null)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{editRule?.name}</label>
            <div className="flex items-center gap-2">
              <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
              <Badge tone="blue">{editRule?.type}</Badge>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditRule(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveRule}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}