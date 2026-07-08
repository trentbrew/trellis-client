import { expect, test } from '@playwright/test'

/**
 * Browse Form view — entity type: feedback (seeded in trellis-ontologies.ts, tier: user).
 */
test.describe('Browse Form view', () => {
  test('submits stacked form and shows response in table', async ({ page }) => {
    const uniqueTitle = `E2E feedback ${Date.now()}`

    await page.goto('/workspace/browse/feedback')
    await expect(page.getByRole('button', { name: /Form/i })).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /Form/i }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Feedback' })).toBeVisible()

    await page.getByPlaceholder('Title').fill(uniqueTitle)
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Good' }).click()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByRole('heading', { name: 'Response recorded' })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'View responses' }).click()
    await expect(page.getByRole('button', { name: /Table view/i })).toBeVisible()
    await expect(page.getByRole('button', { name: uniqueTitle })).toBeVisible({ timeout: 15_000 })
  })
})
