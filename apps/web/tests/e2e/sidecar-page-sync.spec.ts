import { test, expect } from '@playwright/test'

const sidecarMode = process.env.TRELLIS_SIDECAR === '1'

test.describe('Sidecar page realtime', () => {
  test.skip(!sidecarMode, 'requires TRELLIS_SIDECAR=1 and sidecar running')

  test('title syncs across two browser contexts', async ({ browser, baseURL }) => {
    const pageId = process.env.SIDECAR_TEST_PAGE_ID
    test.skip(!pageId, 'set SIDECAR_TEST_PAGE_ID to an imported sidecar page id')

    const url = `${baseURL}/pages/${pageId}`
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await pageA.goto(url)
    await pageB.goto(url)

    const titleA = pageA.getByTestId('page-title')
    const titleB = pageB.getByTestId('page-title')

    await titleA.waitFor()
    await titleB.waitFor()

    const nextTitle = `Sidecar sync ${Date.now()}`
    await titleA.fill(nextTitle)
    await titleA.blur()

    await expect(titleB).toHaveValue(nextTitle, { timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })
})
