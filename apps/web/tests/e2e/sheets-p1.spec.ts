import { expect, test } from '@playwright/test'

test.describe('Sheets P1', () => {
  test('keyboard arrow moves focused cell', async ({ page }) => {
    await page.goto('/sheets/q3-runway')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 15_000 })
    const focused = page.getByTestId('sheet-focused-cell')
    await expect(focused).toBeVisible()
    await focused.press('ArrowDown')
    await expect(page.getByTestId('sheet-focused-cell')).toBeVisible()
  })

  test('shift-select highlights multiple cells', async ({ page }) => {
    await page.goto('/sheets/q3-runway')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 15_000 })
    const focused = page.getByTestId('sheet-focused-cell')
    await expect(focused).toBeVisible()
    await focused.press('Shift+ArrowDown')
    await focused.press('Shift+ArrowDown')
    expect(await page.locator('[aria-selected="true"]').count()).toBeGreaterThan(1)
  })

  test('column headers have reorder grips', async ({ page }) => {
    await page.goto('/sheets/q3-runway')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByLabel(/Reorder column/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
