/**
 * useTrellisSSE — Centralized SSE connection manager for graph events.
 *
 * Provides a singleton EventSource connection to /api/graph/events that
 * all composables can subscribe to. Prevents duplicate connections and
 * ensures proper cleanup.
 */

const API_BASE = '/api/graph'

// Module-level singleton state (survives component unmounts)
let _eventSource: EventSource | null = null
const _connectedRef = ref(false)
let _retryMs = 1000
const _listeners = new Map<string, Set<(_event: MessageEvent) => void>>()

/**
 * Subscribe to SSE events of a specific type.
 * Returns an unsubscribe function.
 */
export function useSSESubscribe(eventType: string, callback: (_event: MessageEvent) => void): () => void {
  // Ensure connection exists
  if (!_eventSource && typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    _initConnection()
  }

  // Register listener
  if (!_listeners.has(eventType)) {
    _listeners.set(eventType, new Set())
  }
  _listeners.get(eventType)!.add(callback)

  // Return unsubscribe function
  return () => {
    const listeners = _listeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        _listeners.delete(eventType)
      }
    }
  }
}

/**
 * Get the current connection status.
 */
export function useSSEStatus() {
  return readonly(_connectedRef)
}

/** Dev/test only — force stale UI without killing server (TRL-319). */
export function __setSSEConnectedForTests(connected: boolean) {
  if (!import.meta.dev) return
  _connectedRef.value = connected
}

/**
 * Initialize the SSE connection (called automatically on first subscribe).
 */
function _initConnection() {
  if (_eventSource || typeof window === 'undefined') return

  function connect() {
    _eventSource = new EventSource(`${API_BASE}/events`)

    _eventSource.addEventListener('connected', () => {
      _connectedRef.value = true
      _retryMs = 1000 // Reset backoff
      console.debug('[SSE] Connected to graph events')
    })

    _eventSource.addEventListener('mutation', (event) => {
      _dispatchToListeners('mutation', event)
    })

    _eventSource.addEventListener('message', (event) => {
      _dispatchToListeners('message', event)
    })

    _eventSource.onerror = () => {
      _connectedRef.value = false
      _eventSource?.close()
      _eventSource = null

      // Exponential backoff with cap at 30s
      console.debug(`[SSE] Connection error, retrying in ${_retryMs}ms`)
      setTimeout(connect, _retryMs)
      _retryMs = Math.min(_retryMs * 2, 30_000)
    }
  }

  connect()
}

/**
 * Dispatch an event to all registered listeners for that event type.
 */
function _dispatchToListeners(eventType: string, event: MessageEvent) {
  const listeners = _listeners.get(eventType)
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(event)
      } catch (err) {
        console.error(`[SSE] Listener error for ${eventType}:`, err)
      }
    })
  }
}

/**
 * Close the SSE connection and clean up (for testing/debugging).
 */
export function closeSSEConnection() {
  _eventSource?.close()
  _eventSource = null
  _connectedRef.value = false
  _listeners.clear()
}
