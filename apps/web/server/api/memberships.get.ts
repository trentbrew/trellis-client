/**
 * GET /api/memberships?email=...
 *
 * Returns all memberships (pending + active) for a given email.
 * Used by the onboarding page to detect whether the user was invited
 * to an existing workspace (member flow) vs needs to create one (owner flow).
 */

import { z } from 'zod'
import { parseApiQuery } from '../utils/api-validation'

export const MembershipsQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email('email query param must be a valid email'),
})

export default defineEventHandler(async (event) => {
  const { email } = parseApiQuery(event, MembershipsQuerySchema)

  const db = useInstantAdmin()

  try {
    const result = await db.query({
      members: {
        $: {
          where: { email },
        },
      },
    })

    const members = (result as any)?.members || []

    return {
      ok: true,
      memberships: members.map((m: any) => ({
        id: m.id,
        orgId: m.orgId,
        orgName: m.orgName || '',
        role: m.role || 'member',
        status: m.status,
        inviterName: m.inviterName || '',
      })),
    }
  } catch (err: any) {
    console.error('[memberships] Error:', err?.message || err)
    throw createError({ statusCode: 500, message: 'Failed to fetch memberships' })
  }
})
