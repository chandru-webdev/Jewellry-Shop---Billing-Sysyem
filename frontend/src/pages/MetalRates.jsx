import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Coins, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { metalRatesApi } from '../api/metalRates'
import { formatINR, formatDateTime } from '../utils/format'

const DEMO_HISTORY = [
  { date: '04 Aug', rate: 89.50 },
  { date: '05 Aug', rate: 90.20 },
  { date: '06 Aug', rate: 91.10 },
  { date: '07 Aug', rate: 89.80 },
  { date: '08 Aug', rate: 91.50 },
  { date: '09 Aug', rate: 92.00 },
  { date: '10 Aug', rate: 92.80 },
]

const DEMO_PRODUCTS = [
  { name: 'Silver Classic Ring', sku: 'SLV-RNG-00021', oldPrice: 588, newPrice: 602, shopify: 'Synced' },
  { name: 'Silver Chain 22"', sku: 'SLV-CHN-00008', oldPrice: 1240, newPrice: 1268, shopify: 'Synced' },
  { name: 'Silver Bracelet', sku: 'SLV-BRC-00015', oldPrice: 780, newPrice: 798, shopify: 'Synced' },
  { name: 'Silver Pendant', sku: 'SLV-PND-00012', oldPrice: 650, newPrice: 665, shopify: 'Pending' },
  { name: 'Silver Earrings', sku: 'SLV-ERN-00031', oldPrice: 520, newPrice: 533, shopify: 'Synced' },
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

export default function MetalRates() {
  const queryClient = useQueryClient()
  const [newRate, setNewRate] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const { data: rates } = useQuery({
    queryKey: ['metal-rates'],
    queryFn: () => metalRatesApi.getCurrent().then((r) => r.data.data),
  })

  const currentRate = rates?.rate || 92.80
  const lastUpdated = rates?.updatedAt || new Date().toISOString()

  const updateMutation = useMutation({
    mutationFn: (rate) => metalRatesApi.updateSilver(parseFloat(rate)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metal-rates'] })
      setNewRate('')
      setPreviewOpen(false)
    },
  })

  const handlePreview = () => {
    if (!newRate || parseFloat(newRate) <= 0) return
    setPreviewOpen(true)
  }

  const handleApprove = () => {
    updateMutation.mutate(newRate)
  }

  return (
    <div>
      <PageHeader
        title="Silver Rate Management"
        subtitle="Manage 92.5 Sterling Silver rates and sync prices to Shopify"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Current Rate Card */}
        <Card className="lg:col-span-1">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold-500/20">
              <Coins size={28} className="text-[#1a0a3e]" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Current Silver Rate</p>
            <p className="text-4xl font-bold text-royal-950">₹{currentRate.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">92.5 Sterling Silver</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
              <TrendingUp size={12} /> +2.80 (3.11%)
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Last Updated: {formatDateTime(lastUpdated)}
            </p>
          </div>
        </Card>

        {/* Update Form */}
        <Card className="lg:col-span-1" title="Update Silver Rate">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Rate (₹ per gram)</label>
              <input
                type="number"
                step="0.01"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder={`Current: ₹${currentRate}`}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-lg font-bold text-royal-950 focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500"
              />
            </div>
            {newRate && parseFloat(newRate) > 0 && (
              <div className="bg-royal-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Old Rate</span>
                  <span className="font-semibold text-gray-800">₹{currentRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">New Rate</span>
                  <span className="font-bold text-royal-950">₹{parseFloat(newRate).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Products Affected</span>
                  <span className="font-semibold text-royal-800">312</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rate Change</span>
                  <span className={`font-semibold ${parseFloat(newRate) > currentRate ? 'text-red-600' : 'text-emerald-600'}`}>
                    {parseFloat(newRate) > currentRate ? '+' : ''}{(parseFloat(newRate) - currentRate).toFixed(2)} ({(((parseFloat(newRate) - currentRate) / currentRate) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setNewRate('')}>Cancel</Button>
              <Button className="flex-1" onClick={handlePreview} disabled={!newRate || parseFloat(newRate) <= 0}>
                Preview Changes <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Rate History Chart */}
        <Card title="Rate History (7 Days)" icon={TrendingUp}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rate" name="Rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Price Change Preview Modal */}
      <Modal
        open={previewOpen}
        title="Preview Price Changes"
        onClose={() => setPreviewOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Approve & Update Shopify'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Price Approval Required</p>
              <p className="text-xs text-amber-700 mt-0.5">This will update prices for 312 products and push to Shopify after admin approval.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">SKU</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Old Price</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">New Price</th>
                  <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Diff</th>
                  <th className="text-center py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Shopify</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_PRODUCTS.map((p) => (
                  <tr key={p.sku} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-royal-950">{p.name}</td>
                    <td className="py-2.5 font-mono text-[11px] text-gray-500">{p.sku}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatINR(p.oldPrice)}</td>
                    <td className="py-2.5 text-right font-bold text-royal-800">{formatINR(p.newPrice)}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-semibold">+{formatINR(p.newPrice - p.oldPrice)}</td>
                    <td className="py-2.5 text-center">
                      <Badge tone={p.shopify === 'Synced' ? 'green' : 'orange'}>{p.shopify}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  )
}
