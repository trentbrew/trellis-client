import { createSharedComposable, useDebounceFn } from '@vueuse/core'
import type { Entity, AppointmentItem, EventItem, TripItem } from '~/types/entity'
import { createDefaultItem } from '~/types/entity'
import { applyPinCollisionOffsets, extractPinCandidates } from '~/lib/locations/extract-pins'
import {
  getClientGeocodeCache,
  setClientGeocodeCache,
} from '~/lib/locations/geocode-cache'
import {
  LOCATION_ENTITY_TYPES,
  VIEWPORT_STORAGE_KEY,
  type LocationEntityType,
  type MapPin,
  type MapViewport,
  type PinCandidate,
} from '~/lib/locations/types'

const MAX_CONCURRENT_GEOCODE = 10

const typeFilters = ref<Record<LocationEntityType, boolean>>({
  event: true,
  trip: true,
  appointment: true,
})

const isResolving = ref(false)
const geocodeFailures = ref(0)
const resolvedPins = ref<MapPin[]>([])
const hoveredPinId = ref<string | null>(null)
const selectedPinId = ref<string | null>(null)
const pendingFlyTo = ref<{ lng: number; lat: number; zoom?: number } | null>(null)
const searchQuery = ref('')
const inspectorOpen = ref(false)
const inspectorEntityId = ref<string | null>(null)

function pinId(candidate: PinCandidate): string {
  return `${candidate.entityId}:${candidate.fieldKey}`
}

async function geocodeText(query: string): Promise<{ lat: number; lng: number; placeName: string } | null> {
  const cached = getClientGeocodeCache(query)
  if (cached) return cached

  try {
    const result = await $fetch<{ lat: number; lng: number; placeName: string }>('/api/geocode', {
      query: { q: query },
    })
    setClientGeocodeCache(query, result)
    return result
  } catch {
    return null
  }
}

async function resolveCandidates(candidates: PinCandidate[]): Promise<{
  pins: MapPin[]
  failed: number
}> {
  const resolved: MapPin[] = []
  let failed = 0
  const pending = [...candidates]

  while (pending.length > 0) {
    const batch = pending.splice(0, MAX_CONCURRENT_GEOCODE)
    const results = await Promise.all(
      batch.map(async (candidate) => {
        if (candidate.lat != null && candidate.lng != null) {
          return {
            id: pinId(candidate),
            entityId: candidate.entityId,
            entityType: candidate.entityType,
            fieldKey: candidate.fieldKey,
            label: candidate.label,
            lat: candidate.lat,
            lng: candidate.lng,
          } satisfies MapPin
        }

        if (!candidate.queryText) return null
        const geo = await geocodeText(candidate.queryText)
        if (!geo) {
          failed++
          return null
        }

        return {
          id: pinId(candidate),
          entityId: candidate.entityId,
          entityType: candidate.entityType,
          fieldKey: candidate.fieldKey,
          label: candidate.label,
          lat: geo.lat,
          lng: geo.lng,
          placeName: geo.placeName,
        } satisfies MapPin
      }),
    )

    for (const pin of results) {
      if (pin) resolved.push(pin)
    }
  }

  return { pins: applyPinCollisionOffsets(resolved), failed }
}

let resolveGeneration = 0

async function refreshPins(candidates: PinCandidate[]) {
  const generation = ++resolveGeneration
  isResolving.value = true
  try {
    const { pins, failed } = await resolveCandidates(candidates)
    if (generation !== resolveGeneration) return
    resolvedPins.value = pins
    geocodeFailures.value = failed
  } finally {
    if (generation === resolveGeneration) isResolving.value = false
  }
}

export const useLocationsMap = createSharedComposable(() => {
  const route = useRoute()
  const { items } = useEntities()
  const { setOriginHash, clearHash } = useDialogUrl()

  const prefersReducedMotion = computed(() => {
    if (import.meta.server) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  function syncFiltersFromQuery() {
    const raw = route.query.types
    if (typeof raw !== 'string' || !raw.trim()) return
    const allowed = new Set(raw.split(',').map((t) => t.trim()))
    for (const type of LOCATION_ENTITY_TYPES) {
      typeFilters.value[type] = allowed.has(type)
    }
  }

  syncFiltersFromQuery()

  watch(
    () => route.query.types,
    () => syncFiltersFromQuery(),
  )

  const candidates = computed(() => extractPinCandidates(items.value as Entity[]))

  const visiblePins = computed(() =>
    resolvedPins.value.filter((pin) => typeFilters.value[pin.entityType]),
  )

  const filteredPins = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return visiblePins.value
    return visiblePins.value.filter((pin) => {
      const haystack = [pin.label, pin.placeName, pin.entityType, pin.fieldKey]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  })

  const placeCountLabel = computed(() => {
    const n = filteredPins.value.length
    const total = visiblePins.value.length
    if (searchQuery.value.trim() && n !== total) {
      return `${n} of ${total} places`
    }
    return `${n} place${n === 1 ? '' : 's'}`
  })

  const hasCandidates = computed(() => candidates.value.length > 0)

  const debouncedRefresh = useDebounceFn((next: PinCandidate[]) => refreshPins(next), 300)

  watch(candidates, (next) => debouncedRefresh(next), { immediate: true, deep: true })

  function toggleTypeFilter(type: LocationEntityType) {
    typeFilters.value[type] = !typeFilters.value[type]
  }

  function loadViewport(): MapViewport | null {
    if (import.meta.server) return null
    try {
      const raw = sessionStorage.getItem(VIEWPORT_STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as MapViewport
      if (
        typeof parsed.lng === 'number'
        && typeof parsed.lat === 'number'
        && typeof parsed.zoom === 'number'
      ) {
        return parsed
      }
    } catch {
      /* ignore */
    }
    return null
  }

  function saveViewport(viewport: MapViewport) {
    if (import.meta.server) return
    try {
      sessionStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport))
    } catch {
      /* ignore */
    }
  }

  function findEntity(entityId: string): Entity | undefined {
    return items.value.find((item) => item.id === entityId) as Entity | undefined
  }

  const inspectorItem = computed(() => {
    if (!inspectorEntityId.value) return null
    return findEntity(inspectorEntityId.value) ?? null
  })

  watch(inspectorOpen, (open) => {
    if (!open) {
      inspectorEntityId.value = null
      clearHash()
    }
  })

  function flyToPin(pin: MapPin, zoom = 14) {
    selectedPinId.value = pin.id
    hoveredPinId.value = pin.id
    pendingFlyTo.value = { lng: pin.lng, lat: pin.lat, zoom }
  }

  function flyToEntity(entityId: string, zoom = 14) {
    const pin = resolvedPins.value.find((p) => p.entityId === entityId)
    if (!pin) return false
    flyToPin(pin, zoom)
    return true
  }

  function openInspector(entityId: string, pin?: MapPin) {
    const entity = findEntity(entityId)
    if (!entity) return
    inspectorEntityId.value = entityId
    inspectorOpen.value = true
    setOriginHash(entityId)
    if (pin) {
      flyToPin(pin)
    } else {
      flyToEntity(entityId)
    }
  }

  function closeInspector() {
    inspectorOpen.value = false
  }

  function navigateToEntity(entityId: string): boolean {
    const entity = findEntity(entityId)
    if (!entity) return false
    openInspector(entityId)
    return true
  }

  function focusPin(pin: MapPin, zoom = 14) {
    flyToPin(pin, zoom)
  }

  function openPinEntity(pin: MapPin) {
    openInspector(pin.entityId, pin)
  }

  function clearPendingFlyTo() {
    pendingFlyTo.value = null
  }

  async function createLocationEntity(type: LocationEntityType) {
    const { create } = useEntities()
    const item = createDefaultItem(type)
    if (type === 'event') {
      ;(item as EventItem).location = ''
    } else if (type === 'appointment') {
      ;(item as AppointmentItem).location = ''
    } else if (type === 'trip') {
      ;(item as TripItem).destination = ''
    }
    await create(item)
    openInspector(item.id)
  }

  return {
    typeFilters,
    searchQuery,
    inspectorOpen,
    inspectorEntityId,
    inspectorItem,
    isResolving,
    geocodeFailures,
    resolvedPins,
    visiblePins,
    filteredPins,
    hoveredPinId,
    selectedPinId,
    pendingFlyTo,
    prefersReducedMotion,
    placeCountLabel,
    hasCandidates,
    toggleTypeFilter,
    loadViewport,
    saveViewport,
    focusPin,
    openPinEntity,
    openInspector,
    closeInspector,
    navigateToEntity,
    findEntity,
    refreshPins,
    clearPendingFlyTo,
    createLocationEntity,
  }
})
