import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

test.describe('VCS issue kanban M1 (TRL-24)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthBypass(page, '/lab/issues')
    await expect(page.getByRole('navigation', { name: 'Lab views' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Showing [1-9]\d* of [1-9]\d*/i)).toBeVisible({ timeout: 15_000 })
  })

  test('label filter reduces visible issues and clear restores', async ({ page }) => {
    const liveCount = page.getByText(/Showing \d+ of \d+/i)
    await expect(liveCount).toBeVisible({ timeout: 15_000 })
    const initialText = await liveCount.textContent()
    expect(initialText).toMatch(/Showing \d+ of \d+/)

    await page.getByRole('button', { name: /^Labels/i }).click()
    const popover = page.getByRole('dialog', { name: /Labels/i })
    await expect(popover).toBeVisible()
    await popover.getByRole('checkbox', { name: 'spec' }).check()
    await page.keyboard.press('Escape')
    await expect(popover).toBeHidden()

    await expect(liveCount).not.toHaveText(initialText ?? '', { timeout: 10_000 })

    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(liveCount).toHaveText(initialText ?? '', { timeout: 10_000 })
  })

  test('grouped mode shows swimlane and flat mode hides it', async ({ page }) => {
    await expect(page.getByRole('region', { name: /grouped by epic/i })).toBeVisible({ timeout: 15_000 })

    const swimlaneButton = page.getByRole('button', { name: /Toggle swimlane/i }).first()
    await expect(swimlaneButton).toBeVisible()

    await page.getByLabel('Board layout').selectOption('flat')
    await expect(page.getByRole('region', { name: 'VCS issue board', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: /grouped by epic/i })).toHaveCount(0)

    await page.getByLabel('Board layout').selectOption('grouped')
    await expect(page.getByRole('region', { name: /grouped by epic/i })).toBeVisible()
  })
})
