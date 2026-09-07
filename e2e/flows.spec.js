const { test, expect } = require('@playwright/test')

const uid = () => `pw_${Date.now()}_${Math.floor(Math.random() * 100000)}`

test.describe('Core flows', () => {
  test('create a new supplier end-to-end', async ({ page }) => {
    const name = `QA Supplier ${uid()}`
    await page.goto('/suppliers')
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible()

    // Open Add Supplier modal
    await page.getByRole('button', { name: /Add Supplier/i }).click()

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Add New Supplier' }).first()
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Form fields order: name, contactPerson, phone, email, gstin, address (textarea)
    const textInputs = modal.locator('input[type="text"], input[type="email"]')
    await textInputs.first().fill(name)                            // Supplier Name
    await textInputs.nth(1).fill('QA Contact Person')              // Contact Person
    await textInputs.nth(2).fill('9876543210')                     // Phone
    await textInputs.nth(3).fill(`qa_${Date.now()}@example.com`)   // Email
    await textInputs.nth(4).fill(`27AAAAA0000A1Z5`)                // GSTIN

    // Address (textarea)
    const textarea = modal.locator('textarea')
    if (await textarea.count() > 0) await textarea.first().fill('QA Test Address, 100 Feet Road')

    // Handle the navigation/refresh the page may do; dismiss any confirm
    page.once('dialog', (d) => d.accept())

    // Submit
    await modal.getByRole('button', { name: 'Save' }).click()

    // The newly created supplier should appear in the table
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible()
    await expect(page.getByText(name)).toBeVisible({ timeout: 15000 })
  })

  test('search filters suppliers', async ({ page }) => {
    await page.goto('/suppliers')
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible()

    // Type a gibberish search that won't match anything
    await page.getByPlaceholder('Search suppliers...').fill('zzzz-no-such-supplier-12345')
    await expect(page.getByText('No suppliers found.')).toBeVisible({ timeout: 10000 })

    // Clear the search
    await page.getByPlaceholder('Search suppliers...').fill('')
    await expect(page.getByPlaceholder('Search suppliers...')).toHaveValue('')
  })

  test('create a new customer end-to-end', async ({ page }) => {
    const name = `QA Customer ${uid()}`
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()

    // Open Add Customer modal
    await page.getByRole('button', { name: /Add Customer/i }).click()

    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Add Customer' }).first()
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Capture inputs inside the modal by label
    const nameInput = modal.locator('input').first()
    await nameInput.fill(name)

    // Fill a phone/email if present
    const textInputs = modal.locator('input[type="text"], input[type="email"], input[type="tel"]')
    const count = await textInputs.count()
    if (count > 1) {
      await textInputs.nth(1).fill(`qa+${Date.now()}@example.com`)
    }

    page.once('dialog', (d) => d.accept())

    // Submit — try a visible save button
    const saveBtn = modal.getByRole('button', { name: /Save|Add|Create/i }).first()
    await saveBtn.click()

    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  })
})
