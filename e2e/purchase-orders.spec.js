const { test, expect } = require('@playwright/test')

test.describe('Purchase Orders — full flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase-orders')
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible({ timeout: 20000 })
  })

  const openModal = async (page) => {
    await page.getByRole('button', { name: /New PO/i }).click()
    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'New Purchase Order' }).first()
    await expect(modal).toBeVisible({ timeout: 10000 })
    return modal
  }

  test('page renders with table and New PO button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New PO/i })).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('New PO modal opens with labeled line-item columns and item count', async ({ page }) => {
    const modal = await openModal(page)

    await expect(modal.getByText('Supplier *')).toBeVisible()
    await expect(modal.getByText('Order Date *')).toBeVisible()
    await expect(modal.getByText('Expected Delivery Date')).toBeVisible()
    await expect(modal.getByText('Line Items')).toBeVisible()
    await expect(modal.getByText('Subtotal')).toBeVisible()
    await expect(modal.getByText('GST %')).toBeVisible()
    await expect(modal.getByText('Total Amount')).toBeVisible()

    // Column labels are now present on the line-item grid
    await expect(modal.getByText('Product', { exact: true }).first()).toBeVisible()
    await expect(modal.getByText('Qty', { exact: true }).first()).toBeVisible()
    await expect(modal.getByText('Weight (g)').first()).toBeVisible()
    await expect(modal.getByText('Rate (₹/g)').first()).toBeVisible()

    // Running item count
    await expect(modal.getByText('0 items added')).toBeVisible()

    await expect(modal.getByRole('button', { name: /Cancel/i })).toBeVisible()
    await expect(modal.getByRole('button', { name: /Submit PO|Save as Draft/i })).toBeVisible()
  })

  test('New PO modal closes on Cancel', async ({ page }) => {
    const modal = await openModal(page)
    await modal.getByRole('button', { name: /Cancel/i }).click()
    await expect(modal).not.toBeVisible({ timeout: 5000 })
  })

  test('line items can be added, duplicated and removed; item count updates', async ({ page }) => {
    const modal = await openModal(page)

    // Supplier select + 1 product select = 2 selects
    const selects = modal.locator('select')
    await expect(selects).toHaveCount(2, { timeout: 5000 })

    // Add another item
    await modal.getByRole('button', { name: /Add Another Item/i }).click()
    await expect(selects).toHaveCount(3, { timeout: 5000 })

    // Add a third via duplicate of the first row
    await modal.getByRole('button', { name: 'Duplicate line item' }).first().click()
    await expect(selects).toHaveCount(4, { timeout: 5000 })

    // Remove the last-duplicated row -> back to 3
    await modal.getByRole('button', { name: 'Remove line item' }).last().click()
    await expect(selects).toHaveCount(3, { timeout: 5000 })
  })

  test('edit toggle disables/enables a line item row and autofills weight/rate from product', async ({ page }) => {
    const modal = await openModal(page)

    // Select a product on the first row -> autofills weight & rate from product
    const productSelect = modal.locator('select').nth(1)
    const optionCount = await productSelect.locator('option').count()
    test.skip(optionCount <= 1, 'no products to select')
    await productSelect.selectOption({ index: 1 })

    const qtyInput = modal.locator('input[type="number"]').nth(0)
    const weightInput = modal.locator('input[type="number"]').nth(1)
    const rateInput = modal.locator('input[type="number"]').nth(2)

    // New rows start editable
    await expect(weightInput).toBeEnabled()
    await expect(rateInput).toBeEnabled()

    // Item count should now show 1 item
    await expect(modal.getByText('1 item added')).toBeVisible()

    // Click "Done editing" (checkmark) -> row becomes read-only/disabled
    await modal.getByRole('button', { name: 'Done editing' }).click()
    await expect(weightInput).toBeDisabled()
    await expect(rateInput).toBeDisabled()

    // Click "Edit line item" -> editable again, and value change works
    await modal.getByRole('button', { name: 'Edit line item' }).click()
    await expect(qtyInput).toBeEnabled()
    await qtyInput.fill('7')
    await expect(qtyInput).toHaveValue('7')
  })

  test('duplicate button copies product but resets qty; no automatic warning', async ({ page }) => {
    const modal = await openModal(page)

    const productSelect = modal.locator('select').nth(1)
    const optionCount = await productSelect.locator('option').count()
    test.skip(optionCount <= 1, 'no products to select')

    // First row -> pick a product
    const label = await productSelect.locator('option').nth(1).textContent()
    await productSelect.selectOption({ index: 1 })

    // Set qty 5 on the first row
    await modal.locator('input[type="number"]').nth(0).fill('5')

    // Click Duplicate on the first row
    await modal.getByRole('button', { name: 'Duplicate line item' }).first().click()

    // A new row appears below with the SAME product selected
    const productSelect2 = modal.locator('select').nth(2)
    await expect(productSelect2).toHaveValue(await productSelect.inputValue())

    // Quantity of the duplicated row is reset to 1
    const qtyInputs = modal.locator('input[type="number"]')
    await expect(qtyInputs.nth(3)).toHaveValue('1')

    // Picking the same product twice does NOT trigger an automatic warning
    await expect(modal.getByText(/added more than once/i)).toHaveCount(0)
  })

  test('blocks submit when a line item is missing a product', async ({ page }) => {
    const modal = await openModal(page)
    const supplierSelect = modal.locator('select').first()
    await supplierSelect.selectOption({ label: 'E2E Test Supplier' })

    let dialogMsg = ''
    page.once('dialog', async (dialog) => { dialogMsg = dialog.message(); await dialog.accept() })

    // Do not pick a product -> submit should be blocked
    await modal.getByRole('button', { name: 'Save as Draft' }).click()
    await expect.poll(() => dialogMsg).toContain('no product selected')
    // Modal stays open
    await expect(modal).toBeVisible()
  })

  test('can fill in form fields and submit a new PO as draft', async ({ page }) => {
    const modal = await openModal(page)

    // Select the seeded supplier
    await modal.locator('select').first().selectOption({ label: 'E2E Test Supplier' })

    // Order date = today
    const orderDateInput = modal.locator('input[type="date"]').first()
    await orderDateInput.fill(new Date().toISOString().split('T')[0])

    // Select a product for the first line item
    const productSelect = modal.locator('select').nth(1)
    const productOptions = await productSelect.locator('option').count()
    if (productOptions > 1) {
      await productSelect.selectOption({ index: 1 })
    }

    // Fill qty / weight / rate (row is editable by default)
    await modal.locator('input[type="number"]').nth(0).fill('5')
    await modal.locator('input[type="number"]').nth(1).fill('10')
    await modal.locator('input[type="number"]').nth(2).fill('120')

    await expect(modal.getByText('Subtotal')).toBeVisible()
    await expect(modal.getByText('Total Amount')).toBeVisible()

    const saveDraftBtn = modal.getByRole('button', { name: 'Save as Draft' })
    page.once('dialog', (dialog) => dialog.accept())
    await saveDraftBtn.click()

    await expect(modal).not.toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle').catch(() => {})
  })
})
