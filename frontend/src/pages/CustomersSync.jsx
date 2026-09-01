import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Download, Search, CheckCircle2, Loader2, AlertTriangle, Users } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { formatDate } from '../utils/format'
import { customersApi } from '../api/customers'
import { shopifyApi } from '../api/shopify'

export default function CustomersSync() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [lastPull, setLastPull] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list({ limit: 1000 }).then((r) => r.data.data),
    retry: false,
  })

  const customers = customersQuery.data || []

  const pullMutation = useMutation({
    mutationFn: () => shopifyApi.pullCustomers(),
    onSuccess: (res) => {
      const r = res.data.data
      setLastPull({ created: r.created, updated: r.updated, failed: r.failed, firstError: r.firstError })
      showToast(`Imported ${r.created ?? 0} new, updated ${r.updated ?? 0}${r.failed ? `, failed ${r.failed}` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => showToast(err.response?.data?.message || err.message || 'Pull failed', 'error'),
  })

  const listError = customersQuery.isError
    ? (customersQuery.error.response?.data?.message || customersQuery.error.message || '')
    : ''

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    )
  })

  const withEmail = customers.filter((c) => c.email).length
  const withOrders = customers.filter((c) => (c._count?.invoices || 0) > 0).length

  return (
    <div>
      <PageHeader title="Customers Sync" subtitle="Import Shopify customers into the ERP customer book" actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => pullMutation.mutate()} disabled={pullMutation.isPending}>
            {pullMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : <><Download size={14} /> Pull from Shopify</>}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => customersQuery.refetch()} disabled={pullMutation.isPending}>
            {customersQuery.isFetching ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={14} /> Refresh</>}
          </Button>
        </div>
      } />

      {toast && (
        <div className={`mb-3 text-sm rounded-lg px-4 py-2 border flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {toast.message}
        </div>
      )}

      {listError && (
        <div className="mb-3 text-sm rounded-lg px-4 py-2 border flex items-center gap-2 bg-amber-50 text-amber-800 border-amber-200">
          <AlertTriangle size={14} />
          Could not load customers: {listError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Total Customers</p>
          <p className="text-xl font-bold text-royal-600 dark:text-gray-300 mt-0.5">{customers.length}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">With Email</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{withEmail}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">With Orders</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{withOrders}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Last Import</p>
          {lastPull ? (
            <p className="text-sm font-bold text-royal-700 dark:text-gray-300 mt-0.5">{lastPull.created} new / {lastPull.updated} updated</p>
          ) : (
            <p className="text-sm font-bold text-gray-400 mt-0.5">—</p>
          )}
        </div>
      </div>

      {lastPull?.failed > 0 && (
        <div className="mb-3 text-sm rounded-lg px-4 py-2 border flex items-center gap-2 bg-amber-50 text-amber-800 border-amber-200">
          <AlertTriangle size={14} />
          {lastPull.failed} customers could not be imported{lastPull.firstError ? ` — ${lastPull.firstError}` : ''}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or phone..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1025] focus:outline-none focus:ring-2 focus:ring-royal-200 focus:border-royal-300" />
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Phone</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-center">Orders</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Added</th>
              </tr>
            </thead>
            <tbody>
              {customersQuery.isLoading && (
                <tr><td colSpan="5" className="px-4 py-10 text-center text-sm text-gray-400"><Loader2 size={16} className="inline animate-spin mr-2" />Loading customers...</td></tr>
              )}
              {!customersQuery.isLoading && filtered.map((c, i) => (
                <tr key={c.id} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-royal-50 text-royal-600 flex items-center justify-center shrink-0">
                        <Users size={13} />
                      </div>
                      <div>
                        <p className="font-medium text-royal-950 dark:text-white">{c.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">#{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">{c.email || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{c.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-gray-600 dark:text-gray-400">{c._count?.invoices || 0}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                </tr>
              ))}
              {!customersQuery.isLoading && filtered.length === 0 && (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-400">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}