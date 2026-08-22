import { useState } from 'react'
import { DollarSign, RefreshCw, CheckCircle2, XCircle, Calendar, Folder, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const PRICING_RULES = [
  { id: 1, name: 'Silver Making Charge %', type: '%', value: 15, description: 'Percentage of silver rate added as making charge' },
  { id: 2, name: 'Gold Making Charge %', type: '%', value: 12, description: 'Percentage of gold rate added as making charge' },
  { id: 3, name: 'Diamond Making Charge (Fixed)', type: 'fixed', value: 500, description: 'Fixed amount for diamond studded jewellery' },
  { id: 4, name: 'Gemstone Making Charge', type: 'fixed', value: 300, description: 'Per stone making charge' },
  { id: 5, name: 'Minimum Making Charge', type: 'fixed', value: 100, description: 'Minimum charge per invoice' },
  { id: 6, name: 'GST on Making Charge', type: '%', value: 3, description: 'GST percentage applicable on making charge' },
]

const TAX_SLABS = [
  { id: 1, name: '3%', slabs: ['Bangles, Chains, Ear rings', 'Rings up to 22 carat'] },
  { id: 2, name: '5%', slabs: ['Necklaces, Pendants', 'Lockets'] },
  { id: 3, name: '0%', slabs: ['Jewellery boxes, polishing charges'] },
]

export default function PricingRules() {
  const [tab, setTab] = useState('pricing')
  const [search, setSearch] = useState('')
  const [editedValue, setEditedValue] = useState('')
  const [editedId, setEditedId] = useState(null)

  const filteredRules = PRICING_RULES.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <PageHeader title="Pricing Rules" subtitle="Making charge %/fixed rates and pricing rule configuration" />

      <div className="flex items-center gap-2 mb-4">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
        >
          <option value="pricing">Pricing Rules</option>
          <option value="tax">Tax / HSN Settings</option>
        </select>
      </div>

      {tab === 'pricing' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {PRICING_RULES.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
              <div className="flex items-between justify-between">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{r.name}</p>
                <p className="text-sm font-medium text-royal-800">{r.value}%</p>
              </div>
              <p className="text-xs text-gray-500">{r.description}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search pricing rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
          />
          <Button variant="primary" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Rule</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Type</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Value</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Description</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.id} className={`border-t border-gray-100 ${filteredRules.indexOf(r) % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2 font-medium text-royal-800">{r.name}</td>
                    <td className="px-3 py-2">
                      <Badge tone={r.type === '%' ? 'blue' : 'amber'}>{r.type}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-royal-800">{r.value}</td>
                    <td className="px-3 py-2 text-gray-600">{r.description}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" title="Edit">
                        <Calendar size={12} />
                      </Button>
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => {}}>
                        <XCircle size={12} />
                      </Button>
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
          {TAX_SLABS.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{t.name}</p>
              <p className="text-sm text-gray-500">{t.slabs.join(', ')}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search tax slabs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
          />
          <Button variant="primary" size="sm"><RefreshCw size={14} /> Refresh</Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Tax Slab</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Description</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {TAX_SLABS.map((t) => (
                  <tr key={t.id} className={`border-t border-gray-100 ${TAX_SLABS.indexOf(t) % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2 font-medium text-royal-800">{t.name}</td>
                    <td className="px-3 py-2 text-gray-600">{t.slabs.join(', ')}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" title="Edit"><Calendar size={12} /></Button>
                      <Button variant="ghost" size="sm" title="Delete"><XCircle size={12} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
    </div>
  )
}