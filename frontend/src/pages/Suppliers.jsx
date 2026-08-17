import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Truck, Search, Plus, Phone, Mail } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { suppliersApi } from '../api/suppliers'
import { formatINR, formatDate } from '../utils/format'

const DEMO_SUPPLIERS = [
  { id: 1, name: 'Silver Arts Jewellers', phone: '9812345678', email: 'sales@silverarts.in', products: 45, totalPurchased: 892000, lastPurchase: '2026-08-08', status: 'Active' },
  { id: 2, name: 'Metro Silver Traders', phone: '9812345679', email: 'info@metrosilver.in', products: 32, totalPurchased: 567000, lastPurchase: '2026-08-05', status: 'Active' },
  { id: 3, name: 'Classic Silver House', phone: '9812345680', email: 'order@classicsilver.in', products: 28, totalPurchased: 445000, lastPurchase: '2026-07-30', status: 'Active' },
  { id: 4, name: 'Royal Silver Crafts', phone: '9812345681', email: 'contact@royalcrafts.in', products: 15, totalPurchased: 234000, lastPurchase: '2026-07-15', status: 'Inactive' },
]

export default function Suppliers() {
  const [search, setSearch] = useState('')

  const { data: apiSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list().then((r) => r.data.data),
  })

  const suppliers = apiSuppliers?.length ? apiSuppliers : DEMO_SUPPLIERS

  const filtered = suppliers.filter((s) => {
    if (search) {
      const q = search.toLowerCase()
      return (s.name || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage your silver jewellery suppliers" actions={<Button size="sm"><Plus size={14} /> Add Supplier</Button>} />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Supplier</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Contact</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Products</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total Purchased</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Last Purchase</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-[10px] font-bold"><Truck size={14} /></span>
                      <span className="font-medium text-royal-950">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-600"><Phone size={10} /> {s.phone}</span>
                      {s.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={10} /> {s.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-royal-900">{s.products}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(s.totalPurchased)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(s.lastPurchase)}</td>
                  <td className="px-4 py-3 text-center"><Badge tone={s.status === 'Active' ? 'green' : 'gray'}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
