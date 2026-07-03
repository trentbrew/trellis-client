import type { TrellisDb } from 'trellis/browser'

declare module '#app' {
  interface NuxtApp {
    $trellisKernelBridge: {
      enabled: boolean
      client: TrellisDb | null
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $trellisKernelBridge: {
      enabled: boolean
      client: TrellisDb | null
    }
  }
}

export {}
