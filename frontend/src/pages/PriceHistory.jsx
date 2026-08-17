import { History, Coins } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'


const DEMO_HISTORY = [
  { date: '01 Aug', rate: 88.50 },
  { date: '02 Aug', rate: 89.00 },
  { date: '03 Aug', rate: 89.20 },
  { date: '04 Aug', rate: 89.50 },
  { date: '05 Aug', rate: 90.20 },
  { date: '06 Aug', rate: 91.10 },
  { date: '07 Aug', rate: 89.80 },
  { date: '08 Aug', rate: 91.50 },
  { date: '09 Aug', rate: 92.00 },
  { date: '10 Aug', rate: 92.80 },
]

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
  return (
    <div>
      <PageHeader title="Silver Rate History" subtitle="Track historical silver rates over time" />

      <Card title="Rate Trend" icon={Coins} className="mb-5">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DEMO_HISTORY} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="rate" name="Rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Rate History" icon={History}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Rate (₹/gm)</th>
                <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_HISTORY.slice().reverse().map((h, i, arr) => {
                const prev = arr[i + 1]
                const change = prev ? h.rate - prev.rate : 0
                return (
                  <tr key={h.date} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-royal-950">{h.date}</td>
                    <td className="py-2.5 text-right font-bold text-royal-800">₹{h.rate.toFixed(2)}</td>
                    <td className={`py-2.5 text-right font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {change !== 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
