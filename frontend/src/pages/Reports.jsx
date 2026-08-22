import { useState } from 'react'
import { FileBarChart, PieChart, ShoppingCart, Package, Store, IndianRupee, Download, Printer } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'

const reportCategories = [
  {
    title: 'Sales Reports',
    icon: ShoppingCart,
    color: 'from-royal-500 to-royal-700',
    reports: [
      { name: 'Daily Sales Report', desc: 'Day-wise sales summary with GST' },
      { name: 'Monthly Sales Report', desc: 'Month-wise consolidated sales' },
      { name: 'Customer Sales Report', desc: 'Sales grouped by customer' },
      { name: 'Product Sales Report', desc: 'Sales grouped by product' },
    ],
  },
  {
    title: 'Purchase Reports',
    icon: Package,
    color: 'from-blue-500 to-blue-600',
    reports: [
      { name: 'Purchase Summary', desc: 'All purchase orders and invoices' },
      { name: 'Supplier Report', desc: 'Purchases grouped by supplier' },
      { name: 'Purchase vs Sales', desc: 'Cost vs revenue comparison' },
    ],
  },
  {
    title: 'Inventory Reports',
    icon: PieChart,
    color: 'from-amber-500 to-orange-500',
    reports: [
      { name: 'Stock Summary', desc: 'Current stock levels by product' },
      { name: 'Stock Movement', desc: 'Stock in/out transactions' },
      { name: 'Low Stock Report', desc: 'Products below reorder level' },
      { name: 'Inventory Valuation', desc: 'Cost and selling value of stock' },
    ],
  },
  {
    title: 'GST Reports',
    icon: FileBarChart,
    color: 'from-emerald-500 to-emerald-600',
    reports: [
      { name: 'GSTR-1', desc: 'Outward supplies (Sales)' },
      { name: 'GSTR-3B', desc: 'Monthly return summary' },
      { name: 'HSN Summary', desc: 'HSN-wise sales summary' },
    ],
  },
  {
    title: 'Accounting Reports',
    icon: IndianRupee,
    color: 'from-indigo-500 to-indigo-600',
    reports: [
      { name: 'Profit & Loss', desc: 'Revenue vs expenses' },
      { name: 'Balance Sheet', desc: 'Assets, liabilities, equity' },
      { name: 'Trial Balance', desc: 'Account balances summary' },
      { name: 'Cash Flow', desc: 'Cash inflows and outflows' },
    ],
  },
  {
    title: 'Shopify Reports',
    icon: Store,
    color: 'from-pink-500 to-pink-600',
    reports: [
      { name: 'Shopify Order Report', desc: 'All Shopify orders with status' },
      { name: 'Payment Reconciliation', desc: 'Razorpay vs Shopify payments' },
      { name: 'Sync Health Report', desc: 'Shopify sync success/failure rates' },
    ],
  },
]

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState(null)

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export business, inventory, GST and accounting reports" />

      {!selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reportCategories.map((cat) => (
            <button
              key={cat.title}
              onClick={() => setSelectedCategory(cat)}
              className="text-left bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm hover:shadow-md hover:border-royal-300 transition-all p-5 cursor-pointer group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <cat.icon size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-royal-950 dark:text-white mb-1">{cat.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{cat.reports.length} report{cat.reports.length === 1 ? '' : 's'} available</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedCategory(null)} className="text-sm font-medium text-royal-600 hover:text-royal-800 mb-4 cursor-pointer">
            ← Back to all categories
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedCategory.reports.map((report) => (
              <div key={report.name} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08]/80 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-royal-950 dark:text-white">{report.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{report.desc}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="p-2 text-royal-600 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer" title="Export"><Download size={14} /></button>
                    <button className="p-2 text-royal-600 hover:bg-royal-50 rounded-lg transition-colors cursor-pointer" title="Print"><Printer size={14} /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <input type="date" className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" defaultValue="2026-08-04" />
                  <span className="text-gray-400 dark:text-gray-500 text-xs py-1.5">to</span>
                  <input type="date" className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500" defaultValue="2026-08-10" />
                  <Button variant="primary" size="sm">Generate</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
