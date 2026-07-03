import type { TrellisDb } from 'trellis/browser'
import { probeSidecarAvailable } from '~/lib/trellis-sidecar/sidecar-probe'

export interface TrellisSidecarContext {
  enabled: boolean
  client: TrellisDb | null
  available: Ref<boolean>
}

export function useTrellisDb(): TrellisDb | null {
  const { $trellisSidecar, $trellisKernelBridge } = useNuxtApp()
  if ($trellisSidecar?.client) return $trellisSidecar.client
  return $trellisKernelBridge?.client ?? null
}

export function useTrellisSidecar(): TrellisSidecarContext {
  const config = useRuntimeConfig()
  const enabled = Boolean(config.public.trellisSidecar)
  const client = useTrellisDb()
  const available = useState('trellis-sidecar:available', () => false)

  if (import.meta.client && enabled && available.value === false) {
    void probeSidecarAvailable().then((ok) => {
      available.value = ok
    })
  }

  return { enabled, client, available }
}
