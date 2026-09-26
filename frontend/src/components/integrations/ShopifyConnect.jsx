import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Store, KeyRound, ShieldCheck, Link2, RefreshCw, Pencil, Trash2,
  CheckCircle2, AlertCircle, Loader2, ExternalLink, Plug,
} from 'lucide-react'
import Button from '../ui/Button'
import { shopifyApi } from '../../api/shopify'

const fieldCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-royal-500'

export default function ShopifyConnect({ onToast }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ shopDomain: '', accessToken: '', webhookSecret: '' })
  const [result, setResult] = useState(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ['shopify-config'],
    queryFn: () => shopifyApi.getConfig().then((r) => r.data.data),
    retry: false,
  })

  const show = (r) => setResult(r)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['shopify-config'] })
    queryClient.invalidateQueries({ queryKey: ['settings'] })
    queryClient.invalidateQueries({ queryKey: ['shopify-status'] })
  }

  const connect = useMutation({
    mutationFn: () => shopifyApi.saveConfig(form),
    onSuccess: (res) => {
      refresh()
      setEditing(false)
      const d = res.data.data
      const lines = []
      if (d.test?.name) lines.push(`Connected to ${d.test.name} (${d.test.domain || ''})`)
      if (d.test?.plan) lines.push(`Plan: ${d.test.plan}`)
      if (d.webhooks?.skipped) lines.push('Webhooks not registered — add the webhook secret to enable order auto-sync')
      else {
        const created = d.webhooks?.results?.filter((r) => r.status === 'created').length || 0
        const failed = d.webhooks?.results?.filter((r) => r.status === 'failed').length || 0
        lines.push(`Webhooks: ${created} registered, ${failed} failed, rest already active`)
      }
      show({ kind: 'ok', title: 'Shopify connected', lines })
    },
    onError: (err) => show({ kind: 'err', title: 'Connection failed', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  const testConn = useMutation({
    mutationFn: () => shopifyApi.testConnection(),
    onSuccess: (res) => {
      const d = res.data.data
      const lines = [`${d.name} (${d.domain || ''})`, d.plan ? `Plan: ${d.plan}` : null, d.currency ? `Currency: ${d.currency}` : null].filter(Boolean)
      show({ kind: 'ok', title: 'Connection test passed', lines })
    },
    onError: (err) => show({ kind: 'err', title: 'Connection test failed', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  const register = useMutation({
    mutationFn: () => shopifyApi.registerWebhooks(),
    onSuccess: (res) => {
      const d = res.data.data
      if (d.skipped) {
        show({ kind: 'err', title: 'Webhook secret missing', lines: ['Add the Shopify webhook secret and save to enable order auto-sync.'] })
        return
      }
      const failed = d.results?.filter((r) => r.status === 'failed') || []
      const created = d.results?.filter((r) => r.status === 'created').length || 0
      show({
        kind: failed.length ? 'err' : 'ok',
        title: failed.length ? 'Some webhooks failed' : 'Webhooks ensured',
        lines: failed.length
          ? failed.map((f) => `${f.topic}: ${f.message || 'failed'}`)
          : [`${created} registered, ${d.results.length - created} already active.`],
      })
    },
    onError: (err) => show({ kind: 'err', title: 'Webhook registration failed', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  const disconnect = useMutation({
    mutationFn: () => shopifyApi.clearConfig(),
    onSuccess: () => {
      refresh()
      setEditing(true)
      setForm({ shopDomain: '', accessToken: '', webhookSecret: '' })
      setResult(null)
      onToast?.('Store disconnected — credentials removed from the app')
    },
    onError: (err) => show({ kind: 'err', title: 'Could not disconnect', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Checking Shopify connection...</p>
  }

  const connected = config?.connected

  if (connected && !editing) {
    const sourceLabel = config.source === 'db' ? 'App-configured' : 'Server env-vars'
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
          <div className="w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Connected to {config.shopDomain}</p>
              <span className="text-[11px] font-medium rounded-full bg-emerald-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">{sourceLabel}</span>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><KeyRound size={12} /> Token {config.tokenMasked}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><ShieldCheck size={12} /> {config.hasWebhookSecret ? 'Webhook secret set' : 'Webhook secret not set'}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><Link2 size={12} /> {config.webhookUrl}</p>
            </div>
          </div>
        </div>

        {result && <ResultPanel result={result} />}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => testConn.mutate()} loading={testConn.isPending}><RefreshCw size={14} /> Test Connection</Button>
          <Button size="sm" variant="outline" onClick={() => register.mutate()} loading={register.isPending}><Plug size={14} /> Ensure Webhooks</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>
          {config.source === 'db' && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => disconnect.mutate()} loading={disconnect.isPending}><Trash2 size={14} /> Disconnect</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => navigate('/shopify')} className="ml-auto">
            <ExternalLink size={14} /> Sync Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2"><Store size={14} /> Connect a Shopify store</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enter your store&apos;s myshopify.com domain and an <span className="font-medium">Admin API</span> access token (Settings &rsaquo; Apps &rsaquo; Develop apps in Shopify). Saving tests the connection and registers the order/webhook subscriptions automatically.
        </p>
      </div>

      {config?.source === 'env' && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><AlertCircle size={12} /> Server environment credentials are active — saving here overrides them for this app.</p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store domain</label>
          <input type="text" value={form.shopDomain} onChange={(e) => setForm((f) => ({ ...f, shopDomain: e.target.value }))} className={fieldCls} placeholder="your-store.myshopify.com" />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Custom domains work too, e.g. shop.example.com</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin API access token</label>
          <input type="password" value={form.accessToken} onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))} className={fieldCls} placeholder="shpat_... or new-style token" autoComplete="new-password" />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Requires read for products/customers/orders and write for products/inventory/variants</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook secret <span className="font-normal text-gray-400">(optional)</span></label>
          <input type="password" value={form.webhookSecret} onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))} className={fieldCls} placeholder="Used to verify Shopify webhooks" autoComplete="new-password" />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Needed for order auto-sync. Generate one in Shopify under the app&apos;s &ldquo;API credentials&rdquo;.</p>
        </div>
      </div>

      {result && <ResultPanel result={result} />}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => connect.mutate()} loading={connect.isPending} disabled={connect.isPending}>
          {connect.isPending ? <><Loader2 size={14} className="animate-spin" /> Connecting...</> : <><Plug size={14} /> Save & Connect</>}
        </Button>
        {connected && <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
    </div>
  )
}

function ResultPanel({ result }) {
  const ok = result.kind === 'ok'
  return (
    <div className={`rounded-lg border p-3 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'}`}>
      <p className={`font-semibold flex items-center gap-1.5 ${ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
        {ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {result.title}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
        {result.lines.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </div>
  )
}