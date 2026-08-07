import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

// Serial — server rate-limits interrupts per source/groupKey (P0 policy)
test.describe.configure({ mode: 'serial' })

const runId = Date.now()
const PASSIVE_TITLE = `E2E passive status ${runId}`
const INTERRUPT_TITLE = `E2E interrupt alert ${runId}`
const ENTITY_TITLE = `E2E open target ${runId}`
const ENTITY_ID = `entity:e2e-activity-open-${runId}`
const OPEN_NOTIFY_TITLE = `E2E open entity notify ${runId}`

async function seedNotification(request: APIRequestContext, body: Record<string, unknown>) {
  const res = await request.post('/api/notifications', {
    data: { ...body, agentId: 'playwright' },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

async function seedEntity(request: APIRequestContext) {
  const res = await request.post('/api/graph/mutate', {
    data: {
      action: 'createNode',
      entityId: ENTITY_ID,
      type: 'entity',
      data: { type: 'note', title: ENTITY_TITLE },
      agentId: 'playwright',
    },
  })
  expect(res.ok()).toBeTruthy()
}

test.describe('Notification activity stream (P1)', () => {
  test('lobby activity page renders', async ({ page }) => {
    await gotoWithAuthBypass(page, '/lobby/activity')
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('tab', { name: 'Status' })).toBeVisible()
  })

  test('passive notification appears on activity feed and in activity sheet', async ({
    page,
    request,
  }) => {
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
    await page.getByRole('button', { name: /Lobby — notifications/i }).first().click()
    const sheet = page.getByTestId('activity-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    await sheet.getByTestId('activity-sheet-tab-status').click()
    await expect(sheet.getByText(PASSIVE_TITLE)).toBeVisible({ timeout: 15_000 })
  })

  test('interrupt notification shows in activity sheet and activity feed', async ({
    page,
    request,
  }) => {
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
    await page.getByRole('button', { name: /Lobby — notifications/i }).first().click()
    const sheet = page.getByTestId('activity-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    await sheet.getByTestId('activity-sheet-tab-alerts').click()
    await expect(sheet.getByText(INTERRUPT_TITLE)).toBeVisible({ timeout: 15_000 })
  })

  test('activity sheet footer links to lobby activity page', async ({ page }) => {
    await gotoWithAuthBypass(page, '/')
    await page.getByRole('button', { name: /Lobby — notifications/i }).first().click()
    const sheet = page.getByTestId('activity-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    const cta = sheet.getByTestId('activity-sheet-full-page')
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('/lobby/activity')
    await page.goto(href!)
    await expect(page).toHaveURL(/\/lobby\/activity/)
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible()
  })

  test('Open button opens entity dialog from activity feed', async ({ page, request }) => {
    await seedEntity(request)
    await seedNotification(request, {
      title: OPEN_NOTIFY_TITLE,
      kind: 'info',
      source: 'graph',
      priority: 'low',
      delivery: 'passive',
      entityId: ENTITY_ID,
      entityType: 'note',
      url: `#${ENTITY_ID}`,
      actions: [
        {
          id: 'open',
          kind: 'link',
          label: 'Open',
          target: `#${ENTITY_ID}`,
        },
      ],
      groupKey: `e2e-open-${runId}`,
    })

    await gotoWithAuthBypass(page, '/lobby/activity')
    const row = page.locator(`[data-notification-title="${OPEN_NOTIFY_TITLE}"]`)
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row).toHaveAttribute('data-entity-id', ENTITY_ID)
    await row.getByTestId('notification-open-entity').click()

    // DialogStackHost renders the stacked entity dialog
    await expect(page.getByText(ENTITY_TITLE).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/activity redirects to /lobby/activity', async ({ page }) => {
    await gotoWithAuthBypass(page, '/activity')
    await expect(page).toHaveURL(/\/lobby\/activity/, { timeout: 15_000 })
  })
})
