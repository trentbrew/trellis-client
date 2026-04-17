import type { DetailDialogMode } from './useDetailDialog'

/**
 * Display variant for the detail sheet (sheet, dialog, or fullscreen)
 */
export type DetailSheetVariant = 'sheet' | 'dialog' | 'fullscreen'

/**
 * Entity type variants that may have bespoke detail views
 */
export type EntityDetailVariant =
  | 'task'
  | 'event'
  | 'email'
  | 'payment'
  | 'deadline'
  | 'reminder'
  | 'permit'
  | 'folder'
  | 'document'
  | 'default'

export interface EntityNode {
  '@id'?: string
  '@type'?: string | string[]
  id?: string
  type?: string
  [key: string]: any
}

export interface GlobalDetailSheetState {
  isOpen: boolean
  mode: DetailDialogMode
  variant: DetailSheetVariant
  entityType: EntityDetailVariant
  currentNode: EntityNode | null
  formData: Record<string, any>
  isLoading: boolean
  canEdit: boolean
}

interface GlobalDetailSheetActions {
  open: (node: EntityNode, options?: OpenOptions) => void
  close: () => void
  setMode: (mode: DetailDialogMode) => void
  setVariant: (variant: DetailSheetVariant) => void
  save: () => Promise<void>
  deleteNode: () => Promise<void>
  updateField: (key: string, value: any) => void
}

interface OpenOptions {
  mode?: DetailDialogMode
  variant?: DetailSheetVariant
  entityType?: EntityDetailVariant
  canEdit?: boolean
}

// Global state using useState for SSR compatibility
const useGlobalDetailSheetState = () => {
  return useState<GlobalDetailSheetState>('global-detail-sheet', () => ({
    isOpen: false,
    mode: 'view',
    variant: 'dialog',
    entityType: 'default',
    currentNode: null,
    formData: {},
    isLoading: false,
    canEdit: true,
  }))
}

/**
 * Global detail sheet composable for opening entity details from anywhere
 *
 * Usage:
 * ```ts
 * const { open, close, state } = useGlobalDetailSheet()
 *
 * // Open a node in view mode
 * open(node)
 *
 * // Open in edit mode
 * open(node, { mode: 'edit' })
 *
 * // Open with specific entity type
 * open(node, { entityType: 'task' })
 * ```
 */
export function useGlobalDetailSheet(): GlobalDetailSheetState & GlobalDetailSheetActions {
  const state = useGlobalDetailSheetState()

  /**
   * Resolve entity type from node's @type or type field
   */
  function resolveEntityType(node: EntityNode): EntityDetailVariant {
    const typeValue = node['@type'] || node.type
    const typeStr = Array.isArray(typeValue) ? typeValue[0] : typeValue

    if (!typeStr) return 'default'

    // Normalize type string (remove prefixes like 'type:', 'schema:', etc.)
    const normalized = typeStr.split(':').pop()?.toLowerCase() || ''

    const typeMap: Record<string, EntityDetailVariant> = {
      task: 'task',
      event: 'event',
      email: 'email',
      payment: 'payment',
      deadline: 'deadline',
      reminder: 'reminder',
      permit: 'permit',
      folder: 'folder',
      document: 'document',
      file: 'document',
    }

    return typeMap[normalized] || 'default'
  }

  /**
   * Open the detail sheet with a node
   */
  function open(node: EntityNode, options: OpenOptions = {}) {
    const entityType = options.entityType || resolveEntityType(node)
    const mode = options.mode || 'view'
    const variant = options.variant || state.value.variant || 'dialog'
    const canEdit = options.canEdit ?? true

    state.value = {
      isOpen: true,
      mode,
      variant,
      entityType,
      currentNode: node,
      formData: { ...node },
      isLoading: false,
      canEdit,
    }
  }

  /**
   * Close the detail sheet
   */
  function close() {
    state.value = {
      ...state.value,
      isOpen: false,
    }
  }

  /**
   * Change the mode (view/edit/create)
   */
  function setMode(mode: DetailDialogMode) {
    state.value = {
      ...state.value,
      mode,
      formData: mode === 'edit' && state.value.currentNode ? { ...state.value.currentNode } : state.value.formData,
    }
  }

  /**
   * Change the display variant (sheet/dialog/fullscreen)
   */
  function setVariant(variant: DetailSheetVariant) {
    state.value = {
      ...state.value,
      variant,
    }
  }

  /**
   * Save the current form data
   * Note: Actual save logic should be provided by the consuming component
   */
  async function save() {
    state.value = { ...state.value, isLoading: true }

    try {
      // Emit event for consumers to handle save
      // The actual save implementation depends on the entity type and data source
      const event = new CustomEvent('global-detail-sheet:save', {
        detail: {
          node: state.value.currentNode,
          formData: state.value.formData,
          entityType: state.value.entityType,
          mode: state.value.mode,
        },
      })
      window.dispatchEvent(event)
    } finally {
      state.value = { ...state.value, isLoading: false }
    }
  }

  /**
   * Delete the current node
   */
  async function deleteNode() {
    state.value = { ...state.value, isLoading: true }

    try {
      const event = new CustomEvent('global-detail-sheet:delete', {
        detail: {
          node: state.value.currentNode,
          entityType: state.value.entityType,
        },
      })
      window.dispatchEvent(event)
    } finally {
      state.value = { ...state.value, isLoading: false }
    }
  }

  /**
   * Update a field in the form data
   */
  function updateField(key: string, value: any) {
    state.value = {
      ...state.value,
      formData: {
        ...state.value.formData,
        [key]: value,
      },
    }
  }

  return {
    // State (reactive)
    get isOpen() {
      return state.value.isOpen
    },
    get mode() {
      return state.value.mode
    },
    get entityType() {
      return state.value.entityType
    },
    get currentNode() {
      return state.value.currentNode
    },
    get formData() {
      return state.value.formData
    },
    get isLoading() {
      return state.value.isLoading
    },
    get canEdit() {
      return state.value.canEdit
    },
    get variant() {
      return state.value.variant
    },

    // Actions
    open,
    close,
    setMode,
    setVariant,
    save,
    deleteNode,
    updateField,
  }
}

/**
 * Reactive version that returns refs for template binding
 */
export function useGlobalDetailSheetRefs() {
  const state = useGlobalDetailSheetState()
  const actions = useGlobalDetailSheet()

  return {
    state,
    ...actions,
  }
}
