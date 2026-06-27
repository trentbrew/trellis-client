import { createError, defineEventHandler, readBody } from 'h3'
import { proxyCreateEntity } from '../../lib/trellis/entities-server'
import { SIDECAR_DISABLED } from '../../lib/trellis/fetch-sidecar'
import { sendWebResponse } from '../../lib/trellis/h3-response'
import { isSidecarEnabled } from '../../lib/trellis/sidecar-enabled'

export default defineEventHandler(async (event) => {
  if (!isSidecarEnabled()) {
    throw createError({ statusCode: 503, data: SIDECAR_DISABLED })
  }

  const body = await readBody(event)
  return sendWebResponse(event, await proxyCreateEntity(body))
})
