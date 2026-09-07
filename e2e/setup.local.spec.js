const { test, expect } = require('@playwright/test')
const { login } = require('./helpers/auth')
const path = require('path')

const E2E_SEED_SUPPLIER = 'E2E Test Supplier'

// Log in once and persist the authenticated session to e2e/.auth/local-state.json
test('local auth setup', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 })

  // Seed a supplier so that PO creation tests can select one.
  // The backend requires Authorization: Bearer header (stored in localStorage as opal_token).
  await page.evaluate(async (supplierName) => {
    const token = localStorage.getItem('opal_token')
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: supplierName, phone: '9999999999', email: 'e2e@test.com' }),
    })
    return res.json()
  }, E2E_SEED_SUPPLIER)

  await page.context().storageState({ path: path.join(__dirname, '.auth', 'local-state.json') })
})
