/**
 * POST /api/admin/backfill-channel-links
 *
 * Retroactively links existing channels to their organizations via the
 * `organizationChannels` InstantDB link. Channels created before the
 * createChannel() fix only have `orgId` as a field — without the link,
 * the `data.ref('organization.members.userId')` permission check fails
 * and non-creator org members cannot see those channels.
 *
 * Safe to run multiple times (links are idempotent in InstantDB).
 */

export default defineEventHandler(async (_event) => {
  const db = useInstantAdmin()

  // Fetch all channels with their orgId field
  const { data } = await db.query({ channels: {} })
  const channels = (data?.channels ?? []) as Array<{ id: string; orgId?: string }>

  const toLink = channels.filter((c) => c.orgId)

  if (toLink.length === 0) {
    return { linked: 0, message: 'No channels to backfill' }
  }

  // Build link transactions for each channel → org
  const txns = toLink.map((ch) =>
    db.tx.organizations[ch.orgId!].link({ channels: ch.id }),
  )

  await db.transact(txns)

  return {
    linked: toLink.length,
    channelIds: toLink.map((c) => c.id),
    message: `Linked ${toLink.length} channel(s) to their organizations`,
  }
})
