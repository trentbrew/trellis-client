import { expect, test } from '@playwright/test'

test.describe('Deck projection (P1 / P1.1)', () => {
  test('yc-s26 deck page renders projection chrome', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByLabel('Deck canvas')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('text=PROJECTION').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('text=LIVE').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('tablist', { name: 'Slides' })).toBeVisible()
    await expect(page.getByLabel('Slide title').first()).toBeVisible()
  })

  test('traction slide shows queryView region', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await page.getByRole('tab').nth(2).click()
    await expect(page.getByRole('region', { name: 'Live query view' })).toBeVisible()
    await expect(page.locator('text=LIVE · queryView').first()).toBeVisible()
    await expect(page.getByText('Traction').first()).toBeVisible()
  })

  test('present route renders presentation shell', async ({ page }) => {
    await page.goto('/decks/yc-s26/present?slide=2')
    await expect(page.getByLabel('Presentation mode')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByLabel('Slide title')).toBeVisible()
    await expect(page.getByRole('button', { name: /Exit/i })).toBeVisible()
  })

  test('layout picker switches to live-data and shows queryView region', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await page.getByRole('tab').nth(2).click()
    const layoutGroup = page.getByRole('radiogroup', { name: 'Slide layout' })
    await expect(layoutGroup).toBeVisible()
    await layoutGroup.getByRole('radio', { name: /live data/i }).click()
    await expect(page.getByRole('region', { name: 'Live query view' })).toBeVisible()
    await expect(page.locator('text=LIVE · queryView').first()).toBeVisible()
  })
})

test.describe('Deck projection (P1.3)', () => {
  test('sorter route renders filmstrip', async ({ page }) => {
    await page.goto('/decks/yc-s26/sorter')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('tablist', { name: 'Slide filmstrip' })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('text=FILMSTRIP').first()).toBeVisible({ timeout: 20_000 })
  })

  test('thumb route renders narrow rail and preview', async ({ page }) => {
    await page.goto('/decks/yc-s26/thumb')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.locator('text=THUMB').first()).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Slides' })).toBeVisible()
    await expect(page.getByLabel('Slide title').first()).toBeVisible()
  })

  test('editor shows presence avatars and query builder on traction slide', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByLabel('Collaborators viewing deck')).toBeVisible()
    await page.getByRole('tab').nth(2).click()
    await page.getByLabel('Query view object').click()
    await expect(page.getByLabel('EQL-S query')).toBeVisible()
    await expect(page.getByRole('button', { name: /Save to slide/i })).toBeVisible()
  })

  test('vantage chips navigate to sorter route', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await page.getByRole('tablist', { name: 'Deck vantage' }).getByRole('tab', { name: 'Sorter' }).click()
    await expect(page).toHaveURL(/\/decks\/yc-s26\/sorter/)
    await expect(page.locator('text=FILMSTRIP').first()).toBeVisible()
  })
})

test.describe('Deck editor fundamentals', () => {
  test('slide stage maintains 16:9 aspect ratio', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    const stage = page.getByLabel('Deck canvas').locator('[data-deck-stage] .aspect-video').first()
    await expect(stage).toBeVisible()
    const box = await stage.boundingBox()
    expect(box).toBeTruthy()
    const ratio = box!.width / box!.height
    expect(ratio).toBeGreaterThan(1.7)
    expect(ratio).toBeLessThan(1.8)
  })

  test('new slide button adds a slide', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    const slideTablist = page.getByRole('tablist', { name: 'Slides' })
    await expect(slideTablist).toBeVisible()
    const tabs = slideTablist.getByRole('tab')
    await expect.poll(() => tabs.count()).toBeGreaterThan(0)
    const before = await tabs.count()
    await page.getByRole('button', { name: /New slide/i }).click()
    await expect(tabs).toHaveCount(before + 1, { timeout: 15_000 })
  })

  test('inline title editor is focusable', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await page.getByRole('tab').first().click()
    const titleRegion = page.getByLabel('Slide title').first()
    await titleRegion.click()
    const editor = titleRegion.locator('.ProseMirror')
    await expect(editor).toBeVisible()
    await editor.click()
    await page.keyboard.type('X')
    await expect(editor).toContainText('X')
  })
})

test.describe('Deck canvas editor', () => {
  test('editor viewport controls render and maintain 16:9 artboard', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByLabel('Deck canvas')).toBeVisible()
    await expect(page.getByLabel('Viewport controls')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fit slide' })).toBeVisible()

    const artboard = page.getByLabel('Deck canvas').locator('[data-deck-stage] .aspect-video').first()
    const box = await artboard.boundingBox()
    expect(box).toBeTruthy()
    const ratio = box!.width / box!.height
    expect(ratio).toBeGreaterThan(1.7)
    expect(ratio).toBeLessThan(1.8)
  })

  test('clicking title selects title and shows title inspector', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await page.getByLabel('Title object').click()
    await expect(page.getByLabel('Object inspector')).toContainText('Title')
    await expect(page.getByLabel('Object inspector').getByLabel('Title HTML')).toBeVisible()
  })

  test('clicking queryView selects query inspector on traction slide', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await page.getByRole('tab').nth(2).click()
    await page.getByLabel('Query view object').click()
    await expect(page.getByLabel('Object inspector')).toContainText('Query view')
    await expect(page.getByLabel('EQL-S query')).toBeVisible()
  })

  test('viewport fit and zoom controls update percentage', async ({ page }) => {
    await page.goto('/decks/yc-s26')
    await expect(page.getByText('Loading projection…')).toBeHidden({ timeout: 20_000 })
    await expect(page.getByLabel('Viewport controls')).toBeVisible({ timeout: 20_000 })
    const zoomPercent = page.getByRole('button', { name: 'Zoom to 100 percent' })
    await expect(zoomPercent).toBeVisible()
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect(zoomPercent).toContainText(/%/)
    await zoomPercent.click()
    await expect(zoomPercent).toContainText('100%')
  })

  test('present route has no canvas editor selection chrome', async ({ page }) => {
    await page.goto('/decks/yc-s26/present?slide=2')
    await expect(page.getByLabel('Presentation mode')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByLabel('Deck canvas')).toHaveCount(0)
    await expect(page.getByLabel('Object inspector')).toHaveCount(0)
  })
})
