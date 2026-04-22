/**
 * GET /api/integrations/github/repos
 *
 * Proxy endpoint that lists repositories accessible to the authenticated
 * GitHub user. Handles token refresh automatically.
 *
 * Query params:
 *   - connectionId: TQL entity ID of the integration_connection (required)
 *   - affiliation: 'owner,collaborator,organization_member' (default)
 *   - visibility:  'all' | 'public' | 'private' (default 'all')
 *   - sort:        'created' | 'updated' | 'pushed' | 'full_name' (default 'pushed')
 *   - direction:   'asc' | 'desc'
 *   - per_page:    1..100 (default 50)
 *   - page:        page number
 *   - q:           optional search filter applied client-side on full_name/description
 */

import { getValidAccessToken } from './_credentials'
import { normalizeRepo, type GithubRepoRaw, type NormalizedRepository } from './_shared'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId as string
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  const accessToken = await getValidAccessToken(connectionId)
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Trellis-Client',
  }

  const params = new URLSearchParams({
    affiliation: (query.affiliation as string) || 'owner,collaborator,organization_member',
    visibility: (query.visibility as string) || 'all',
    sort: (query.sort as string) || 'pushed',
    direction: (query.direction as string) || 'desc',
    per_page: String(Math.min(Number(query.per_page) || 50, 100)),
    page: String(Number(query.page) || 1),
  })

  let raws: GithubRepoRaw[]
  try {
    raws = await $fetch<GithubRepoRaw[]>(`https://api.github.com/user/repos?${params.toString()}`, {
      headers,
    })
  } catch (err: any) {
    console.error('[github/repos] Failed to list repos:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to list repositories from GitHub.' })
  }

  let repos: NormalizedRepository[] = (raws || []).map(normalizeRepo)

  const q = (query.q as string | undefined)?.trim().toLowerCase()
  if (q) {
    repos = repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    )
  }

  return { repos }
})
