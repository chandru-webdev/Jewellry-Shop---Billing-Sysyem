import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  PackageCheck,
  Truck,
  RotateCw,
  Boxes,
  Package,
  ArrowRight,
  ScanBarcode,
  AlertTriangle,
  CreditCard,
  Landmark,
  BookOpen,
  BarChart3,
  FileBarChart,
  TrendingUp,
  PieChart,
  Store,
  RefreshCw,
  PackageOpen,
  UsersRound,
  DollarSign,
  Settings,
  ScrollText,
  Coins,
  Receipt,
  Users,
} from 'lucide-react'

export const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'dashboard:view' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/sales', label: 'Sales', icon: ShoppingCart, permission: 'invoices:view' },
    ],
  },
  {
    label: 'Purchase',
    items: [
      { to: '/purchase-orders', label: 'Purchase Orders', icon: PackageSearch, permission: 'orders:view' },
      { to: '/purchase-invoices', label: 'Purchase Invoices', icon: PackageCheck, permission: 'invoices:view' },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'suppliers:view' },
      { to: '/purchase-returns', label: 'Returns', icon: RotateCw, permission: 'orders:view' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: 'products:view' },
      { to: '/inventory', label: 'Stock Overview', icon: Boxes, permission: 'inventory:view' },
      { to: '/stock-transfer', label: 'Stock Transfer', icon: ArrowRight, permission: 'inventory:manage' },
      { to: '/barcode', label: 'Barcode / Labels', icon: ScanBarcode, permission: 'inventory:view' },
      { to: '/low-stock', label: 'Low Stock Alert', icon: AlertTriangle, permission: 'inventory:view' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Receipt, permission: 'payments:view' },
      { to: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments:view' },
      { to: '/bank-accounts', label: 'Bank Accounts', icon: Landmark, permission: 'payments:view' },
      { to: '/ledger', label: 'Ledger', icon: BookOpen, permission: 'reports:view' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', label: 'Business Reports', icon: BarChart3, permission: 'reports:view' },
      { to: '/gst-reports', label: 'GST Reports', icon: FileBarChart, permission: 'reports:view' },
      { to: '/sales-analysis', label: 'Sales Analysis', icon: TrendingUp, permission: 'reports:view' },
      { to: '/inventory-reports', label: 'Inventory Reports', icon: PieChart, permission: 'inventory:view' },
    ],
  },
  {
    label: 'Shopify',
    items: [
      { to: '/shopify', label: 'Shopify Dashboard', icon: Store, permission: 'shopify:view' },
      { to: '/shopify/orders-sync', label: 'Orders Sync', icon: RefreshCw, permission: 'shopify:manage' },
      { to: '/shopify/products-sync', label: 'Products Sync', icon: PackageOpen, permission: 'shopify:manage' },
      { to: '/shopify/inventory-sync', label: 'Inventory Sync', icon: Boxes, permission: 'shopify:manage' },
      { to: '/shopify/customers-sync', label: 'Customers Sync', icon: UsersRound, permission: 'shopify:manage' },
      { to: '/shopify/price-sync', label: 'Price Sync', icon: DollarSign, permission: 'shopify:manage' },
      { to: '/shopify/sync-logs', label: 'Sync Logs', icon: ScrollText, permission: 'shopify:view' },
    ],
  },
  {
    label: 'System',
    permission: 'users:manage', // entire group requires this permission
    items: [
      { to: '/users', label: 'User Management', icon: Users, permission: 'users:manage' },
      { to: '/metal-rates', label: 'Silver Rate', icon: Coins, permission: 'metal-rates:view' },
      { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'users:manage' },
      { to: '/settings', label: 'Settings', icon: Settings, permission: 'users:manage' },
    ],
  },
]
