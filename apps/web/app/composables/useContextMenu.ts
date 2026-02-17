/**
 * Composable for resolving and managing context menus.
 *
 * Provides:
 * - Config resolution (static arrays or dynamic functions)
 * - Built-in action presets for common patterns
 * - Clipboard helpers (copy link)
 * - Integration with sidebar pin/collapse systems
 */

import type { ContextMenuAction, ContextMenuConfig } from '~/types/contextMenu'
import { CONTEXT_ACTIONS } from '~/types/contextMenu'

/**
 * Resolve a ContextMenuConfig into a concrete action array.
 * Filters out invisible items.
 */
export function resolveContextMenu<T>(config: ContextMenuConfig<T> | undefined, context: T): ContextMenuAction[] {
  if (!config) return []
  const actions = typeof config === 'function' ? config(context) : config
  return actions.filter((a) => a.visible !== false)
}

// ── Built-in presets ─────────────────────────────────────────────────────
// Reusable action sets for common surfaces.

/** Default context menu for a sidebar nav item */
export function sidebarItemMenu(options: {
  isPinned?: boolean
  canPin?: boolean
  path?: string
}): ContextMenuAction[] {
  const { isPinned = false, canPin = true, path } = options
  return [
    {
      id: CONTEXT_ACTIONS.OPEN,
      label: 'Open',
      icon: 'lucide:arrow-right',
    },
    {
      id: CONTEXT_ACTIONS.OPEN_NEW_TAB,
      label: 'Open in New Tab',
      icon: 'lucide:external-link',
    },
    {
      id: CONTEXT_ACTIONS.COPY_LINK,
      label: 'Copy Link',
      icon: 'lucide:link',
      shortcut: '⌘L',
      visible: !!path,
    },
    {
      id: isPinned ? CONTEXT_ACTIONS.UNPIN : CONTEXT_ACTIONS.PIN,
      label: isPinned ? 'Unpin' : 'Pin to Top',
      icon: isPinned ? 'lucide:pin-off' : 'lucide:pin',
      separator: true,
      visible: canPin,
    },
  ]
}

/** Context menu for a sidebar section header */
export function sidebarSectionMenu(options: {
  isCollapsed?: boolean
  canResetOrder?: boolean
  canCreate?: boolean
}): ContextMenuAction[] {
  const { isCollapsed = false, canResetOrder = false, canCreate = false } = options
  return [
    {
      id: isCollapsed ? CONTEXT_ACTIONS.EXPAND : CONTEXT_ACTIONS.COLLAPSE,
      label: isCollapsed ? 'Expand Section' : 'Collapse Section',
      icon: isCollapsed ? 'lucide:chevrons-down' : 'lucide:chevrons-up',
    },
    {
      id: CONTEXT_ACTIONS.CREATE,
      label: 'New Item',
      icon: 'lucide:plus',
      separator: true,
      visible: canCreate,
    },
    {
      id: CONTEXT_ACTIONS.RESET_ORDER,
      label: 'Reset Order',
      icon: 'lucide:arrow-down-up',
      separator: !canCreate,
      visible: canResetOrder,
    },
  ]
}

/** Context menu for a collection sidebar item */
export function collectionItemMenu(): ContextMenuAction[] {
  return [
    {
      id: CONTEXT_ACTIONS.OPEN,
      label: 'Open',
      icon: 'lucide:arrow-right',
    },
    {
      id: CONTEXT_ACTIONS.OPEN_NEW_TAB,
      label: 'Open in New Tab',
      icon: 'lucide:external-link',
    },
    {
      id: CONTEXT_ACTIONS.COPY_LINK,
      label: 'Copy Link',
      icon: 'lucide:link',
    },
    {
      id: CONTEXT_ACTIONS.RENAME,
      label: 'Rename',
      icon: 'lucide:pencil',
      separator: true,
    },
    {
      id: CONTEXT_ACTIONS.CHANGE_ICON,
      label: 'Change Icon',
      icon: 'lucide:palette',
    },
    {
      id: CONTEXT_ACTIONS.DUPLICATE,
      label: 'Duplicate',
      icon: 'lucide:copy',
    },
    {
      id: CONTEXT_ACTIONS.EXPORT,
      label: 'Export',
      icon: 'lucide:download',
    },
    {
      id: CONTEXT_ACTIONS.DELETE,
      label: 'Delete',
      icon: 'lucide:trash-2',
      variant: 'destructive',
      separator: true,
    },
  ]
}

/** Context menu for a user-created custom sidebar section */
export function customSectionMenu(options: {
  isCollapsed?: boolean
}): ContextMenuAction[] {
  const { isCollapsed = false } = options
  return [
    {
      id: isCollapsed ? CONTEXT_ACTIONS.EXPAND : CONTEXT_ACTIONS.COLLAPSE,
      label: isCollapsed ? 'Expand Section' : 'Collapse Section',
      icon: isCollapsed ? 'lucide:chevrons-down' : 'lucide:chevrons-up',
    },
    {
      id: CONTEXT_ACTIONS.RENAME,
      label: 'Rename Section',
      icon: 'lucide:pencil',
      separator: true,
    },
    {
      id: CONTEXT_ACTIONS.DELETE,
      label: 'Delete Section',
      icon: 'lucide:trash-2',
      variant: 'destructive',
      separator: true,
    },
  ]
}

/** Context menu for the sidebar surface (right-click on empty area) */
export function sidebarSurfaceMenu(options: {
  isWorkspace?: boolean
  canCreateSection?: boolean
  hasCollapsedSections?: boolean
}): ContextMenuAction[] {
  const { isWorkspace = false, canCreateSection = false, hasCollapsedSections = false } = options
  return [
    {
      id: 'expand-all',
      label: 'Expand All Sections',
      icon: 'lucide:chevrons-down',
      visible: hasCollapsedSections,
    },
    {
      id: 'collapse-all',
      label: 'Collapse All Sections',
      icon: 'lucide:chevrons-up',
    },
    {
      id: 'create-section',
      label: 'New Section',
      icon: 'lucide:folder-plus',
      separator: true,
      visible: canCreateSection,
    },
    {
      id: CONTEXT_ACTIONS.RESET_ORDER,
      label: 'Reset All Order',
      icon: 'lucide:arrow-down-up',
      separator: !canCreateSection,
      visible: isWorkspace,
    },
  ]
}

/** Context menu for a tree-driven sidebar section (graph-backed SidebarNode with nodeType 'section') */
export function treeNodeSectionMenu(options: {
  isCollapsed?: boolean
  isLocked?: boolean
  canCreate?: boolean
}): ContextMenuAction[] {
  const { isCollapsed = false, isLocked = false, canCreate = false } = options
  return [
    {
      id: isCollapsed ? CONTEXT_ACTIONS.EXPAND : CONTEXT_ACTIONS.COLLAPSE,
      label: isCollapsed ? 'Expand Section' : 'Collapse Section',
      icon: isCollapsed ? 'lucide:chevrons-down' : 'lucide:chevrons-up',
    },
    {
      id: CONTEXT_ACTIONS.CREATE,
      label: 'New Item',
      icon: 'lucide:plus',
      separator: true,
      visible: canCreate,
    },
    {
      id: CONTEXT_ACTIONS.RENAME,
      label: 'Rename Section',
      icon: 'lucide:pencil',
      separator: !canCreate,
      visible: !isLocked,
    },
    {
      id: CONTEXT_ACTIONS.CHANGE_ICON,
      label: 'Change Icon',
      icon: 'lucide:palette',
      visible: !isLocked,
    },
    {
      id: CONTEXT_ACTIONS.RESET_ORDER,
      label: 'Reset Order',
      icon: 'lucide:arrow-down-up',
    },
    {
      id: CONTEXT_ACTIONS.DELETE,
      label: 'Delete Section',
      icon: 'lucide:trash-2',
      variant: 'destructive',
      separator: true,
      visible: !isLocked,
    },
  ]
}

/** Context menu for a tree-driven sidebar item (graph-backed SidebarNode with nodeType 'item') */
export function treeNodeItemMenu(options: {
  isPinned?: boolean
  canPin?: boolean
  isLocked?: boolean
  path?: string
}): ContextMenuAction[] {
  const { isPinned = false, canPin = true, isLocked = false, path } = options
  return [
    {
      id: CONTEXT_ACTIONS.OPEN,
      label: 'Open',
      icon: 'lucide:arrow-right',
    },
    {
      id: CONTEXT_ACTIONS.OPEN_NEW_TAB,
      label: 'Open in New Tab',
      icon: 'lucide:external-link',
    },
    {
      id: CONTEXT_ACTIONS.COPY_LINK,
      label: 'Copy Link',
      icon: 'lucide:link',
      shortcut: '⌘L',
      visible: !!path,
    },
    {
      id: isPinned ? CONTEXT_ACTIONS.UNPIN : CONTEXT_ACTIONS.PIN,
      label: isPinned ? 'Unpin' : 'Pin to Top',
      icon: isPinned ? 'lucide:pin-off' : 'lucide:pin',
      separator: true,
      visible: canPin,
    },
    {
      id: CONTEXT_ACTIONS.RENAME,
      label: 'Rename',
      icon: 'lucide:pencil',
      separator: true,
      visible: !isLocked,
    },
    {
      id: CONTEXT_ACTIONS.CHANGE_ICON,
      label: 'Change Icon',
      icon: 'lucide:palette',
      visible: !isLocked,
    },
    {
      id: CONTEXT_ACTIONS.MOVE_TO,
      label: 'Move to Section...',
      icon: 'lucide:move',
      visible: !isLocked,
    },
    {
      id: CONTEXT_ACTIONS.DELETE,
      label: 'Remove from Sidebar',
      icon: 'lucide:trash-2',
      variant: 'destructive',
      separator: true,
      visible: !isLocked,
    },
  ]
}

/** Context menu for a projection/view mode (right-click within the view area) */
export function projectionContextMenu(options: {
  projectionType?: string
  canEdit?: boolean
  canExport?: boolean
  canDuplicate?: boolean
}): ContextMenuAction[] {
  const { projectionType, canEdit = true, canExport = true, canDuplicate = true } = options
  return [
    {
      id: CONTEXT_ACTIONS.CREATE,
      label: 'New Item',
      icon: 'lucide:plus',
      shortcut: '⌘N',
      visible: canEdit,
    },
    {
      id: 'refresh-view',
      label: 'Refresh',
      icon: 'lucide:refresh-cw',
      separator: true,
    },
    {
      id: 'configure-view',
      label: 'Configure View',
      icon: 'lucide:settings-2',
      visible: !!projectionType,
    },
    {
      id: CONTEXT_ACTIONS.DUPLICATE,
      label: 'Duplicate View',
      icon: 'lucide:copy',
      visible: canDuplicate,
    },
    {
      id: CONTEXT_ACTIONS.EXPORT,
      label: 'Export View',
      icon: 'lucide:download',
      separator: true,
      visible: canExport,
    },
  ]
}

/**
 * Composable that provides context menu utilities.
 */
export const useContextMenu = () => {
  /**
   * Copy a path as a full URL to clipboard.
   */
  const copyLink = async (path: string) => {
    if (!import.meta.client) return
    const url = `${window.location.origin}${path}`
    await navigator.clipboard.writeText(url)
  }

  return {
    resolveContextMenu,
    copyLink,
    // Presets
    sidebarItemMenu,
    sidebarSectionMenu,
    collectionItemMenu,
    customSectionMenu,
    sidebarSurfaceMenu,
    projectionContextMenu,
  }
}
