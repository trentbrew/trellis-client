/**
 * POST /api/transfer-ownership
 *
 * Transfers workspace ownership from the current owner to another active member.
 * - Demotes the current owner to 'admin'
 * - Promotes the target member to 'owner'
 * - Updates org.ownerId
 * - Sends notifications to both parties
 *
 * Body: { orgId: string, currentOwnerId: string, newOwnerId: string }
 */

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    orgId: string
    currentOwnerId: string
    newOwnerId: string
  }>(event)

  if (!body?.orgId || !body?.currentOwnerId || !body?.newOwnerId) {
    throw createError({ statusCode: 400, message: 'orgId, currentOwnerId, and newOwnerId are required' })
  }

  if (body.currentOwnerId === body.newOwnerId) {
    throw createError({ statusCode: 400, message: 'Cannot transfer ownership to yourself' })
  }

  const db = useInstantAdmin()

  try {
    // 1. Verify the org exists and currentOwnerId is indeed the owner
    const orgResult = await db.query({
      organizations: {
        $: { where: { id: body.orgId } },
      },
    })
    const org = (orgResult as any)?.organizations?.[0]
    if (!org) {
      throw createError({ statusCode: 404, message: 'Organization not found' })
    }
    if (org.ownerId !== body.currentOwnerId) {
      throw createError({ statusCode: 403, message: 'Only the current owner can transfer ownership' })
    }

    // 2. Find both member records
    const membersResult = await db.query({
      members: {
        $: { where: { orgId: body.orgId } },
      },
    })
    const allMembers = (membersResult as any)?.members || []

    const currentOwnerMember = allMembers.find(
      (m: any) => m.userId === body.currentOwnerId && m.role === 'owner',
    )
    const newOwnerMember = allMembers.find(
      (m: any) => m.userId === body.newOwnerId && m.status === 'active',
    )

    if (!newOwnerMember) {
      throw createError({ statusCode: 404, message: 'Target member not found or not active' })
    }

    // 3. Execute the transfer atomically
    const txOps: any[] = [
      // Update org.ownerId
      db.tx.organizations[body.orgId].update({ ownerId: body.newOwnerId }),
      // Promote new owner
      db.tx.members[newOwnerMember.id].update({ role: 'owner' }),
    ]

    // Demote current owner to admin (if they have a member record)
    if (currentOwnerMember) {
      txOps.push(db.tx.members[currentOwnerMember.id].update({ role: 'admin' }))
    }

    await db.transact(txOps)

    // 4. Send notifications
    const now = Date.now()
    const orgName = org.name || org.slug || 'Workspace'

    // Notify the new owner
    const newOwnerNotifId = crypto.randomUUID()
    await db.transact([
      db.tx.notifications[newOwnerNotifId].update({
        recipientId: body.newOwnerId,
        orgId: body.orgId,
        orgName,
        type: 'role_changed',
        title: 'You are now the workspace owner',
        message: `Ownership of "${orgName}" has been transferred to you.`,
        icon: 'lucide:shield',
        variant: 'success',
        isRead: false,
        actorId: body.currentOwnerId,
        createdAt: now,
      }),
    ])

    // Notify the previous owner
    const prevOwnerNotifId = crypto.randomUUID()
    await db.transact([
      db.tx.notifications[prevOwnerNotifId].update({
        recipientId: body.currentOwnerId,
        orgId: body.orgId,
        orgName,
        type: 'role_changed',
        title: 'Ownership transferred',
        message: `You transferred ownership of "${orgName}". Your role is now Admin.`,
        icon: 'lucide:shield',
        variant: 'info',
        isRead: false,
        actorId: body.currentOwnerId,
        createdAt: now,
      }),
    ])

    return {
      success: true,
      newOwnerId: body.newOwnerId,
      previousOwnerId: body.currentOwnerId,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[transfer-ownership] error:', err)
    throw createError({
      statusCode: 500,
      message: err?.message || 'Failed to transfer ownership',
    })
  }
})
