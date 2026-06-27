import { createTrellisSidecarClient } from '~/lib/trellis-sidecar/create-client'
import { probeSidecarAvailable } from '~/lib/trellis-sidecar/sidecar-probe'
import { provideTrellisDb } from '~/composables/useTrellisSidecar'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const enabled = Boolean(config.public.trellisSidecar)

  if (!enabled) {
    provideTrellisDb(null)
    return {
      provide: {
        trellisSidecar: { enabled: false as const, client: null },
      },
    }
  }

  const wsUrl = (config.public.trellisWsUrl || config.public.trellisUrl || 'http://localhost:8230').replace(
    /\/$/,
    '',
  )
  const apiKey = config.public.trellisApiKey || undefined

  const client = createTrellisSidecarClient({ url: wsUrl, apiKey })
  provideTrellisDb(client)

  const available = await probeSidecarAvailable()
  if (import.meta.dev) {
    console.info(
      `[trellis-sidecar] enabled — WS ${wsUrl}/realtime, HTTP /api/trellis, available=${available}`,
    )
  }

  return {
    provide: {
      trellisSidecar: { enabled: true as const, client },
    },
  }
})
