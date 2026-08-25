import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, RefreshCw, Download, Plus, TrendingUp, TrendingDown,
  Package, Clock, Loader2, X, ChevronDown, Filter, Eye,
  Calendar, BarChart3, History, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { priceHistoryApi } from '../api/priceHistory'
import { productsApi } from '../api/products'
import { formatINR, formatDateTime, formatDate } from '../utils/format'

const REASONS = [
  { value: 'silver_rate_change', label: 'Silver rate change' },
  { value: 'gold_rate_change', label: 'Gold rate change' },
  { value: 'making_charge_change', label: 'Making charge change' },
  { value: 'stone_price_change', label: 'Stone price change' },
  { value: 'supplier_price_change', label: 'Supplier price change' },
  { value: 'manual_price_update', label: 'Manual price update' },
  { value: 'promotional_price', label: 'Promotional price' },
  { value: 'discount_update', label: 'Discount update' },
  { value: 'other', label: 'Other' },
]

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'This Year' },
  { value: 'all', label: 'All' },
]

const PRICE_TYPES = [
  { value: 'ALL', label: 'All Prices' },
  { value: 'SELLING', label: 'Selling Price' },
  { value: 'BASE', label: 'Base Amount' },
  { value: 'MAKING_CHARGE', label: 'Making Charge' },
  { value: 'GST', label: 'GST' },
]

const CHART_RANGES = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

function getDateRange(value) {
  const now = new Date()
  const start = new Date()
  switch (value) {
    case 'today': start.setHours(0, 0, 0, 0); break
    case '7d': start.setDate(now.getDate() - 7); break
    case '30d': start.setDate(now.getDate() - 30); break
    case '3m': start.setMonth(now.getMonth() - 3); break
    case '6m': start.setMonth(now.getMonth() - 6); break
    case '1y': start.setFullYear(now.getFullYear() - 1); break
    default: return {}
  }
  return { dateFrom: start.toISOString() }
}

function StatCardKpi({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4 flex items-start gap-3 hover:border-[#D4AF37]/20 transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${accent}`}>
        <Icon size={18} className="text-[#0B0B0B]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">{label}</p>
        <p className="text-xl font-bold text-[#F5F5F5] mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-[#A3A3A3] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function PriceChangeIndicator({ oldPrice, newPrice }) {
  const oldP = Number(oldPrice)
  const newP = Number(newPrice)
  const change = newP - oldP
  const pct = oldP ? ((change / oldP) * 100).toFixed(2) : 0

  if (change === 0) return <span className="text-[#A3A3A3] flex items-center gap-1"><Minus size={12} /> No change</span>
  if (change > 0) return (
    <span className="text-[#22C55E] font-semibold flex items-center gap-1">
      <ArrowUpRight size={14} /> +{formatINR(change)} (+{pct}%)
    </span>
  )
  return (
    <span className="text-[#EF4444] font-semibold flex items-center gap-1">
      <ArrowDownRight size={14} /> -{formatINR(Math.abs(change))} ({pct}%)
    </span>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-[#F5F5F5] mb-1">{d?.fullDate || label}</p>
      <p className="text-[#D4AF37] font-bold">Price: {formatINR(payload[0]?.value)}</p>
      {d?.oldPrice && <p className="text-[#A3A3A3]">Prev: {formatINR(d.oldPrice)}</p>}
      {d?.changedBy && <p className="text-[#A3A3A3]">By: {d.changedBy}</p>}
    </div>
  )
}

function AddPriceUpdateModal({ open, onClose, onSuccess }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({
    productId: '', priceType: 'SELLING', newPrice: '', reason: '', notes: '', search: '',
  })
  const [selectedProduct, setSelectedProduct] = useState(null)

  const { data: searchResults } = useQuery({
    queryKey: ['products-search', form.search],
    queryFn: () => productsApi.list({ search: form.search }).then((r) => r.data.data),
    enabled: form.search.length >= 2,
  })

  const createMutation = useMutation({
    mutationFn: (data) => priceHistoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-history'] })
      queryClient.invalidateQueries({ queryKey: ['price-history-stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setForm({ productId: '', priceType: 'SELLING', newPrice: '', reason: '', notes: '', search: '' })
    setSelectedProduct(null)
    setStep('form')
    onClose()
  }

  const currentPrice = selectedProduct ? Number(
    form.priceType === 'SELLING' ? selectedProduct.sellingPrice :
    form.priceType === 'BASE' ? selectedProduct.baseAmount :
    selectedProduct.makingCharge
  ) : 0

  const newPrice = Number(form.newPrice) || 0
  const change = newPrice - currentPrice
  const changePct = currentPrice ? ((change / currentPrice) * 100).toFixed(2) : 0

  return (
    <Modal open={open} title={step === 'preview' ? 'Confirm Price Change' : 'Add Price Update'} onClose={handleClose}
      footer={
        step === 'form' ? (
          <>
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => setStep('preview')}
              disabled={!selectedProduct || !form.newPrice || !form.reason}>
              Preview Change
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setStep('form')}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => createMutation.mutate({
              productId: selectedProduct.id, priceType: form.priceType,
              oldPrice: currentPrice, newPrice, reason: form.reason, notes: form.notes,
            })} loading={createMutation.isPending}>
              Confirm Update
            </Button>
          </>
        )
      }
    >
      {step === 'form' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Product *</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2">
                <span className="text-sm text-[#F5F5F5]">{selectedProduct.name} ({selectedProduct.sku})</span>
                <button onClick={() => setSelectedProduct(null)} className="text-[#A3A3A3] hover:text-[#EF4444] cursor-pointer"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={form.search} onChange={(e) => setForm({ ...form, search: e.target.value })}
                  placeholder="Search product name or SKU..."
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
                {searchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.slice(0, 10).map((p) => (
                      <button key={p.id} onClick={() => { setSelectedProduct(p); setForm({ ...form, search: '' }) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#1A1A1A] text-[#F5F5F5] cursor-pointer">
                        {p.name} <span className="text-[#A3A3A3]">({p.sku})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Price Type *</label>
            <select value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
              {PRICE_TYPES.filter(t => t.value !== 'ALL').map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Current Price</p>
              <p className="text-lg font-bold text-[#D4AF37]">{formatINR(currentPrice)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#A3A3A3] mb-1">New Price *</label>
            <input type="number" min="0" step="0.01" value={form.newPrice}
              onChange={(e) => setForm({ ...form, newPrice: e.target.value })}
              placeholder="Enter new price"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Reason *</label>
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
              <option value="">Select reason...</option>
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Enter additional information about this price change..."
              rows={3}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 min-h-20" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
            <div className="flex justify-between"><span className="text-sm text-[#A3A3A3]">Product</span><span className="text-sm font-medium text-[#F5F5F5]">{selectedProduct?.name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-[#A3A3A3]">Current Price</span><span className="text-sm font-medium text-[#F5F5F5]">{formatINR(currentPrice)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-[#A3A3A3]">New Price</span><span className="text-sm font-bold text-[#D4AF37]">{formatINR(newPrice)}</span></div>
            <div className="border-t border-[#2A2A2A] pt-3 flex justify-between">
              <span className="text-sm text-[#A3A3A3]">Change</span>
              <PriceChangeIndicator oldPrice={currentPrice} newPrice={newPrice} />
            </div>
            <div className="flex justify-between"><span className="text-sm text-[#A3A3A3]">Reason</span><span className="text-sm text-[#F5F5F5]">{REASONS.find(r => r.value === form.reason)?.label}</span></div>
            {form.notes && <div className="flex justify-between"><span className="text-sm text-[#A3A3A3]">Notes</span><span className="text-sm text-[#F5F5F5]">{form.notes}</span></div>}
          </div>
          {createMutation.isError && (
            <p className="text-sm text-[#EF4444]">Failed to update price. Please try again.</p>
          )}
        </div>
      )}
    </Modal>
  )
}

function DetailDrawer({ open, record, onClose }) {
  if (!open || !record) return null

  const p = record.product
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#141414] border-l border-[#2A2A2A] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <h3 className="text-lg font-semibold text-[#F5F5F5]">Price Change Details</h3>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl p-4">
            <h4 className="font-semibold text-[#F5F5F5]">{p?.name}</h4>
            <p className="text-sm text-[#A3A3A3] mt-1">SKU: {p?.sku}</p>
            <p className="text-sm text-[#A3A3A3]">Category: {p?.category?.name || 'N/A'}</p>
            <p className="text-sm text-[#A3A3A3]">Metal: {p?.metal?.toUpperCase()}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Price Type</p>
              <p className="text-sm font-medium text-[#F5F5F5] mt-1">{record.priceType?.replace('_', ' ')}</p>
            </div>
            <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Difference</p>
              <p className="mt-1"><PriceChangeIndicator oldPrice={record.oldPrice} newPrice={record.newPrice} /></p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
              <span className="text-sm text-[#A3A3A3]">Old Price</span>
              <span className="text-sm font-medium text-[#F5F5F5]">{formatINR(record.oldPrice)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
              <span className="text-sm text-[#A3A3A3]">New Price</span>
              <span className="text-sm font-bold text-[#D4AF37]">{formatINR(record.newPrice)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
              <span className="text-sm text-[#A3A3A3]">Reason</span>
              <span className="text-sm text-[#F5F5F5]">{REASONS.find(r => r.value === record.reason)?.label || record.reason}</span>
            </div>
            {record.notes && (
              <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
                <span className="text-sm text-[#A3A3A3]">Notes</span>
                <span className="text-sm text-[#F5F5F5] max-w-[60%] text-right">{record.notes}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
              <span className="text-sm text-[#A3A3A3]">Changed By</span>
              <span className="text-sm text-[#F5F5F5]">{record.changedBy?.name || 'System'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2A2A2A]">
              <span className="text-sm text-[#A3A3A3]">Date</span>
              <span className="text-sm text-[#F5F5F5]">{formatDate(record.createdAt)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#A3A3A3]">Time</span>
              <span className="text-sm text-[#F5F5F5]">{formatDateTime(record.createdAt).split(', ')[1] || formatDateTime(record.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductPriceHistory() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [priceType, setPriceType] = useState('ALL')
  const [dateRange, setDateRange] = useState('30d')
  const [chartRange, setChartRange] = useState('30d')
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)

  const dateParams = useMemo(() => getDateRange(dateRange), [dateRange])
  const chartDateParams = useMemo(() => getDateRange(chartRange), [chartRange])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['price-history-stats'],
    queryFn: () => priceHistoryApi.getStats().then((r) => r.data.data),
  })

  const { data: historyData, isLoading: historyLoading, refetch } = useQuery({
    queryKey: ['price-history', search, priceType, dateRange],
    queryFn: () => priceHistoryApi.list({ search, priceType, ...dateParams, limit: 100 }).then((r) => r.data.data),
  })

  const { data: productHistory, isLoading: productHistoryLoading } = useQuery({
    queryKey: ['price-history-product', selectedProductId, chartRange],
    queryFn: () => priceHistoryApi.getByProduct(selectedProductId, { priceType, ...chartDateParams }).then((r) => r.data.data),
    enabled: !!selectedProductId,
  })

  const { data: productSearchResults } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.list({ search: productSearch }).then((r) => r.data.data),
    enabled: productSearch.length >= 2,
  })

  const selectedProduct = productHistory?.[0]?.product

  const chartData = useMemo(() => {
    if (!productHistory?.length) return []
    return productHistory
      .slice()
      .reverse()
      .map((h) => ({
        date: formatDate(h.createdAt),
        fullDate: formatDateTime(h.createdAt),
        price: Number(h.newPrice),
        oldPrice: Number(h.oldPrice),
        changedBy: h.changedBy?.name || 'System',
      }))
  }, [productHistory])

  const handleExport = () => {
    const records = historyData?.records || []
    if (!records.length) return
    const csv = [
      'Date,Product,SKU,Old Price,New Price,Change,Reason,Updated By',
      ...records.map((r) =>
        `${formatDateTime(r.createdAt)},${r.product?.name},${r.product?.sku},${r.oldPrice},${r.newPrice},${r.changeAmount},"${REASONS.find(rv => rv.value === r.reason)?.label || r.reason}",${r.changedBy?.name || 'System'}`
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'price-history.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Product Price History"
        subtitle="Track product price changes, pricing trends and historical selling prices"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} /> Export</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw size={14} /> Refresh</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Price Update</Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <StatCardKpi icon={Package} label="Products Updated" value={stats?.productsUpdated || 0} accent="from-[#D4AF37] to-[#A67C00]" />
        <StatCardKpi icon={BarChart3} label="Price Updates" value={stats?.totalUpdates || 0} accent="from-blue-500 to-blue-600" />
        <StatCardKpi icon={TrendingUp} label="Increases" value={stats?.increases || 0} accent="from-emerald-500 to-emerald-600" />
        <StatCardKpi icon={TrendingDown} label="Decreases" value={stats?.decreases || 0} accent="from-red-500 to-red-600" />
        <StatCardKpi icon={History} label="Avg Change" value={stats?.avgChange != null ? `${stats.avgChange >= 0 ? '+' : ''}${formatINR(stats.avgChange)}` : '₹0'} accent="from-[#D4AF37] to-[#A67C00]" />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product price history..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#141414] text-sm text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Price Type</label>
            <select value={priceType} onChange={(e) => setPriceType(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
              {PRICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Date Range</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
              {DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Product Selection + Summary */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Select Product</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
              <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product, SKU or barcode..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#141414] text-sm text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
              {productSearchResults && productSearchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {productSearchResults.slice(0, 8).map((p) => (
                    <button key={p.id}
                      onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setChartRange('30d') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#1A1A1A] text-[#F5F5F5] cursor-pointer flex justify-between">
                      <span>{p.name}</span>
                      <span className="text-[#A3A3A3]">{p.sku}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Summary */}
        {selectedProduct && (
          <div className="bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-xl p-5 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Product</p>
              <p className="text-sm font-bold text-[#D4AF37] mt-1">{selectedProduct.name}</p>
              <p className="text-xs text-[#A3A3A3]">SKU: {selectedProduct.sku}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Current Selling Price</p>
              <p className="text-lg font-bold text-[#F5F5F5] mt-1">{formatINR(selectedProduct.sellingPrice)}</p>
            </div>
            {productHistory?.length >= 2 && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Previous Price</p>
                  <p className="text-lg font-bold text-[#A3A3A3] mt-1">{formatINR(productHistory[1]?.newPrice)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Change</p>
                  <div className="mt-1">
                    <PriceChangeIndicator oldPrice={productHistory[1]?.newPrice} newPrice={selectedProduct.sellingPrice} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-semibold">Last Updated</p>
                  <p className="text-sm text-[#F5F5F5] mt-1">{formatDateTime(productHistory[0]?.createdAt)}</p>
                  <p className="text-xs text-[#A3A3A3]">by {productHistory[0]?.changedBy?.name || 'System'}</p>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Chart */}
      {selectedProductId && (
        <Card title="Price History" className="mb-6"
          action={
            <div className="flex gap-1">
              {CHART_RANGES.map((cr) => (
                <button key={cr.value} onClick={() => setChartRange(cr.value)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    chartRange === cr.value ? 'bg-[#D4AF37] text-[#0B0B0B]' : 'text-[#A3A3A3] hover:bg-[#1A1A1A]'
                  }`}>
                  {cr.label}
                </button>
              ))}
            </div>
          }>
          {productHistoryLoading ? (
            <div className="h-80 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-[#D4AF37]" /></div>
          ) : chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}K`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="price" stroke="#D4AF37" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#D4AF37', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#F4C95D', stroke: '#D4AF37', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-[#A3A3A3]">
              <BarChart3 size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Select a product to view price history chart</p>
            </div>
          )}
        </Card>
      )}

      {/* Price History Table */}
      <Card title="Price Change History" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Date & Time</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Product</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">SKU</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Old Price</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">New Price</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Change</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Reason</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Updated By</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {historyLoading && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#A3A3A3]"><Loader2 size={20} className="animate-spin mx-auto mb-2 text-[#D4AF37]" /><p className="text-sm">Loading price history...</p></td></tr>
              )}
              {!historyLoading && historyData?.records?.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#A3A3A3]"><History size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">No price history found</p><p className="text-xs mt-1">Price changes will appear here automatically.</p></td></tr>
              )}
              {historyData?.records?.map((r) => (
                <tr key={r.id} className="hover:bg-[#1A1A1A]/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#A3A3A3] whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-[#F5F5F5]">{r.product?.name}</td>
                  <td className="px-4 py-3 text-xs text-[#A3A3A3] font-mono">{r.product?.sku}</td>
                  <td className="px-4 py-3 text-right text-[#A3A3A3]">{formatINR(r.oldPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#F5F5F5]">{formatINR(r.newPrice)}</td>
                  <td className="px-4 py-3 text-right"><PriceChangeIndicator oldPrice={r.oldPrice} newPrice={r.newPrice} /></td>
                  <td className="px-4 py-3 text-xs text-[#A3A3A3]">{REASONS.find(rv => rv.value === r.reason)?.label || r.reason}</td>
                  <td className="px-4 py-3 text-xs text-[#A3A3A3]">{r.changedBy?.name || 'System'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setDetailRecord(r)}
                      className="p-1.5 text-[#A3A3A3] hover:text-[#D4AF37] hover:bg-[#1A1A1A] rounded-lg cursor-pointer">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddPriceUpdateModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => {}} />
      <DetailDrawer open={!!detailRecord} record={detailRecord} onClose={() => setDetailRecord(null)} />
    </div>
  )
}
