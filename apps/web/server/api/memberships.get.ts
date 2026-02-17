/**
 * GET /api/memberships?email=...
 *
 * Returns all memberships (pending + active) for a given email.
 * Used by the onboarding page to detect whether the user was invited
 * to an existing workspace (member flow) vs needs to create one (owner flow).
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = (query.email as string)?.trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, message: 'email query param is required' })
  }

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
