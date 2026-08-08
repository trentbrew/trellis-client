import type { TrellisDb } from 'trellis/browser'
import { createTrellisSidecarClient } from '~/lib/trellis-sidecar/create-client'
import { probeSidecarAvailable } from '~/lib/trellis-sidecar/sidecar-probe'

type TrellisSidecarHandle = { enabled: false; client: null } | { enabled: true; client: TrellisDb }

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const enabled = Boolean(config.public.trellisSidecar)

  let handle: TrellisSidecarHandle = { enabled: false, client: null }

  if (enabled) {
    const wsUrl = (config.public.trellisWsUrl || 'http://localhost:8230').replace(/\/$/, '')
    const apiKey = config.public.trellisApiKey || undefined

    const client = createTrellisSidecarClient({ url: wsUrl, apiKey })
    handle = { enabled: true, client }

    const available = await probeSidecarAvailable()
    if (import.meta.dev) {
      console.info(
        `[trellis-sidecar] enabled — WS ${wsUrl}/realtime, HTTP /api/trellis, available=${available}`,
      )
    }
  }

  return {
    provide: {
      trellisSidecar: handle,
    },
  }
})
