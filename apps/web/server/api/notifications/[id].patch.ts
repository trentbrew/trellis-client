import { updateNotificationStatus } from '../../utils/notification-service'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing notification id' })

  const body = await readBody(event)
  const { agentId, ...patch } = body || {}

  let outcome: 'acted' | 'dismissed' | undefined
  if (patch.status === 'read' || patch.status === 'archived') {
    outcome = 'dismissed'
  }

  await updateNotificationStatus(id, patch, {
    agentId: agentId || 'browser',
    outcome,
  })
  return { ok: true, id }
})
