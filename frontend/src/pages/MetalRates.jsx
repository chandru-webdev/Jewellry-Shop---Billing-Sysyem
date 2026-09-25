import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Coins, TrendingUp, TrendingDown, AlertCircle, ArrowRight, Loader2, Send, Clock, CheckCircle, XCircle, CalendarDays, RefreshCw, Check, X, Eye } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { metalRatesApi } from '../api/metalRates'
import { formatINR, formatDateTime, formatDate } from '../utils/format'
import { exportMetalRateHistoryExcel, inRange } from '../utils/exportExcel'
import ExportControls from '../components/ui/ExportControls'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-royal-950 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="font-semibold">{label}</p>
      <p className="text-gold-400">Rate: ₹{payload[0].value}/gm</p>
    </div>
  )
}

// Step status icon: green check / red x / amber spinner / grey dot
const StepIcon = ({ status }) => {
  if (status === 'done') {
    return <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check size={12} className="text-white" /></span>
  }
  if (status === 'failed') {
    return <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0"><X size={12} className="text-white" /></span>
  }
  if (status === 'running') {
    return <span className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center shrink-0"><Loader2 size={10} className="animate-spin text-amber-500" /></span>
  }
  return <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/20 flex items-center justify-center shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-white/30" /></span>
}

const STEP_LABEL_TONE = {
  done: 'text-royal-950 dark:text-white',
  failed: 'text-red-600',
  running: 'text-amber-600 dark:text-amber-400',
  pending: 'text-gray-400 dark:text-gray-500',
  blocked: 'text-gray-400 dark:text-gray-500',
}

export default function MetalRates() {
  const queryClient = useQueryClient()
  const { isManager, isSuperAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [newRate, setNewRate] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'update')

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && (tab === 'update' || tab === 'requests')) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const updateTab = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }

  const { data: rates, isLoading: ratesLoading } = useQuery({
    queryKey: ['metal-rates'],
    queryFn: () => metalRatesApi.getCurrent().then((r) => r.data.data),
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['metal-rates-history'],
    queryFn: () => metalRatesApi.getHistory({ limit: 30 }).then((r) => r.data.data),
  })

  // Daily pipeline report (used by the status card + daily report table)
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['metal-rates-report'],
    queryFn: () => metalRatesApi.getReport({ days: 14 }).then((r) => r.data.data),
  })

  const reportGroups = useMemo(() => {
    const map = new Map()
    for (const it of reportData?.items || []) {
      const day = formatDate(it.changedAt)
      if (!map.has(day)) map.set(day, [])
      map.get(day).push(it)
    }
    return [...map.entries()].map(([day, items]) => ({
      day,
      items,
      anyFailed: items.some((i) => i.shopifyStatus === 'FAILED'),
      allComplete: items.length > 0 && items.every((i) => i.shopifyStatus === 'SUCCESS'),
    }))
  }, [reportData])

  const currentRate = rates?.rate ? parseFloat(rates.rate) : 0
  const lastUpdated = rates?.updatedAt

  // Live pipeline after a rate update: rate -> prices -> shopify sync
  const [pipeline, setPipeline] = useState(null)
  const [pipelineActive, setPipelineActive] = useState(false)
  const [viewItem, setViewItem] = useState(null)

  useEffect(() => {
    if (!pipelineActive) return
    let cancelled = false
    const started = Date.now()
    const id = setInterval(async () => {
      if (cancelled) return
      try {
        const r = await metalRatesApi.getReport({ days: 1 })
        const items = r?.data?.data?.items || []
        const match = items.find((i) => String(i.newRate) === String(pipeline.newRate))
        if (match) {
          setPipeline((prev) => ({
            ...prev,
            historyId: match.id,
            shopifyStatus: match.shopifyStatus || 'PENDING',
            shopifyMessage: match.shopifyMessage || 'Pushing updated prices to Shopify…',
            steps: match.steps || prev.steps || null,
            syncPayload: match.syncPayload || prev.syncPayload || null,
          }))
          if (match.shopifyStatus === 'SUCCESS' || match.shopifyStatus === 'FAILED') {
            setPipelineActive(false)
            queryClient.invalidateQueries({ queryKey: ['metal-rates-report'] })
            return
          }
        }
      } catch {
        // transient network error — keep polling
      }
      if (Date.now() - started > 120000) setPipelineActive(false)
    }, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [pipelineActive, pipeline?.newRate, pipeline?.historyId])

  const chartData = (historyData || [])
    .slice()
    .reverse()
    .map((h) => ({
      date: formatDate(h.changedAt),
      rate: parseFloat(h.newRate),
    }))

  const previousRate = historyData?.length > 1 ? parseFloat(historyData[1]?.newRate) : null
  const rateDiff = previousRate ? currentRate - previousRate : 0
  const rateDiffPct = previousRate ? ((rateDiff / previousRate) * 100).toFixed(2) : '0.00'
  const rateUp = rateDiff >= 0

  const previewMutation = useMutation({
    mutationFn: (rate) => metalRatesApi.preview(parseFloat(rate)),
    onSuccess: () => setPreviewOpen(true),
  })

  const updateMutation = useMutation({
    mutationFn: (rate) => metalRatesApi.updateSilver(parseFloat(rate)),
    onSuccess: (data) => {
      const res = data?.data?.data
      queryClient.invalidateQueries({ queryKey: ['metal-rates'] })
      queryClient.invalidateQueries({ queryKey: ['metal-rates-history'] })
      queryClient.invalidateQueries({ queryKey: ['silver-rate-current'] })
      queryClient.invalidateQueries({ queryKey: ['metal-rates-report'] })
      if (res && !res.unchanged) {
        setPipeline({
          historyId: res.historyId || null,
          oldRate: res.oldRate,
          newRate: res.newRate,
          updatedProducts: res.updatedProducts,
          shopifyStatus: 'PENDING',
          shopifyMessage: 'Pushing updated prices to Shopify…',
        })
        setPipelineActive(true)
      }
      setNewRate('')
      setPreviewOpen(false)
    },
  })

  const retryMutation = useMutation({
    mutationFn: (id) => metalRatesApi.retryShopify(id),
    onSuccess: (data) => {
      const res = data?.data?.data
      setPipeline((prev) => ({
        ...prev,
        shopifyStatus: res?.shopifyStatus || 'FAILED',
        shopifyMessage: res?.shopifyMessage || '',
        steps: res?.steps || prev?.steps || null,
      }))
      setPipelineActive(false)
      queryClient.invalidateQueries({ queryKey: ['metal-rates-report'] })
    },
  })

  const retryRowMutation = useMutation({
    mutationFn: (id) => metalRatesApi.retryShopify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metal-rates-report'] })
      queryClient.invalidateQueries({ queryKey: ['metal-rates-history'] })
    },
  })

  // Live stepper derived from the current pipeline (session run after an update)
  const liveSteps = useMemo(() => {
    if (!pipeline) return []
    const st = pipeline.shopifyStatus // SUCCESS | FAILED | PENDING
    const steps = [
      { key: 'rate', label: 'Rate updated in ERP', status: 'done', detail: `₹${Number(pipeline.oldRate).toFixed(2)} → ₹${Number(pipeline.newRate).toFixed(2)} /gm`, at: null, error: null },
      { key: 'reprice', label: 'Products repriced', status: pipeline.updatedProducts != null ? 'done' : 'pending', detail: `${pipeline.updatedProducts ?? 0} products repriced`, at: null, error: null },
      { key: 'shopify', label: 'Pushed to Shopify', status: st === 'SUCCESS' ? 'done' : st === 'FAILED' ? 'failed' : 'running', detail: pipeline.shopifyMessage || 'Pushing updated prices to Shopify…', at: null, error: null },
      { key: 'complete', label: 'Complete', status: st === 'SUCCESS' ? 'done' : st === 'FAILED' ? 'blocked' : 'pending', detail: st === 'SUCCESS' ? 'All steps succeeded' : st === 'FAILED' ? 'Stopped — previous step failed' : 'Waiting for previous steps', at: null, error: null },
    ]
    const stored = Array.isArray(pipeline.steps) ? pipeline.steps : []
    for (const step of steps) {
      const s = stored.find((x) => x.key === step.key)
      if (s?.at) step.at = s.at
      if (s?.detail) step.detail = s.detail
      if (s?.error) step.error = s.error
    }
    return steps
  }, [pipeline])

  // Full step breakdown for the "View" modal, derived from a persisted row
  const viewSteps = useMemo(() => {
    if (!viewItem) return []
    const stored = Array.isArray(viewItem.steps) ? viewItem.steps : []
    const rate = stored.find((s) => s.key === 'rate') || {
      key: 'rate', label: 'Rate updated in ERP', status: 'DONE', at: viewItem.changedAt,
      detail: `₹${parseFloat(viewItem.oldRate).toFixed(2)} → ₹${parseFloat(viewItem.newRate).toFixed(2)} /gm`, error: null,
    }
    const reprice = stored.find((s) => s.key === 'reprice') || (viewItem.productsUpdated != null
      ? { key: 'reprice', label: 'Products repriced', status: 'DONE', at: viewItem.changedAt, detail: `${viewItem.productsUpdated} products repriced`, error: null }
      : { key: 'reprice', label: 'Products repriced', status: 'PENDING', at: null, detail: 'Not recorded', error: null })
    let shopify = stored.find((x) => x.key === 'shopify')
    if (!shopify) {
      shopify = viewItem.shopifyStatus
        ? {
            key: 'shopify', label: 'Pushed to Shopify',
            status: viewItem.shopifyStatus === 'SUCCESS' ? 'DONE' : viewItem.shopifyStatus === 'FAILED' ? 'FAILED' : 'PENDING',
            at: null, detail: viewItem.shopifyMessage || '',
            error: viewItem.shopifyStatus === 'FAILED' ? (viewItem.shopifyMessage || 'Shopify push failed') : null,
          }
        : { key: 'shopify', label: 'Pushed to Shopify', status: 'PENDING', at: null, detail: 'Not recorded', error: null }
    }
    const completeStatus = shopify.status === 'DONE' ? 'DONE' : shopify.status === 'FAILED' ? 'BLOCKED' : 'PENDING'
    return [
      rate, reprice, shopify,
      {
        key: 'complete', label: 'Complete',
        status: completeStatus, at: completeStatus === 'DONE' ? shopify.at : null,
        detail: completeStatus === 'DONE'
          ? 'All steps succeeded'
          : completeStatus === 'BLOCKED'
            ? 'Stopped — previous step failed'
            : 'Waiting for previous steps',
        error: null,
      },
    ]
  }, [viewItem])

  const requestMutation = useMutation({
    mutationFn: (rate) => metalRatesApi.createRequest(parseFloat(rate)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-requests'] })
      setNewRate('')
      setPreviewOpen(false)
      updateTab('requests')
    },
  })

  const previewData = previewMutation.data?.data?.data

  const handlePreview = () => {
    if (!newRate || parseFloat(newRate) <= 0) return
    previewMutation.mutate(newRate)
  }

  const handleDirectApprove = () => {
    updateMutation.mutate(newRate)
  }

  const handleSubmitRequest = () => {
    requestMutation.mutate(newRate)
  }

  const handleExport = async ({ from, to }) => {
    const r = await metalRatesApi.getHistory({ limit: 100000 })
    const all = (r.data.data || []).filter((h) => inRange(h.changedAt, from, to))
    exportMetalRateHistoryExcel(all)
  }

  return (
    <div>
      <PageHeader
        title="Silver Rate Management"
        subtitle="Manage 92.5 Sterling Silver rates and sync prices to Shopify"
        actions={<ExportControls onExport={handleExport} />}
      />

      {/* Role indicator */}
      <div className="mb-4 flex items-center gap-2">
        <Badge tone={isSuperAdmin ? 'gold' : isManager ? 'blue' : 'gray'}>
          {isSuperAdmin ? 'SUPER ADMIN' : isManager ? 'MANAGER' : 'EMPLOYEE'}
        </Badge>
        {isManager && (
          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">You can submit rate requests for admin approval</span>
        )}
        {isSuperAdmin && (
          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">You can directly update rates or approve requests</span>
        )}
      </div>

      {/* Tabs for Super Admin */}
      {isSuperAdmin && (
        <div className="mb-6 border-b border-gray-200 dark:border-white/[0.08]">
          <nav className="flex gap-4" aria-label="Tabs">
            <button
              onClick={() => updateTab('update')}
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'update'
                  ? 'border-royal-600 dark:border-white/20 text-royal-700 dark:text-gray-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              Update Rate
            </button>
            <button
              onClick={() => updateTab('requests')}
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'requests'
                  ? 'border-royal-600 dark:border-white/20 text-royal-700 dark:text-gray-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              Pending Requests <Clock size={14} className="inline ml-1" />
            </button>
          </nav>
        </div>
      )}

      {(activeTab === 'update' || isManager) && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* Current Rate Card */}
            <Card className="lg:col-span-1">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold-500/20">
                  <Coins size={28} className="text-[#1a0a3e]" />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold mb-1">Current Silver Rate</p>
                {ratesLoading ? (
                  <div className="h-10 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={20} /></div>
                ) : (
                  <p className="text-4xl font-bold text-royal-950 dark:text-white">₹{currentRate.toFixed(2)}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">92.5 Sterling Silver</p>
                {previousRate > 0 && (
                  <div className={`mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${rateUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                    {rateUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {rateUp ? '+' : ''}{rateDiff.toFixed(2)} ({rateDiffPct}%)
                  </div>
                )}
                {lastUpdated && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                    Last Updated: {formatDateTime(lastUpdated)}
                  </p>
                )}
              </div>
            </Card>

            {/* Update Form */}
            <Card className="lg:col-span-1" title={isManager ? 'Request Rate Change' : 'Update Silver Rate'}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Rate (₹ per gram)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder={`Current: ₹${currentRate.toFixed(2)}`}
                    className="w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2.5 text-lg font-bold text-royal-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500"
                  />
                </div>
                {newRate && parseFloat(newRate) > 0 && (
                  <div className="bg-royal-50 dark:bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Old Rate</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">₹{currentRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">New Rate</span>
                      <span className="font-bold text-royal-950 dark:text-white">₹{parseFloat(newRate).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Rate Change</span>
                      <span className={`font-semibold ${parseFloat(newRate) > currentRate ? 'text-red-600' : 'text-emerald-600'}`}>
                        {parseFloat(newRate) > currentRate ? '+' : ''}{(parseFloat(newRate) - currentRate).toFixed(2)} ({(((parseFloat(newRate) - currentRate) / currentRate) * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setNewRate(''); previewMutation.reset() }}>Cancel</Button>
                  <Button className="flex-1" onClick={handlePreview} disabled={!newRate || parseFloat(newRate) <= 0 || previewMutation.isPending}>
                    {previewMutation.isPending ? (
                      <><Loader2 size={14} className="animate-spin" /> Loading...</>
                    ) : (
                      <>Preview Changes <ArrowRight size={14} /></>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Rate History Chart */}
            <Card title="Rate History" icon={TrendingUp}>
              <div className="h-52">
                {historyLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={20} /></div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0edf6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="rate" name="Rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#7c3aed' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">No history yet</div>
                )}
              </div>
            </Card>
          </div>

          {/* Live pipeline status after a rate update — 4-step stepper */}
      {pipeline && (
        <Card title="Update Status" icon={CheckCircle} className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <ol className="flex-1 space-y-0">
              {liveSteps.map((step, idx) => (
                <li key={step.key} className="relative flex items-start gap-3 pb-5 last:pb-0">
                  {idx < liveSteps.length - 1 && (
                    <span className={`absolute left-[9px] top-6 bottom-0 w-px ${step.status === 'done' ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-gray-200 dark:bg-white/[0.08]'}`} />
                  )}
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${STEP_LABEL_TONE[step.status]}`}>{step.label}</p>
                      {step.status === 'done' && <Badge tone="green"><CheckCircle size={12} /> Done</Badge>}
                      {step.status === 'failed' && <Badge tone="red"><XCircle size={12} /> Failed</Badge>}
                      {step.status === 'running' && <Badge tone="orange"><Loader2 size={12} className="animate-spin" /> Running</Badge>}
                      {step.status === 'blocked' && <Badge tone="gray">Not reached</Badge>}
                      {step.status === 'pending' && <Badge tone="gray">Pending</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                      {step.detail}
                      {step.at && <span className="ml-2 text-[11px] text-gray-400 dark:text-gray-500">· {formatDateTime(step.at)}</span>}
                    </p>
                    {step.key === 'shopify' && step.error && (
                      <p className="text-xs text-red-600 mt-1">Shopify sync failed: {step.error}</p>
                    )}
                    {step.key === 'shopify' && pipeline.syncPayload && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Total: {pipeline.syncPayload.total} · Pushed: {pipeline.syncPayload.ok} · Failed: {pipeline.syncPayload.failed}
                      </p>
                    )}
                    {step.key === 'shopify' && step.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => retryMutation.mutate(pipeline.historyId)}
                        disabled={retryMutation.isPending}
                      >
                        {retryMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Retry Sync
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className={`rounded-xl px-6 py-5 text-center border shrink-0 ${
              pipeline.shopifyStatus === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                : pipeline.shopifyStatus === 'FAILED'
                  ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
            }`}>
              {pipeline.shopifyStatus === 'SUCCESS' ? (
                <CheckCircle size={28} className="mx-auto mb-1.5 text-emerald-600" />
              ) : pipeline.shopifyStatus === 'FAILED' ? (
                <XCircle size={28} className="mx-auto mb-1.5 text-red-600" />
              ) : (
                <Loader2 size={28} className="mx-auto mb-1.5 animate-spin text-amber-600" />
              )}
              <p className={`text-sm font-bold ${
                pipeline.shopifyStatus === 'SUCCESS'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : pipeline.shopifyStatus === 'FAILED'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-amber-700 dark:text-amber-400'
              }`}>
                {pipeline.shopifyStatus === 'SUCCESS' ? 'All complete' : pipeline.shopifyStatus === 'FAILED' ? 'Sync failed' : 'Updating…'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Rate · Prices · Shopify</p>
            </div>
          </div>
        </Card>
      )}

      {/* Daily Update Report — green when every step of the day completed, red if any failed */}
      <Card title="Daily Update Report" icon={CalendarDays} className="mb-6">
        {reportLoading ? (
          <div className="py-10 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={22} /></div>
        ) : reportGroups.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">No rate updates in the last 14 days</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">Complete: {reportData?.summary?.complete ?? 0}</Badge>
              <Badge tone="orange">Pending: {reportData?.summary?.pending ?? 0}</Badge>
              <Badge tone="red">Failed: {reportData?.summary?.failed ?? 0}</Badge>
              <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Last 14 days</span>
            </div>

            {reportGroups.map((group) => (
              <div key={group.day}>
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/[0.08] pb-2 mb-2">
                  <p className="text-sm font-semibold text-royal-950 dark:text-white">{group.day}</p>
                  <Badge tone={group.anyFailed ? 'red' : group.allComplete ? 'green' : 'orange'}>
                    {group.anyFailed ? 'Some failed' : group.allComplete ? 'All complete' : 'Incomplete'}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                        <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Time</th>
                        <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Updated By</th>
                        <th className="text-center py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Rate</th>
                        <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Change</th>
                        <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Products</th>
                        <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Shopify</th>
                        <th className="text-center py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((it) => {
                        const diff = parseFloat(it.newRate) - parseFloat(it.oldRate)
                        const diffPct = parseFloat(it.oldRate) > 0 ? ((diff / parseFloat(it.oldRate)) * 100).toFixed(2) : '0.00'
                        return (
                          <tr key={it.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 whitespace-nowrap text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDateTime(it.changedAt)}</td>
                            <td className="py-2 whitespace-nowrap">{it.changedBy?.name || 'System'}</td>
                            <td className="py-2 text-center whitespace-nowrap">
                              <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">₹{parseFloat(it.oldRate).toFixed(2)}</span>
                              <ArrowRight size={12} className="inline mx-1 text-gray-400" />
                              <span className="font-bold text-royal-950 dark:text-white">₹{parseFloat(it.newRate).toFixed(2)}</span>
                            </td>
                            <td className={`py-2 text-right font-semibold whitespace-nowrap ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({diffPct}%)
                            </td>
                            <td className="py-2 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{it.productsUpdated ?? '—'}</td>
                            <td className="py-2">
                              {it.shopifyStatus === 'SUCCESS' && <Badge tone="green"><CheckCircle size={12} /> Synced</Badge>}
                              {it.shopifyStatus === 'FAILED' && (
                                <div className="flex items-center gap-1.5">
                                  <Badge tone="red"><XCircle size={12} /> Failed</Badge>
                                  {(isSuperAdmin || isManager) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-600 hover:bg-red-50 px-2"
                                      onClick={() => retryRowMutation.mutate(it.id)}
                                      disabled={retryRowMutation.isPending}
                                    >
                                      {retryRowMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Retry
                                    </Button>
                                  )}
                                </div>
                              )}
                              {it.shopifyStatus === 'PENDING' && <Badge tone="orange"><Loader2 size={12} className="animate-spin" /> Syncing…</Badge>}
                              {!it.shopifyStatus && <span className="text-xs text-gray-400 dark:text-gray-500">—</span>}
                            </td>
                            <td className="py-2 text-center">
                              <Button size="sm" variant="outline" onClick={() => setViewItem(it)}>
                                <Eye size={12} /> View
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Per-update detail modal — full 4-step breakdown with timestamps */}
      <Modal
        open={!!viewItem}
        title="Rate Update Detail"
        onClose={() => setViewItem(null)}
        footer={
          <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
        }
      >
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-white/5 rounded-lg p-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Old Rate</p>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300">₹{parseFloat(viewItem.oldRate).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">New Rate</p>
                <p className="text-lg font-bold text-royal-900 dark:text-gray-200">₹{parseFloat(viewItem.newRate).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Updated By</p>
                <p className="text-sm font-bold text-royal-900 dark:text-gray-200">{viewItem.changedBy?.name || 'System'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Products</p>
                <p className="text-lg font-bold text-royal-900 dark:text-gray-200">{viewItem.productsUpdated ?? '—'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Updated at {formatDateTime(viewItem.changedAt)}</p>

            <ol className="space-y-0">
              {viewSteps.map((step, idx) => {
                const status = step.status === 'DONE' ? 'done' : step.status === 'FAILED' ? 'failed' : step.status === 'BLOCKED' ? 'blocked' : step.status === 'RUNNING' ? 'running' : 'pending'
                return (
                  <li key={step.key} className="relative flex items-start gap-3 pb-4 last:pb-0">
                    {idx < viewSteps.length - 1 && (
                      <span className={`absolute left-[9px] top-6 bottom-0 w-px ${status === 'done' ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-gray-200 dark:bg-white/[0.08]'}`} />
                    )}
                    <StepIcon status={status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${STEP_LABEL_TONE[status]}`}>{step.label}</p>
                        {status === 'done' && <Badge tone="green"><CheckCircle size={12} /> Done</Badge>}
                        {status === 'failed' && <Badge tone="red"><XCircle size={12} /> Failed</Badge>}
                        {status === 'blocked' && <Badge tone="gray">Not reached</Badge>}
                        {status === 'pending' && <Badge tone="gray">Pending</Badge>}
                      </div>
                      {step.detail && (
                        <p className={`text-xs mt-0.5 ${status === 'failed' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>{step.detail}</p>
                      )}
                      {step.error && <p className="text-xs text-red-600 mt-0.5">Reason: {step.error}</p>}
                      {step.key === 'shopify' && viewItem.syncPayload && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          Shopify response — Total: {viewItem.syncPayload.total} · Pushed: {viewItem.syncPayload.ok} · Failed: {viewItem.syncPayload.failed} · {viewItem.syncPayload.failed === 0 ? 'Status: OK' : 'Status: ERROR'}
                        </p>
                      )}
                      {step.at && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">✓ {formatDateTime(step.at)}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </Modal>

      {/* Price Change Preview Modal */}
          <Modal
            open={previewOpen}
            title="Preview Price Changes"
            onClose={() => { setPreviewOpen(false); previewMutation.reset() }}
            footer={
              <>
                <Button variant="ghost" onClick={() => { setPreviewOpen(false); previewMutation.reset() }}>Cancel</Button>
                {isManager ? (
                  <Button onClick={handleSubmitRequest} disabled={requestMutation.isPending}>
                    {requestMutation.isPending ? (
                      <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                    ) : (
                      <><Send size={14} /> Submit for Approval</>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleDirectApprove} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Approve & Update All Products'}
                  </Button>
                )}
              </>
            }
          >
            {previewData && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Price Approval Required</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      This will update prices for <strong>{previewData.affectedCount}</strong> products.
                      Shopify will be synced automatically after approval.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Old Rate</p>
                    <p className="text-lg font-bold text-gray-700 dark:text-gray-300">₹{parseFloat(previewData.oldRate).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">New Rate</p>
                    <p className="text-lg font-bold text-royal-900 dark:text-gray-200">₹{parseFloat(previewData.newRate).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">Products</p>
                    <p className="text-lg font-bold text-royal-900 dark:text-gray-200">{previewData.affectedCount}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                        <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Product</th>
                        <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">SKU</th>
                        <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Old Price</th>
                        <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">New Price</th>
                        <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sample.map((p) => {
                        const diff = parseFloat(p.newPrice) - parseFloat(p.oldPrice)
                        return (
                          <tr key={p.sku} className="border-b border-gray-50 last:border-0">
                            <td className="py-2.5 font-medium text-royal-950 dark:text-white">{p.name}</td>
                            <td className="py-2.5 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                            <td className="py-2.5 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">{formatINR(p.oldPrice)}</td>
                            <td className="py-2.5 text-right font-bold text-royal-800 dark:text-gray-200">{formatINR(p.newPrice)}</td>
                            <td className={`py-2.5 text-right font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff >= 0 ? '+' : ''}{formatINR(diff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {previewData.affectedCount > previewData.sample.length && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">
                      Showing {previewData.sample.length} of {previewData.affectedCount} affected products
                    </p>
                  )}
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {/* Pending Requests Tab - Super Admin only */}
      {isSuperAdmin && activeTab === 'requests' && <RateRequestsTab />}
    </div>
  )
}

// Separate component for the pending requests tab (uses its own queries)
function RateRequestsTab() {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['rate-requests', filterStatus],
    queryFn: () => metalRatesApi.listRequests(filterStatus).then((r) => r.data.data),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => metalRatesApi.reviewRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-requests'] })
      queryClient.invalidateQueries({ queryKey: ['metal-rates'] })
      queryClient.invalidateQueries({ queryKey: ['metal-rates-history'] })
      queryClient.invalidateQueries({ queryKey: ['silver-rate-current'] })
    },
  })

  return (
    <Card title="Rate Change Requests" icon={Clock}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {requestsLoading ? (
        <div className="py-12 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={24} /></div>
      ) : (requestsData || []).length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No requests found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Requested By</th>
                <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Old Rate</th>
                <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">New Rate</th>
                <th className="text-right py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Change</th>
                <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Products</th>
                <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Requested</th>
                <th className="text-left py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Reviewed</th>
                <th className="text-center py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {requestsData.map((req) => {
                const change = parseFloat(req.newRate) - parseFloat(req.oldRate)
                return (
                  <tr key={req.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-royal-950 dark:text-white">
                      {req.requestedBy?.name} <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-normal">({req.requestedBy?.email})</span>
                    </td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">₹{parseFloat(req.oldRate).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-royal-800 dark:text-gray-200">₹{parseFloat(req.newRate).toFixed(2)}</td>
                    <td className={`py-2.5 text-right font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {change >= 0 ? '+' : ''}₹{Math.abs(change).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-gray-400 dark:text-gray-500">
                      {req.previewJson?.affectedCount || 0}
                    </td>
                    <td className="py-2.5">
                      <Badge tone={
                        req.status === 'PENDING' ? 'orange' :
                        req.status === 'APPROVED' ? 'green' : 'red'
                      }>{req.status}</Badge>
                    </td>
                    <td className="py-2.5 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDateTime(req.createdAt)}</td>
                    <td className="py-2.5 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {req.reviewedAt ? formatDateTime(req.reviewedAt) : '—'}
                    </td>
                    <td className="py-2.5 text-center">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                            onClick={() => reviewMutation.mutate({ id: req.id, status: 'APPROVED' })}
                            disabled={reviewMutation.isPending}
                          >
                            <CheckCircle size={14} /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => reviewMutation.mutate({ id: req.id, status: 'REJECTED' })}
                            disabled={reviewMutation.isPending}
                          >
                            <XCircle size={14} /> Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {req.status === 'APPROVED' && <CheckCircle size={12} className="text-emerald-500" />}
                          {req.status === 'REJECTED' && <XCircle size={12} className="text-red-500" />}
                          {req.reviewedBy && <span>by {req.reviewedBy.name}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}