import { Store, Coins, Building2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function Settings() {
  const navigate = useNavigate()

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
              <input type="text" defaultValue="Opal Line Jewellery" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GSTIN</label>
              <input type="text" defaultValue="27AABCU9603R1ZM" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN</label>
              <input type="text" defaultValue="AABCU9603R" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <textarea defaultValue="123 Jewellery Lane, Zaveri Bazaar, Mumbai 400003" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500 min-h-16" />
            </div>
            <Button size="sm">Save Changes</Button>
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
              <input type="text" defaultValue="https://opalline.myshopify.com" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input type="password" defaultValue="shpat_xxxxxxxxxxxxx" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-sync Frequency</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
                <option>Every 5 minutes</option>
                <option>Every 15 minutes</option>
                <option>Every 30 minutes</option>
                <option>Manual only</option>
              </select>
            </div>
            <Button variant="outline" size="sm">Reconnect Shopify</Button>
          </div>
        </Card>

        {/* Invoice Settings */}
        <Card title="Invoice Settings" icon={Coins}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Prefix</label>
              <input type="text" defaultValue="SI" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Rate (%)</label>
              <input type="number" defaultValue="3" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HSN Code</label>
              <input type="text" defaultValue="7113" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Purity</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
                <option>92.5 Sterling Silver</option>
                <option>99.9 Fine Silver</option>
              </select>
            </div>
            <Button size="sm">Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
