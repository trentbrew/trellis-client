import type { TrellisDb } from 'trellis/browser'
import { probeSidecarAvailable } from '~/lib/trellis-sidecar/sidecar-probe'

export interface TrellisSidecarContext {
  enabled: boolean
  client: TrellisDb | null
  available: Ref<boolean>
}

const TRELLIS_DB_KEY = Symbol('trellisDb')

export function provideTrellisDb(client: TrellisDb | null) {
  provide(TRELLIS_DB_KEY, client)
}

export function useTrellisDb(): TrellisDb | null {
  return inject(TRELLIS_DB_KEY, null)
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
