// ============================================================================
// Keyboard Shortcuts Type System
// ============================================================================

/** Scope determines when a shortcut is active */
export type ShortcutScope = 'global' | 'grid' | 'browse' | 'dialog' | 'editor'

/** Category for grouping in the settings UI */
export type ShortcutCategory = 'General' | 'Navigation' | 'Editing' | 'Selection' | 'View'

/**
 * Normalized key chord string.
 *
 * Format: modifier keys in order `mod+ctrl+alt+shift+<key>`
 * - `mod` = ⌘ on Mac, Ctrl on Windows/Linux
 * - Examples: `"mod+z"`, `"mod+shift+z"`, `"escape"`, `"/"`, `"backspace"`
 */
export type KeyChord = string

/** A single shortcut definition */
export interface ShortcutDefinition {
  /** Unique shortcut identifier, e.g. `"command-palette"` */
  id: string
  /** Human-readable label, e.g. `"Command palette"` */
  label: string
  /** Optional longer description */
  description?: string
  /** Normalized key chord, e.g. `"mod+k"` */
  keys: KeyChord
  /** When the shortcut is active */
  scope: ShortcutScope
  /** UI grouping category */
  category: ShortcutCategory
  /** Whether this shortcut is currently enabled (default true) */
  enabled?: boolean
  /**
   * Toast behavior when this shortcut fires.
   * - `true`  → show toast with the shortcut label + key chord
   * - `false` → no toast (e.g. command palette already has visual feedback)
   * - string  → custom toast message
   * Default: `true`
   */
  showToast?: boolean | string
}

/**
 * A registered (live) shortcut — definition + runtime action callback.
 * The action is not serializable, so it's kept separate from the definition.
 */
export interface RegisteredShortcut extends ShortcutDefinition {
  /**
   * Callback to execute when the shortcut fires.
   * Optionally returns a string describing what was acted upon
   * (e.g. "3 items", "Task: Deploy v2") — shown in the toast.
   */
  action: () => string | undefined
}

/** Result of dispatching a keyboard event through the shortcut registry */
export interface DispatchResult {
  /** The shortcut that matched and fired */
  shortcut: RegisteredShortcut
  /** Optional description of what the action targeted (returned by the action callback) */
  target?: string
}

/** User override for a shortcut's key binding */
export interface ShortcutOverride {
  /** Shortcut ID */
  id: string
  /** New key chord (replaces default) */
  keys: KeyChord
}

/** Conflict between two shortcuts */
export interface ShortcutConflict {
  keys: KeyChord
  shortcuts: [ShortcutDefinition, ShortcutDefinition]
}

// ── Display helpers ─────────────────────────────────────────────────────

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

const MOD_DISPLAY: Record<string, { mac: string; other: string }> = {
  mod: { mac: '⌘', other: 'Ctrl' },
  ctrl: { mac: '⌃', other: 'Ctrl' },
  alt: { mac: '⌥', other: 'Alt' },
  shift: { mac: '⇧', other: 'Shift' },
}

const KEY_DISPLAY: Record<string, string> = {
  escape: 'Esc',
  backspace: '⌫',
  delete: 'Del',
  enter: '↩',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  ' ': 'Space',
  tab: 'Tab',
}

/**
 * Format a key chord for display.
 * e.g. `"mod+shift+z"` → `"⌘⇧Z"` (Mac) or `"Ctrl+Shift+Z"` (other)
 */
export function formatKeyChord(chord: KeyChord): string {
  const parts = chord.toLowerCase().split('+')
  const isMac = IS_MAC

  const display: string[] = []
  for (const part of parts) {
    if (MOD_DISPLAY[part]) {
      display.push(isMac ? MOD_DISPLAY[part].mac : MOD_DISPLAY[part].other)
    } else {
      const mapped = KEY_DISPLAY[part]
      if (mapped) {
        display.push(mapped)
      } else {
        display.push(part.length === 1 ? part.toUpperCase() : part)
      }
    }
  }

  return isMac ? display.join('') : display.join('+')
}

/**
 * Normalize a KeyboardEvent into a key chord string.
 * e.g. ⌘+Shift+Z → `"mod+shift+z"`
 */
export function eventToKeyChord(e: KeyboardEvent): KeyChord {
  const parts: string[] = []

  if (e.metaKey || e.ctrlKey) parts.push('mod')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  // Normalize the key
  const key = e.key.toLowerCase()

  // Skip if the key itself is a modifier
  if (['meta', 'control', 'alt', 'shift'].includes(key)) {
    return parts.join('+')
  }

  parts.push(key)
  return parts.join('+')
}

/**
 * Check if a KeyboardEvent matches a key chord.
 */
export function matchesKeyChord(e: KeyboardEvent, chord: KeyChord): boolean {
  return eventToKeyChord(e) === chord.toLowerCase()
}
