import { useEffect, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server,
  Database,
  Store,
  Globe,
  Mail,
  Coins,
  RefreshCw,
  Activity,
  Hourglass,
  FlaskConical,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { systemHealthApi } from '../api/systemHealth'

const checkMeta = {
  api: { label: 'API Server', icon: Server, accent: 'text-royal-600 bg-royal-50 dark:text-royal-400 dark:bg-royal-500/10' },
  database: { label: 'Database', icon: Database, accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
  shopify: { label: 'Shopify API', icon: Store, accent: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10' },
  storefront: { label: 'Storefront', icon: Globe, accent: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-500/10' },
  email: { label: 'Email (SMTP)', icon: Mail, accent: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/10' },
  metalRate: { label: 'Silver Rate Source', icon: Coins, accent: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' },
  syncs: { label: 'Recent Sync Status', icon: RefreshCw, accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
  errors: { label: 'Last 24h Errors', icon: Activity, accent: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' },
  stuck: { label: 'Stuck Jobs', icon: Hourglass, accent: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' },
  testData: { label: 'Test Data Detector', icon: FlaskConical, accent: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10' },
  env: { label: 'Environment Secrets', icon: KeyRound, accent: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-white/10' },
}

const statusMeta = {
  ok: { label: 'Healthy', dot: 'bg-emerald-500', tone: 'green', Icon: CheckCircle2 },
  warn: { label: 'Degraded', dot: 'bg-amber-500', tone: 'gold', Icon: AlertTriangle },
  down: { label: 'Down', dot: 'bg-red-500', tone: 'red', Icon: XCircle },
}

const syncDot = { SUCCESS: 'bg-emerald-500', FAILED: 'bg-red-500', PENDING: 'bg-amber-500', DONE: 'bg-emerald-500', NEVER: 'bg-gray-400', OK: 'bg-emerald-500' }
const syncLabel = { PRODUCT: 'Products', PRICE: 'Prices', INVENTORY: 'Inventory', ORDER: 'Orders', CUSTOMER: 'Customers' }

function statusDot(status) {
  return syncDot[String(status || '').toUpperCase()] || 'bg-gray-400'
}

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
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function DetailList({ items }) {
  const rows = (items || []).filter(Boolean)
  if (!rows.length) return null
  return (
    <div className="mt-3 space-y-1 border-t border-gray-100 dark:border-white/[0.06] pt-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
      {rows.map((line) => (
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
    case 'storefront':
      return [
        d.statusCode !== undefined ? `HTTP ${d.statusCode}` : null,
        d.latencyMs !== undefined ? `Load: ${d.latencyMs}ms` : null,
        d.passwordProtected ? 'Behind password page' : null,
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
    case 'errors':
      return [d.total !== undefined ? `${d.total} error(s) in ${d.windowHours || 24}h window` : null]
    case 'stuck':
      return [d.total !== undefined ? `${d.total} stuck job(s)` : null]
    case 'testData':
      return [d.total !== undefined ? `${d.total} flagged record(s)` : null]
    default:
      return []
  }
}

// ---------- Modal building blocks ----------

function Sec({ title }) {
  return <h4 className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{title}</h4>
}

function Row({ label, children, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 dark:border-white/[0.04] text-sm">
      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
      <span className={`text-right text-gray-800 dark:text-gray-200 ${mono ? 'font-mono text-xs break-all' : ''}`}>{children}</span>
    </div>
  )
}

function Code({ children }) {
  if (!children) return null
  return (
    <pre className="mt-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-3 text-[11px] font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">
      {children}
    </pre>
  )
}

function EmptyNote({ children }) {
  return <p className="my-2 text-xs text-gray-400 dark:text-gray-500">{children}</p>
}

function WebhookTable({ webhooks }) {
  if (!webhooks) return <EmptyNote>Webhooks could not be verified against the store.</EmptyNote>
  if (!webhooks.length) return <EmptyNote>No required webhooks found.</EmptyNote>
  return (
    <div className="mt-1 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.08]">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 dark:bg-white/[0.04] text-left text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2 font-medium">Topic</th>
            <th className="px-3 py-2 font-medium">Registered</th>
            <th className="px-3 py-2 font-medium">Last delivery</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {webhooks.map((w) => (
            <tr key={w.topic}>
              <td className="px-3 py-2 font-mono text-[11px] text-gray-700 dark:text-gray-300">{w.topic}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${w.registered ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={w.registered ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {w.registered ? 'yes' : 'missing'}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{w.lastDelivery ? niceDate(w.lastDelivery) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SyncRunTable({ runs }) {
  if (!runs || !runs.length) return <EmptyNote>Never synced — no runs recorded.</EmptyNote>
  return (
    <div className="mt-1 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.08]">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 dark:bg-white/[0.04] text-left text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Result</th>
            <th className="px-3 py-2 font-medium">Items</th>
            <th className="px-3 py-2 font-medium">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {runs.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{niceDate(r.createdAt)}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot(r.status)}`} />
                  <span className={r.status === 'FAILED' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>{r.status}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.itemsProcessed ?? 0}</td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[260px] truncate" title={r.message || ''}>{r.message || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Per-check View panels ----------

function ApiDetail({ check, history }) {
  const d = check.details || {}
  return (
    <div>
      <Row label="Endpoint tested" mono>{d.endpoint || '—'}</Row>
      <Row label="Method">{d.method || 'GET'}</Row>
      <Row label="Raw status code">{d.statusCode ?? '—'}</Row>
      <Row label="Content type" mono>{d.contentType || '—'}</Row>
      <Row label="This check latency">{check.latencyMs !== undefined ? `${check.latencyMs}ms` : '—'}</Row>
      <Row label="API version">{d.version || '—'}</Row>
      <Row label="Process uptime">{fmtDuration(d.uptimeSec)}</Row>
      {d.sanitizedError && <Code>{d.sanitizedError}</Code>}
      <Sec title="Response-time history (last 10 checks)" />
      {history && history.length ? (
        <div className="mt-1 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.08]">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-white/[0.04] text-left text-gray-500 dark:text-gray-400">
              <tr><th className="px-3 py-2 font-medium">When</th><th className="px-3 py-2 font-medium">Latency</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {history.map((h) => (
                <tr key={h.at}>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{niceDate(h.at)}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{h.ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyNote>No response-time history collected yet this session.</EmptyNote>
      )}
    </div>
  )
}

function DatabaseDetail({ check }) {
  const d = check.details || {}
  return (
    <div>
      <Row label="Probe tested" mono>{d.query || 'SELECT 1'}</Row>
      <Row label="Connection layer">{d.adapter || 'Prisma'}</Row>
      <Row label="Exact query time">{check.latencyMs !== undefined ? `${check.latencyMs}ms` : '—'}</Row>
      <Row label="Connection pool">{d.poolNote || 'managed by Prisma'}</Row>
      {d.sanitizedError && <Code>{d.sanitizedError}</Code>}
    </div>
  )
}

function ShopifyDetail({ check }) {
  const d = check.details || {}
  return (
    <div>
      <Row label="API endpoint called" mono>{d.apiEndpoint || '/shop.json'}</Row>
      <Row label="Method">{d.method || 'GET'}</Row>
      <Row label="Store name">{d.storeName || '—'}</Row>
      <Row label="Store domain" mono>{d.shopDomain || '—'}</Row>
      <Row label="Latency">{d.latencyMs !== undefined ? `${d.latencyMs}ms` : '—'}</Row>
      {d.sanitizedError && <Code>{d.sanitizedError}</Code>}
      <Sec title="Webhook registrations" />
      <WebhookTable webhooks={d.webhooks} />
    </div>
  )
}

function StorefrontDetail({ check }) {
  const d = check.details || {}
  if (d.configured === false) return <EmptyNote>Storefront URL not configured (SHOPIFY_SHOP_DOMAIN).</EmptyNote>
  return (
    <div>
      <Row label="URL tested">
        <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-royal-600 dark:text-royal-400 hover:underline">
          {d.url}
          <ExternalLink size={11} />
        </a>
      </Row>
      {d.finalUrl && d.finalUrl !== d.url && <Row label="Redirected to" mono>{d.finalUrl}</Row>}
      <Row label="Raw status code">{d.statusCode ?? '—'}</Row>
      <Row label="Content type" mono>{d.contentType || '—'}</Row>
      <Row label="Load latency">{d.latencyMs !== undefined ? `${d.latencyMs}ms` : '—'}</Row>
      <Row label="Detected title">{d.title || '—'}</Row>
      <Row label="Password protected">{d.passwordProtected ? 'yes' : 'no'}</Row>
      {d.sanitizedError && <Code>{d.sanitizedError}</Code>}
    </div>
  )
}

function EmailDetail({ check }) {
  const d = check.details || {}
  if (d.configured === false) {
    return (
      <div>
        <Row label="Delivery mode">Console fallback</Row>
        <Row label="Reason">SMTP_HOST not configured in environment</Row>
      </div>
    )
  }
  return (
    <div>
      <Row label="SMTP host">{d.host}</Row>
      <Row label="Port">{d.port}</Row>
      <Row label="Secure (TLS)">{d.secure ? 'yes' : 'no'}</Row>
      <Row label="Auth">{d.authType || '—'}</Row>
      <Row label="From address">{d.from}</Row>
      <Row label="Verify latency">{d.latencyMs !== undefined ? `${d.latencyMs}ms` : '—'}</Row>
      {d.sanitizedError && <Code>{d.sanitizedError}</Code>}
    </div>
  )
}

function MetalRateDetail({ check }) {
  const d = check.details || {}
  return (
    <div>
      <Row label="Current rate">₹{d.rate}/gm</Row>
      <Row label="Last change">{niceDate(d.updatedAt)}</Row>
      <Row label="Changed by">{d.updatedBy || '—'}</Row>
      <Row label="Stale">{d.stale ? 'yes — older than 7 days' : 'no'}</Row>
      <Sec title="Recent rate changes (last 10)" />
      {d.recentRateChanges && d.recentRateChanges.length ? (
        <div className="mt-1 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.08]">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-white/[0.04] text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Change</th>
                <th className="px-3 py-2 font-medium">By</th>
                <th className="px-3 py-2 font-medium">Shopify push</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {d.recentRateChanges.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{niceDate(r.changedAt)}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">₹{r.oldRate} → ₹{r.newRate}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.changedBy || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(r.shopifyStatus)}`} />
                      <span className="text-gray-500 dark:text-gray-400">{r.shopifyStatus || 'legacy'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyNote>No rate changes on record yet.</EmptyNote>
      )}
    </div>
  )
}

function SyncsDetailModal({ check }) {
  const d = check.details || {}
  return (
    <div>
      <SyncsDetail byType={d.byType} webhooksRegistered={d.webhooksRegistered} webhooksRequired={d.webhooksRequired} />
      <Sec title="Webhook registrations" />
      <WebhookTable webhooks={d.webhooks} />
      {d.history && (
        <Sec title="Sync history (last 10 runs per type)" />
      )}
      {d.history?.map((h) => (
        <div key={h.type}>
          <p className="mt-3 mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{syncLabel[h.type] || h.type}</p>
          <SyncRunTable runs={h.runs} />
        </div>
      ))}
    </div>
  )
}

function ErrorsDetail({ check }) {
  const d = check.details || {}
  const sources = d.sources || []
  return (
    <div>
      <Row label="Lookback window">{d.windowHours}h</Row>
      <Row label="Total errors">{d.total ?? 0}</Row>
      {!d.total && <EmptyNote>No failed syncs, webhook errors or failed rate pushes in the window.</EmptyNote>}
      {sources.map((s) => (
        <div key={s.key}>
          <Sec title={`${s.label}${s.count ? ` (${s.count})` : ''}`} />
          {!s.items || !s.items.length ? (
            <EmptyNote>None.</EmptyNote>
          ) : (
            <div className="space-y-2">
              {s.items.map((it) => (
                <div key={`${s.key}-${it.id}`} className="rounded-lg border border-red-100 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/[0.07] p-2.5">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-mono text-gray-600 dark:text-gray-300">{it.type || '—'}</span>
                    <span className="whitespace-nowrap">{niceDate(it.at)}</span>
                  </div>
                  {it.detail && <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 break-words">{it.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StuckDetail({ check }) {
  const d = check.details || {}
  return (
    <div>
      <Row label="Stuck threshold">&gt; {d.stuckAfterMin} min pending</Row>
      <Row label="Total stuck jobs">{d.total ?? 0}</Row>
      {!d.total && <EmptyNote>Every recorded job completed — nothing is stuck.</EmptyNote>}
      <Sec title="Stuck sync jobs" />
      {d.syncs && Array.isArray(d.syncs) && d.syncs.length ? (
        <BenchList items={d.syncs} label={(it) => it.type} />
      ) : (
        <EmptyNote>None.</EmptyNote>
      )}
      <Sec title="Stuck rate pushes" />
      {d.ratePushes && Array.isArray(d.ratePushes) && d.ratePushes.length ? (
        <BenchList items={d.ratePushes} label={(it) => it.type} />
      ) : (
        <EmptyNote>None.</EmptyNote>
      )}
    </div>
  )
}

function BenchList({ items, label }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border border-orange-100 dark:border-orange-500/20 bg-orange-50/60 dark:bg-orange-500/[0.07] p-2.5 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-gray-600 dark:text-gray-300">#{it.id} · {label(it)}</span>
            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">started {timeAgo(it.startedAt)} · {it.ageMin}m</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TestDataDetail({ check }) {
  const d = check.details || {}
  const patterns = d.patterns || []
  return (
    <div>
      <Row label="Patterns scanned">
        <span className="inline-flex flex-wrap gap-1 justify-end">
          {patterns.map((p) => <code key={p} className="rounded bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 text-[11px]">{p}</code>)}
        </span>
      </Row>
      <Row label="Total flagged">{d.total ?? 0}</Row>
      {!d.total && <EmptyNote>No product, supplier or customer names match the test patterns.</EmptyNote>}
      {(d.tables || []).map((t) => (
        <div key={t.key}>
          <Sec title={`${t.label}${t.count ? ` (${t.count})` : ''}`} />
          {!t.rows || !t.rows.length ? (
            <EmptyNote>No matches.</EmptyNote>
          ) : (
            <>
              <div className="space-y-2">
                {t.rows.map((r) => (
                  <div key={r.id} className="rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/[0.07] p-2.5">
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="text-gray-700 dark:text-gray-200 break-all">{r.name}</span>
                      <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap">#{r.id}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(r.matches || []).map((m) => <code key={m} className="rounded bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-600 dark:text-rose-300">“{m}”</code>)}
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to={t.route}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-royal-600 dark:text-royal-400 hover:underline"
              >
                Open {t.label.toLowerCase()} to clean up <ExternalLink size={11} />
              </Link>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function EnvDetailModal({ check }) {
  const d = check.details || {}
  return (
    <div>
      <EnvDetail vars={d.vars} />
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Contact details are listed so you know what to configure — never their values.
      </p>
    </div>
  )
}

function DetailView({ check, history }) {
  switch (check.key) {
    case 'api': return <ApiDetail check={check} history={history} />
    case 'database': return <DatabaseDetail check={check} />
    case 'shopify': return <ShopifyDetail check={check} />
    case 'storefront': return <StorefrontDetail check={check} />
    case 'email': return <EmailDetail check={check} />
    case 'metalRate': return <MetalRateDetail check={check} />
    case 'syncs': return <SyncsDetailModal check={check} />
    case 'errors': return <ErrorsDetail check={check} />
    case 'stuck': return <StuckDetail check={check} />
    case 'testData': return <TestDataDetail check={check} />
    case 'env': return <EnvDetailModal check={check} />
    default: return <EmptyNote>No detail view for {check.key}.</EmptyNote>
  }
}

function HealthDetailModal({ checkKey, history, onClose }) {
  const { data: check, isLoading } = useQuery({
    queryKey: ['health-detail', checkKey],
    queryFn: () => systemHealthApi.getOne(checkKey).then((r) => r.data.data),
    enabled: Boolean(checkKey),
  })
  const meta = checkMeta[checkKey] || { label: checkKey }
  const status = statusMeta[check?.status] || statusMeta.warn
  const StatusIcon = status.Icon

  return (
    <Modal
      open={Boolean(checkKey)}
      onClose={onClose}
      size="lg"
      title={checkKey ? `${meta.label} — diagnostics` : ''}
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>Close</Button>
      }
    >
      {isLoading || !check ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Gathering full diagnostics...
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{status.label}</span>
            <Badge tone={status.tone}><StatusIcon size={11} className="mr-1" /> {String(check.status).toUpperCase()}</Badge>
            <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
              Checked {niceDate(check.checkedAt)}{check.latencyMs !== undefined ? ` · ${check.latencyMs}ms` : ''}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{check.message}</p>
          <DetailView check={check} history={history} />
          <div className="mt-6 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <ShieldCheck size={13} /> Read-only · error messages are scrubbed — secrets, tokens and connection strings are never shown.
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------- Page ----------

export default function SystemHealth() {
  const queryClient = useQueryClient()
  const [pendingKey, setPendingKey] = useState(null)
  const [openKey, setOpenKey] = useState(null)
  const [latHist, setLatHist] = useState({})

  const recordLatency = useCallback((c) => {
    if (!c || c.latencyMs === undefined) return
    setLatHist((prev) => {
      const next = [...(prev[c.key] || []), { at: c.checkedAt, ms: c.latencyMs }].slice(-10)
      if (next.length === (prev[c.key] || []).length && next[next.length - 1]?.at === (prev[c.key] || [])[(prev[c.key] || []).length - 1]?.at) return prev
      return { ...prev, [c.key]: next }
    })
  }, [])

  const { data: health, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => systemHealthApi.getAll().then((r) => r.data.data),
  })

  useEffect(() => {
    if (health?.checks) health.checks.forEach(recordLatency)
  }, [health, recordLatency])

  const recheckMutation = useMutation({
    mutationFn: (key) => systemHealthApi.getOne(key).then((r) => r.data.data),
    onMutate: (key) => setPendingKey(key),
    onSuccess: (check) => {
      recordLatency(check)
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
        subtitle="Live status of every critical service — backend, database, Shopify + storefront, email, rate source, syncs, errors, stuck jobs, test data and secrets"
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
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setOpenKey(check.key)}>
                        <Eye size={12} /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => recheckMutation.mutate(check.key)}
                        disabled={pendingKey !== null}
                      >
                        <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Recheck
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <HealthDetailModal checkKey={openKey} history={latHist[openKey]} onClose={() => setOpenKey(null)} />
    </div>
  )
}