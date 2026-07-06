import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

/**
 * Resident cluster placement: AppHeader right zone (next to menubar).
 * Do NOT mount AccountRailCluster on IconRail — see .cursor/rules/trellis-shell-chrome.mdc
 */
test.describe('Campus header resident cluster', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthBypass(page, '/workspace/browse?type=note')
    await expect(page.getByRole('navigation', { name: 'Facility sky' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('navigation', { name: 'Navigation rail' })).toBeVisible({ timeout: 15_000 })
  })

  test('menubar visible; bell and avatar in header, not rail', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    const menubar = page.getByRole('navigation', { name: 'Facility sky' })
    const rail = page.getByRole('navigation', { name: 'Navigation rail' })

    await expect(header.getByRole('button', { name: /Lobby — notifications/i })).toBeVisible()
    await expect(header.getByRole('button', { name: /Resident menu|User menu/i })).toBeVisible()
    await expect(rail.getByRole('button', { name: /Lobby — notifications/i })).toHaveCount(0)
    await expect(rail.getByRole('button', { name: /Resident menu|User menu/i })).toHaveCount(0)

    await expect(menubar.getByRole('button', { name: 'Quick create' })).toHaveCount(0)
    await expect(menubar.getByRole('button', { name: 'Quick capture' })).toHaveCount(0)
  })

  test('bell opens notification dropdown', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    await header.getByRole('button', { name: /Lobby — notifications/i }).click()
    await expect(page.getByText(/Action required|All caught up/)).toBeVisible({
      timeout: 5_000,
    })
  })

  test('avatar opens resident menu', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    await header.getByRole('button', { name: 'Resident menu' }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByText('Profile settings')).toBeVisible({ timeout: 5_000 })
    await expect(menu.getByText('Sign out')).toBeVisible()
  })

  test('quick create opens furnish menu from header', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    const quickCreate = header.getByRole('button', { name: 'Quick create' })
    await expect(quickCreate).toBeVisible({ timeout: 15_000 })
    await quickCreate.click()
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 5_000 })
  })
})
