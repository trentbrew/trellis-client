import type { TrellisDb } from 'trellis/browser'
import { useEntities } from 'trellis/vue/typed'
import type { ComputedRef } from 'vue'
import { bridgeRowToEntity } from '~/lib/entities-live/bridge-row-to-entity'
import { resolveEntityTransportMode } from '~/lib/entities-live/mode'
import { KernelBrowseType } from '~/lib/trellis-sidecar/schema/browse-entity'
import type { Entity } from '~/types/entity'

export type LiveEntitiesState = {
  items: ComputedRef<Entity[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  transportMode: ComputedRef<'live' | 'fallback'>
  active: ComputedRef<boolean>
}

/**
 * Live entity browse via trellis/vue KernelBrowse aggregate — ADR-002 TRL-17.
 * Requires kernel-bridge client (embedded kernel, TRELLIS_SIDECAR=0).
 */
export function useTrellisEntitiesLive(client: TrellisDb): LiveEntitiesState {
  const trellisClient = client as unknown as Parameters<typeof useEntities>[0]
  const browseRead = useEntities(trellisClient, KernelBrowseType)

  const items = computed(() =>
    (browseRead.value.data ?? []).map((row) => bridgeRowToEntity(row)),
  )

  const loading = computed(() => browseRead.value.loading)
  const error = computed(() => browseRead.value.error ?? null)

  const transportMode = computed(() =>
    resolveEntityTransportMode(client, items.value.length, loading.value),
  )

  const active = computed(() => transportMode.value === 'live')

  return { items, loading, error, transportMode, active }
}
