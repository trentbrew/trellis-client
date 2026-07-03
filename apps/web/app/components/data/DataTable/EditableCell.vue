<script setup lang="ts">
  import type { DatabaseField } from '~/types/database'
  import type { EntityType } from '~/types/entity'
  import { useEntitySearch } from '~/composables/useEntitySearch'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  interface Props {
    value: any
    field: DatabaseField
    rowId: string
    isLoading?: boolean
    rowData?: Record<string, any>
  }

  interface Emits {
    (e: 'update', value: any): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // ── Formula evaluation ───────────────────────────────────────────────────
  const computedFormulaValue = computed(() => {
    if (props.field.type !== 'formula' || !props.field.formula) return null
    try {
      const { evaluateSingleFormula } = useCollectionFormulas('table')
      const result = evaluateSingleFormula(props.field.formula, props.rowData || {})
      if (result === null || result === undefined) return '-'
      switch (props.field.formulaReturnType) {
        case 'number':
          return typeof result === 'number' ? result.toLocaleString() : String(result)
        case 'boolean':
          return result ? '✓' : '✗'
        case 'date':
          return result instanceof Date ? result.toLocaleDateString() : String(result)
        default:
          return String(result)
      }
    } catch (error) {
      console.error('Formula evaluation error:', error)
      return '⚠️ Error'
    }
  })

  // ── Inline editing state (text-like fields only) ─────────────────────────
  const localValue = ref(props.value)
  const inputRef = ref<HTMLElement | null>(null)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  watch(
    () => props.value,
    (v) => { localValue.value = v },
  )

  // ── Relation picker ──────────────────────────────────────────────────────
  const relationEntityType = computed(() => {
    const configured = props.field.config?.entityType
    return configured && configured !== 'any' ? configured : undefined
  })
  const relationFilterType = computed(() => relationEntityType.value)
  const entitySearch = useEntitySearch({ filterType: relationFilterType })
  const relationPickerOpen = ref(false)

  const relationLabel = computed(() => {
    const t = relationEntityType.value
    if (!t) return 'Link entity'
    try {
      return `Link ${getEntityTypeConfig(t as EntityType).label.toLowerCase()}`
    } catch {
      return 'Link entity'
    }
  })

  const selectedRelationIds = computed(() => {
    const val = localValue.value
    if (!val) return new Set<string>()
    const arr = Array.isArray(val) ? val : [val]
    return new Set(
      arr.map((v: any) => {
        if (typeof v === 'string') return v
        if (typeof v === 'object') return v?.entityId || v?.['@id'] || v?.id
        return String(v)
      }).filter(Boolean),
    )
  })

  const toggleEntityRelation = (entityId: string, entityType: string, title: string) => {
    const current = Array.isArray(localValue.value) ? [...localValue.value] : localValue.value ? [localValue.value] : []
    const idx = current.findIndex((v: any) => {
      const vid = typeof v === 'object' ? (v?.entityId || v?.id) : String(v)
      return vid === entityId
    })
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push({ entityId, entityType, title, kind: 'entity' })
    }
    localValue.value = current.length === 0 ? null : current
    emit('update', localValue.value)
  }

  const removeRelation = (refVal: any) => {
    const targetId = typeof refVal === 'object' ? (refVal?.entityId || refVal?.['@id'] || refVal?.id) : String(refVal)
    const current = Array.isArray(localValue.value) ? [...localValue.value] : localValue.value ? [localValue.value] : []
    const filtered = current.filter((v: any) => {
      const vid = typeof v === 'object' ? (v?.entityId || v?.['@id'] || v?.id) : String(v)
      return vid !== targetId
    })
    localValue.value = filtered.length === 0 ? null : filtered
    emit('update', localValue.value)
  }

  const getRelationLabel = (refVal: any): string => {
    if (typeof refVal === 'object' && refVal?.title) return refVal.title
    const id = typeof refVal === 'object' ? (refVal?.entityId || refVal?.['@id'] || refVal?.id) : String(refVal)
    const match = entitySearch.items.value?.find((i: any) => i.id === id)
    if (match) return (match as any).title || id
    return typeof refVal === 'string' ? refVal.split('/').pop() || refVal : String(refVal)
  }

  const getRelationType = (refVal: any): string => {
    if (typeof refVal === 'object' && refVal?.entityType) return refVal.entityType
    const id = typeof refVal === 'object' ? (refVal?.entityId || refVal?.['@id'] || refVal?.id) : String(refVal)
    const match = entitySearch.items.value?.find((i: any) => i.id === id)
    if (match) return (match as any).type || ''
    return ''
  }

  // ── Select / Multiselect popover ─────────────────────────────────────────
  const selectPickerOpen = ref(false)
  const multiselectPickerOpen = ref(false)

  const selectOption = (optValue: string) => {
    localValue.value = optValue
    emit('update', optValue)
    selectPickerOpen.value = false
  }

  const currentSelectOption = computed(() => {
    if (!props.field.options) return null
    return props.field.options.find((o) => o.value === props.value)
  })

  const toggleMultiselectOption = (optValue: string) => {
    const arr = Array.isArray(localValue.value) ? [...localValue.value] : []
    const idx = arr.indexOf(optValue)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(optValue)
    localValue.value = arr
    emit('update', arr)
  }

  const removeMultiselectChip = (optValue: string) => {
    const arr = Array.isArray(localValue.value) ? localValue.value.filter((v: string) => v !== optValue) : []
    localValue.value = arr
    emit('update', arr)
  }

  const multiselectValues = computed(() => {
    return Array.isArray(props.value) ? props.value : []
  })

  const getOptionColor = (optValue: string): string => {
    const opt = props.field.options?.find((o) => o.value === optValue)
    return opt?.color || 'gray'
  }

  // Map color name → Tailwind classes for chips
  const colorClasses = (color: string) => {
    const map: Record<string, string> = {
      red: 'bg-red-500/10 text-red-700 dark:text-red-400',
      orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      yellow: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      lime: 'bg-lime-500/10 text-lime-700 dark:text-lime-400',
      green: 'bg-green-500/10 text-green-700 dark:text-green-400',
      emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      teal: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
      cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
      sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
      blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
      purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      fuchsia: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
      pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
      rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
      gray: 'bg-muted text-muted-foreground',
    }
    return map[color] || map.gray
  }

  const dotColor = (color: string) => {
    const map: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      amber: 'bg-amber-500',
      yellow: 'bg-yellow-500',
      lime: 'bg-lime-500',
      green: 'bg-green-500',
      emerald: 'bg-emerald-500',
      teal: 'bg-teal-500',
      cyan: 'bg-cyan-500',
      sky: 'bg-sky-500',
      blue: 'bg-blue-500',
      indigo: 'bg-indigo-500',
      violet: 'bg-violet-500',
      purple: 'bg-purple-500',
      fuchsia: 'bg-fuchsia-500',
      pink: 'bg-pink-500',
      rose: 'bg-rose-500',
      gray: 'bg-muted-foreground',
    }
    return map[color] || map.gray
  }

  // ── Date popover ─────────────────────────────────────────────────────────
  const datePickerOpen = ref(false)

  const dateDisplay = computed(() => {
    if (!props.value) return null
    try {
      return new Date(props.value).toLocaleDateString()
    } catch {
      return String(props.value)
    }
  })

  const dateModelValue = computed({
    get: () => {
      if (!localValue.value) return null
      try {
        return new Date(localValue.value)
      } catch {
        return null
      }
    },
    set: (v: Date | null) => {
      if (!v) return
      const ts = v.getTime()
      localValue.value = ts
      emit('update', ts)
      datePickerOpen.value = false
    },
  })

  // ── Text-like field helpers ──────────────────────────────────────────────
  const validateValue = (value: any): string | null => {
    if (props.field.required && (value === null || value === undefined || value === '')) {
      return 'This field is required'
    }
    switch (props.field.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format'
        break
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) return 'Invalid URL (must start with http:// or https://)'
        break
      case 'number':
        if (value && isNaN(Number(value))) return 'Must be a valid number'
        break
    }
    return null
  }

  const saveValue = async () => {
    const validationError = validateValue(localValue.value)
    if (validationError) {
      error.value = validationError
      return
    }
    let processedValue = localValue.value
    if (props.field.type === 'number' && processedValue !== '') processedValue = Number(processedValue)
    isSaving.value = true
    try {
      emit('update', processedValue)
      error.value = null
    } catch {
      error.value = 'Failed to save'
    } finally {
      isSaving.value = false
    }
  }

  const cancelEditing = () => {
    localValue.value = props.value
    error.value = null
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveValue()
      ;(e.target as HTMLElement)?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
      ;(e.target as HTMLElement)?.blur()
    }
  }

  const toggleCheckbox = () => {
    emit('update', !props.value)
  }
</script>

<template>
  <div class="relative group" :class="{ 'opacity-50': isLoading }">

    <!-- ── Formula (read-only) ──────────────────────────────────────────── -->
    <div v-if="field.type === 'formula'" class="flex items-center gap-2 min-h-8 px-1">
      <Icon name="lucide:zap" class="h-3 w-3 text-amber-500 shrink-0" />
      <span class="truncate italic text-muted-foreground text-sm">
        {{ computedFormulaValue ?? '-' }}
      </span>
    </div>

    <!-- ── Checkbox (always inline) ─────────────────────────────────────── -->
    <div v-else-if="field.type === 'checkbox'" class="flex items-center min-h-8 px-1">
      <UiCheckbox :checked="value" :disabled="isLoading" @update:checked="toggleCheckbox" />
    </div>

    <!-- ── Select (popover pill) ────────────────────────────────────────── -->
    <div v-else-if="field.type === 'select'" class="flex items-center min-h-8 px-1">
      <UiPopover v-model:open="selectPickerOpen">
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            :class="currentSelectOption ? colorClasses(currentSelectOption.color) : 'bg-muted/50 text-muted-foreground hover:bg-muted'">
            <span
              v-if="currentSelectOption"
              class="h-2 w-2 rounded-full shrink-0"
              :class="dotColor(currentSelectOption.color)" />
            {{ currentSelectOption?.value || 'Select...' }}
            <Icon name="lucide:chevron-down" class="h-3 w-3 shrink-0 opacity-50" />
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" :side-offset="4" class="w-44 p-1">
          <button
            v-for="opt in field.options"
            :key="opt.value"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            @click="selectOption(opt.value)">
            <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="dotColor(opt.color)" />
            <span class="flex-1">{{ opt.value }}</span>
            <Icon v-if="value === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
          <button
            v-if="value"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors text-left border-t border-border mt-1 pt-1"
            @click="selectOption('')">
            <Icon name="lucide:x" class="h-3 w-3" />
            <span>Clear</span>
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- ── Multiselect (chip row + popover) ─────────────────────────────── -->
    <div v-else-if="field.type === 'multiselect'" class="flex items-center gap-1 flex-wrap min-h-8 px-1 py-0.5">
      <span
        v-for="mv in multiselectValues"
        :key="mv"
        class="inline-flex items-center gap-1 rounded-md pl-1.5 pr-0.5 py-0.5 text-[11px] font-medium"
        :class="colorClasses(getOptionColor(mv))">
        <span class="h-1.5 w-1.5 rounded-full shrink-0" :class="dotColor(getOptionColor(mv))" />
        <span class="truncate max-w-[80px]">{{ mv }}</span>
        <button
          type="button"
          class="ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          @click.stop="removeMultiselectChip(mv)">
          <Icon name="lucide:x" class="h-2.5 w-2.5" />
        </button>
      </span>
      <UiPopover v-model:open="multiselectPickerOpen">
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            @click.stop>
            <Icon name="lucide:plus" class="h-3 w-3" />
            <span v-if="multiselectValues.length === 0">Select...</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" :side-offset="4" class="w-44 p-1">
          <button
            v-for="opt in field.options"
            :key="opt.value"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            @click.stop="toggleMultiselectOption(opt.value)">
            <div
              class="h-4 w-4 shrink-0 rounded border flex items-center justify-center"
              :class="multiselectValues.includes(opt.value) ? 'bg-primary border-primary' : 'border-border'">
              <Icon v-if="multiselectValues.includes(opt.value)" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
            </div>
            <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="dotColor(opt.color)" />
            <span class="flex-1">{{ opt.value }}</span>
          </button>
          <div v-if="!field.options?.length" class="px-2 py-3 text-center text-xs text-muted-foreground">
            No options defined
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- ── Date (popover picker) ────────────────────────────────────────── -->
    <div v-else-if="field.type === 'date'" class="flex items-center min-h-8 px-1">
      <UiPopover v-model:open="datePickerOpen">
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
            :class="dateDisplay ? 'bg-muted/50 hover:bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'">
            <Icon name="lucide:calendar" class="h-3 w-3 shrink-0" />
            {{ dateDisplay || 'Pick date...' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" :side-offset="4" class="w-auto border-border bg-popover p-0">
          <UiDatepicker v-model="dateModelValue" embedded color="primary" class="p-2" />
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- ── Relation (scoped entity picker) ──────────────────────────────── -->
    <div v-else-if="field.type === 'relation'" class="flex items-center gap-1 flex-wrap min-h-8 px-1 py-0.5">
      <span
        v-for="(refVal, idx) in (Array.isArray(value) ? value : value ? [value] : [])"
        :key="idx"
        class="inline-flex items-center gap-1 rounded-md pl-1.5 pr-0.5 py-0.5 text-[11px] font-medium max-w-[140px]"
        :class="entitySearch.getColor(getRelationType(refVal))">
        <Icon :name="entitySearch.getIcon(getRelationType(refVal))" class="h-2.5 w-2.5 shrink-0" />
        <span class="truncate">{{ getRelationLabel(refVal) }}</span>
        <button
          type="button"
          class="ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          @click.stop="removeRelation(refVal)">
          <Icon name="lucide:x" class="h-2.5 w-2.5" />
        </button>
      </span>
      <UiPopover v-model:open="relationPickerOpen">
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            @click.stop>
            <Icon name="lucide:plus" class="h-3 w-3" />
            <span v-if="!value || (Array.isArray(value) && !value.length)">{{ relationLabel }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" :side-offset="4" class="w-72 p-0">
          <div class="p-2 border-b border-border">
            <div class="relative">
              <Icon name="lucide:search" class="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                v-model="entitySearch.search.value"
                type="text"
                :placeholder="`Search ${relationEntityType ? entitySearch.getLabel(relationEntityType) + 's' : 'entities'}...`"
                class="w-full h-7 rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                @click.stop />
            </div>
          </div>
          <div class="max-h-56 overflow-y-auto p-1">
            <button
              v-for="entity in entitySearch.filteredItems.value"
              :key="entity.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              @click.stop="toggleEntityRelation(entity.id, entity.type, entity.title || 'Untitled')">
              <div
                class="h-4 w-4 shrink-0 rounded border flex items-center justify-center"
                :class="selectedRelationIds.has(entity.id) ? 'bg-primary border-primary' : 'border-border'">
                <Icon v-if="selectedRelationIds.has(entity.id)" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
              </div>
              <div
                class="h-5 w-5 shrink-0 rounded flex items-center justify-center"
                :class="entitySearch.getColor(entity.type)">
                <Icon :name="entitySearch.getIcon(entity.type)" class="h-3 w-3" />
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <span class="truncate">{{ entity.title || 'Untitled' }}</span>
                <span v-if="!relationEntityType" class="text-[10px] text-muted-foreground capitalize">{{ entitySearch.getLabel(entity.type) }}</span>
              </div>
            </button>
            <div v-if="entitySearch.filteredItems.value.length === 0" class="px-2 py-3 text-center text-xs text-muted-foreground">
              No {{ relationEntityType ? entitySearch.getLabel(relationEntityType) + 's' : 'entities' }} found
            </div>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- ── File (placeholder) ───────────────────────────────────────────── -->
    <div v-else-if="field.type === 'file'" class="flex items-center min-h-8 px-1">
      <span class="text-xs text-muted-foreground italic">File upload coming soon...</span>
    </div>

    <!-- ── Text-like inputs (text, number, email, url) ──────────────────── -->
    <div v-else class="relative min-h-8 flex items-center">
      <input
        ref="inputRef"
        v-model="localValue"
        :type="field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'"
        class="w-full h-8 bg-transparent px-2 text-sm outline-none border border-transparent rounded transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary hover:bg-accent/30"
        :class="{ 'border-destructive!': error }"
        :placeholder="field.type === 'email' ? 'email@example.com' : field.type === 'url' ? 'https://...' : '—'"
        @blur="saveValue"
        @keydown="handleKeydown"
      />
    </div>

    <!-- Saving Indicator -->
    <div v-if="isSaving" class="absolute right-1 top-1/2 -translate-y-1/2">
      <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="absolute left-0 top-full mt-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded whitespace-nowrap z-10">
      {{ error }}
    </div>
  </div>
</template>
