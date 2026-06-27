/**
 * Trellis mutation event bus
 *
 * In-process event emitter for broadcasting graph mutations to SSE clients.
 * When any mutation occurs (from browser REST calls or future agent/CLI calls),
 * connected SSE clients receive the event and can react (e.g., re-fetch data).
 *
 * Campus Substrate (Phase 0, slice 0.3): every event is tagged with the
 * originating `zoneId` and `facilityId`. Emit sites that don't yet know their
 * zone (pre-0.5 route mapping) fall back to the founder's Lab.
 */

/**
 * Canonical IDs for the seeded founder root Facility and its default zones.
 * Emit sites without explicit zone context default to FOUNDER_LAB_ZONE_ID.
 * Slice 0.5 threads route-specific zones through to override the defaults.
 */
export const FOUNDER_FACILITY_ID = 'entity:founder-facility'
export const FOUNDER_LAB_ZONE_ID = 'entity:founder-facility-lab'
export const FOUNDER_LOBBY_ZONE_ID = 'entity:founder-facility-lobby'
export const FOUNDER_WORKSHOP_ZONE_ID = 'entity:founder-facility-workshop'
export const FOUNDER_SHOWROOM_ZONE_ID = 'entity:founder-facility-showroom'
export const FOUNDER_VAULT_ZONE_ID = 'entity:founder-facility-vault'

export interface MutationEvent {
  /** Unique event ID (monotonic counter) */
  id: number
  /** ISO timestamp */
  timestamp: string
  /** The mutation action: createNode, updateNode, deleteNode, link */
  action: string
  /** Primary entity ID affected */
  entityId?: string
  /** Entity type (e.g., 'task', 'note') */
  type?: string
  /** Who performed the mutation (browser, agent name, etc.) */
  agentId: string
  /** Campus Zone entity ID where the mutation originated */
  zoneId?: string
  /** Campus Facility entity ID containing the zone */
  facilityId?: string
  /** Optional extra data */
  data?: Record<string, any>
}

type MutationListener = (_event: MutationEvent) => void

// Module-level singleton state
let _eventCounter = 0
const _listeners = new Set<MutationListener>()

/**
 * Emit a mutation event to all connected listeners (SSE clients).
 *
 * If `zoneId`/`facilityId` are omitted, they default to the founder's Lab.
 * This is the correct fallback for Phase 0 since every existing entity in
 * the workspace pre-migration belongs in the founder's personal space.
 */
export function emitMutation(entry: Omit<MutationEvent, 'id' | 'timestamp'>): MutationEvent {
  const event: MutationEvent = {
    ...entry,
    id: ++_eventCounter,
    timestamp: new Date().toISOString(),
    zoneId: entry.zoneId || FOUNDER_LAB_ZONE_ID,
    facilityId: entry.facilityId || FOUNDER_FACILITY_ID,
  }

  for (const listener of _listeners) {
    try {
      listener(event)
    } catch {
      // Listener error — swallow to avoid breaking other listeners
    }
  }

  return event
}

/**
 * Subscribe to mutation events. Returns an unsubscribe function.
 */
export function onMutation(listener: MutationListener): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

/**
 * Get the current number of connected SSE listeners.
 */
export function getListenerCount(): number {
  return _listeners.size
}
