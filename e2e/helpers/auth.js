const DEFAULT_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@opalline.com',
  password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
}

// Perform an actual UI login. Returns once the dashboard has loaded.
async function login(page, { email = DEFAULT_ADMIN.email, password = DEFAULT_ADMIN.password } = {}) {
  await page.goto('/login')
  await page.getByPlaceholder('admin@opalline.com').fill(email)
  await page.getByPlaceholder('Enter password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // After successful login the app navigates to the dashboard ("/").
  await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 })
  // Wait for some dashboard content to be interactive.
  await page.waitForLoadState('networkidle').catch(() => {})
}

// Each Playwright test runs in a fresh context with empty localStorage, so we
// always have to perform a real login. Navigation to "/" when unauthenticated
// is a client-side redirect and can race, so go straight to /login.
async function ensureLoggedIn(page) {
  await login(page)
}

module.exports = { login, ensureLoggedIn, DEFAULT_ADMIN }
