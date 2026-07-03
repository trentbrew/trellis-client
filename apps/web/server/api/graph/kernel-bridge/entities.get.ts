import { createError, defineEventHandler, getRequestURL } from 'h3'
import { useTrellisKernel } from '../../../plugins/trellis-kernel'
import {
  BRIDGE_APP_CONFIG_TYPES,
  listBridgeEntities,
  type BridgeEntityType,
} from '../../../lib/kernel-bridge/map-app-config-rows'
import {
  KERNEL_BROWSE_BRIDGE_TYPE,
  listKernelBrowseEntities,
} from '../../../lib/kernel-bridge/map-kernel-entity-rows'

export default defineEventHandler((event) => {
  let kernel
  try {
    kernel = useTrellisKernel()
  } catch {
    throw createError({ statusCode: 503, message: 'TQL kernel not initialized' })
  }

  const url = getRequestURL(event)
  const typeParam = url.searchParams.get('type')
  const defaultLimit = typeParam === KERNEL_BROWSE_BRIDGE_TYPE ? '500' : '100'
  const limit = Number.parseInt(url.searchParams.get('limit') ?? defaultLimit, 10)
  const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10)

  if (!typeParam) {
    throw createError({ statusCode: 400, message: 'Missing type query parameter' })
  }

  const resolvedLimit = Number.isFinite(limit) ? limit : typeParam === KERNEL_BROWSE_BRIDGE_TYPE ? 500 : 100
  const resolvedOffset = Number.isFinite(offset) ? offset : 0
  const empty = { data: [], total: 0, limit: resolvedLimit, offset: resolvedOffset }

  if (typeParam === KERNEL_BROWSE_BRIDGE_TYPE) {
    return listKernelBrowseEntities(kernel, { limit: resolvedLimit, offset: resolvedOffset })
  }

  if (!BRIDGE_APP_CONFIG_TYPES.includes(typeParam as BridgeEntityType)) {
    return empty
  }

  return listBridgeEntities(kernel, typeParam as BridgeEntityType, {
    limit: resolvedLimit,
    offset: resolvedOffset,
  })
})
