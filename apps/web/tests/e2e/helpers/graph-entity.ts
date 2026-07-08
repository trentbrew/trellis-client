import type { APIRequestContext, Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { gotoWithAuthBypass } from './auth-bypass'

/** Client entity ids omit the `entity:` namespace prefix (see stripNamespace). */
export function graphClientId(entityId: string): string {
  return entityId.replace(/^entity:/, '')
}

/** TQL mutate API expects the fully-qualified id. */
export function graphMutateId(idOrSlug: string): string {
  return idOrSlug.startsWith('entity:') ? idOrSlug : `entity:${idOrSlug}`
}

/** Poll until the graph kernel returns the node (mutate is durable before client hydration). */
export async function waitForGraphNode(
  request: APIRequestContext,
  entityId: string,
  opts?: { timeoutMs?: number; intervalMs?: number },
) {
  const timeoutMs = opts?.timeoutMs ?? 15_000
  const intervalMs = opts?.intervalMs ?? 200
  const deadline = Date.now() + timeoutMs
  const mutateId = graphMutateId(entityId)
  const path = `/api/graph/node/${encodeURIComponent(mutateId)}`

  while (Date.now() < deadline) {
    const res = await request.get(path)
    if (res.ok()) return res.json()
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`Graph node ${entityId} not available within ${timeoutMs}ms`)
}

export async function createGraphEntity(
  request: APIRequestContext,
  payload: {
    entityId: string
    data: Record<string, unknown>
    agentId?: string
  },
) {
  const res = await request.post('/api/graph/mutate', {
    data: {
      action: 'createNode',
      entityId: graphMutateId(payload.entityId),
      type: 'entity',
      data: payload.data,
      agentId: payload.agentId ?? 'e2e',
    },
  })

  if (!res.ok()) {
    throw new Error(`createNode failed: ${res.status()} ${await res.text()}`)
  }

  await waitForGraphNode(request, payload.entityId)
  return payload.entityId
}

/**
 * Create an entity from the browser context so the app's SSE listener refreshes
 * the client entity store before hash / browse UI interactions.
 */
export async function createGraphEntityInBrowser(
  page: Page,
  request: APIRequestContext,
  payload: {
    entityId: string
    data: Record<string, unknown>
    agentId?: string
  },
) {
  const mutateId = graphMutateId(payload.entityId)
  const agentId = payload.agentId ?? 'e2e'

  const queryRefresh = page.waitForResponse(
    (r) => r.url().includes('/api/graph/query') && r.request().method() === 'POST' && r.status() === 200,
    { timeout: 30_000 },
  )

  await page.evaluate(
    async ({ entityId, data, agent }) => {
      const res = await fetch('/api/graph/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createNode',
          entityId,
          type: 'entity',
          data,
          agentId: agent,
        }),
      })
      if (!res.ok) {
        throw new Error(`createNode failed: ${res.status} ${await res.text()}`)
      }
    },
    { entityId: mutateId, data: payload.data, agent: agentId },
  )

  await queryRefresh
  await waitForGraphNode(request, payload.entityId)
}

/** Navigate until a locator is visible; re-navigates with auth bypass on retry (never bare reload). */
export async function gotoUntilVisible(
  page: Page,
  path: string,
  locator: Locator,
  opts?: { timeoutMs?: number },
) {
  const timeoutMs = opts?.timeoutMs ?? 20_000

  await gotoWithAuthBypass(page, path)

  try {
    await locator.waitFor({ state: 'visible', timeout: 5_000 })
    return
  } catch {
    await gotoWithAuthBypass(page, path)
    await locator.waitFor({ state: 'visible', timeout: timeoutMs })
  }
}

/**
 * Open a browse-managed entity dialog via hash deep-link.
 * Sets hash in-page after browse loads so retries are not no-ops on the same URL.
 */
export async function openBrowseEntityDialog(
  page: Page,
  clientId: string,
  opts?: { entityType?: string; timeoutMs?: number; title?: string },
) {
  const entityType = opts?.entityType ?? 'note'
  const basePath = `/workspace/browse?type=${entityType}`
  const dialog = page.getByRole('dialog')
  const timeoutMs = opts?.timeoutMs ?? 30_000
  const deadline = Date.now() + timeoutMs

  await gotoWithAuthBypass(page, basePath)
  await page.waitForLoadState('domcontentloaded')

  while (Date.now() < deadline) {
    await page.evaluate((id) => {
      const next = `#${id}`
      if (window.location.hash !== next) window.location.hash = next
    }, clientId)

    try {
      await dialog.waitFor({ state: 'visible', timeout: 6_000 })
      return dialog
    } catch {
      if (opts?.title) {
        const search = page.getByPlaceholder('Search everything...')
        if (await search.isVisible().catch(() => false)) {
          await search.fill(opts.title)
          await page.waitForTimeout(600)
          const hit = page.getByText(opts.title, { exact: true }).first()
          if (await hit.isVisible().catch(() => false)) {
            await hit.click()
            try {
              await dialog.waitFor({ state: 'visible', timeout: 6_000 })
              return dialog
            } catch {
              // fall through
            }
          }
        }
      }
      await page.waitForTimeout(400)
    }
  }

  throw new Error(`Dialog for ${clientId} did not open within ${timeoutMs}ms`)
}

/** Assert mocked summarize-entity-llm produced summary text in the UI. */
export async function expectMockSummary(
  page: Page,
  mockSummary: string,
  scope?: Locator,
  opts?: { timeoutMs?: number },
) {
  const root = scope ?? page
  const propertiesTab = root.getByRole('button', { name: 'Properties' })
  if (await propertiesTab.isVisible().catch(() => false)) {
    await propertiesTab.click()
  }
  await expect(root.getByLabel('AI-generated summary')).toContainText(mockSummary, {
    timeout: opts?.timeoutMs ?? 45_000,
  })
}
