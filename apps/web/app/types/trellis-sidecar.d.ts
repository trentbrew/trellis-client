import type { TrellisDb } from 'trellis/browser'

declare module '#app' {
  interface NuxtApp {
    $trellisSidecar: {
      enabled: boolean
      client: TrellisDb | null
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $trellisSidecar: {
      enabled: boolean
      client: TrellisDb | null
    }
  }
}

export {}
