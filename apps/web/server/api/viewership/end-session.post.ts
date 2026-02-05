export default defineEventHandler(async (event) => {
  try {
    const raw = await readRawBody(event)
    const body = (() => {
      if (!raw) return {}
      const rawAny = raw as unknown as any
      const text =
        typeof rawAny === 'string' ? rawAny : rawAny instanceof Uint8Array ? new TextDecoder().decode(rawAny) : null

      if (typeof text === 'string') {
        try {
          return JSON.parse(text)
        } catch {
          return {}
        }
      }

      return raw as any
    })()

    const { sessionId, endedAt, totalWatchTime } = body as any

    if (!sessionId) {
      throw createError({
        statusCode: 400,
        message: 'sessionId is required',
      })
    }

    void endedAt
    void totalWatchTime
    return { success: true, sessionId }
  } catch (error) {
    console.error('[Viewership API] Failed to end session:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to end session',
    })
  }
})
