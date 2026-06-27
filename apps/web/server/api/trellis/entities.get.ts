import { createError, defineEventHandler, getRequestURL } from 'h3'
import { proxyListEntities } from '../../lib/trellis/entities-server'
import { SIDECAR_DISABLED } from '../../lib/trellis/fetch-sidecar'
import { sendWebResponse } from '../../lib/trellis/h3-response'
import { isSidecarEnabled } from '../../lib/trellis/sidecar-enabled'

export default defineEventHandler(async (event) => {
  if (!isSidecarEnabled()) {
    throw createError({ statusCode: 503, data: SIDECAR_DISABLED })
  }

  const url = getRequestURL(event)
  return sendWebResponse(event, await proxyListEntities(new Request(url.toString())))
})
