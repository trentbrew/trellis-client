/**
 * Centralized action log with actor/ownership tracking.
 *
 * Every action records WHO did it, WHAT they did, WHEN, and HOW (keyboard,
 * mouse, system, etc.). This feeds into the activity feed and can be wired
 * into the TQL mutation log for persistence.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type ActionSource = 'keyboard' | 'mouse' | 'system' | 'api'

export interface ActionActor {
  id: string
  name: string
  avatar?: string | null
}

export interface ActionLogEntry {
  /** Unique entry ID */
  id: string
  /** Action identifier (e.g. shortcut id, mutation type) */
  action: string
  /** Human-readable description */
  label: string
  /** Who performed the action */
  actor: ActionActor
  /** How it was triggered */
  source: ActionSource
  /** ISO timestamp */
  timestamp: number
  /** Optional metadata (entity id, scope, key chord, etc.) */
  meta?: Record<string, unknown>
}

// ── Singleton state ───────────────────────────────────────────────────────

const MAX_ENTRIES = 200

const entries = ref<ActionLogEntry[]>([])

const ANONYMOUS_ACTOR: ActionActor = { id: 'anonymous', name: 'Anonymous' }

// ── Composable ────────────────────────────────────────────────────────────

export function useActionLog() {
  /**
   * Resolve the current actor from auth state.
   * Safe to call outside of setup — returns anonymous if no user.
   */
  function getCurrentActor(): ActionActor {
    try {
      const { user } = useInstantAuth()
      if (user.value) {
        return {
          id: user.value.id,
          name: user.value.name || user.value.email || 'User',
          avatar: user.value.avatar,
        }
      }
    } catch { /* composable not available outside setup */ }
    return ANONYMOUS_ACTOR
  }

  /**
   * Log an action with full ownership metadata.
   */
  function log(
    action: string,
    label: string,
    source: ActionSource = 'system',
    meta?: Record<string, unknown>,
  ): ActionLogEntry {
    const entry: ActionLogEntry = {
      id: crypto.randomUUID(),
      action,
      label,
      actor: getCurrentActor(),
      source,
      timestamp: Date.now(),
      meta,
    }

    entries.value.unshift(entry)

    // Cap the log size
    if (entries.value.length > MAX_ENTRIES) {
      entries.value = entries.value.slice(0, MAX_ENTRIES)
    }

    return entry
  }

  /** Recent entries (newest first) */
  const recentEntries = computed(() => entries.value.slice(0, 50))

  /** Clear the log */
  function clear() {
    entries.value = []
  }

  return {
    entries: readonly(entries),
    recentEntries,
    log,
    clear,
    getCurrentActor,
  }
}
