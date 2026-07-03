import { test, expect } from '@playwright/test'

const sidecarMode = process.env.TRELLIS_SIDECAR === '1'

test.describe('Zone BroadcastChannel presence (ADR-002 P0)', () => {
  test.skip(!sidecarMode, 'requires TRELLIS_SIDECAR=1 and sidecar page')

  test('two tabs in same browser context see zone presence avatars', async ({ browser, baseURL }) => {
    const pageId = process.env.SIDECAR_TEST_PAGE_ID
    test.skip(!pageId, 'set SIDECAR_TEST_PAGE_ID to an imported sidecar page id')

    const url = `${baseURL}/pages/${pageId}`
    const context = await browser.newContext()
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await pageA.goto(url)
    await pageB.goto(url)

    await pageA.getByTestId('page-title').waitFor()
    await pageB.getByTestId('page-title').waitFor()

    await expect(pageA.getByTestId('page-viewer-avatar')).toHaveCount(2, { timeout: 10_000 })
    await expect(pageB.getByTestId('page-viewer-avatar')).toHaveCount(2, { timeout: 10_000 })

    await context.close()
  })
})
