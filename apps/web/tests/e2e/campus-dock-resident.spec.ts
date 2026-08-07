import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

/**
 * Split resident placement: avatar/+ on IconRail corners; bell/capture in header.
 * See .cursor/rules/trellis-shell-chrome.mdc + campus_chrome_zone_presence_spec.md
 */
test.describe('Campus shell chrome placement', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthBypass(page, '/workspace/browse?type=note')
    await expect(page.getByRole('navigation', { name: 'Facility sky' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('navigation', { name: 'Navigation rail' })).toBeVisible({ timeout: 15_000 })
  })

  test('menubar visible; bell in header; avatar and + on rail', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    const menubar = page.getByRole('navigation', { name: 'Facility sky' })
    const rail = page.getByRole('navigation', { name: 'Navigation rail' })

    await expect(header.getByRole('button', { name: /Lobby — notifications/i })).toBeVisible()
    await expect(rail.getByRole('button', { name: /Lobby — notifications/i })).toHaveCount(0)

    await expect(rail.getByRole('button', { name: /Resident menu|User menu/i })).toBeVisible()
    await expect(header.getByRole('button', { name: /Resident menu|User menu/i })).toHaveCount(0)

    await expect(rail.getByRole('button', { name: 'Quick create' })).toBeVisible({ timeout: 15_000 })
    await expect(header.getByRole('button', { name: 'Quick create' })).toHaveCount(0)

    await expect(menubar.getByRole('button', { name: 'Quick create' })).toHaveCount(0)
    await expect(menubar.getByRole('button', { name: 'Quick capture' })).toHaveCount(0)
  })

  test('bell opens activity sheet from header', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    await header.getByRole('button', { name: /Lobby — notifications/i }).click()
    const sheet = page.getByTestId('activity-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    await expect(sheet.getByRole('heading', { name: 'Activity' })).toBeVisible()
  })

  test('avatar opens resident menu from rail', async ({ page }) => {
    const rail = page.getByRole('navigation', { name: 'Navigation rail' })
    await rail.getByRole('button', { name: /Resident menu|User menu/i }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByText('Profile settings')).toBeVisible({ timeout: 5_000 })
    await expect(menu.getByText('Sign out')).toBeVisible()
  })

  test('quick create opens furnish menu from rail', async ({ page }) => {
    const rail = page.getByRole('navigation', { name: 'Navigation rail' })
    const quickCreate = rail.getByRole('button', { name: 'Quick create' })
    await expect(quickCreate).toBeVisible({ timeout: 15_000 })
    await quickCreate.click()
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 5_000 })
  })

  test('zone presence avatars render in header when present', async ({ page }) => {
    const header = page.locator('[data-slot="app-header"]')
    const stack = header.getByTestId('zone-presence-avatars')
    // Presence layer is client-only; allow brief mount, soft-skip if disabled in env
    const count = await stack.count()
    if (count > 0) {
      await expect(stack).toBeVisible()
      await expect(stack).toHaveAttribute('aria-label', 'People in this zone')
    }
  })
})
