/**
 * TQL Mutation Event Bus
 *
 * In-process event emitter for broadcasting graph mutations to SSE clients.
 * When any mutation occurs (from browser REST calls or future agent/CLI calls),
 * connected SSE clients receive the event and can react (e.g., re-fetch data).
 */

export interface MutationEvent {
  /** Unique event ID (monotonic counter) */
  id: number
  /** ISO timestamp */
  timestamp: string
  /** The mutation action: createNode, updateNode, deleteNode, link */
  action: string
  /** Primary entity ID affected */
  entityId?: string
  /** Entity type (e.g., 'calendaritem') */
  type?: string
  /** Who performed the mutation (browser, agent name, etc.) */
  agentId: string
  /** Optional extra data */
  data?: Record<string, any>
}

type MutationListener = (_event: MutationEvent) => void

// Module-level singleton state
let _eventCounter = 0
const _listeners = new Set<MutationListener>()

/**
 * Emit a mutation event to all connected listeners (SSE clients).
 */
export function emitMutation(
  entry: Omit<MutationEvent, 'id' | 'timestamp'>,
): MutationEvent {
  const event: MutationEvent = {
    ...entry,
    id: ++_eventCounter,
    timestamp: new Date().toISOString(),
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
