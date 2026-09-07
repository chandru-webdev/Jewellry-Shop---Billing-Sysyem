const { test, expect } = require('@playwright/test')

const PAGES = [
  { path: '/', title: 'Dashboard' },
  // Sales
  { path: '/sales', title: 'Sales' },
  { path: '/invoices', title: 'Sales Invoices' },
  { path: '/orders', title: 'Sales Orders' },
  { path: '/customers', title: 'Customers' },
  { path: '/sales-returns', title: 'Sales Returns' },
  // Purchase
  { path: '/purchase-orders', title: 'Purchase Orders' },
  { path: '/purchase-invoices', title: 'Purchase Invoices' },
  { path: '/suppliers', title: 'Suppliers' },
  { path: '/purchase-returns', title: 'Purchase Returns' },
  // Inventory
  { path: '/products', title: 'Products' },
  { path: '/price-history', title: 'Product Price History' },
  { path: '/categories', title: 'Categories' },
  { path: '/inventory', title: 'Stock Overview' },
  { path: '/stock-transfer', title: 'Stock Transfer' },
  { path: '/barcode', title: 'Barcode / Labels' },
  { path: '/low-stock', title: 'Low Stock Alert' },
  // Accounts
  { path: '/expenses', title: 'Expenses' },
  { path: '/payments', title: 'Payments' },
  { path: '/bank-accounts', title: 'Bank Accounts' },
  { path: '/ledger', title: 'General Ledger' },
  // Reports
  { path: '/reports', title: 'Business Report' },
  { path: '/gst-reports', title: 'GST Reports' },
  { path: '/sales-analysis', title: 'Sales Analysis' },
  { path: '/inventory-reports', title: 'Inventory Reports' },
  // Shopify
  { path: '/shopify', title: 'Shopify Dashboard' },
  // System
  { path: '/metal-rates', title: 'Silver Rate Management' },
  { path: '/users', title: 'User Management' },
  { path: '/roles', title: 'Roles & Permissions' },
  { path: '/audit-logs', title: 'Audit Logs' },
  { path: '/settings', title: 'Settings' },
  { path: '/notifications', title: 'Notifications' },
  { path: '/rate-approvals', title: 'Rate Approvals' },
  { path: '/pricing-rules', title: 'Pricing Rules' },
  { path: '/tax-hsn-settings', title: 'Tax / HSN Settings' },
  { path: '/activity-log', title: 'Activity Log' },
  { path: '/data-export', title: 'Data Export / Backup' },
]

test.describe('Page navigation — all main pages load', () => {
  test('log in and iterate through every page', async ({ page }) => {
    for (const p of PAGES) {
      await test.step(`load ${p.path} (${p.title})`, async () => {
        await page.goto(p.path)
        const heading = page.getByRole('heading', { name: p.title }).first()
        await expect(heading).toBeVisible({ timeout: 20000 })
        // Confirm the router actually rendered a page body (not a blank screen).
        await expect(page.locator('body')).not.toBeEmpty({ timeout: 20000 })
      })
    }
  })
})