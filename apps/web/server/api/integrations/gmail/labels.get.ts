/**
 * GET /api/integrations/gmail/labels
 *
 * Lists all labels (system + user) on the connected Gmail account.
 *
 * Query params:
 *   - connectionId: TQL entity ID of the integration_connection
 */

import { getValidAccessToken } from './_credentials'
import { requireConnectionOwner } from '../../../utils/connection-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId as string

  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  // Multi-tenant guard: deny label enumeration across users.
  await requireConnectionOwner(event, connectionId)

  const accessToken = await getValidAccessToken(connectionId)

  try {
    const response = await $fetch<{
      labels?: Array<{
        id: string
        name: string
        type: 'system' | 'user'
        messagesTotal?: number
        messagesUnread?: number
      }>
    }>('https://gmail.googleapis.com/gmail/v1/users/me/labels', { headers: { Authorization: `Bearer ${accessToken}` } })

    return { labels: response.labels || [] }
  } catch (err: any) {
    console.error('[gmail/labels] Failed to list labels:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch labels from Gmail.' })
  }
})
