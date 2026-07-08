import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'
import {
  createGraphEntityInBrowser,
  graphClientId,
  openBrowseEntityDialog,
} from './helpers/graph-entity'

test.describe('Shared block embeds (TRL-44)', () => {
  test('rich text slash command inserts sandboxed HTML embed', async ({ page }) => {
    test.setTimeout(90_000)

    const entityId = `entity:shared-html-note-${Date.now()}`
    const title = `Shared HTML Note ${Date.now()}`

    await gotoWithAuthBypass(page, '/workspace/browse?type=note')
    await createGraphEntityInBrowser(page, page.request, {
      entityId,
      data: {
        type: 'note',
        title,
        content: '<p></p>',
      },
    })

    const dialog = await openBrowseEntityDialog(page, graphClientId(entityId), {
      entityType: 'note',
      title,
      timeoutMs: 45_000,
    })
    const editor = dialog.getByTestId('note-body-editor').locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 30_000 })
    await expect(editor).toBeEditable({ timeout: 10_000 })

    await editor.click()
    await editor.pressSequentially('/html', { delay: 50 })
    const slashMenu = page.locator('.slash-command-menu')
    await expect(slashMenu.getByRole('button', { name: /HTML embed/i })).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Enter')

    await expect(dialog.getByRole('group', { name: 'HTML embed block' })).toBeVisible()
    await expect(dialog.frameLocator('iframe[title="HTML embed"]').locator('body')).toBeVisible()
  })

  test('deck inspector adds and edits a sandboxed HTML object', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    const inspector = page.getByLabel('Object inspector')
    await expect(inspector).toBeVisible({ timeout: 20_000 })

    await inspector.getByRole('button', { name: 'Add HTML embed' }).click()
    const selectedObject = page.getByRole('button', { name: 'HTML embed object', pressed: true })
    await expect(selectedObject).toBeVisible({ timeout: 20_000 })
    await expect(inspector).toContainText('HTML embed')

    const source = inspector.getByLabel('Source HTML')
    await expect(source).toBeVisible()
    await source.fill('<section><h1>Deck HTML</h1><script>window.__trellisUnsafe = true</script></section>')
    await expect(inspector).toContainText('scripts disabled')
    await inspector.getByRole('button', { name: 'Save source' }).click()

    await expect(inspector).toContainText('scripts disabled')
    await expect(selectedObject.frameLocator('iframe[title="HTML embed"]').locator('text=Deck HTML')).toBeVisible()
  })
})
