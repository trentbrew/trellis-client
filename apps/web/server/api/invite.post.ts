/**
 * POST /api/invite
 *
 * Sends workspace invitations via InstantDB magic codes.
 * Creates a pending `members` record for each invitee and sends
 * a magic-code email so they can sign in / sign up.
 *
 * Body: { emails: string[], orgId: string, appId: string, inviterId: string, inviterName?: string }
 */

interface InviteBody {
  emails: string[]
  orgId: string
  orgName: string
  appId: string
  worldId?: string
  worldName?: string
  inviterId: string
  inviterName?: string
}

interface InviteResult {
  email: string
  status: 'sent' | 'already_member' | 'error'
  message?: string
  inviteToken?: string
  inviteUrl?: string
}

export default defineEventHandler(async (event) => {
  // Build base URL from request origin so invite links point to the right host
  const reqUrl = getRequestURL(event)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`

  const body = await readBody<InviteBody>(event)

  if (!body?.emails?.length) {
    throw createError({ statusCode: 400, message: 'emails[] is required' })
  }
  if (!body.orgId || !body.inviterId) {
    throw createError({ statusCode: 400, message: 'orgId and inviterId are required' })
  }

  const db = useInstantAdmin()
  const results: InviteResult[] = []

  // Look up the inviter's email to prevent self-invites
  let inviterEmail: string | null = null
  try {
    const inviterResp = await db.auth.getUser({ id: body.inviterId })
    inviterEmail = (inviterResp as any)?.user?.email?.toLowerCase() || null
  } catch {
    // Non-fatal — self-invite check will be skipped
  }

  for (const rawEmail of body.emails) {
    const email = rawEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      results.push({ email: rawEmail, status: 'error', message: 'Invalid email' })
      continue
    }

    // Prevent inviting yourself
    if (inviterEmail && email === inviterEmail) {
      results.push({ email, status: 'error', message: 'You cannot invite yourself' })
      continue
    }

    try {
      // Check if already a member of this org
      const existing = await db.query({
        members: {
          $: {
            where: {
              orgId: body.orgId,
              email,
            },
          },
        },
      })

      const existingMembers = (existing as any)?.members || []
      if (existingMembers.length > 0) {
        results.push({ email, status: 'already_member', message: 'Already invited' })
        continue
      }

      // Create a pending member record with invite token
      const memberId = crypto.randomUUID()
      const inviteToken = crypto.randomUUID()
      const now = Date.now()

      await db.transact(
        db.tx.members[memberId].update({
          ownerId: body.inviterId,
          orgId: body.orgId,
          worldId: body.worldId || body.appId || '',
          userId: '', // Will be filled when they accept
          email,
          name: '',
          role: 'member',
          status: 'pending',
          invitedAt: now,
          inviteToken,
          inviterName: body.inviterName || '',
          orgName: body.orgName || '',
          worldName: body.worldName || '',
        }),
      )

      // Link member to the organization (non-fatal — org may not exist yet during onboarding race)
      try {
        await db.transact(
          db.tx.organizations[body.orgId].link({ members: memberId }),
        )
      } catch (linkErr: any) {
        console.warn(`[invite] Org link failed for ${email} (non-fatal):`, linkErr?.message)
      }

      // Build the invite URL — the accept page will send the magic code
      const inviteUrl = `${baseUrl}/invite/accept?token=${inviteToken}`
      results.push({ email, status: 'sent', inviteToken, inviteUrl })
    } catch (err: any) {
      console.error(`[invite] Failed for ${email}:`, err?.message || err)
      results.push({ email, status: 'error', message: err?.message || 'Unknown error' })
    }
  }

  return {
    ok: true,
    results,
    summary: {
      sent: results.filter((r) => r.status === 'sent').length,
      alreadyMember: results.filter((r) => r.status === 'already_member').length,
      errors: results.filter((r) => r.status === 'error').length,
    },
  }
})
