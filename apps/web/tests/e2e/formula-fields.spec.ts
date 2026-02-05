import { test, expect } from '@playwright/test'

test.describe('Formula Fields E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to formula playground
    await page.goto('/playground/formulas')
  })

  test('should display formula playground', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Formula Evaluation Playground')
  })

  test('should show sample budget data', async ({ page }) => {
    // Check if sample data table is visible
    await expect(page.locator('text=Housing')).toBeVisible()
    await expect(page.locator('text=Food')).toBeVisible()
    await expect(page.locator('text=$2,000')).toBeVisible()
  })

  test('should evaluate pre-built formulas', async ({ page }) => {
    // Check that formula examples are rendered
    await expect(page.locator('text=Total Budgeted')).toBeVisible()

    // Check for success badges
    const successBadges = page.locator('text=Success')
    await expect(successBadges.first()).toBeVisible()
  })

  test('should evaluate custom formula in real-time', async ({ page }) => {
    const formulaInput = page.locator('textarea[placeholder*="custom"]').first()
    const resultDisplay = page.locator('text=Result').locator('..').locator('.text-xl')

    // Clear existing formula
    await formulaInput.clear()

    // Type a simple formula
    await formulaInput.fill('10 + 20')

    // Result should update
    await expect(resultDisplay).toContainText('30')
  })

  test('should handle formula errors gracefully', async ({ page }) => {
    const formulaInput = page.locator('textarea[placeholder*="custom"]').first()

    // Type invalid formula
    await formulaInput.clear()
    await formulaInput.fill('invalid syntax !')

    // Should show error message (not crash)
    await expect(page.locator('text=Error').or(page.locator('text=undefined'))).toBeVisible()
  })

  test('should display helper function reference', async ({ page }) => {
    // Scroll to helpers section
    await page.locator('text=Available Helper Functions').scrollIntoViewIfNeeded()

    // Check for helper categories
    await expect(page.locator('text=Array Operations')).toBeVisible()
    await expect(page.locator('text=Formatting')).toBeVisible()
    await expect(page.locator('text=String Operations')).toBeVisible()

    // Check for specific helpers
    await expect(page.locator('code:has-text("$sum")')).toBeVisible()
    await expect(page.locator('code:has-text("$currency")')).toBeVisible()
    await expect(page.locator('code:has-text("$if")')).toBeVisible()
  })

  test('should evaluate budget formulas correctly', async ({ page }) => {
    const formulaInput = page.locator('textarea[placeholder*="custom"]').first()

    // Test total budgeted
    await formulaInput.clear()
    await formulaInput.fill('$sum(...categories.map(c => c.budgeted))')
    await page.waitForTimeout(500) // Wait for evaluation

    // Should show sum of all budgets
    const result = page.locator('text=Result').locator('..').locator('.text-xl')
    await expect(result).toContainText('4400')
  })

  test('should evaluate currency formatting', async ({ page }) => {
    const formulaInput = page.locator('textarea[placeholder*="custom"]').first()

    await formulaInput.clear()
    await formulaInput.fill('$currency(1234.56)')
    await page.waitForTimeout(500)

    const result = page.locator('text=Result').locator('..').locator('.text-xl')
    await expect(result).toContainText('$1,234.56')
  })

  test('should evaluate percentage calculations', async ({ page }) => {
    const formulaInput = page.locator('textarea[placeholder*="custom"]').first()

    await formulaInput.clear()
    await formulaInput.fill('$percent(0.75)')
    await page.waitForTimeout(500)

    const result = page.locator('text=Result').locator('..').locator('.text-xl')
    await expect(result).toContainText('75.00%')
  })

  test('should handle complex nested formulas', async ({ page }) => {
    const formulaInput = page.locator('textarea[placeholder*="custom"]').first()

    await formulaInput.clear()
    await formulaInput.fill('$if($sum(10, 20) > 25, "Greater", "Less")')
    await page.waitForTimeout(500)

    const result = page.locator('text=Result').locator('..').locator('.text-xl')
    await expect(result).toContainText('Greater')
  })
})

test.describe('Schema Editor Formula Integration', () => {
  test.skip('should add formula field to schema', async ({ page }) => {
    // This test requires navigation to a collection with schema editor
    // Skip for now as it depends on authentication and collection setup

    await page.goto('/collections/test-collection')

    // Click schema editor button
    await page.locator('button:has-text("Edit Schema")').click()

    // Add new field
    await page.locator('button:has-text("Add Field")').click()

    // Change type to formula
    await page.locator('select').last().selectOption('formula')

    // Formula editor should appear
    await expect(page.locator('label:has-text("Formula Expression")')).toBeVisible()
  })

  test.skip('should insert helper functions in schema editor', async ({ page }) => {
    await page.goto('/collections/test-collection')
    await page.locator('button:has-text("Edit Schema")').click()
    await page.locator('button:has-text("Add Field")').click()
    await page.locator('select').last().selectOption('formula')

    // Click a helper button
    await page.locator('button:has-text("Sum")').click()

    // Formula textarea should contain the helper
    const formulaTextarea = page.locator('textarea[placeholder*="formula"]')
    await expect(formulaTextarea).toContainText('$sum')
  })
})
