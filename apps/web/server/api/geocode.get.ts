import { geocodeQuery, normalizeGeocodeQuery } from '../lib/locations/geocode-server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''

  if (!normalizeGeocodeQuery(q)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or empty ?q parameter' })
  }

  const result = await geocodeQuery(q)
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'No results for query' })
  }

  return result
})
