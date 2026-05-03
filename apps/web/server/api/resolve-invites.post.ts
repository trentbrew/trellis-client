/**
 * POST /api/resolve-invites
 *
 * Called after a user authenticates. Checks if there are any pending
 * `members` records matching the user's email and links them to the
 * user's InstantDB account.
 *
 * Body: { userId: string, email: string }
 * Returns: { resolved: number, memberships: { orgId, role }[] }
 */

export default defineEventHandler(async (event) => {
  const body = await readBody<{ userId: string; email: string }>(event)

  if (!body?.userId || !body?.email) {
    throw createError({ statusCode: 400, message: 'userId and email are required' })
  }

  const db = useInstantAdmin()
  const email = body.email.trim().toLowerCase()

  try {
    // Find all pending member records matching this email
    const result = await db.query({
      members: {
        $: {
          where: {
            email,
            status: 'pending',
          },
        },
      },
    })

    const pendingMembers = (result as any)?.members || []

    if (pendingMembers.length === 0) {
      return { resolved: 0, memberships: [] }
    }

    const memberships: { orgId: string; worldId?: string; role: string }[] = []

    for (const member of pendingMembers) {
      try {
        const joinedAt = Date.now()
        const sharesResult = await db.query({
          shares: {
            $: {
              where: {
                userId: member.id,
              },
            },
          },
        })
        const placeholderShares = (sharesResult as any)?.shares || []

        const txOps = [
          db.tx.members[member.id].update({
            userId: body.userId,
            status: 'active',
            joinedAt,
          }),
          ...placeholderShares.map((share: any) =>
            db.tx.shares[share.id].update({
              userId: body.userId,
            }),
          ),
        ]

        await db.transact(txOps)

        // Ensure the org→member link exists (may have been created during invite,
        // but we retry here in case it failed the first time). This link is required
        // for the CEL permission rule `data.ref('members.userId')` to work.
        if (member.orgId) {
          try {
            await db.transact(db.tx.organizations[member.orgId].link({ members: member.id }))
          } catch (linkErr: any) {
            console.warn(`[resolve-invites] Org→member link failed for ${member.id} (non-fatal):`, linkErr?.message)
          }
        }

        memberships.push({
          orgId: member.orgId,
          worldId: member.worldId || undefined,
          role: member.role || 'member',
        })
      } catch (err: any) {
        console.warn(`[resolve-invites] Failed to resolve member ${member.id}:`, err?.message)
      }
    }

    // Send notifications for each resolved membership
    for (const member of pendingMembers) {
      if (!member.orgId) continue
      try {
        const orgName = member.orgName || 'your workspace'
        const inviteeName = body.email.split('@')[0] || body.email

        // Notify the inviter that their invite was accepted
        if (member.ownerId) {
          const notifId = crypto.randomUUID()
          await db.transact(
            db.tx.notifications[notifId].update({
              recipientId: member.ownerId,
              orgId: member.orgId,
              orgName,
              type: 'invite_accepted',
              title: 'Invite accepted',
              message: `${inviteeName} accepted your invitation to ${orgName}.`,
              actionUrl: '/settings/members',
              icon: 'lucide:user-check',
              variant: 'success',
              isRead: false,
              actorId: body.userId,
              actorName: inviteeName,
              metadata: { memberEmail: body.email },
              createdAt: Date.now(),
            }),
          )
          // Link notification to org (non-fatal)
          try {
            await db.transact(db.tx.organizations[member.orgId].link({ notifications: notifId }))
          } catch {
            /* non-fatal */
          }
        }

        // Notify ALL other active members (member_joined)
        const allMembersResult = await db.query({
          members: {
            $: {
              where: {
                orgId: member.orgId,
                status: 'active',
              },
            },
          },
        })
        const peers = ((allMembersResult as any)?.members || []).filter(
          (a: any) => a.userId && a.userId !== body.userId && a.userId !== member.ownerId,
        )

        for (const peer of peers) {
          const peerNotifId = crypto.randomUUID()
          await db.transact(
            db.tx.notifications[peerNotifId].update({
              recipientId: peer.userId,
              orgId: member.orgId,
              orgName,
              type: 'member_joined',
              title: 'New member joined',
              message: `${inviteeName} joined ${orgName}.`,
              actionUrl: '/settings/members',
              icon: 'lucide:user-plus',
              variant: 'default',
              isRead: false,
              actorId: body.userId,
              actorName: inviteeName,
              metadata: { memberEmail: body.email },
              createdAt: Date.now(),
            }),
          )
          try {
            await db.transact(db.tx.organizations[member.orgId].link({ notifications: peerNotifId }))
          } catch {
            /* non-fatal */
          }
        }
      } catch (notifErr: any) {
        console.warn('[resolve-invites] Notification creation failed (non-fatal):', notifErr?.message)
      }
    }

    // If the user was successfully linked to at least one org, set up their
    // workspace context so the auth middleware lands them in the right place
    // instead of sending them through onboarding (which creates a new org).
    if (memberships.length > 0) {
      const primaryOrgId = memberships[0].orgId
      const userId = body.userId
      const now = Date.now()

      // Helper: upsert a setting (admin SDK, bypasses permissions)
      const upsertSetting = async (key: string, value: any) => {
        const settingKey = `user:${userId}:${key}`
        const existing = await db.query({
          settings: { $: { where: { settingKey } } },
        })
        const found = ((existing as any)?.settings || [])[0]

        if (found?.id) {
          await db.transact(db.tx.settings[found.id].update({ value, updatedAt: now }))
        } else {
          const id = crypto.randomUUID()
          await db.transact(
            db.tx.settings[id].create({
              ownerId: userId,
              settingKey,
              entityType: 'user',
              entityId: userId,
              key,
              value,
              updatedAt: now,
            }),
          )
        }
      }

      try {
        await upsertSetting('lastOrgId', primaryOrgId)
        // Also set lastWorldId so auth middleware lands the user in the right world
        const primaryWorldId = memberships[0].worldId
        if (primaryWorldId) {
          await upsertSetting('lastAppId', primaryWorldId)
        }
        await upsertSetting('onboardingComplete', true)
      } catch (settingErr: any) {
        console.warn('[resolve-invites] Failed to upsert workspace settings (non-fatal):', settingErr?.message)
      }
    }

    return {
      resolved: memberships.length,
      memberships,
    }
  } catch (err: any) {
    console.error('[resolve-invites] Error:', err?.message || err)
    throw createError({ statusCode: 500, message: 'Failed to resolve invites' })
  }
})
