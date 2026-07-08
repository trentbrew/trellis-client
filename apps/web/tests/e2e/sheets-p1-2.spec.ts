import { expect, test } from '@playwright/test'

test.describe('Sheets P1.2', () => {
  test('Add row button inserts a new expense row', async ({ page }) => {
    await page.goto('/sheets/q3-runway')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 15_000 })

    const insertBtn = page.getByTestId('sheet-insert-row')
    await expect(insertBtn).toBeVisible()

    const mutatePromise = page.waitForResponse(
      (r) => {
        if (!r.url().includes('/api/graph/mutate') || r.status() !== 200) return false
        const post = r.request().postData() || ''
        return post.includes('createNode') && post.includes('New row')
      },
      { timeout: 15_000 },
    )

    await insertBtn.click()
    await mutatePromise

    await expect(page.getByTestId('sheet-focused-cell')).toContainText('New row', { timeout: 20_000 })
  })

  test('fill handle is visible for number column selection', async ({ page }) => {
    await page.goto('/sheets/q3-runway')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('grid')).toBeVisible({ timeout: 15_000 })

    const focused = page.getByTestId('sheet-focused-cell')
    await expect(focused).toBeVisible()
    await focused.press('Tab')
    await focused.press('Tab')

    await expect(page.getByTestId('sheet-fill-handle')).toBeVisible({ timeout: 10_000 })
  })
})
