const { test, expect } = require('@playwright/test')
const { login, DEFAULT_ADMIN } = require('./helpers/auth')

// The login page tests must start unauthenticated, so opt out of the
// authed storage state used by the rest of the suite.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication', () => {
  test('renders the login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByPlaceholder('admin@opalline.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter password')).toBeVisible()
  })

  test('shows validation errors for empty credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // HTML5 required blocks submission; we should still stay on /login
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs in with valid admin credentials', async ({ page }) => {
    await login(page, DEFAULT_ADMIN)
    // Landed on dashboard
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('admin@opalline.com').fill(DEFAULT_ADMIN.email)
    await page.getByPlaceholder('Enter password').fill('Wrong-Password-123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Should show an error message and stay on login
    await expect(page.getByText(/invalid|incorrect|credentials|error/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
