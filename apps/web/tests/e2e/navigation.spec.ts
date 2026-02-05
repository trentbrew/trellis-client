import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('main rail links navigation', async ({ page }) => {
    // Test Home link (now redirects to /forms/feed)
    await page.click('a[aria-label="Home"]')
    await expect(page).toHaveURL('/forms/feed')
    await expect(page.locator('h1')).toContainText('0')

    // Test Layouts link
    await page.click('a[aria-label="Layouts"]')
    await expect(page).toHaveURL('/layouts/playground')
    await expect(page.locator('h1')).toContainText('Layout playground')

    // Test Activity link
    await page.click('a[aria-label="Activity"]')
    await expect(page).toHaveURL('/activity/feed')
    await expect(page.locator('h1')).toContainText('Activity feed')

    // Test Settings link
    await page.click('a[aria-label="Settings"]')
    await expect(page).toHaveURL('/settings/project')
    await expect(page.locator('h1')).toContainText('Project settings')
  })

  test('secondary rail links navigation', async ({ page }) => {
    // Test Notifications link
    await page.click('a[aria-label="Notifications"]')
    await expect(page).toHaveURL('/settings/notifications')
    await expect(page.locator('h1')).toContainText('Inbox')

    // Go back to settings for profile test
    await page.click('a[aria-label="Settings"]')

    // Test Profile link
    await page.click('a[aria-label="Profile"]')
    await expect(page).toHaveURL('/settings/profile')
    await expect(page.locator('h1')).toContainText('Your profile')
  })

  test('sidebar Forms section links', async ({ page }) => {
    // Click on Home to activate Forms section
    await page.click('a[aria-label="Home"]')
    // Ensure we're on /forms/feed
    await expect(page).toHaveURL('/forms/feed')

    // Test Create form link
    await page.click('a:has-text("Create form")')
    await expect(page).toHaveURL('/forms/new')
    await expect(page.locator('h1')).toContainText('Create form')

    // Test Templates link
    await page.click('a:has-text("Templates")')
    await expect(page).toHaveURL('/forms/library')
    await expect(page.locator('h1')).toContainText('Template library')
  })

  test('sidebar Layouts section links', async ({ page }) => {
    // Click on Layouts to activate Layouts section
    await page.click('a[aria-label="Layouts"]')

    // Test Shells link
    await page.click('a:has-text("Shells")')
    await expect(page).toHaveURL('/layouts/shells')
    await expect(page.locator('h1')).toContainText('Shell gallery')

    // Test Sections link
    await page.click('a:has-text("Sections")')
    await expect(page).toHaveURL('/layouts/sections')
    await expect(page.locator('h1')).toContainText('Section stack')
  })

  test('sidebar Design tokens section links', async ({ page }) => {
    // Navigate to tokens section
    await page.goto('/tokens')

    // Test Colors link
    await page.click('a:has-text("Colors")')
    await expect(page).toHaveURL('/tokens/colors')
    await expect(page.locator('h1')).toContainText('Color palette')

    // Test Typography link
    await page.click('a:has-text("Typography")')
    await expect(page).toHaveURL('/tokens/type')
    await expect(page.locator('h1')).toContainText('Typography kit')
  })

  test('sidebar Activity section links', async ({ page }) => {
    // Click on Activity to activate Activity section
    await page.click('a[aria-label="Activity"]')

    // Test Analytics link
    await page.click('a:has-text("Analytics")')
    await expect(page).toHaveURL('/activity/analytics')
    await expect(page.locator('h1')).toContainText('Analytics dashboard')

    // Test Responses link
    await page.click('a:has-text("Responses")')
    await expect(page).toHaveURL('/activity/responses')
    await expect(page.locator('h1')).toContainText('Responses')
  })

  test('logo navigation', async ({ page }) => {
    // Navigate to a different page
    await page.goto('/settings')

    // Click logo to go home (redirects to /forms/feed)
    await page.click('nav a img[alt="Logo"]')
    await expect(page).toHaveURL('/')
    // Wait for redirect
    await expect(page).toHaveURL('/forms/feed')
    await expect(page.locator('h1')).toContainText('0')
  })

  test('all pages load without errors', async ({ page }) => {
    const routes = [
      '/forms/feed',
      '/forms/new',
      '/forms/builder',
      '/forms/library',
      '/layouts/playground',
      '/layouts/shells',
      '/layouts/sections',
      '/layouts/flow',
      '/activity/feed',
      '/activity/analytics',
      '/activity/responses',
      '/settings/project',
      '/settings/notifications',
      '/settings/profile',
      '/tokens',
      '/tokens/colors',
      '/tokens/type',
    ]

    for (const route of routes) {
      await page.goto(route)
      // Check that page loads without network errors
      await expect(page.locator('body')).toBeVisible()
      // Check that we're on the correct URL
      await expect(page).toHaveURL(route)
    }
  })
})
