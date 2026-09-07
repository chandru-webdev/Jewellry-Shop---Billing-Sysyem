const { defineConfig, devices } = require('@playwright/test')

const PROD_BASE_URL = 'https://zayra-jewellry-billing-software.vercel.app'
const LOCAL_BASE_URL = 'http://localhost:5173'
const LOCAL_STATE = 'e2e/.auth/local-state.json'
const PROD_STATE = 'e2e/.auth/prod-state.json'

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // ---- Local setup: log in once and persist the session ----
    {
      name: 'local-auth-setup',
      testMatch: /setup\.local\.spec\.js/,
      use: { ...devices['Desktop Chrome'], baseURL: process.env.E2E_BASE_URL || LOCAL_BASE_URL },
    },
    {
      name: 'local-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.E2E_BASE_URL || LOCAL_BASE_URL,
        storageState: LOCAL_STATE,
      },
      dependencies: ['local-auth-setup'],
    },

    // ---- Production setup: log in once and persist the session ----
    {
      name: 'prod-auth-setup',
      testMatch: /setup\.prod\.spec\.js/,
      use: { ...devices['Desktop Chrome'], baseURL: PROD_BASE_URL },
    },
    {
      name: 'production-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PROD_BASE_URL,
        storageState: PROD_STATE,
      },
      dependencies: ['prod-auth-setup'],
    },
  ],
})
