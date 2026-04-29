/**
 * GET /api/integrations/github/issues
 *
 * Proxy endpoint that lists issues either:
 *  - For a specific repo:           ?connectionId=...&repo=owner/name
 *  - For the authenticated user:    ?connectionId=...  (uses /issues endpoint)
 *
 * Notes:
 *  - GitHub's REST API returns PRs when listing issues. We filter out PRs
 *    (PRs have a `pull_request` field on the payload) so this endpoint only
 *    returns true issues.
 *
 * Query params:
 *   - connectionId (required)
 *   - repo         — 'owner/name' to scope to a repo; omit for user-wide
 *   - state        — 'open' | 'closed' | 'all' (default 'open')
 *   - labels       — comma-separated label names
 *   - milestone    — milestone number or '*' (repo-scoped only)
 *   - assignee     — login name, 'none', or '*' (repo-scoped only)
 *   - creator      — login name (repo-scoped only)
 *   - sort         — 'created' | 'updated' | 'comments'
 *   - direction    — 'asc' | 'desc'
 *   - per_page     — default 50, max 100
 *   - page         — default 1
 *   - since        — ISO8601 updated-at cutoff
 */

import { getValidAccessToken } from './_credentials'
import { normalizeIssue, type GithubIssueRaw, type NormalizedIssue } from './_shared'
import { requireConnectionOwner } from '../../../utils/connection-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId as string
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  // Multi-tenant guard: deny reads of another user's GitHub issues.
  await requireConnectionOwner(event, connectionId)

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
  if (query.labels) params.set('labels', query.labels as string)
  if (query.since) params.set('since', query.since as string)
  if (query.assignee) params.set('assignee', query.assignee as string)
  if (query.creator) params.set('creator', query.creator as string)
  if (query.milestone) params.set('milestone', query.milestone as string)

  const repo = query.repo as string | undefined
  const url = repo
    ? `https://api.github.com/repos/${encodeURI(repo)}/issues?${params.toString()}`
    : `https://api.github.com/issues?${params.toString()}`

  let raws: GithubIssueRaw[]
  try {
    raws = await $fetch<GithubIssueRaw[]>(url, { headers })
  } catch (err: any) {
    console.error('[github/issues] Failed to list issues:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to list issues from GitHub.' })
  }

  // Filter out PRs — GitHub treats PRs as issues in the REST API
  const onlyIssues = (raws || []).filter((r) => !r.pull_request)
  const issues: NormalizedIssue[] = onlyIssues.map(normalizeIssue)

  return { issues }
})
