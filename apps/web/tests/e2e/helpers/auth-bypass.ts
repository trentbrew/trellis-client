/**
 * Helper utilities for enabling auth bypass in Playwright tests
 *
 * Usage:
 * ```ts
 * import { enableAuthBypass, disableAuthBypass } from './helpers/auth-bypass'
 *
 * test('my test', async ({ page }) => {
 *   await enableAuthBypass(page)
 *   await page.goto('/collections')
 *   // ... your test
 * })
 * ```
 */

/**
 * Enable auth bypass for a Playwright page
 * Adds the testAuthBypass query param to bypass authentication
 */
export async function enableAuthBypass(page: any) {
  const current = typeof page?.url === 'function' ? String(page.url() || '') : ''
  if (!current || current.startsWith('about:')) {
    await page.goto('/?testAuthBypass=true')
    return
  }

  const url = new URL(current)
  url.searchParams.set('testAuthBypass', 'true')
  await page.goto(url.toString())
}

/**
 * Disable auth bypass for a Playwright page
 * Removes the testAuthBypass query param
 */
export async function disableAuthBypass(page: any) {
  const current = typeof page?.url === 'function' ? String(page.url() || '') : ''
  if (!current || current.startsWith('about:')) {
    await page.goto('/')
    return
  }

  const url = new URL(current)
  url.searchParams.delete('testAuthBypass')
  await page.goto(url.toString())
}

/**
 * Navigate to a page with auth bypass enabled
 */
export async function gotoWithAuthBypass(page: any, path: string) {
  const separator = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${separator}testAuthBypass=true`)
}

/**
 * Set up auth bypass context for all tests in a suite
 * Use in beforeEach to enable auth bypass for all tests
 */
export function setupAuthBypassContext(page: any) {
  return {
    enable: () => enableAuthBypass(page),
    disable: () => disableAuthBypass(page),
    goto: (path: string) => gotoWithAuthBypass(page, path),
  }
}
