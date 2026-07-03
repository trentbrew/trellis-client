import { createError, defineEventHandler } from 'h3'
import { useTrellisKernel } from '../../../../plugins/trellis-kernel'
import { getBridgeEntity } from '../../../../lib/kernel-bridge/map-app-config-rows'

export default defineEventHandler((event) => {
  let kernel
  try {
    kernel = useTrellisKernel()
  } catch {
    throw createError({ statusCode: 503, message: 'TQL kernel not initialized' })
  }

  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing entity id' })
  }

  const row = getBridgeEntity(kernel, decodeURIComponent(id))
  if (!row) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  return row
})
