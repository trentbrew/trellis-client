import type { Ref, ComputedRef } from 'vue'

export type DetailDialogMode = 'view' | 'edit' | 'create'

export type FieldVariant =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'badge'
  | 'readonly'

export interface FieldOption {
  value: string
  label: string
  icon?: string
  color?: string
}

export interface DetailField<T = any> {
  key: keyof T | string
  label: string
  variant: FieldVariant
  placeholder?: string
  required?: boolean
  options?: FieldOption[]
  icon?: string
  colSpan?: 1 | 2
  description?: string
  readOnly?: boolean
  renderValue?: (value: any, item: T) => string
  badgeColor?: (value: any) => string
  hideInCreate?: boolean
  hideInView?: boolean
  hideInEdit?: boolean
}

export interface DetailSchema<T = any> {
  title: string | ((item: T | null, mode: DetailDialogMode) => string)
  description?: string | ((item: T | null, mode: DetailDialogMode) => string)
  icon?: string
  fields: DetailField<T>[]
  onSave?: (item: T, mode: DetailDialogMode) => Promise<void> | void
  onDelete?: (item: T) => Promise<void> | void
}

export interface DetailDialogState<T> {
  isOpen: Ref<boolean>
  mode: Ref<DetailDialogMode>
  currentItem: Ref<T | null>
  formData: Ref<Partial<T>>
  isLoading: Ref<boolean>
  schema: DetailSchema<T>
  resolvedTitle: ComputedRef<string>
  resolvedDescription: ComputedRef<string>
  visibleFields: ComputedRef<DetailField<T>[]>
  open: (item?: T | null, mode?: DetailDialogMode) => void
  close: () => void
  setMode: (mode: DetailDialogMode) => void
  save: () => Promise<void>
  deleteItem: () => Promise<void>
  updateField: (key: keyof T | string, value: any) => void
}

export function useDetailDialog<T extends Record<string, any>>(
  schema: DetailSchema<T>,
  options?: {
    defaultMode?: DetailDialogMode
    onOpen?: (item: T | null, mode: DetailDialogMode) => void
    onClose?: () => void
  },
): DetailDialogState<T> {
  const isOpen = ref(false)
  const mode = ref<DetailDialogMode>(options?.defaultMode || 'view')
  const currentItem = ref<T | null>(null) as Ref<T | null>
  const formData = ref<Partial<T>>({}) as Ref<Partial<T>>
  const isLoading = ref(false)

  const resolvedTitle = computed(() => {
    if (typeof schema.title === 'function') {
      return schema.title(currentItem.value, mode.value)
    }
    if (mode.value === 'create') return `New ${schema.title}`
    if (mode.value === 'edit') return `Edit ${schema.title}`
    return schema.title
  })

  const resolvedDescription = computed(() => {
    if (!schema.description) return ''
    if (typeof schema.description === 'function') {
      return schema.description(currentItem.value, mode.value)
    }
    return schema.description
  })

  const visibleFields = computed(() => {
    return schema.fields.filter((field) => {
      if (mode.value === 'create' && field.hideInCreate) return false
      if (mode.value === 'view' && field.hideInView) return false
      if (mode.value === 'edit' && field.hideInEdit) return false
      return true
    })
  })

  function open(item?: T | null, openMode?: DetailDialogMode) {
    currentItem.value = item || null
    mode.value = openMode || (item ? 'view' : 'create')

    // Initialize form data
    if (item) {
      formData.value = { ...item }
    } else {
      // Initialize with empty values based on schema fields
      const initialData: Partial<T> = {}
      schema.fields.forEach((field) => {
        const key = field.key as keyof T
        if (field.variant === 'checkbox') {
          ;(initialData as any)[key] = false
        } else if (field.variant === 'multiselect') {
          ;(initialData as any)[key] = []
        } else {
          ;(initialData as any)[key] = ''
        }
      })
      formData.value = initialData
    }

    isOpen.value = true
    options?.onOpen?.(item || null, mode.value)
  }

  function close() {
    isOpen.value = false
    options?.onClose?.()
  }

  function setMode(newMode: DetailDialogMode) {
    mode.value = newMode
    if (newMode === 'edit' && currentItem.value) {
      formData.value = { ...currentItem.value }
    }
  }

  async function save() {
    if (!schema.onSave) return

    isLoading.value = true
    try {
      const dataToSave =
        mode.value === 'create' ? (formData.value as T) : ({ ...currentItem.value, ...formData.value } as T)

      await schema.onSave(dataToSave, mode.value)
      close()
    } finally {
      isLoading.value = false
    }
  }

  async function deleteItem() {
    if (!schema.onDelete || !currentItem.value) return

    isLoading.value = true
    try {
      await schema.onDelete(currentItem.value)
      close()
    } finally {
      isLoading.value = false
    }
  }

  function updateField(key: keyof T | string, value: any) {
    ;(formData.value as any)[key] = value
  }

  return {
    isOpen,
    mode,
    currentItem,
    formData,
    isLoading,
    schema,
    resolvedTitle,
    resolvedDescription,
    visibleFields,
    open,
    close,
    setMode,
    save,
    deleteItem,
    updateField,
  }
}
