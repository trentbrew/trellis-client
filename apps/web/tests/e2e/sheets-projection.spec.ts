import { expect, test } from '@playwright/test'

test.describe('Sheet projection (P0)', () => {
  test('q3-runway sheet page renders projection chrome', async ({ page }) => {
    await page.goto('/sheets/q3-runway')
    await expect(page.getByText('Q3 Runway').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=PROJECTION').first()).toBeVisible()
    await expect(page.locator('text=LIVE').first()).toBeVisible()
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('sheet-focused-cell')).toBeVisible()
  })
})
