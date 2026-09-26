import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Receipt, Bell, ShieldCheck, Plug, X, CheckCircle2, AlertCircle, Upload,
  FileText, Tags, Moon, Sun, ExternalLink,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { settingsApi } from '../api/settings'

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

const fieldCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-royal-500'

function Field({ label, hint, children, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-royal-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const logoInputRef = useRef(null)

  const [form, setForm] = useState({})
  const [integration, setIntegration] = useState(null)
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    settingsApi.getAll()
      .then((res) => setForm(res.data.data || {}))
      .catch(() => {})
    settingsApi.getIntegrationStatus()
      .then((res) => setIntegration(res.data.data))
      .catch(() => setIntegration(null))
  }, [])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const saveMutation = useMutation({
    mutationFn: (fields) => settingsApi.update(fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      showToast('Settings saved successfully')
    },
    onError: (error) => showToast(error.response?.data?.message || error.message || 'Failed to save settings'),
  })

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Logo must be an image file (PNG, JPG, SVG)')
      return
    }
    if (file.size > 300 * 1024) {
      showToast('Logo must be under 300 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set('businessLogo')(String(reader.result))
    reader.readAsDataURL(file)
  }

  const saveBusiness = () => {
    const nextErrors = {}
    if (form.gstin && !GSTIN_REGEX.test(form.gstin)) nextErrors.gstin = 'Invalid GSTIN — must be 15 characters (e.g. 27AABCU9603R1ZM)'
    if (form.pan && !PAN_REGEX.test(form.pan)) nextErrors.pan = 'Invalid PAN — must be 10 characters (e.g. AAACB9603R)'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    saveMutation.mutate({
      businessName: form.businessName, businessLogo: form.businessLogo,
      businessAddress: form.businessAddress, businessPhone: form.businessPhone,
      businessEmail: form.businessEmail, businessHours: form.businessHours,
      gstin: form.gstin, pan: form.pan,
    })
  }

  const saveInvoice = () => {
    const prefix = form.invoicePrefix ?? 'INV-'
    if (!/^[A-Za-z0-9-]+$/.test(prefix)) {
      setErrors({ invoicePrefix: 'Prefix can only contain letters, numbers and hyphens' })
      return
    }
    setErrors({})
    saveMutation.mutate({
      invoicePrefix: prefix,
      invoiceNumberDigits: Number(form.invoiceNumberDigits) || 4,
      paymentTerms: form.paymentTerms,
      currency: form.currency,
      taxInclusive: form.taxInclusive !== false,
      invoiceFooter: form.invoiceFooter,
      invoiceTerms: form.invoiceTerms,
    })
  }

  const saveNotifications = () => saveMutation.mutate({
    invoiceNotificationsEnabled: Boolean(form.invoiceNotificationsEnabled),
    orderNotificationsEnabled: Boolean(form.orderNotificationsEnabled),
    lowStockNotificationsEnabled: Boolean(form.lowStockNotificationsEnabled),
    lowStockThresholdDefault: Number(form.lowStockThresholdDefault) || 5,
  })

  const saveSecurity = () => saveMutation.mutate({
    sessionTimeoutMinutes: Math.max(0, Math.min(10080, Number(form.sessionTimeoutMinutes) || 0)),
  })

  const integrationRows = integration
    ? [
        {
          label: 'Shopify',
          ok: integration.shopify?.configured,
          detail: integration.shopify?.configured ? integration.shopify.shopDomain : 'Not configured — credentials are set via server environment variables',
        },
        {
          label: 'Email (SMTP)',
          ok: integration.smtp?.configured,
          detail: integration.smtp?.configured ? `${integration.smtp.host}` : 'Not configured — set SMTP_HOST / SMTP_* environment variables to send emails',
        },
        {
          label: 'Payment Gateway',
          ok: integration.paymentGateway?.connected,
          detail: integration.paymentGateway?.connected ? integration.paymentGateway.provider : 'Not connected — payments are recorded manually for now',
        },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Business profile, invoices, tax and system preferences"
        actions={
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Business Profile */}
        <Card title="Business Profile" icon={Building2}>
          <div className="space-y-4">
            <Field label="Business Name" hint="Printed at the top of every invoice">
              <input type="text" value={form.businessName || ''} onChange={(e) => set('businessName')(e.target.value)} className={fieldCls} placeholder="OPAL LINE" />
            </Field>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo</label>
              <div className="flex items-center gap-4">
                {form.businessLogo ? (
                  <img src={form.businessLogo} alt="logo" className="w-16 h-16 object-contain border border-gray-200 dark:border-gray-600 rounded-lg p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400"><Upload size={20} /></div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>Upload</Button>
                  {form.businessLogo && <Button variant="ghost" size="sm" onClick={() => set('businessLogo')('')}>Remove</Button>}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">PNG/JPG/SVG under 300 KB. Shown on printed invoices.</p>
            </div>

            <Field label="Address">
              <textarea value={form.businessAddress || ''} onChange={(e) => set('businessAddress')(e.target.value)} className={`${fieldCls} min-h-16`} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input type="text" value={form.businessPhone || ''} onChange={(e) => set('businessPhone')(e.target.value)} className={fieldCls} />
              </Field>
              <Field label="Email">
                <input type="text" value={form.businessEmail || ''} onChange={(e) => set('businessEmail')(e.target.value)} className={fieldCls} />
              </Field>
            </div>

            <Field label="Business Hours" hint="Shown on printed invoices, e.g. 10:00 AM – 8:30 PM">
              <input type="text" value={form.businessHours || ''} onChange={(e) => set('businessHours')(e.target.value)} className={fieldCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="GSTIN" hint="15-character GST identification number" error={errors.gstin}>
                <input type="text" value={form.gstin || ''} onChange={(e) => set('gstin')(e.target.value.toUpperCase())} maxLength={15} className={fieldCls} placeholder="27AABCU9603R1ZM" />
              </Field>
              <Field label="PAN" hint="10-character permanent account number" error={errors.pan}>
                <input type="text" value={form.pan || ''} onChange={(e) => set('pan')(e.target.value.toUpperCase())} maxLength={10} className={fieldCls} placeholder="AAACB9603R" />
              </Field>
            </div>

            <Button size="sm" onClick={saveBusiness} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Card>

        {/* Invoice & Billing */}
        <Card title="Invoice & Billing" icon={Receipt}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Invoice Prefix" hint="e.g. INV-" error={errors.invoicePrefix}>
                <input type="text" value={form.invoicePrefix || ''} onChange={(e) => set('invoicePrefix')(e.target.value)} className={fieldCls} placeholder="INV-" />
              </Field>
              <Field label="Number Digits" hint="Width of the counter">
                <input type="number" min={2} max={6} value={form.invoiceNumberDigits ?? 4} onChange={(e) => set('invoiceNumberDigits')(e.target.value)} className={fieldCls} />
              </Field>
              <Field label="Currency">
                <select value={form.currency || 'INR'} onChange={(e) => set('currency')(e.target.value)} className={fieldCls}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                </select>
              </Field>
            </div>

            <Field label="Payment Terms" hint="Printed on invoices, e.g. Due on Receipt">
              <input type="text" value={form.paymentTerms || ''} onChange={(e) => set('paymentTerms')(e.target.value)} className={fieldCls} placeholder="Due on Receipt" />
            </Field>

            <Toggle
              checked={form.taxInclusive !== false}
              onChange={set('taxInclusive')}
              label="Prices include GST"
              hint="Unchecked = taxes added on top at checkout"
            />

            <Field label="Invoice Footer" hint="Short message at the bottom of invoices">
              <input type="text" value={form.invoiceFooter || ''} onChange={(e) => set('invoiceFooter')(e.target.value)} className={fieldCls} />
            </Field>

            <Field label="Terms & Conditions" hint="Optional T&C block printed on invoices">
              <textarea value={form.invoiceTerms || ''} onChange={(e) => set('invoiceTerms')(e.target.value)} className={`${fieldCls} min-h-20`} />
            </Field>

            <Button size="sm" onClick={saveInvoice} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"><Tags size={14} /> Tax / HSN Codes</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">HSN master and GST slab rates</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/tax-hsn-settings')}>Open <ExternalLink size={12} className="ml-1" /></Button>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"><FileText size={14} /> Pricing Rules</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">Margin, discount and rounding rules</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/pricing-rules')}>Open <ExternalLink size={12} className="ml-1" /></Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card title="Notifications" icon={Bell}>
          <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
            <Toggle
              checked={Boolean(form.invoiceNotificationsEnabled)}
              onChange={set('invoiceNotificationsEnabled')}
              label="New invoice"
              hint="Alert staff when an invoice is created"
            />
            <Toggle
              checked={Boolean(form.orderNotificationsEnabled)}
              onChange={set('orderNotificationsEnabled')}
              label="New order"
              hint="Alert staff when an order is created"
            />
            <Toggle
              checked={Boolean(form.lowStockNotificationsEnabled)}
              onChange={set('lowStockNotificationsEnabled')}
              label="Low stock"
              hint="Alert staff when stock falls below threshold"
            />
          </div>
          <div className="mt-3">
            <Field label="Default low-stock threshold" hint="Used for products without their own threshold">
              <input type="number" min={0} value={form.lowStockThresholdDefault ?? 5} onChange={(e) => set('lowStockThresholdDefault')(e.target.value)} className={fieldCls} />
            </Field>
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={saveNotifications} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
          {form.lowStockNotificationsEnabled === false && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">Low-stock alerts are switched off — you won't be notified when stock runs low.</p>
          )}
        </Card>

        {/* Security & Session */}
        <Card title="Security & Session" icon={ShieldCheck}>
          <div className="space-y-4">
            <Field label="Session idle timeout (minutes)" hint="0 = never sign out. Logs users out after inactivity.">
              <input type="number" min={0} max={10080} value={form.sessionTimeoutMinutes ?? 0} onChange={(e) => set('sessionTimeoutMinutes')(e.target.value)} className={fieldCls} />
            </Field>
            <Button size="sm" onClick={saveSecurity} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <hr className="border-gray-200 dark:border-gray-700" />
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Appearance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Currently in {theme === 'light' ? 'light' : 'dark'} mode</p>
                </div>
                <ThemeToggle />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{theme === 'light' ? <Moon size={12} className="inline mr-1" /> : <Sun size={12} className="inline mr-1" />}Switch the whole interface between light and dark.</p>
            </div>
          </div>
        </Card>

        {/* Integrations */}
        <Card title="Integrations" icon={Plug}>
          <div className="space-y-2">
            {integrationRows.length ? integrationRows.map((row) => (
              <div key={row.label} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${row.ok ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{row.label} <span className={`text-xs font-normal ${row.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>{row.ok ? 'Connected' : 'Not connected'}</span></p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.detail}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Checking configured integrations...</p>
            )}
            <div className="pt-1">
              <Button variant="outline" size="sm" onClick={() => navigate('/shopify-dashboard')}>Open Shopify Dashboard</Button>
            </div>
          </div>
        </Card>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg px-4 py-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{toast}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:bg-white/10 rounded transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}