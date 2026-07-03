import type { TrellisDb } from 'trellis/browser'
import { useEntities } from 'trellis/vue/typed'
import type { ComputedRef } from 'vue'
import {
  AppProjectionType,
  AppProjectionViewType,
  AppRouteType,
  AppSchemaType,
} from '~/lib/trellis-sidecar/schema/app-config'
import {
  appConfigRowCount,
  assembleAppConfigFromRows,
} from '~/lib/app-config-live/assemble-config'
import { resolveAppConfigTransportMode } from '~/lib/app-config-live/mode'
import type { ServerConfig } from '~/lib/app-config/types'

export type LiveAppConfigState = {
  config: ComputedRef<ServerConfig>
  routes: ComputedRef<ServerConfig['routes']>
  projections: ComputedRef<ServerConfig['projections']>
  projectionViews: ComputedRef<ServerConfig['projectionViews']>
  ontologies: ComputedRef<ServerConfig['ontologies']>
  app: ComputedRef<ServerConfig['app']>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  transportMode: ComputedRef<'live' | 'fallback'>
  active: ComputedRef<boolean>
}

/**
 * Live app config via trellis/vue `useEntities` — ADR-002 P3 path A.
 * Requires app config entities imported into the sidecar DB.
 */
export function useTrellisConfigLive(client: TrellisDb): LiveAppConfigState {
  const trellisClient = client as unknown as Parameters<typeof useEntities>[0]

  const routesRead = useEntities(trellisClient, AppRouteType)
  const schemasRead = useEntities(trellisClient, AppSchemaType)
  const projectionsRead = useEntities(trellisClient, AppProjectionType)
  const viewsRead = useEntities(trellisClient, AppProjectionViewType)

  const loading = computed(
    () =>
      routesRead.value.loading
      || schemasRead.value.loading
      || projectionsRead.value.loading
      || viewsRead.value.loading,
  )

  const error = computed(() => {
    return (
      routesRead.value.error
      ?? schemasRead.value.error
      ?? projectionsRead.value.error
      ?? viewsRead.value.error
      ?? null
    )
  })

  const config = computed(() =>
    assembleAppConfigFromRows({
      routes: routesRead.value.data ?? [],
      schemas: schemasRead.value.data ?? [],
      projections: projectionsRead.value.data ?? [],
      projectionViews: viewsRead.value.data ?? [],
    }),
  )

  const transportMode = computed(() =>
    resolveAppConfigTransportMode(client, appConfigRowCount(config.value), loading.value),
  )

  const active = computed(() => transportMode.value === 'live')

  return {
    config,
    routes: computed(() => config.value.routes),
    projections: computed(() => config.value.projections),
    projectionViews: computed(() => config.value.projectionViews),
    ontologies: computed(() => config.value.ontologies),
    app: computed(() => config.value.app),
    loading,
    error,
    transportMode,
    active,
  }
}
