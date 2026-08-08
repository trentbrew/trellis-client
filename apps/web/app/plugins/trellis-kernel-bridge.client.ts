import type { TrellisDb } from 'trellis/browser'
import { createKernelBridgeClient } from '~/lib/trellis-kernel-bridge/create-client'

type KernelBridgeHandle = { enabled: false; client: null } | { enabled: true; client: TrellisDb }

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const sidecarEnabled = Boolean(config.public.trellisSidecar)

  let handle: KernelBridgeHandle = { enabled: false, client: null }

  if (!sidecarEnabled) {
    const client = createKernelBridgeClient()
    handle = { enabled: true, client }

    if (import.meta.dev) {
      console.info('[trellis-kernel-bridge] enabled — HTTP /api/graph/kernel-bridge, SSE /api/graph/events')
    }
  }

  return {
    provide: {
      trellisKernelBridge: handle,
    },
  }
})
