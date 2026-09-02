import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Percent, Package, Plus, Pencil, Trash2, Save, Search, RefreshCw, Building2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { settingsApi } from '../api/settings'

export default function PricingRules() {
  const [tab, setTab] = useState('pricing')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [editRule, setEditRule] = useState(null)
  const [ruleForm, setRuleForm] = useState({ name: '', value: '0', description: '' })
  const [editSlab, setEditSlab] = useState(null)
  const [slabForm, setSlabForm] = useState({ name: '', rate: '5', items: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data.data),
    retry: false,
  })

  const rules = settings?.pricingRules || []
  const slabs = settings?.taxSlabs || []

  const save = useMutation({
    mutationFn: (payload) => settingsApi.update(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const showToast = (msg, tone = 'ok') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(''), 2200)
  }

  const persist = async (key, next) => {
    try {
      await save.mutateAsync({ [key]: next })
      showToast(`${key === 'pricingRules' ? 'Pricing rules' : 'Tax slabs'} saved`)
    } catch {
      showToast('Save failed — try again', 'err')
    }
  }

  const nextId = (list) => list.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1

  const filteredRules = rules.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
  })

  const filteredSlabs = slabs.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.items || '').toLowerCase().includes(q)
  })

  const openRule = (r) => {
    setRuleForm({ name: r.name, value: String(r.value), description: r.description || '' })
    setEditRule(r)
  }

  const openNewRule = () => {
    setRuleForm({ name: 'New Percentage Rule', value: '0', description: '' })
    setEditRule({ id: nextId(rules), type: '%' })
  }

  const handleSaveRule = () => {
    const exists = rules.some((r) => r.id === editRule.id)
    const next = exists
      ? rules.map((r) => (r.id === editRule.id ? { ...r, name: ruleForm.name, value: Number(ruleForm.value), description: ruleForm.description } : r))
      : [...rules, { id: editRule.id, name: ruleForm.name, type: editRule.type || '%', value: Number(ruleForm.value), description: ruleForm.description }]
    setEditRule(null)
    persist('pricingRules', next)
  }

  const openSlab = (s) => {
    setSlabForm({ name: s.name, rate: String(s.rate), items: s.items || '' })
    setEditSlab(s)
  }

  const openNewSlab = () => {
    openSlab({ id: nextId(slabs), name: '', rate: 5, items: '' })
  }

  const handleSaveSlab = () => {
    const exists = slabs.some((s) => s.id === editSlab.id)
    const next = exists
      ? slabs.map((s) => (s.id === editSlab.id ? { ...s, name: slabForm.name, rate: Number(slabForm.rate), items: slabForm.items } : s))
      : [...slabs, { id: editSlab.id, name: slabForm.name || `${slabForm.rate}%`, rate: Number(slabForm.rate), items: slabForm.items }]
    setEditSlab(null)
    persist('taxSlabs', next)
  }

  const handleDelete = (type, id) => {
    if (type === 'rule') {
      persist('pricingRules', rules.filter((r) => r.id !== id))
    } else {
      persist('taxSlabs', slabs.filter((s) => s.id !== id))
    }
    setDeleteTarget(null)
  }

  return (
    <div>
      <PageHeader title="Pricing Rules" subtitle="Making charge and GST configuration" />

      {toast && (
        <div className={`mb-3 text-sm rounded-lg px-4 py-2 border ${toast.tone === 'err' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1">
          <button onClick={() => setTab('pricing')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${tab === 'pricing' ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
            <Percent size={14} /> Pricing Rules
          </button>
          <button onClick={() => setTab('tax')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${tab === 'tax' ? 'bg-white dark:bg-[#1a1025] text-royal-700 dark:text-gray-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
            <Building2 size={14} /> Tax / Slab Settings
          </button>
        </div>
        <div className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Config auto-saves to the server
          </span>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading configuration…</Card>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={tab === 'pricing' ? 'Search pricing rules...' : 'Search tax slabs...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSearch('')}><RefreshCw size={14} /> Clear</Button>
            {tab === 'pricing' ? (
              <Button variant="primary" size="sm" onClick={openNewRule}><Plus size={14} /> Add Rule</Button>
            ) : (
              <Button variant="primary" size="sm" onClick={openNewSlab}><Plus size={14} /> Add Slab</Button>
            )}
          </div>

          {tab === 'pricing' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {rules.slice(0, 6).map((r) => (
                  <div key={r.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1"><Package size={12} /> {r.name}</p>
                      <p className="text-sm font-bold text-royal-800 dark:text-gray-200">{r.value}{r.type}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.description || '—'}</p>
                  </div>
                ))}
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
                      {filteredRules.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">No rules match.</td></tr>}
                      {filteredRules.map((r, i) => (
                        <tr key={r.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2 font-medium text-royal-800 dark:text-gray-200">{r.name}</td>
                          <td className="px-3 py-2"><Badge tone={r.type === '%' ? 'blue' : 'amber'}>{r.type}</Badge></td>
                          <td className="px-3 py-2 text-right font-medium text-royal-800 dark:text-gray-200">{r.value}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.description || '—'}</td>
                          <td className="px-3 py-2 text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => openRule(r)} title="Edit"><Pencil size={12} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'rule', id: r.id, name: r.name })} title="Delete"><Trash2 size={12} className="text-red-500" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {slabs.map((t) => (
                  <div key={t.id} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{t.name}</p>
                    <p className="text-sm font-bold text-royal-800 dark:text-gray-200 mt-0.5">{t.rate}% GST</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.items || '—'}</p>
                  </div>
                ))}
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 text-left">
                        <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Tax Slab</th>
                        <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Rate</th>
                        <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Items Covered</th>
                        <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSlabs.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">No slabs yet.</td></tr>}
                      {filteredSlabs.map((t, i) => (
                        <tr key={t.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2 font-medium text-royal-800 dark:text-gray-200">{t.name}</td>
                          <td className="px-3 py-2"><Badge tone="gold">{t.rate}%</Badge></td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.items || '—'}</td>
                          <td className="px-3 py-2 text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => openSlab(t)} title="Edit"><Pencil size={12} /></Button>
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

          <Modal open={!!editRule} title={editRule && rules.some((r) => r.id === editRule.id) ? `Edit ${editRule.name}` : 'New Pricing Rule'} onClose={() => setEditRule(null)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                <input value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="any" value={ruleForm.value} onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })} className="flex-1 border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm" />
                  <Badge tone="blue">{editRule?.type}</Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm" placeholder="Short description…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditRule(null)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSaveRule}><Save size={12} className="mr-1" /> Save</Button>
              </div>
            </div>
          </Modal>

          <Modal open={!!editSlab} title={editSlab && slabs.some((s) => s.id === editSlab.id) ? 'Edit Tax Slab' : 'New Tax Slab'} onClose={() => setEditSlab(null)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slab Name</label>
                <input value={slabForm.name} onChange={(e) => setSlabForm({ ...slabForm, name: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm" placeholder="e.g. 5% Silver" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Rate %</label>
                <input type="number" step="any" value={slabForm.rate} onChange={(e) => setSlabForm({ ...slabForm, rate: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items Covered</label>
                <textarea value={slabForm.items} onChange={(e) => setSlabForm({ ...slabForm, items: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm min-h-[80px]" placeholder="Comma-separated categories…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditSlab(null)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSaveSlab}><Save size={12} className="mr-1" /> Save</Button>
              </div>
            </div>
          </Modal>

          <Modal open={!!deleteTarget} title="Confirm Delete" onClose={() => setDeleteTarget(null)}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Delete <strong>{deleteTarget?.name}</strong>? This config change will be saved.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deleteTarget.type, deleteTarget.id)}>Delete</Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}