import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

test.describe('VCS issue kanban (TRL-17)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthBypass(page, '/lab/issues')
    await expect(page.getByRole('navigation', { name: 'Lab views' })).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Board layout').selectOption('flat')
    await expect(page.getByText(/Showing [1-9]\d* of [1-9]\d*/i)).toBeVisible({ timeout: 15_000 })
  })

  test('renders board shell, sub-nav, and column headers', async ({ page }) => {
    await expect(page).toHaveURL(/\/lab\/issues/)

    const nav = page.getByRole('navigation', { name: 'Lab views' })
    await expect(nav).toBeVisible({ timeout: 15_000 })
    await expect(nav.getByRole('link', { name: 'Op log' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Issues' })).toBeVisible()

    await expect(page.getByRole('group', { name: /Backlog/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('group', { name: /Queue/i })).toBeVisible()
    await expect(page.getByRole('group', { name: /In progress/i })).toBeVisible()
    await expect(page.getByRole('group', { name: /Paused/i })).toBeVisible()
    await expect(page.getByRole('group', { name: /Done/i })).toBeVisible()
  })

  test('opens detail drawer when an issue card is clicked', async ({ page }) => {
    const card = page.getByTestId('vcs-issue-card').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
  })
})
