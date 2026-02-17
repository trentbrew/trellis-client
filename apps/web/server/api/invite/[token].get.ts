/**
 * GET /api/invite/:token
 *
 * Looks up a pending invite by its token and returns the invite details
 * (inviter name, org name, email, role) for the acceptance page.
 */

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, message: 'Invite token is required' })
  }

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
