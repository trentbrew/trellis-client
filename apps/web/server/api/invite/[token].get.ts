/**
 * GET /api/invite/:token
 *
 * Looks up a pending invite by its token and returns the invite details
 * (inviter name, org name, email, role) for the acceptance page.
 */

import { z } from 'zod'
import { parseApiRouterParams } from '../../utils/api-validation'

export const InviteTokenParamsSchema = z.object({
  token: z.string().trim().min(1, 'Invite token is required'),
})

export default defineEventHandler(async (event) => {
  const { token } = parseApiRouterParams(event, InviteTokenParamsSchema)

  const db = useInstantAdmin()

  try {
    const result = await db.query({
      members: {
        $: {
          where: {
            inviteToken: token,
          },
        },
      },
    })

    const members = (result as any)?.members || []

    if (members.length === 0) {
      throw createError({ statusCode: 404, message: 'Invite not found or has expired' })
    }

    const member = members[0]

    if (member.status === 'active') {
      return {
        ok: true,
        status: 'already_accepted',
        invite: {
          email: member.email,
          orgName: member.orgName || 'a workspace',
          worldName: member.worldName || '',
          inviterName: member.inviterName || 'Someone',
          role: member.role || 'member',
        },
      }
    }

    return {
      ok: true,
      status: 'pending',
      invite: {
        email: member.email,
        orgName: member.orgName || 'a workspace',
        worldName: member.worldName || '',
        inviterName: member.inviterName || 'Someone',
        role: member.role || 'member',
        orgId: member.orgId,
        worldId: member.worldId || '',
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[invite/token] Error:', err?.message || err)
    throw createError({ statusCode: 500, message: 'Failed to look up invite' })
  }
})
