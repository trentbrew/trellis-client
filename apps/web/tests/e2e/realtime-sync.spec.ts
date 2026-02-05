import { test, expect } from '@playwright/test'

/**
 * End-to-End Tests for Real-time Sync
 *
 * These tests verify the actual user experience:
 * - Changes made in one part of the UI update other parts
 * - Changes made in one tab appear in other tabs
 * - Offline changes sync when reconnected
 */

test.describe('Real-time Icon Sync', () => {
  test('changing collection icon updates sidebar immediately', async ({ page }) => {
    // Navigate to a collection
    await page.goto('/collections/literature')

    // Get initial sidebar icon
    const sidebarIcon = page.locator('aside [href="/collections/literature"] svg')
    const initialIconName = await sidebarIcon.getAttribute('data-icon')

    // Click icon in page header to open picker
    await page.locator('button:has(svg[data-icon])').first().click()

    // Select a different icon
    await page.locator('[role="dialog"] button:has(svg)').nth(5).click()

    // Verify sidebar icon changed without refresh
    await expect(sidebarIcon).not.toHaveAttribute('data-icon', initialIconName)
  })

  test('changing collection title updates sidebar immediately', async ({ page }) => {
    await page.goto('/collections/literature')

    // Get initial sidebar title
    const sidebarLink = page.locator('aside [href="/collections/literature"]')
    const _initialTitle = await sidebarLink.textContent()

    // Edit title in page header
    const titleInput = page.locator('input[placeholder="Untitled"]')
    await titleInput.fill('Updated Title')
    await titleInput.blur()

    // Verify sidebar title changed
    await expect(sidebarLink).toContainText('Updated Title')
  })

  test('changing description saves and persists', async ({ page }) => {
    await page.goto('/collections/literature')

    // Add description
    const descInput = page.locator('input[placeholder="Add a description..."]')
    await descInput.fill('Test description')
    await descInput.blur()

    // Refresh page
    await page.reload()

    // Verify description persisted
    await expect(descInput).toHaveValue('Test description')
  })
})

test.describe('Cross-Tab Sync', () => {
  test('changes in one tab appear in another tab', async ({ browser }) => {
    // Open two tabs
    const context = await browser.newContext()
    const page1 = await context.newPage()
    const page2 = await context.newPage()

    await page1.goto('/collections/literature')
    await page2.goto('/collections/literature')

    // Change icon in page1
    await page1.locator('button:has(svg[data-icon])').first().click()
    await page1.locator('[role="dialog"] button:has(svg)').nth(3).click()

    // Wait a moment for sync
    await page2.waitForTimeout(500)

    // Verify page2 shows the same icon
    const page1Icon = await page1.locator('button:has(svg[data-icon])').first().getAttribute('data-icon')
    const page2Icon = await page2.locator('button:has(svg[data-icon])').first().getAttribute('data-icon')

    expect(page1Icon).toBe(page2Icon)

    await context.close()
  })
})

test.describe('Published Toggle', () => {
  test('published toggle in header updates collection state', async ({ page }) => {
    await page.goto('/collections/literature')

    // Find published toggle in header
    const publishedToggle = page.locator('header [role="switch"]')

    // Get initial state
    const initialState = await publishedToggle.getAttribute('aria-checked')

    // Toggle it
    await publishedToggle.click()

    // Verify state changed
    const newState = await publishedToggle.getAttribute('aria-checked')
    expect(newState).not.toBe(initialState)

    // Refresh and verify persistence
    await page.reload()
    await expect(publishedToggle).toHaveAttribute('aria-checked', newState)
  })
})

test.describe('Pin Button', () => {
  test('pin button adds collection to pinned section', async ({ page }) => {
    await page.goto('/collections/literature')

    // Check if pinned section exists
    const pinnedSection = page.locator('aside button:has-text("Pinned")')
    const hasPinned = (await pinnedSection.count()) > 0

    // Click pin button in header
    await page.locator('header button:has(svg[name*="pin"])').click()

    // If no pinned section before, should appear now
    if (!hasPinned) {
      await expect(pinnedSection).toBeVisible()
    }

    // Verify collection appears in pinned section
    await pinnedSection.click() // expand if collapsed
    await expect(page.locator('aside button:has-text("Pinned") ~ ul [href="/collections/literature"]')).toBeVisible()
  })

  test('unpin button removes collection from pinned section', async ({ page }) => {
    await page.goto('/collections/literature')

    // Pin it first
    await page.locator('header button:has(svg[name*="pin"])').click()
    await page.waitForTimeout(300)

    // Unpin it
    await page.locator('header button:has(svg[name*="pin"])').click()
    await page.waitForTimeout(300)

    // Verify it's back in regular section
    const pinnedSection = page.locator('aside button:has-text("Pinned") ~ ul')
    const inPinned = await pinnedSection.locator('[href="/collections/literature"]').count()

    expect(inPinned).toBe(0)
  })
})
