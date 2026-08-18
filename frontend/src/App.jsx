import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ui/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Inventory from './pages/Inventory'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
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
import MetalRates from './pages/MetalRates'
import PriceHistory from './pages/PriceHistory'
import Reports from './pages/Reports'
import ShopifySync from './pages/ShopifySync'
import Users from './pages/Users'
import Roles from './pages/Roles'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'

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
        <Route path="/stock-transfer" element={<StockIn />} />
        <Route path="/barcode" element={<StockOut />} />
        <Route path="/low-stock" element={<Inventory />} />

        {/* Accounts */}
        <Route path="/expenses" element={<Payments />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/bank-accounts" element={<Payments />} />
        <Route path="/ledger" element={<Reports />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />
        <Route path="/gst-reports" element={<Reports />} />
        <Route path="/sales-analysis" element={<Reports />} />
        <Route path="/inventory-reports" element={<Reports />} />

        {/* Shopify */}
        <Route path="/shopify" element={<ShopifySync />} />
        <Route path="/shopify/orders-sync" element={<ShopifySync />} />
        <Route path="/shopify/products-sync" element={<ShopifySync />} />
        <Route path="/shopify/inventory-sync" element={<ShopifySync />} />
        <Route path="/shopify/customers-sync" element={<ShopifySync />} />
        <Route path="/shopify/price-sync" element={<ShopifySync />} />
        <Route path="/shopify/sync-logs" element={<ShopifySync />} />

        {/* System — SUPER_ADMIN only */}
        <Route path="/users" element={<ProtectedRoute permission="users:manage"><Users /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute permission="users:manage"><Roles /></ProtectedRoute>} />
        <Route path="/metal-rates" element={<MetalRates />} />
        <Route path="/metal-rates/history" element={<PriceHistory />} />
        <Route path="/audit-logs" element={<ProtectedRoute permission="users:manage"><AuditLogs /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute permission="users:manage"><Settings /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
