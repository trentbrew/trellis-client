import { expect, test } from '@playwright/test'
import { createGraphEntity, gotoUntilVisible, graphMutateId } from './helpers/graph-entity'

const CANVAS_ID = 'entity:canvas-e2e-board'
const EMPTY_LAYOUT = JSON.stringify({
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: [],
})

function isCanvasDetailPath(url: string): boolean {
  return /\/canvases\/[^/]+$/.test(new URL(url).pathname)
}

function waitForGraphMutate(page: import('@playwright/test').Page) {
  return page.waitForResponse(
    (r) => r.url().includes('/api/graph/mutate') && r.request().method() === 'POST' && r.ok(),
    { timeout: 20_000 },
  )
}

async function resetCanvasLayout(request: import('@playwright/test').APIRequestContext) {
  await request.post('/api/graph/mutate', {
    data: {
      action: 'updateNode',
      entityId: graphMutateId(CANVAS_ID),
      type: 'entity',
      data: { layout: EMPTY_LAYOUT },
      agentId: 'e2e',
    },
  })
}

test.describe('Canvas surface (TRL-34)', () => {
  test.describe.configure({ timeout: 60_000 })

  test.beforeAll(async ({ request }) => {
    try {
      await createGraphEntity(request, {
        entityId: CANVAS_ID,
        data: {
          type: 'canvas',
          title: 'E2E test board',
          layout: EMPTY_LAYOUT,
        },
      })
    } catch {
      await resetCanvasLayout(request)
    }
  })

  // Run create flow first — avoids dev-server pressure after the longer persist test.
  test('create canvas from index navigates to board', async ({ page }) => {
    await gotoUntilVisible(page, '/canvases', page.getByTestId('canvas-index-ready'), {
      timeoutMs: 30_000,
    })
    const createButton = page.getByTestId('canvas-create-button').first()
    await expect(createButton).toBeEnabled({ timeout: 15_000 })

    await createButton.click()
    await page.waitForURL(isCanvasDetailPath, { timeout: 30_000 })
    await expect(page.getByTestId('canvas-projection-frame')).toBeVisible({ timeout: 20_000 })
  })

  test.describe('board persistence', () => {
    test.beforeEach(async ({ request }) => {
      await resetCanvasLayout(request)
    })

    test('canvas page loads and add sticky persists on reload', async ({ page, request }) => {
      await resetCanvasLayout(request)
      await gotoUntilVisible(page, '/canvases/e2e-board', page.getByTestId('canvas-projection-frame'), {
        timeoutMs: 30_000,
      })

      const addSave = waitForGraphMutate(page)
      await page.getByTestId('canvas-add-sticky').click()
      await addSave
      await expect(page.getByTestId('canvas-sticky-node').first()).toBeVisible()

      const sticky = page.getByTestId('canvas-sticky-node').first().locator('textarea')
      const bodySave = waitForGraphMutate(page)
      await sticky.fill('Persist me')
      await sticky.blur()
      await bodySave
      await expect(page.getByText(/^Saved /)).toBeVisible({ timeout: 10_000 })

      await expect
        .poll(async () => {
          const res = await page.request.get(`/api/graph/node/${encodeURIComponent(graphMutateId(CANVAS_ID))}`)
          const body = await res.json()
          const raw = body?.node?.layout
          const layout = typeof raw === 'string' ? JSON.parse(raw) : raw
          return layout?.nodes?.length ?? 0
        })
        .toBeGreaterThan(0)

      await gotoUntilVisible(page, '/canvases/e2e-board', page.getByTestId('canvas-sticky-node').first(), {
        timeoutMs: 30_000,
      })
      await expect(page.getByTestId('canvas-sticky-node').first().locator('textarea')).toHaveValue('Persist me')
    })
  })
})
