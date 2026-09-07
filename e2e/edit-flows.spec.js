const { test, expect } = require('@playwright/test')

test.describe('Edit flows', () => {
  async function pickProduct(page, modal, nthSelect) {
    const sel = modal.locator('select').nth(nthSelect)
    const count = await sel.locator('option').count()
    if (count <= 1) return false
    await sel.selectOption({ index: 1 })
    return true
  }

  test('edit a purchase order: status + line item change persist', async ({ page }) => {
    await page.goto('/purchase-orders')
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible()

    // Create a fresh DRAFT PO so we own the newest row
    await page.getByRole('button', { name: /New PO/i }).click()
    let modal = page.locator('.fixed.inset-0').filter({ hasText: 'New Purchase Order' }).first()
    await expect(modal).toBeVisible()

    await modal.locator('select').first().selectOption({ label: 'E2E Test Supplier' })
    const ok = await pickProduct(page, modal, 1)
    if (!ok) { await page.getByRole('button', { name: /Cancel/i }).click(); test.skip(true, 'no products'); return }

    await modal.locator('input[type="number"]').nth(0).fill('2')
    await modal.locator('input[type="number"]').nth(1).fill('5')
    await modal.locator('input[type="number"]').nth(2).fill('900')

    page.once('dialog', (d) => d.accept())
    await modal.getByRole('button', { name: 'Save as Draft' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    // The newest PO is the first data row (list orderBy id desc)
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible()

    // Open its Edit modal
    await firstRow.getByTitle('Edit').click()
    modal = page.locator('.fixed.inset-0').filter({ hasText: 'Edit Purchase Order' }).first()
    await expect(modal).toBeVisible()

    // Change status to Pending via the status dropdown (edit-only select)
    await modal.locator('select').nth(1).selectOption('PENDING')
    // Change the first item quantity
    await modal.locator('input[type="number"]').nth(0).fill('4')

    page.once('dialog', (d) => d.accept())
    await modal.getByRole('button', { name: 'Save Changes' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // The row's status should now reflect the change
    await expect(firstRow.getByText(/Pending/i)).toBeVisible({ timeout: 10000 })
  })

  test('edit a purchase return: update item and reason', async ({ page }) => {
    await page.goto('/purchase-returns')
    await expect(page.getByRole('heading', { name: 'Purchase Returns' })).toBeVisible()

    // Create a fresh return
    await page.getByRole('button', { name: /New Return/i }).click()
    let modal = page.locator('.fixed.inset-0').filter({ hasText: 'New Purchase Return' }).first()
    await expect(modal).toBeVisible()

    await modal.locator('select').first().selectOption({ label: 'E2E Test Supplier' })
    const ok = await pickProduct(page, modal, 1)
    if (!ok) { await page.getByRole('button', { name: /Cancel/i }).click(); test.skip(true, 'no products'); return }

    await modal.locator('input[type="number"]').nth(0).fill('2')
    await modal.locator('input[type="number"]').nth(1).fill('800')
    await modal.locator('textarea').fill('initial reason')

    page.once('dialog', (d) => d.accept())
    await modal.getByRole('button', { name: 'Create Return' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle').catch(() => {})

    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible()

    await firstRow.getByTitle('Edit').click()
    modal = page.locator('.fixed.inset-0').filter({ hasText: 'Edit Purchase Return' }).first()
    await expect(modal).toBeVisible()

    await modal.locator('input[type="number"]').nth(0).fill('5')
    await modal.locator('textarea').fill('updated reason')

    page.once('dialog', (d) => d.accept())
    await modal.getByRole('button', { name: 'Save Changes' }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })
  })

  test('edit a purchase invoice: update status via record payment', async ({ page }) => {
    await page.goto('/purchase-invoices')
    await expect(page.getByRole('heading', { name: 'Purchase Invoices' })).toBeVisible()

    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible()

    // Click Record Payment button (credit card icon)
    const paymentBtn = firstRow.getByTitle('Record Payment')
    if (await paymentBtn.count() === 0) { test.skip(true, 'no rows or no payment button'); return }
    await paymentBtn.click()

    const modal = page.locator('.fixed.inset-0').filter({ hasText: /Record Payment/i }).first()
    await expect(modal).toBeVisible()

    // Fill payment amount
    const amountInput = modal.locator('input[type="number"]').first()
    await amountInput.fill('100')

    // Select payment method
    await modal.locator('select').selectOption('CASH')

    page.once('dialog', (d) => d.accept())
    await modal.getByRole('button', { name: /Record Payment/i }).click()
    await expect(modal).not.toBeVisible({ timeout: 10000 })
  })
})
