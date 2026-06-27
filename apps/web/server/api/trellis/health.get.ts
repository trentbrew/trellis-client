import { defineEventHandler } from 'h3'
import { probeSidecarHealth } from '../../lib/trellis/entities-server'
import { isSidecarEnabled } from '../../lib/trellis/sidecar-enabled'

export default defineEventHandler(async () => {
  if (!isSidecarEnabled()) {
    return { available: false, reason: 'sidecar disabled' }
  }

  const available = await probeSidecarHealth()
  return { available }
})
