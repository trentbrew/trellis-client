import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

// Serial — server rate-limits interrupts per source/groupKey (P0 policy)
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const PASSIVE_TITLE = `E2E passive status ${runId}`
const INTERRUPT_TITLE = `E2E interrupt alert ${runId}`

async function seedNotification(request: APIRequestContext, body: Record<string, unknown>) {
  const res = await request.post('/api/notifications', {
    data: { ...body, agentId: 'playwright' },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

test.describe('Notification activity stream (P1)', () => {
  test('lobby activity page renders', async ({ page }) => {
    await gotoWithAuthBypass(page, '/lobby/activity')
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('tab', { name: 'Status' })).toBeVisible()
  })

  test('passive notification appears on activity feed, not in alarm panel', async ({ page, request }) => {
    await seedNotification(request, {
      title: PASSIVE_TITLE,
      kind: 'info',
      source: 'graph',
      priority: 'low',
      delivery: 'passive',
      groupKey: `e2e-passive-${runId}`,
    })

    await gotoWithAuthBypass(page, '/lobby/activity')
    await expect(page.getByText(PASSIVE_TITLE)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator(`[data-notification-title="${PASSIVE_TITLE}"]`)).toHaveAttribute(
      'data-delivery',
      'passive',
    )

    await gotoWithAuthBypass(page, '/')
    await page.locator('button[aria-label*="Lobby notifications"]').first().click()
    await expect(page.getByText(PASSIVE_TITLE)).toBeHidden()
  })

  test('interrupt notification shows in bell panel and activity feed', async ({ page, request }) => {
    const seed = await seedNotification(request, {
      title: INTERRUPT_TITLE,
      kind: 'error',
      source: 'ops',
      priority: 'critical',
      delivery: 'interrupt',
      requiredAction: 'resolve',
      groupKey: `e2e-interrupt-${runId}`,
    })
    expect(seed.notification.delivery).toBe('interrupt')

    await gotoWithAuthBypass(page, '/lobby/activity')
    await expect(page.getByText(INTERRUPT_TITLE)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator(`[data-notification-title="${INTERRUPT_TITLE}"]`)).toHaveAttribute(
      'data-delivery',
      'interrupt',
    )

    await gotoWithAuthBypass(page, '/')
    await page.locator('button[aria-label*="Lobby notifications"]').first().click()
    await expect(page.getByText(INTERRUPT_TITLE)).toBeVisible()
  })

  test('bell footer navigates to lobby activity', async ({ page }) => {
    await gotoWithAuthBypass(page, '/')
    await page.locator('button[aria-label*="Lobby notifications"]').first().click()
    const cta = page.getByTestId('alarm-view-lobby-activity-header')
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('/lobby/activity')
    // Portal-positioned dropdown can block Playwright hit-testing; verify link + route.
    await page.goto(href!)
    await expect(page).toHaveURL(/\/lobby\/activity/)
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible()
  })

  test('/activity redirects to /lobby/activity', async ({ page }) => {
    await gotoWithAuthBypass(page, '/activity')
    await expect(page).toHaveURL(/\/lobby\/activity/, { timeout: 15_000 })
  })
})
