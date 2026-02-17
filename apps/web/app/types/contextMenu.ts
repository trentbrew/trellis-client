/**
 * Context Menu Configuration System
 *
 * Provides a declarative, config-driven context menu architecture
 * that can be attached to any component via props or route config.
 *
 * Design principles:
 * - Actions are declarative metadata (icon, label, shortcut, variant)
 * - Parents handle action dispatch via string IDs
 * - Supports separators, submenus, disabled/hidden states
 * - Context object passed through for dynamic resolution
 * - Composable at every level: defaults can be extended/overridden
 */

/** A single context menu action item */
export interface ContextMenuAction {
  /** Unique action identifier — emitted when clicked */
  id: string
  /** Display label */
  label: string
  /** Lucide icon name (e.g., 'lucide:pin') */
  icon?: string
  /** Keyboard shortcut hint (display only) */
  shortcut?: string
  /** Visual variant */
  variant?: 'default' | 'destructive'
  /** Whether the action is disabled */
  disabled?: boolean
  /** Whether the action is visible (false = hidden entirely) */
  visible?: boolean
  /** Render a separator line BEFORE this item */
  separator?: boolean
  /** Nested submenu actions */
  children?: ContextMenuAction[]
}

/**
 * Context menu configuration.
 *
 * Can be:
 * - A static array of actions
 * - A function that receives context and returns actions (for dynamic menus)
 */
export type ContextMenuConfig<T = any> = ContextMenuAction[] | ((_context: T) => ContextMenuAction[])

/**
 * Resolved context menu event payload.
 * Emitted when an action is selected.
 */
export interface ContextMenuEvent<T = any> {
  /** The action ID that was selected */
  actionId: string
  /** The context object (e.g., the item that was right-clicked) */
  context: T
}

// ── Built-in action IDs ──────────────────────────────────────────────────
// These are canonical action IDs used across the system.
// Components can define custom IDs beyond these.

export const CONTEXT_ACTIONS = {
  // Navigation
  OPEN: 'open',
  OPEN_NEW_TAB: 'open-new-tab',
  COPY_LINK: 'copy-link',

  // Sidebar
  PIN: 'pin',
  UNPIN: 'unpin',
  COLLAPSE: 'collapse',
  EXPAND: 'expand',
  RESET_ORDER: 'reset-order',

  // CRUD
  CREATE: 'create',
  RENAME: 'rename',
  DUPLICATE: 'duplicate',
  DELETE: 'delete',

  // Organization
  MOVE_TO: 'move-to',
  CHANGE_ICON: 'change-icon',
  EXPORT: 'export',

  // Entity-specific
  CHANGE_STATUS: 'change-status',
  CHANGE_PRIORITY: 'change-priority',
  ASSIGN_TO: 'assign-to',
} as const

export type ContextActionId = (typeof CONTEXT_ACTIONS)[keyof typeof CONTEXT_ACTIONS]
