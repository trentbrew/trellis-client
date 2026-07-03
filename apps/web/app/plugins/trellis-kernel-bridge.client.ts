import { createKernelBridgeClient } from '~/lib/trellis-kernel-bridge/create-client'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const sidecarEnabled = Boolean(config.public.trellisSidecar)

  if (sidecarEnabled) {
    return {
      provide: {
        trellisKernelBridge: { enabled: false as const, client: null },
      },
    }
  }

  const client = createKernelBridgeClient()

  if (import.meta.dev) {
    console.info('[trellis-kernel-bridge] enabled — HTTP /api/graph/kernel-bridge, SSE /api/graph/events')
  }

  return {
    provide: {
      trellisKernelBridge: { enabled: true as const, client },
    },
  }
})
