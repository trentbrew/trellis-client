interface AnalyticsQuery {
  startDate?: string
  endDate?: string
  period?: 'day' | 'week' | 'month'
}

export default defineEventHandler(async (event) => {
  const stationId = getRouterParam(event, 'stationId')
  const query = getQuery<AnalyticsQuery>(event)

  if (!stationId) {
    throw createError({
      statusCode: 400,
      message: 'stationId is required',
    })
  }

  const now = Date.now()
  const days = query.period === 'day' ? 1 : query.period === 'week' ? 7 : query.period === 'month' ? 30 : 7
  const startTime = query.startDate ? new Date(query.startDate).getTime() : now - days * 24 * 60 * 60 * 1000
  const endTime = query.endDate ? new Date(query.endDate).getTime() : now

  void stationId

  const viewershipOverTime = Array.from({ length: Math.max(1, Math.min(days, 30)) }).map((_, idx) => {
    const d = new Date(startTime + idx * 24 * 60 * 60 * 1000)
    const date = d.toISOString().split('T')[0]
    return { date, live: 0, vod: 0, total: 0 }
  })

  return {
    summary: {
      totalViews: 0,
      uniqueViewers: 0,
      totalWatchTime: 0,
      avgWatchTime: 0,
      peakConcurrent: 0,
      liveViews: 0,
      vodViews: 0,
    },
    viewershipOverTime,
    topChannels: [],
    topShows: [],
    period: {
      start: new Date(startTime).toISOString(),
      end: new Date(endTime).toISOString(),
      days,
    },
  }
})
