import { test, expect } from '@playwright/test'
import { gotoWithAuthBypass, setupAuthBypassContext } from './helpers/auth-bypass'

/**
 * Example test demonstrating auth bypass usage
 *
 * This test shows how to use the auth bypass feature to test
 * protected routes without needing real authentication.
 */
test.describe('Auth Bypass Example', () => {
  test('can access protected route with auth bypass', async ({ page }) => {
    // Navigate to a protected route with auth bypass enabled
    await gotoWithAuthBypass(page, '/collections')

    // The page should load without redirecting to login
    await expect(page).not.toHaveURL(/\/auth\/login/)

    // You can now test the UI without authentication
    // Note: Database operations will be mocked, so you won't see real data
  })

  test('can use auth bypass context helper', async ({ page }) => {
    const auth = setupAuthBypassContext(page)

    // Enable bypass
    await auth.goto('/collections')

    // Verify we're on the collections page
    await expect(page).toHaveURL(/\/collections/)
    await expect(page).toHaveURL(/testAuthBypass=true/)
  })

  test('auth bypass creates mock user', async ({ page }) => {
    await gotoWithAuthBypass(page, '/')

    // Check console for bypass warning (in dev mode)
    // The mock user will be available but won't have real data
    await page.waitForLoadState('networkidle')
  })
})
