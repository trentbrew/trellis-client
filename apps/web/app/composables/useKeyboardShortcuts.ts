import type {
  ShortcutDefinition,
  ShortcutScope,
  ShortcutCategory,
  ShortcutOverride,
  ShortcutConflict,
  RegisteredShortcut,
  DispatchResult,
  KeyChord,
} from '~/types/shortcuts'
import { matchesKeyChord } from '~/types/shortcuts'

// ============================================================================
// Default Shortcut Map
// ============================================================================

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // ── General ──────────────────────────────────────────────────────────
  { id: 'command-palette', label: 'Command palette', keys: 'mod+k', scope: 'global', category: 'General', showToast: false },
  { id: 'search', label: 'Focus search', keys: '/', scope: 'global', category: 'General', showToast: false },
  { id: 'quick-capture', label: 'Quick capture', keys: 'mod+shift+n', scope: 'global', category: 'General', showToast: false },

  // ── Navigation ───────────────────────────────────────────────────────
  { id: 'go-home', label: 'Go to home', keys: 'mod+shift+h', scope: 'global', category: 'Navigation' },
  { id: 'go-database', label: 'Go to database', keys: 'mod+shift+d', scope: 'global', category: 'Navigation' },
  { id: 'go-settings', label: 'Go to settings', keys: 'mod+,', scope: 'global', category: 'Navigation' },
  { id: 'toggle-sidebar', label: 'Toggle sidebar', keys: 'mod+b', scope: 'global', category: 'Navigation', showToast: false },
  { id: 'nav-back', label: 'Go back', keys: 'mod+[', scope: 'global', category: 'Navigation', showToast: false },
  { id: 'nav-forward', label: 'Go forward', keys: 'mod+]', scope: 'global', category: 'Navigation', showToast: false },

  // ── Editing ──────────────────────────────────────────────────────────
  { id: 'undo', label: 'Undo', keys: 'mod+z', scope: 'global', category: 'Editing', showToast: 'Undo' },
  { id: 'redo', label: 'Redo', keys: 'mod+shift+z', scope: 'global', category: 'Editing', showToast: 'Redo' },
  { id: 'delete-selected', label: 'Delete selected', keys: 'backspace', scope: 'browse', category: 'Editing' },

  // ── Selection ────────────────────────────────────────────────────────
  { id: 'select-all', label: 'Select all', keys: 'mod+a', scope: 'browse', category: 'Selection' },
  { id: 'clear-selection', label: 'Clear selection', keys: 'escape', scope: 'browse', category: 'Selection', showToast: false },

  // ── View ─────────────────────────────────────────────────────────────
  { id: 'toggle-edit-mode', label: 'Toggle edit mode', keys: 'mod+e', scope: 'grid', category: 'View' },

  // ── Debug ─────────────────────────────────────────────────────────────
  { id: 'debug-toast', label: 'Test toast', keys: 'alt+t', scope: 'global', category: 'General', showToast: 'Toast is working' },
]

// ============================================================================
// Singleton State
// ============================================================================

const STORAGE_KEY = 'keyboard-shortcut-overrides'

/** All registered shortcuts (definitions + actions) */
const registry = ref<RegisteredShortcut[]>([])

/** User key-binding overrides persisted to localStorage */
const overrides = ref<ShortcutOverride[]>([])

/** Currently active scopes (components push/pop as they mount/unmount) */
const activeScopes = ref<Set<ShortcutScope>>(new Set(['global']))


// Load overrides from localStorage
if (import.meta.client) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) overrides.value = JSON.parse(stored)
  } catch { /* ignore */ }
}

// ============================================================================
// Composable
// ============================================================================

export function useKeyboardShortcuts() {
  // ── Derived state ──────────────────────────────────────────────────

  /** All shortcut definitions with user overrides applied */
  const shortcuts = computed<ShortcutDefinition[]>(() => {
    const overrideMap = new Map(overrides.value.map(o => [o.id, o.keys]))
    return DEFAULT_SHORTCUTS.map(def => ({
      ...def,
      keys: overrideMap.get(def.id) || def.keys,
    }))
  })

  /** Shortcuts grouped by category */
  const groupedShortcuts = computed(() => {
    const groups: Record<ShortcutCategory, ShortcutDefinition[]> = {
      General: [],
      Navigation: [],
      Editing: [],
      Selection: [],
      View: [],
    }
    for (const s of shortcuts.value) {
      groups[s.category].push(s)
    }
    return groups
  })

  /** Detect conflicts: two shortcuts with same keys and overlapping scope */
  const conflicts = computed<ShortcutConflict[]>(() => {
    const result: ShortcutConflict[] = []
    const all = shortcuts.value
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!
        const b = all[j]!
        if (a.keys === b.keys && scopesOverlap(a.scope, b.scope)) {
          result.push({ keys: a.keys, shortcuts: [a, b] })
        }
      }
    }
    return result
  })

  // ── Registration ───────────────────────────────────────────────────

  /**
   * Register a shortcut with a runtime action.
   * Call from `onMounted` — returns an unregister function for `onUnmounted`.
   */
  function register(
    id: string,
    action: () => string | undefined,
    overrideDef?: Partial<ShortcutDefinition>,
  ): () => void {
    // Find the definition (default or custom)
    const baseDef = DEFAULT_SHORTCUTS.find(d => d.id === id)
    const overrideKeys = overrides.value.find(o => o.id === id)?.keys

    const definition: ShortcutDefinition = {
      id,
      label: overrideDef?.label || baseDef?.label || id,
      keys: overrideKeys || overrideDef?.keys || baseDef?.keys || '',
      scope: overrideDef?.scope || baseDef?.scope || 'global',
      category: overrideDef?.category || baseDef?.category || 'General',
      description: overrideDef?.description || baseDef?.description,
      enabled: overrideDef?.enabled ?? baseDef?.enabled ?? true,
      showToast: overrideDef?.showToast ?? baseDef?.showToast,
    }

    const wrapped: () => string | undefined = () => action() ?? undefined
    const registered: RegisteredShortcut = { ...definition, action: wrapped }

    // Prevent duplicate registration
    const existingIdx = registry.value.findIndex(r => r.id === id)
    if (existingIdx >= 0) {
      registry.value[existingIdx] = registered
    } else {
      registry.value.push(registered)
    }

    // Return unregister function
    return () => {
      const idx = registry.value.findIndex(r => r.id === id)
      if (idx >= 0) registry.value.splice(idx, 1)
    }
  }

  /** Unregister a shortcut by ID */
  function unregister(id: string): void {
    const idx = registry.value.findIndex(r => r.id === id)
    if (idx >= 0) registry.value.splice(idx, 1)
  }

  // ── Scope management ──────────────────────────────────────────────

  /** Push a scope (e.g. when a grid editor mounts) */
  function pushScope(scope: ShortcutScope): void {
    activeScopes.value.add(scope)
  }

  /** Pop a scope (e.g. when a grid editor unmounts) */
  function popScope(scope: ShortcutScope): void {
    if (scope !== 'global') activeScopes.value.delete(scope)
  }

  // ── Dispatch ──────────────────────────────────────────────────────

  /**
   * Central keyboard event dispatcher. Called by the global plugin.
   * Returns the matched shortcut definition if one fired, or null.
   */
  function dispatch(e: KeyboardEvent): DispatchResult | null {
    // Skip if user is typing in a text field
    const tag = (e.target as HTMLElement)?.tagName
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

    for (const shortcut of registry.value) {
      if (shortcut.enabled === false) continue
      if (!matchesKeyChord(e, shortcut.keys)) continue

      // Scope check
      if (shortcut.scope !== 'global' && !activeScopes.value.has(shortcut.scope)) continue

      // For non-mod shortcuts (like "/" or "escape"), skip if typing in input
      // For mod shortcuts (like "mod+k"), always allow
      const isMod = shortcut.keys.startsWith('mod+') || shortcut.keys.startsWith('ctrl+') || shortcut.keys.startsWith('alt+')
      if (!isMod && isInput) continue

      // Special case: Escape should work even in inputs (for closing things)
      if (shortcut.keys === 'escape' && isInput) {
        // Only allow escape if the shortcut is specifically for closing overlays
        if (shortcut.scope !== 'global') continue
      }

      e.preventDefault()
      const target = shortcut.action() || undefined

      // Log action with actor ownership
      _logShortcutAction(shortcut)

      return { shortcut, target }
    }

    return null
  }

  /** Log shortcut action to the centralized action log with actor info */
  function _logShortcutAction(shortcut: RegisteredShortcut): void {
    try {
      const { log } = useActionLog()
      log(shortcut.id, shortcut.label, 'keyboard', {
        keys: shortcut.keys,
        scope: shortcut.scope,
        category: shortcut.category,
      })
    } catch { /* action log not available */ }
  }

  // ── User override management ──────────────────────────────────────

  /** Set a user override for a shortcut's key binding */
  function setOverride(id: string, keys: KeyChord): void {
    const existing = overrides.value.find(o => o.id === id)
    if (existing) {
      existing.keys = keys
    } else {
      overrides.value.push({ id, keys })
    }
    _persistOverrides()

    // Update any live registered shortcut
    const registered = registry.value.find(r => r.id === id)
    if (registered) registered.keys = keys
  }

  /** Reset a single shortcut to its default binding */
  function resetOverride(id: string): void {
    overrides.value = overrides.value.filter(o => o.id !== id)
    _persistOverrides()

    // Restore default in registry
    const defaultDef = DEFAULT_SHORTCUTS.find(d => d.id === id)
    const registered = registry.value.find(r => r.id === id)
    if (registered && defaultDef) registered.keys = defaultDef.keys
  }

  /** Reset all overrides to defaults */
  function resetAllOverrides(): void {
    overrides.value = []
    _persistOverrides()

    // Restore all defaults in registry
    for (const reg of registry.value) {
      const defaultDef = DEFAULT_SHORTCUTS.find(d => d.id === reg.id)
      if (defaultDef) reg.keys = defaultDef.keys
    }
  }

  /** Check if a shortcut has a user override */
  function hasOverride(id: string): boolean {
    return overrides.value.some(o => o.id === id)
  }

  /** Get the default keys for a shortcut */
  function getDefaultKeys(id: string): KeyChord | undefined {
    return DEFAULT_SHORTCUTS.find(d => d.id === id)?.keys
  }

  // ── Persistence ───────────────────────────────────────────────────

  function _persistOverrides(): void {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides.value))
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    // State
    shortcuts,
    groupedShortcuts,
    conflicts,
    overrides: readonly(overrides),
    activeScopes: readonly(activeScopes),

    // Registration
    register,
    unregister,

    // Scopes
    pushScope,
    popScope,

    // Dispatch
    dispatch,

    // Override management
    setOverride,
    resetOverride,
    resetAllOverrides,
    hasOverride,
    getDefaultKeys,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Check if two scopes can conflict */
function scopesOverlap(a: ShortcutScope, b: ShortcutScope): boolean {
  if (a === 'global' || b === 'global') return true
  return a === b
}
