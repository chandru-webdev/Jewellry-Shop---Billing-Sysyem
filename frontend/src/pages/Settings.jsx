import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, Coins, Building2, X, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { settingsApi } from '../api/settings'

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [storeName, setStoreName] = useState('Opal Line Jewellery')
  const [gstin, setGstin] = useState('27AABCU9603R1ZM')
  const [pan, setPan] = useState('AABCU9603R')
  const [address, setAddress] = useState('123 Jewellery Lane, Zaveri Bazaar, Mumbai 400003')
  const [shopUrl, setShopUrl] = useState('https://opalline.myshopify.com')
  const [apiKey, setApiKey] = useState('shpat_xxxxxxxxxxxxx')
  const [syncFreq, setSyncFreq] = useState('Every 5 minutes')
  const [invoicePrefix, setInvoicePrefix] = useState('SI')
  const [gstRate, setGstRate] = useState('3')
  const [hsnCode, setHsnCode] = useState('7113')
  const [defaultPurity, setDefaultPurity] = useState('92.5 Sterling Silver')

  const [toast, setToast] = useState(null)

  useEffect(() => {
    settingsApi.getAll().then((res) => {
      const s = res.data.data
      if (s.businessName) setStoreName(s.businessName)
      if (s.gstin) setGstin(s.gstin)
      if (s.businessAddress) setAddress(s.businessAddress)
      if (s.invoicePrefix) setInvoicePrefix(s.invoicePrefix)
    }).catch(() => {})
  }, [])

  const storeMutation = useMutation({
    mutationFn: () => settingsApi.update({ businessName: storeName, gstin, businessAddress: address }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      showToast('Store information saved successfully')
    },
    onError: () => showToast('Failed to save store information'),
  })

  const invoiceMutation = useMutation({
    mutationFn: () => settingsApi.update({ invoicePrefix }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      showToast('Invoice settings saved successfully')
    },
    onError: () => showToast('Failed to save invoice settings'),
  })

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your Opal Line ERP system"
        actions={
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Store Settings */}
        <Card title="Store Information" icon={Building2}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Name</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GSTIN</label>
              <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN</label>
              <input type="text" value={pan} onChange={(e) => setPan(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500 min-h-16" />
            </div>
            <Button size="sm" onClick={() => storeMutation.mutate()} disabled={storeMutation.isPending}>
              {storeMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>

        {/* Shopify Settings */}
        <Card title="Shopify Integration" icon={Store}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Connected</p>
                <p className="text-[11px] text-emerald-600">opalline.myshopify.com</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop URL</label>
              <input type="text" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-sync Frequency</label>
              <select value={syncFreq} onChange={(e) => setSyncFreq(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
                <option>Every 5 minutes</option>
                <option>Every 15 minutes</option>
                <option>Every 30 minutes</option>
                <option>Manual only</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => showToast(`Reconnecting to Shopify at ${shopUrl}...`)}>Reconnect Shopify</Button>
          </div>
        </Card>

        {/* Invoice Settings */}
        <Card title="Invoice Settings" icon={Coins}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Prefix</label>
              <input type="text" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Rate (%)</label>
              <input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HSN Code</label>
              <input type="text" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Purity</label>
              <select value={defaultPurity} onChange={(e) => setDefaultPurity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
                <option>92.5 Sterling Silver</option>
                <option>99.9 Fine Silver</option>
              </select>
            </div>
            <Button size="sm" onClick={() => invoiceMutation.mutate()} disabled={invoiceMutation.isPending}>
              {invoiceMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
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
