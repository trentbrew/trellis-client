import { expect, test } from '@playwright/test'

test.describe('Sheet range block (P0 harden + P1 stale/error)', () => {
  test('sheetRange playground shows LIVE block with grid data', async ({ page }) => {
    await page.goto('/playground/sheet-range')
    await expect(page.locator('[data-type="sheet-range"]').or(page.getByText('LIVE')).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Loading range…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('cell', { name: 'npm org + domains' })).toBeVisible({ timeout: 20_000 })
  })

  test('sheetRange error playground shows ERROR state', async ({ page }) => {
    await page.goto('/playground/sheet-range-error')
    await expect(page.getByText('ERROR').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Loading range…')).toBeHidden({ timeout: 20_000 })
    await expect(
      page.getByText(/Sheet entity not found or range invalid\.|404 Server Error/),
    ).toBeVisible()
  })

  test('sheetRange playground shows STALE when SSE disconnected', async ({ page }) => {
    await page.goto('/playground/sheet-range')
    await expect(page.getByText('LIVE').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Loading range…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('cell', { name: 'npm org + domains' })).toBeVisible({ timeout: 20_000 })

    await page.evaluate(() => {
      ;(window as Window & { __trellisSetSSE?: (v: boolean) => void }).__trellisSetSSE?.(false)
    })

    await expect(page.getByText('STALE').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Sheet unavailable or connection lost')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'npm org + domains' })).toBeHidden()
  })
})
