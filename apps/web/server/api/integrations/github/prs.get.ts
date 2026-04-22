/**
 * GET /api/integrations/github/prs
 *
 * Proxy endpoint that lists pull requests for a specific repository.
 *
 * Query params:
 *   - connectionId (required)
 *   - repo        — 'owner/name' (required)
 *   - state       — 'open' | 'closed' | 'all' (default 'open')
 *   - head        — filter by head branch 'user:ref-name' or 'organization:ref-name'
 *   - base        — filter by base branch
 *   - sort        — 'created' | 'updated' | 'popularity' | 'long-running' (default 'updated')
 *   - direction   — 'asc' | 'desc'
 *   - per_page    — default 50, max 100
 *   - page        — default 1
 */

import { getValidAccessToken } from './_credentials'
import { normalizePr, type GithubPrRaw, type NormalizedPullRequest } from './_shared'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId as string
  const repo = query.repo as string | undefined

  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }
  if (!repo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing repo query parameter (expected "owner/name").',
    })
  }

  const accessToken = await getValidAccessToken(connectionId)
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Trellis-Client',
  }

  const params = new URLSearchParams({
    state: (query.state as string) || 'open',
    sort: (query.sort as string) || 'updated',
    direction: (query.direction as string) || 'desc',
    per_page: String(Math.min(Number(query.per_page) || 50, 100)),
    page: String(Number(query.page) || 1),
  })
  if (query.head) params.set('head', query.head as string)
  if (query.base) params.set('base', query.base as string)

  const url = `https://api.github.com/repos/${encodeURI(repo)}/pulls?${params.toString()}`

  let raws: GithubPrRaw[]
  try {
    raws = await $fetch<GithubPrRaw[]>(url, { headers })
  } catch (err: any) {
    console.error('[github/prs] Failed to list pull requests:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to list pull requests from GitHub.' })
  }

  const prs: NormalizedPullRequest[] = (raws || []).map(normalizePr)

  return { pulls: prs }
})
