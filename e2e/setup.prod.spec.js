const { test, expect } = require('@playwright/test')
const { login } = require('./helpers/auth')
const path = require('path')

// Log in once and persist the authenticated session to e2e/.auth/prod-state.json
test('prod auth setup', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 })
  await page.context().storageState({ path: path.join(__dirname, '.auth', 'prod-state.json') })
})
