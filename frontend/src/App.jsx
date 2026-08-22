import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ui/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Inventory from './pages/Inventory'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import PurchaseInvoices from './pages/PurchaseInvoices'
import PurchaseReturns from './pages/PurchaseReturns'
import Sales from './pages/Sales'
import Billing from './pages/Billing'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import LowStockAlert from './pages/LowStockAlert'
import StockTransfer from './pages/StockTransfer'
import BarcodeLabels from './pages/BarcodeLabels'
import SalesReturns from './pages/SalesReturns'
import ActivityLog from './pages/ActivityLog'
import MetalRates from './pages/MetalRates'
import PriceHistory from './pages/PriceHistory'
import BusinessReports from './pages/BusinessReports'
import GSTReports from './pages/GSTReports'
import SalesAnalysis from './pages/SalesAnalysis'
import InventoryReports from './pages/InventoryReports'
import ShopifyDashboard from './pages/ShopifyDashboard'
import OrdersSync from './pages/OrdersSync'
import ProductsSync from './pages/ProductsSync'
import InventorySync from './pages/InventorySync'
import CustomersSync from './pages/CustomersSync'
import PriceSync from './pages/PriceSync'
import SyncLogs from './pages/SyncLogs'
import Users from './pages/Users'
import Roles from './pages/Roles'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'
import RateApprovals from './pages/RateApprovals'
import PricingRules from './pages/PricingRules'
import Notifications from './pages/Notifications'
import TaxHSNSettings from './pages/TaxHSNSettings'
import DataExportBackup from './pages/DataExportBackup'
import Expenses from './pages/Expenses'
import BankAccounts from './pages/BankAccounts'
import Ledger from './pages/Ledger'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        {/* Sales */}
        <Route path="/sales" element={<Sales />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<Customers />} />

        {/* Purchase */}
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/purchase-invoices" element={<PurchaseInvoices />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/purchase-returns" element={<PurchaseReturns />} />

        {/* Inventory */}
        <Route path="/products" element={<Products />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/stock-transfer" element={<StockTransfer />} />
        <Route path="/barcode" element={<BarcodeLabels />} />
        <Route path="/low-stock" element={<LowStockAlert />} />
        <Route path="/sales-returns" element={<SalesReturns />} />

        {/* Accounts */}
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/bank-accounts" element={<BankAccounts />} />
        <Route path="/ledger" element={<Ledger />} />

        {/* Reports */}
        <Route path="/reports" element={<BusinessReports />} />
        <Route path="/gst-reports" element={<GSTReports />} />
        <Route path="/sales-analysis" element={<SalesAnalysis />} />
        <Route path="/inventory-reports" element={<InventoryReports />} />

        {/* Shopify */}
        <Route path="/shopify" element={<ShopifyDashboard />} />
        <Route path="/shopify/orders-sync" element={<OrdersSync />} />
        <Route path="/shopify/products-sync" element={<ProductsSync />} />
        <Route path="/shopify/inventory-sync" element={<InventorySync />} />
        <Route path="/shopify/customers-sync" element={<CustomersSync />} />
        <Route path="/shopify/price-sync" element={<PriceSync />} />
        <Route path="/shopify/sync-logs" element={<SyncLogs />} />

        {/* System — SUPER_ADMIN only */}
        <Route path="/users" element={<ProtectedRoute permission="users:manage"><Users /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute permission="users:manage"><Roles /></ProtectedRoute>} />
        <Route path="/metal-rates" element={<MetalRates />} />
        <Route path="/metal-rates/history" element={<PriceHistory />} />
        <Route path="/audit-logs" element={<ProtectedRoute permission="users:manage"><AuditLogs /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute permission="users:manage"><Settings /></ProtectedRoute>} />
        <Route path="/activity-log" element={<ProtectedRoute permission="users:manage"><ActivityLog /></ProtectedRoute>} />
        <Route path="/rate-approvals" element={<ProtectedRoute permission="users:manage"><RateApprovals /></ProtectedRoute>} />
        <Route path="/pricing-rules" element={<ProtectedRoute permission="users:manage"><PricingRules /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute permission="users:manage"><Notifications /></ProtectedRoute>} />
        <Route path="/tax-hsn-settings" element={<ProtectedRoute permission="users:manage"><TaxHSNSettings /></ProtectedRoute>} />
        <Route path="/data-export" element={<ProtectedRoute permission="users:manage"><DataExportBackup /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
