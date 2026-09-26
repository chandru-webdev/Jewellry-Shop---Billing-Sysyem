import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server,
  Database,
  Store,
  Mail,
  Coins,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { systemHealthApi } from '../api/systemHealth'

const checkMeta = {
  api: { label: 'API Server', icon: Server, accent: 'text-royal-600 bg-royal-50 dark:text-royal-400 dark:bg-royal-500/10' },
  database: { label: 'Database', icon: Database, accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
  shopify: { label: 'Shopify API', icon: Store, accent: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10' },
  email: { label: 'Email (SMTP)', icon: Mail, accent: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/10' },
  metalRate: { label: 'Silver Rate Source', icon: Coins, accent: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' },
  syncs: { label: 'Recent Sync Status', icon: RefreshCw, accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
  env: { label: 'Environment Secrets', icon: KeyRound, accent: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-white/10' },
}

const statusMeta = {
  ok: { label: 'Healthy', dot: 'bg-emerald-500', tone: 'green', Icon: CheckCircle2 },
  warn: { label: 'Degraded', dot: 'bg-amber-500', tone: 'gold', Icon: AlertTriangle },
  down: { label: 'Down', dot: 'bg-red-500', tone: 'red', Icon: XCircle },
}

const syncDot = { SUCCESS: 'bg-emerald-500', FAILED: 'bg-red-500', PENDING: 'bg-amber-500', NEVER: 'bg-gray-400' }
const syncLabel = { PRODUCT: 'Products', PRICE: 'Prices', INVENTORY: 'Inventory', ORDER: 'Orders', CUSTOMER: 'Customers' }

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

function fmtDuration(sec) {
  if (sec === null || sec === undefined) return '—'
  const s = Math.round(sec)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function niceDate(iso) {
  return new Date(iso).toLocaleString()
}

function DetailList({ items }) {
  return (
    <div className="mt-3 space-y-1 border-t border-gray-100 dark:border-white/[0.06] pt-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
      {items.map((line) => (
        <p key={line} className="truncate">{line}</p>
      ))}
    </div>
  )
}

function SyncsDetail({ byType, webhooksRegistered, webhooksRequired }) {
  const types = Object.keys(byType || {})
  return (
    <div className="mt-3 border-t border-gray-100 dark:border-white/[0.06] pt-3">
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => {
          const s = byType[t]?.status || 'NEVER'
          return (
            <span key={t} title={byType[t]?.message || ''} className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300">
              <span className={`h-1.5 w-1.5 rounded-full ${syncDot[s]}`} />
              {syncLabel[t] || t}
              <span className="text-gray-400 dark:text-gray-500">{byType[t]?.itemsProcessed ?? ''}</span>
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
        Webhooks: {webhooksRegistered === null ? 'not verified' : `${webhooksRegistered}/${webhooksRequired || 0} topics registered`}
      </p>
      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        Age of last log per type — {types.map((t) => `${syncLabel[t] || t}: ${timeAgo(byType[t]?.lastRun)}`).join(' · ')}
      </p>
    </div>
  )
}

function EnvDetail({ vars }) {
  return (
    <div className="mt-3 border-t border-gray-100 dark:border-white/[0.06] pt-3">
      <div className="flex flex-wrap gap-1.5">
        {(vars || []).map((v) => (
          <span
            key={v.key}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${v.set ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${v.set ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {v.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">Values are never exposed — only presence is reported.</p>
    </div>
  )
}

function detailLines(check) {
  const d = check.details || {}
  switch (check.key) {
    case 'api':
      return [d.uptimeSec !== undefined ? `Uptime: ${fmtDuration(d.uptimeSec)}` : null, d.version ? `API version ${d.version}` : null]
    case 'database':
      return [d.latencyMs !== undefined ? `Query round-trip: ${d.latencyMs}ms` : null]
    case 'shopify':
      return [
        d.storeName ? `Store: ${d.storeName}` : null,
        d.shopDomain ? `Domain: ${d.shopDomain}` : null,
        d.latencyMs !== undefined ? `Response: ${d.latencyMs}ms` : null,
      ]
    case 'email':
      if (!d.configured) return ['Delivery mode: console fallback']
      return [`Host: ${d.host}`, d.from ? `From: ${d.from}` : null, d.latencyMs !== undefined ? `Verify: ${d.latencyMs}ms` : null]
    case 'metalRate':
      return [
        d.rate !== undefined ? `Rate: ₹${d.rate}/gm` : null,
        d.updatedBy ? `Updated by: ${d.updatedBy}` : null,
        d.updatedAt ? `Last change: ${niceDate(d.updatedAt)}` : null,
      ]
    default:
      return []
  }
}

export default function SystemHealth() {
  const queryClient = useQueryClient()
  const [pendingKey, setPendingKey] = useState(null)

  const { data: health, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => systemHealthApi.getAll().then((r) => r.data.data),
  })

  const recheckMutation = useMutation({
    mutationFn: (key) => systemHealthApi.getOne(key).then((r) => r.data.data),
    onMutate: (key) => setPendingKey(key),
    onSuccess: (check) => {
      queryClient.setQueryData(['system-health'], (old) =>
        old
          ? { ...old, checkedAt: check.checkedAt, checks: (old.checks || []).map((c) => (c.key === check.key ? check : c)) }
          : old
      )
    },
    onSettled: () => setPendingKey(null),
  })

  const overall = health?.overall || { status: 'warn', counts: { ok: 0, warn: 0, down: 0 } }
  const StatusMeta = statusMeta[overall.status] || statusMeta.warn
  const overallIconOk = () => {
    if (overall.status === 'ok') return <CheckCircle2 size={18} />
    if (overall.status === 'down') return <XCircle size={18} />
    return <AlertTriangle size={18} />
  }

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Live status of every critical service — backend, database, Shopify, email, rate source, syncs and secrets"
        actions={
          <Button variant="primary" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Recheck All
          </Button>
        }
      />

      {(isLoading || !health) && (
        <Card className="p-10 flex items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
          <Loader2 size={18} className="animate-spin" /> Running health checks...
        </Card>
      )}

      {health && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-5 bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-4">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${overall.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : overall.status === 'down' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
              {overallIconOk()}
              <span className="font-semibold text-sm">Overall: {StatusMeta.label}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
              <span><span className="font-semibold text-emerald-600">{overall.counts?.ok ?? 0}</span> healthy</span>
              <span><span className="font-semibold text-amber-600">{overall.counts?.warn ?? 0}</span> degraded</span>
              <span><span className="font-semibold text-red-600">{overall.counts?.down ?? 0}</span> down</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <ShieldCheck size={14} />
              Last full run: {timeAgo(health.checkedAt)} · No secret values are shown
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {health.checks.map((check) => {
              const meta = checkMeta[check.key]
              const Icon = meta?.icon || Server
              const status = statusMeta[check.status] || statusMeta.warn
              const StatusIcon = status.Icon
              const busy = pendingKey === check.key
              return (
                <Card key={check.key} className="p-4 flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${meta?.accent || 'bg-gray-100 text-gray-500'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-royal-950 dark:text-white text-sm truncate">{meta?.label || check.key}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">{status.label}</span>
                      </div>
                    </div>
                    <Badge tone={status.tone}>
                      <StatusIcon size={11} className="mr-1" /> {String(check.status).toUpperCase()}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{check.message || 'No message'}</p>

                  {check.key === 'syncs' ? (
                    <SyncsDetail
                      byType={check.details?.byType}
                      webhooksRegistered={check.details?.webhooksRegistered}
                      webhooksRequired={check.details?.webhooksRequired}
                    />
                  ) : check.key === 'env' ? (
                    <EnvDetail vars={check.details?.vars} />
                  ) : (
                    <DetailList items={detailLines(check)} />
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/[0.06] pt-3">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      Checked {timeAgo(check.checkedAt)}{check.latencyMs !== undefined ? ` · ${check.latencyMs}ms` : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => recheckMutation.mutate(check.key)}
                      disabled={pendingKey !== null}
                    >
                      <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Recheck
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}