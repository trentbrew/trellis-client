import type { Entity, EntityType, Reference } from '~/types/entity'

// ── Deterministic UUID v5 ────────────────────────────────────────────────────
// Derives a stable UUID from a googleEventId string so InstantDB (which
// requires UUID keys) always gets the same ID for the same GCal event,
// without needing a lookup table.
//
// Uses a simple UUID v5-like approach: SHA-1 of a namespace + name,
// formatted as a UUID. We use a fixed namespace UUID for Trellis enrichment.

const ENRICHMENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // UUID v1 DNS namespace

async function uuidV5(name: string): Promise<string> {
  const nsBytes = ENRICHMENT_NAMESPACE.replace(/-/g, '').match(/.{2}/g)!.map((b) => parseInt(b, 16))
  const nameBytes = new TextEncoder().encode(name)
  const data = new Uint8Array([...nsBytes, ...nameBytes])
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const h = new Uint8Array(hashBuffer)
  // Set version (5) and variant bits per RFC 4122
  h[6] = (h[6]! & 0x0f) | 0x50
  h[8] = (h[8]! & 0x3f) | 0x80
  const hex = Array.from(h.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// In-memory cache: googleEventId → UUID (avoids repeated async hashing)
const _enrichmentIdCache = new Map<string, string>()

/**
 * Returns a stable UUID for a GCal enrichment node.
 * Cached after first call. Async because SHA-1 is async in WebCrypto.
 */
async function enrichmentUUID(googleEventId: string): Promise<string> {
  const clean = googleEventId.replace(/^gcal:/, '').replace(/^entity:/, '')
  if (_enrichmentIdCache.has(clean)) return _enrichmentIdCache.get(clean)!
  const id = await uuidV5(clean)
  _enrichmentIdCache.set(clean, id)
  return id
}

/**
 * Synchronous lookup — only works after `enrichmentUUID()` has been called
 * at least once for this googleEventId. Returns undefined if not yet cached.
 */
function enrichmentUUIDSync(googleEventId: string): string | undefined {
  const clean = googleEventId.replace(/^gcal:/, '').replace(/^entity:/, '')
  return _enrichmentIdCache.get(clean)
}

export interface GCalEnrichmentData {
  id: string
  type: 'event'
  title: string
  /** Stored as `eventType: 'gcal-enrichment'` in the InstantDB schema. */
  eventType: 'gcal-enrichment'
  /** Stored as `referenceNumber` in the InstantDB schema. */
  referenceNumber: string
  notes: string
  tags: string[]
  references: Reference[]
  owner?: string
  involved: string[]
  priority?: string
  urgency?: string
  createdAt: number
  updatedAt: number
}

/**
 * Composable for lazy GCal enrichment nodes.
 *
 * Each GCal event can have a corresponding Trellis-native enrichment node.
 * The node ID is a deterministic UUID v5 derived from the googleEventId,
 * satisfying InstantDB's UUID requirement while remaining stable across sessions.
 *
 * Schema mapping:
 *   googleEventId → `referenceNumber` (existing schema field, string)
 *   source marker  → `eventType: 'gcal-enrichment'` (existing schema field)
 *
 * The node is created lazily on first edit and never deleted on GCal re-sync.
 * It participates fully in the TQL link graph (references, mentions, etc.).
 */
export function useGCalEnrichment() {
  const { items, create: createEntity, update: updateEntity } = useEntities()

  /**
   * Find an existing enrichment entity for a given GCal event ID.
   * Uses the cached UUID if available, otherwise falls back to a linear scan
   * on `referenceNumber` (covers the case where the cache was cleared).
   */
  function findEnrichment(googleEventId: string): GCalEnrichmentData | undefined {
    const clean = googleEventId.replace(/^gcal:/, '').replace(/^entity:/, '')
    const cachedId = enrichmentUUIDSync(googleEventId)

    if (cachedId) {
      const byId = items.value.find((e) => e.id === cachedId)
      if (byId) return byId as unknown as GCalEnrichmentData
    }

    // Fallback: scan by referenceNumber (handles page reload before cache is warm)
    return items.value.find(
      (e) => (e as any).eventType === 'gcal-enrichment' && (e as any).referenceNumber === clean,
    ) as GCalEnrichmentData | undefined
  }

  /**
   * Reactively watch the enrichment node for a given GCal event ID.
   * Returns a computed ref that updates when the entity store changes.
   */
  function getEnrichment(googleEventId: Ref<string> | string) {
    return computed(() => {
      const id = typeof googleEventId === 'string' ? googleEventId : googleEventId.value
      if (!id) return undefined
      return findEnrichment(id)
    })
  }

  /**
   * Ensure an enrichment node exists for the given GCal event.
   * Creates it if absent. Returns the Trellis entity UUID.
   */
  async function ensureEnrichment(googleEventId: string, gcalTitle: string): Promise<string> {
    const existing = findEnrichment(googleEventId)
    if (existing) return existing.id

    const clean = googleEventId.replace(/^gcal:/, '').replace(/^entity:/, '')
    const entityId = await enrichmentUUID(googleEventId)

    await createEntity({
      id: entityId,
      type: 'event' as EntityType,
      title: gcalTitle,
      eventType: 'gcal-enrichment',
      referenceNumber: clean,
      // Required by InstantDB schema
      startDate: new Date().toISOString().slice(0, 10),
      allDay: true,
      priority: 'medium',
      notes: '',
      tags: [],
      references: [],
      involved: [],
    } as any)

    return entityId
  }

  /**
   * Partially update the enrichment node for a given GCal event.
   * Creates the node first if it doesn't exist yet (lazy).
   */
  async function updateEnrichment(googleEventId: string, gcalTitle: string, patch: Partial<GCalEnrichmentData>) {
    const entityId = await ensureEnrichment(googleEventId, gcalTitle)
    const existing = findEnrichment(googleEventId)
    const clean = googleEventId.replace(/^gcal:/, '').replace(/^entity:/, '')

    const merged: Entity = {
      ...(existing ?? {}),
      ...patch,
      id: entityId,
      type: 'event' as EntityType,
      title: gcalTitle,
      eventType: 'gcal-enrichment',
      referenceNumber: clean,
    } as any

    await updateEntity(merged)
  }

  return {
    enrichmentUUID,
    enrichmentUUIDSync,
    getEnrichment,
    findEnrichment,
    ensureEnrichment,
    updateEnrichment,
  }
}
