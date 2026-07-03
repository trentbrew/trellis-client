import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

test.describe('Locations map (TRL-LOC)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthBypass(page, '/locations')
  })

  test('renders map shell and custom zoom controls', async ({ page }) => {
    await expect(page).toHaveURL(/\/locations/)

    const mapRegion = page.getByLabel('Locations map')
    await expect(mapRegion).toBeVisible()

    // MapLibre init + CARTO style load — custom controls mount when mapReady
    const zoomIn = page.getByRole('button', { name: 'Zoom in' })
    await expect(zoomIn).toBeVisible({ timeout: 15_000 })

    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fit all places' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Locate me' })).toBeVisible()
  })

  test('hides default MapLibre control chrome', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible({ timeout: 15_000 })

    const maplibreControls = page.locator('.maplibregl-ctrl')
    const count = await maplibreControls.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(maplibreControls.nth(i)).toBeHidden()
      }
    }
  })

  test('shows custom attribution text', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible({ timeout: 15_000 })
    await expect(
      page.locator('p.pointer-events-none').filter({ hasText: /OpenStreetMap contributors/i }),
    ).toBeVisible()
  })

  test('zoom in control is interactive', async ({ page }) => {
    const zoomIn = page.getByRole('button', { name: 'Zoom in' })
    await expect(zoomIn).toBeVisible({ timeout: 15_000 })
    await zoomIn.click()
    // No throw + controls remain — sufficient smoke for map interaction wiring
    await expect(zoomIn).toBeVisible()
  })
})
