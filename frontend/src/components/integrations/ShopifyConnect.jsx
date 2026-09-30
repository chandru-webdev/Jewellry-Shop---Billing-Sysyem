import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Store, KeyRound, Link2, RefreshCw, Pencil, Trash2,
  CheckCircle2, AlertCircle, Loader2, ExternalLink, Plug,
  Lock, Eye, EyeOff,
} from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { shopifyApi } from '../../api/shopify'
import { authApi } from '../../api/auth'

const fieldCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-royal-500'

export default function ShopifyConnect({ onToast }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ shopDomain: '', accessToken: '', webhookSecret: '', adminPassword: '' })
  const [result, setResult] = useState(null)
  const [passwordModal, setPasswordModal] = useState(null) // null | { mode: 'save' | 'edit' }
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

  const closePasswordModal = () => {
    setPasswordModal(null)
    setPasswordInput('')
  }

  // Verify the admin password, then either open the edit form or run the save.
  const verifyPassword = useMutation({
    mutationFn: (password) => authApi.verifyAdminPassword({ password }),
    onSuccess: (_res, password) => {
      closePasswordModal()
      setResult(null)
      if (passwordModal?.mode === 'edit') {
        setForm((f) => ({ ...f, adminPassword: password }))
        setEditing(true)
      } else if (passwordModal?.mode === 'disconnect') {
        disconnect.mutate(password)
      } else {
        connect.mutate({ ...form, adminPassword: password })
      }
    },
    onError: () => {
      setPasswordInput('')
    },
  })

  const connect = useMutation({
    mutationFn: (payload) => shopifyApi.saveConfig(payload),
    onSuccess: (res) => {
      refresh()
      setEditing(false)
      setForm((f) => ({ ...f, adminPassword: '' }))
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
      show({ ok: true, title: 'Shopify connected', lines })
    },
    onError: (err) => {
      setForm((f) => ({ ...f, adminPassword: '' }))
      show({ ok: false, title: 'Connection failed', lines: [err.response?.data?.message || err.message || 'Unknown error'] })
    },
  })

  const testConn = useMutation({
    mutationFn: () => shopifyApi.testConnection(),
    onSuccess: (res) => {
      const d = res.data.data
      const lines = [`${d.name} (${d.domain || ''})`, d.plan ? `Plan: ${d.plan}` : null, d.currency ? `Currency: ${d.currency}` : null].filter(Boolean)
      show({ ok: true, title: 'Connection test passed', lines })
    },
    onError: (err) => show({ ok: false, title: 'Connection test failed', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  const register = useMutation({
    mutationFn: () => shopifyApi.registerWebhooks(),
    onSuccess: (res) => {
      const d = res.data.data
      if (d.skipped) {
        show({ ok: false, title: 'Webhook secret missing', lines: ['Add the Shopify webhook secret and save to enable order auto-sync.'] })
        return
      }
      const failed = d.results?.filter((r) => r.status === 'failed') || []
      const created = d.results?.filter((r) => r.status === 'created').length || 0
      show({
        ok: !failed.length,
        title: failed.length ? 'Some webhooks failed' : 'Webhooks ensured',
        lines: failed.length
          ? failed.map((f) => `${f.topic}: ${f.message || 'failed'}`)
          : [`${created} registered, ${d.results.length - created} already active.`],
      })
    },
    onError: (err) => show({ ok: false, title: 'Webhook registration failed', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  const disconnect = useMutation({
    mutationFn: (password) => shopifyApi.clearConfig({ adminPassword: password }),
    onSuccess: () => {
      refresh()
      setEditing(true)
      setForm((f) => ({ ...f, shopDomain: '', accessToken: '', webhookSecret: '', adminPassword: '' }))
      setResult(null)
      onToast?.('Store disconnected — credentials removed from the app')
    },
    onError: (err) => show({ ok: false, title: 'Could not disconnect', lines: [err.response?.data?.message || err.message || 'Unknown error'] }),
  })

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Checking Shopify connection...</p>
  }

  const connected = config?.connected

  return (
    <div className="space-y-4">
      {connected && !editing && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <div className="w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Connected to {config.shopDomain}</p>
                <span className="text-[11px] font-medium rounded-full bg-emerald-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                  {config.source === 'db' ? 'App-configured' : 'Server env-vars'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <DetailCard title="API details" icon={<KeyRound size={14} />}>
              <DetailRow label="Store domain" value={config.shopDomain} />
              <DetailRow label="Admin API token" value={config.tokenMasked || '—'} />
              <DetailRow label="API version" value={config.apiVersion || '—'} />
              <DetailRow label="Credential source" value={config.source === 'db' ? 'App-configured (DB)' : 'Server environment variables'} />
            </DetailCard>

            <DetailCard title="Webhook details" icon={<Link2 size={14} />}>
              <DetailRow label="Webhook secret" value={config.hasWebhookSecret ? 'Set' : 'Not set'} />
              <DetailRow label="Callback URL" value={config.webhookUrl || '—'} mono />
              <DetailRow label="Required topics" value={config.requiredTopics?.length ? `${config.requiredTopics.length} registered` : '—'} />
            </DetailCard>
          </div>

          {config.requiredTopics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {config.requiredTopics.map((t) => (
                <span key={t} className="text-[11px] font-mono rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}

          {result && <ResultPanel result={result} />}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => testConn.mutate()} loading={testConn.isPending}><RefreshCw size={14} /> Test Connection</Button>
            <Button size="sm" variant="outline" onClick={() => register.mutate()} loading={register.isPending}><Plug size={14} /> Ensure Webhooks</Button>
            <Button size="sm" variant="outline" onClick={() => setPasswordModal({ mode: 'edit' })}><Pencil size={14} /> Edit</Button>
            {config.source === 'db' && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setPasswordModal({ mode: 'disconnect' })} loading={disconnect.isPending}><Trash2 size={14} /> Disconnect</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate('/shopify')} className="ml-auto">
              <ExternalLink size={14} /> Sync Dashboard
            </Button>
          </div>
        </div>
      )}

      {(editing || !connected) && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Store size={14} /> {connected ? 'Edit store credentials' : 'Connect a Shopify store'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your store&apos;s myshopify.com domain and an <span className="font-medium">Admin API</span> access token (Settings &rsaquo; Apps &rsaquo; Develop apps in Shopify). Saving tests the connection and registers the required webhook subscriptions automatically.
            </p>
          </div>

          {config?.source === 'env' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><AlertCircle size={12} /> Server environment credentials are active — saving here overrides them for this app.</p>
          )}
          {connected && (
            <p className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5"><Lock size={12} /> Leave a field blank to keep its current value.</p>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store domain</label>
              <input type="text" value={form.shopDomain} onChange={(e) => setForm((f) => ({ ...f, shopDomain: e.target.value }))} className={fieldCls} placeholder={connected ? config.shopDomain : 'your-store.myshopify.com'} />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Custom domains work too, e.g. shop.example.com</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin API access token</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                  className={`${fieldCls} pr-10`}
                  placeholder={connected ? config.tokenMasked : 'shpat_... or new-style token'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide token' : 'Show token'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook secret <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="password" value={form.webhookSecret} onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))} className={fieldCls} placeholder="Used to verify Shopify webhooks" autoComplete="new-password" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Needed for order auto-sync. Generate one in Shopify under the app&apos;s &ldquo;API credentials&rdquo;.</p>
            </div>
          </div>

          {result && <ResultPanel result={result} />}

          <div className="flex gap-2">
            <Button size="sm" onClick={() => (connected ? connect.mutate(form) : setPasswordModal({ mode: 'save' }))} loading={connect.isPending || verifyPassword.isPending} disabled={connect.isPending || verifyPassword.isPending}>
              {(connect.isPending || verifyPassword.isPending) ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Plug size={14} /> {connected ? 'Save Changes' : 'Save & Connect'}</>}
            </Button>
            {connected && <Button size="sm" variant="outline" onClick={() => { setEditing(false); setResult(null); setForm((f) => ({ ...f, adminPassword: '' })) }}>Cancel</Button>}
          </div>
        </div>
      )}

      <Modal open={!!passwordModal} title="Admin verification" onClose={closePasswordModal}>
        <form
          onSubmit={(e) => { e.preventDefault(); if (passwordInput) verifyPassword.mutate(passwordInput) }}
          className="space-y-3"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter your admin password to {passwordModal?.mode === 'edit' ? 'edit the storefront details' : passwordModal?.mode === 'disconnect' ? 'disconnect this store' : 'save these credentials'}.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`${fieldCls} pr-10`}
                placeholder="••••••••"
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {verifyPassword.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
              <p className="font-semibold flex items-center gap-1.5"><AlertCircle size={12} /> Admin password verification failed</p>
              <p className="mt-0.5">{verifyPassword.error?.response?.data?.message || verifyPassword.error?.message || 'Invalid admin password'}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" type="button" onClick={closePasswordModal}>Cancel</Button>
            <Button size="sm" type="submit" loading={verifyPassword.isPending} disabled={!passwordInput || verifyPassword.isPending}>
              Verify
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function DetailCard({ title, icon, children }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">{icon} {title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-sm text-gray-800 dark:text-gray-100 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

function ResultPanel({ result }) {
  const ok = result.ok
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