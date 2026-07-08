import { expect, test } from '@playwright/test'
import {
  createGraphEntityInBrowser,
  expectMockSummary,
  gotoUntilVisible,
  graphClientId,
  openBrowseEntityDialog,
} from './helpers/graph-entity'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

const MOCK_SUMMARY = 'Mock summary for e2e.'
const LONG_CONTENT =
  'This is a long note body used to trigger the AI summary pipeline in document chrome e2e tests. ' +
  'It needs to exceed the minimum source length threshold so the client calls summarize-entity-llm. ' +
  'Extra padding ensures the stripped plain text always clears the one hundred twenty character gate.'

test.describe('Document chrome (document-chrome)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/summarize-entity-llm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: MOCK_SUMMARY }),
      })
    })
  })

  test('note dialog uses seamless title and properties summary', async ({ page }) => {
    test.setTimeout(90_000)

    const mutateId = `entity:doc-chrome-note-${Date.now()}`
    const clientId = graphClientId(mutateId)
    const noteTitle = `Document Chrome E2E Note ${Date.now()}`

    await gotoWithAuthBypass(page, '/workspace/browse?type=note')

    await createGraphEntityInBrowser(page, page.request, {
      entityId: mutateId,
      data: {
        type: 'note',
        title: noteTitle,
        content: `<p>${LONG_CONTENT}</p>`,
      },
    })

    const dialog = await openBrowseEntityDialog(page, clientId, {
      entityType: 'note',
      timeoutMs: 45_000,
      title: noteTitle,
    })

    const title = dialog.getByTestId('document-title')
    await expect(title).toBeVisible()
    await expect(title).toHaveValue(noteTitle)
    await expect(dialog.getByPlaceholder('Add a description...')).toHaveCount(0)

    await expectMockSummary(page, MOCK_SUMMARY, dialog)
  })

  test('page route uses document title in scroll column without description editor', async ({ page }) => {
    test.setTimeout(90_000)

    const mutateId = `entity:doc-chrome-page-${Date.now()}`
    const clientId = graphClientId(mutateId)
    const pageTitle = `Document Chrome E2E Page ${Date.now()}`

    await gotoWithAuthBypass(page, '/pages')

    await createGraphEntityInBrowser(page, page.request, {
      entityId: mutateId,
      data: {
        type: 'page',
        title: pageTitle,
        content: `<p>${LONG_CONTENT}</p>`,
      },
    })

    await gotoUntilVisible(page, `/pages/${clientId}`, page.getByTestId('document-title'), {
      timeoutMs: 30_000,
    })

    await expect(page.getByTestId('document-title')).toHaveValue(pageTitle)
    await expect(page.getByPlaceholder('Add a description...')).toHaveCount(0)
    await expect(page.getByTestId('page-content-editor')).toBeVisible()

    const expandSidebar = page.getByTitle('Expand sidebar')
    if (await expandSidebar.isVisible().catch(() => false)) {
      await expandSidebar.click()
    }

    await expectMockSummary(page, MOCK_SUMMARY)
  })
})
