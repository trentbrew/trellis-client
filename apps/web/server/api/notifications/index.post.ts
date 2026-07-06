import { createNotification } from '../../utils/notification-service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { agentId, ...input } = body || {}
  if (!input?.title || !input?.kind || !input?.source) {
    throw createError({ statusCode: 400, message: 'Missing required fields: title, kind, source' })
  }
  const notification = await createNotification(input, { agentId: agentId || 'browser' })
  return { ok: true, notification }
})
