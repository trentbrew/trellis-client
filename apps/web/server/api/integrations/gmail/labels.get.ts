import { requireConnectionOwner } from '../../../utils/connection-auth'
import { getValidAccessToken } from '../../../utils/google-oauth-credentials'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId

  if (!connectionId || typeof connectionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  await requireConnectionOwner(event, connectionId)
  const accessToken = await getValidAccessToken(connectionId)

  try {
    const response = await $fetch<{ labels?: unknown[] }>(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    return { labels: response.labels || [] }
  } catch (err: any) {
    console.error('[gmail/labels] Failed to list labels:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch labels from Gmail.' })
  }
})
