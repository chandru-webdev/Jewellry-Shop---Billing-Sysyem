import { useQuery } from '@tanstack/react-query'
import { History, Coins, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { metalRatesApi } from '../api/metalRates'
import { formatDate, formatDateTime } from '../utils/format'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold">{label}</p>
      <p className="text-gold-400">Rate: ₹{payload[0].value}/gm</p>
    </div>
  )
}

export default function PriceHistory() {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['metal-rates-history'],
    queryFn: () => metalRatesApi.getHistory({ limit: 100 }).then((r) => r.data.data),
  })

  const chartData = (historyData || [])
    .slice()
    .reverse()
    .map((h) => ({
      date: formatDate(h.changedAt),
      rate: parseFloat(h.newRate),
    }))

  const tableData = (historyData || []).map((h, i, arr) => {
    const prev = arr[i + 1]
    const oldRate = parseFloat(h.oldRate)
    const newRate = parseFloat(h.newRate)
    const change = prev ? newRate - parseFloat(prev.newRate) : newRate - oldRate
    return {
      id: h.id,
      date: h.changedAt,
      oldRate,
      newRate,
      change,
      changedBy: h.changedBy?.name || 'System',
    }
  })

  return (
    <div>
      <PageHeader title="Silver Rate History" subtitle="Track historical silver rates over time" />

      <Card title="Rate Trend" icon={Coins} className="mb-5">
        <div className="h-80">
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={20} /></div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rate" name="Rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">No rate history yet</div>
          )}
        </div>
      </Card>

      <Card title="Rate History" icon={History}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={20} /></div>
          ) : tableData.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                  <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Date</th>
                  <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Changed By</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Old Rate</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">New Rate</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Change</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((h) => (
                  <tr key={h.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-royal-950 dark:text-white">{formatDateTime(h.date)}</td>
                    <td className="py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{h.changedBy}</td>
                    <td className="py-2.5 text-right text-gray-500 dark:text-gray-400 dark:text-gray-500">₹{h.oldRate.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-royal-800 dark:text-gray-200">₹{h.newRate.toFixed(2)}</td>
                    <td className={`py-2.5 text-right font-semibold ${h.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {h.change !== 0 ? `${h.change >= 0 ? '+' : ''}₹${Math.abs(h.change).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No rate history yet</div>
          )}
        </div>
      </Card>
    </div>
  )
}
