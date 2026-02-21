/**
 * POST /api/chat/notify-message
 *
 * Creates new_message notification records for all org members who are not
 * the message author. Uses the admin SDK so it bypasses client permissions.
 * Respects per-user chatNotificationPrefs (skips users who muted the channel).
 *
 * Body:
 *   { channelId, channelTitle, orgId, authorId, authorName, content }
 */

interface NotifyMessageBody {
  channelId: string
  channelTitle: string
  orgId: string
  authorId: string
  authorName: string
  content: string
  skipUserIds?: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<NotifyMessageBody>(event)

  if (!body?.channelId || !body?.orgId || !body?.authorId) {
    throw createError({ statusCode: 400, message: 'channelId, orgId, and authorId are required' })
  }

  const db = useInstantAdmin()
  const now = Date.now()

  // 1. Fetch all active members of the org except the author
  const membersResult = await db.query({
    members: {
      $: {
        where: {
          orgId: body.orgId,
          status: 'active',
        },
      },
    },
  })

  const skipSet = new Set(body.skipUserIds ?? [])
  const members = ((membersResult as any)?.members || [])
    .filter((m: any) => m.userId && m.userId !== body.authorId && !skipSet.has(m.userId))

  if (members.length === 0) return { ok: true, created: 0 }

  const recipientIds: string[] = members.map((m: any) => m.userId as string)

  // 2. Fetch chatNotificationPrefs to honour per-user / per-channel mutes
  const prefsResult = await db.query({
    chatNotificationPrefs: {
      $: {
        where: {
          userId: { in: recipientIds },
        },
      },
    },
  })
  const prefs: any[] = (prefsResult as any)?.chatNotificationPrefs || []

  function effectiveLevel(userId: string): string {
    const channelPref = prefs.find((p) => p.userId === userId && p.channelId === body.channelId)
    if (channelPref) return channelPref.level
    const globalPref = prefs.find((p) => p.userId === userId && !p.channelId)
    return globalPref?.level ?? 'all'
  }

  // 3. Create notification records for qualifying recipients
  const created: string[] = []
  const snippet = body.content.length > 80 ? body.content.slice(0, 80) + '…' : body.content

  for (const recipientId of recipientIds) {
    if (effectiveLevel(recipientId) === 'none') continue

    try {
      const notifId = crypto.randomUUID()
      await db.transact(
        db.tx.notifications[notifId].update({
          recipientId,
          orgId: body.orgId,
          type: 'new_message',
          title: `#${body.channelTitle}`,
          message: `${body.authorName}: ${snippet}`,
          actionUrl: `/messages/${body.channelId}`,
          icon: 'lucide:message-square',
          variant: 'default',
          isRead: false,
          actorId: body.authorId,
          actorName: body.authorName,
          metadata: { channelId: body.channelId },
          createdAt: now,
        }),
      )
      created.push(notifId)
    } catch (err: any) {
      console.warn(`[chat/notify-message] Failed for ${recipientId}:`, err?.message)
    }
  }

  return { ok: true, created: created.length }
})
