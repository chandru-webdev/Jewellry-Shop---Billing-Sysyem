import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Phone, Mail } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { customersApi } from '../api/customers'
import { formatINR, formatDate } from '../utils/format'

const DEMO_CUSTOMERS = [
  { id: 1, name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@gmail.com', orders: 12, totalSpent: 85600, lastOrder: '2026-08-10' },
  { id: 2, name: 'Priya Sharma', phone: '9876543211', email: 'priya@gmail.com', orders: 8, totalSpent: 62300, lastOrder: '2026-08-10' },
  { id: 3, name: 'Amit Patel', phone: '9876543212', email: 'amit@gmail.com', orders: 5, totalSpent: 34500, lastOrder: '2026-08-09' },
  { id: 4, name: 'Sneha Reddy', phone: '9876543213', email: 'sneha@gmail.com', orders: 15, totalSpent: 128900, lastOrder: '2026-08-08' },
  { id: 5, name: 'Vikram Singh', phone: '9876543214', email: 'vikram@gmail.com', orders: 3, totalSpent: 22100, lastOrder: '2026-08-07' },
]

export default function Customers() {
  const [search, setSearch] = useState('')

  const { data: apiCustomers, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list().then((r) => r.data.data),
    retry: false,
  })

  const customers = (!isError && apiCustomers?.length) ? apiCustomers : DEMO_CUSTOMERS

  const filtered = customers.filter((c) => {
    if (search) {
      const q = search.toLowerCase()
      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <PageHeader title="Customers" subtitle="Manage your ecommerce customer database" actions={<Button size="sm"><Plus size={14} /> Add Customer</Button>} />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Search by name, phone or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Contact</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Orders</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total Spent</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Last Order</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-royal-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 text-white flex items-center justify-center text-[10px] font-bold">{c.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
                      <span className="font-medium text-royal-950">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-600"><Phone size={10} /> {c.phone}</span>
                      {c.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={10} /> {c.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-royal-900">{c.orders}</td>
                  <td className="px-4 py-3 text-right font-bold text-royal-800">{formatINR(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(c.lastOrder)}</td>
                  <td className="px-4 py-3 text-center"><Badge tone="blue">Shopify</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
