import { deleteNotification, getNotificationFields, updateNotificationStatus } from '../../utils/notification-service'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing notification id' })

  const fields = getNotificationFields(id)
  if (fields?.source && fields.delivery === 'interrupt') {
    await updateNotificationStatus(id, {}, { agentId: 'browser', outcome: 'dismissed' })
  }

  await deleteNotification(id, { agentId: 'browser' })
  return { ok: true, id }
})
