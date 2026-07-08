import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

/**
 * Browse convergence — collection host resolver redirects (Phase 3b-1 hardening).
 *
 * Ontology-only slugs redirect from /collections/:slug → /workspace/browse/:slug.
 * Legacy /types shims redirect to /ontologies.
 */
test.describe('Collection host resolver redirects', () => {
  test('ontology slug redirects from collections to workspace browse', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(String(err)))

    await gotoWithAuthBypass(page, '/collections/task')

    await expect(page).toHaveURL(/\/workspace\/browse\/task/, { timeout: 20_000 })

    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([])
  })

  test('legacy /types index redirects to ontologies', async ({ page }) => {
    await gotoWithAuthBypass(page, '/types')
    await expect(page).toHaveURL(/\/ontologies\/?$/, { timeout: 20_000 })
  })

  test('legacy /types/:id redirects toward ontologies editor', async ({ page }) => {
    await gotoWithAuthBypass(page, '/types/task')
    await expect(page).toHaveURL(/\/ontologies/, { timeout: 20_000 })
  })
})
