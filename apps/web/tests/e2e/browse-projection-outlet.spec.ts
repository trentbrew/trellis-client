import { expect, test } from '@playwright/test'
import { gotoWithAuthBypass } from './helpers/auth-bypass'

/**
 * Browse projection outlet / shell cohesion (TRL-26 M1, TRL-28).
 *
 * Verifies the browse index page renders registry-backed projection chrome,
 * switches projections through ProjectionOutlet dispatch (card-grid ↔ table),
 * and exposes unavailable/unsupported projection affordances. Robust to empty data.
 */
test.describe('Browse projection outlet shell cohesion (TRL-28)', () => {
  test('renders and switches projections without crashing', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(String(err)))

    await gotoWithAuthBypass(page, '/workspace/browse')

    // Page shell + registry-backed toolbar view switcher (proves the page mounted).
    const dataTableView = page.getByRole('button', { name: /Data Table view/i })
    await expect(dataTableView).toBeVisible({ timeout: 20_000 })

    // Default card projection: outlet renders the card count chrome.
    await expect(page.getByText(/Showing \d+ of \d+/i)).toBeVisible({ timeout: 15_000 })

    // Capability-gated projections remain visible but disabled with an explanatory reason.
    const kanbanView = page.getByRole('button', { name: /Kanban view/i })
    await expect(kanbanView).toBeDisabled()
    await expect(kanbanView).toHaveAttribute('title', /Needs select field/i)

    // Switch to the Table projection through the toolbar → BrowseSpreadsheetView + table count chrome.
    await dataTableView.click()
    await expect(page.getByText(/^\d+ items?$/i)).toBeVisible({ timeout: 15_000 })
    await expect(dataTableView).toHaveAttribute('aria-current', 'true')

    // Registered but unwired browse-compatible projections use the shared fallback.
    await page.getByRole('button', { name: /Form view/i }).click()
    await expect(page.getByText(/form view isn.t available here yet/i)).toBeVisible({ timeout: 15_000 })

    // The unsupported fallback should win even when the current result set is empty.
    await page.getByPlaceholder('Search everything...').fill('__no_projection_results__')
    await expect(page.getByText(/form view isn.t available here yet/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/No results for your search/i)).toBeHidden()
    await page.getByPlaceholder('Search everything...').fill('')

    // Switch back to Card Grid → card count chrome returns.
    await page.getByRole('button', { name: /Card Grid view/i }).click()
    await expect(page.getByText(/Showing \d+ of \d+/i)).toBeVisible({ timeout: 15_000 })

    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([])
  })
})
