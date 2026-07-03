import { createError, defineEventHandler, getRequestURL } from 'h3'
import { useTrellisKernel } from '../../../plugins/trellis-kernel'
import {
  BRIDGE_APP_CONFIG_TYPES,
  listBridgeEntities,
  type BridgeEntityType,
} from '../../../lib/kernel-bridge/map-app-config-rows'

export default defineEventHandler((event) => {
  let kernel
  try {
    kernel = useTrellisKernel()
  } catch {
    throw createError({ statusCode: 503, message: 'TQL kernel not initialized' })
  }

  const url = getRequestURL(event)
  const typeParam = url.searchParams.get('type')
  const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)
  const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10)

  if (!typeParam) {
    throw createError({ statusCode: 400, message: 'Missing type query parameter' })
  }

  if (!BRIDGE_APP_CONFIG_TYPES.includes(typeParam as BridgeEntityType)) {
    return { data: [], total: 0, limit: Number.isFinite(limit) ? limit : 100, offset: Number.isFinite(offset) ? offset : 0 }
  }

  return listBridgeEntities(kernel, typeParam as BridgeEntityType, {
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
  })
})
