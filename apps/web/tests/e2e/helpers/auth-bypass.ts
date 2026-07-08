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
 * Navigate to a page with auth bypass enabled.
 * Query params must precede the URL hash — appending after `#` would land in the fragment.
 */
export async function gotoWithAuthBypass(page: any, path: string) {
  const hashIndex = path.indexOf('#')
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const separator = base.includes('?') ? '&' : '?'
  await page.goto(`${base}${separator}testAuthBypass=true${hash}`)
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
