import { createError, defineEventHandler, getRequestURL, getRouterParam, readRawBody } from 'h3'
import { proxySidecarPath } from '../../lib/trellis/entities-server'
import { SIDECAR_DISABLED } from '../../lib/trellis/fetch-sidecar'
import { sendWebResponse } from '../../lib/trellis/h3-response'
import { isSidecarEnabled } from '../../lib/trellis/sidecar-enabled'

export default defineEventHandler(async (event) => {
  if (!isSidecarEnabled()) {
    throw createError({ statusCode: 503, data: SIDECAR_DISABLED })
  }

  const segments = getRouterParam(event, 'path')
  if (!segments) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const url = getRequestURL(event)
  const method = event.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'DELETE' && method !== 'HEAD'
  const rawBody = hasBody ? await readRawBody(event) : undefined

  const init: RequestInit = { method }
  if (rawBody !== undefined) {
    init.body = rawBody
  }

  const request = new Request(url.toString(), init)
  return sendWebResponse(event, await proxySidecarPath(request, segments, undefined))
})
