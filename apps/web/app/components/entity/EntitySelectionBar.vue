<script setup lang="ts">
  import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
  import { getPropertyFieldsForType } from '~/config/entityRegistry'
  import { resolveFieldEditorConfig } from '~/lib/fieldEditorConfig'

  interface Props {
    /** Currently selected entities */
    selectedItems: Entity[]
    /** Number of selected items */
    selectionCount: number
    /** Whether batch operations are in progress */
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    loading: false,
  })

  const emit = defineEmits<{
    'batch-delete': []
    'batch-duplicate': []
    'batch-set-field': [fieldId: PropertyFieldId, value: unknown]
    'clear-selection': []
  }>()

  // ── Batch field editing ────────────────────────────────────────────────────

  const batchFieldOpen = ref(false)
  const selectedFieldId = ref<PropertyFieldId | ''>('')
  const batchFieldValue = ref<unknown>('')

  /** Editable fields common to all selected items */
  const commonEditableFields = computed(() => {
    if (props.selectedItems.length === 0) return []

    const types = new Set(props.selectedItems.map(i => i.type).filter(Boolean))
    if (types.size === 0) return []

    // Get fields present on ALL selected types
    let commonFields: PropertyFieldId[] | null = null
    for (const type of types) {
      try {
        const fields = getPropertyFieldsForType(type as EntityType)
        const ids = fields
          .filter(f => f.editable && f.id !== 'type')
          .map(f => f.id)
        if (commonFields === null) {
          commonFields = ids
        } else {
          const set = new Set(ids)
          commonFields = commonFields.filter(id => set.has(id))
        }
      } catch {
        // Unknown type — skip
      }
    }

    return (commonFields ?? []).map(id => {
      const entityType = [...types][0] as EntityType
      const config = resolveFieldEditorConfig(id, entityType)
      return { id, label: id, editorType: config.editorType, config }
    }).filter(f => f.editorType !== 'readonly' && f.editorType !== 'tags')
  })

  const selectedFieldConfig = computed(() => {
    if (!selectedFieldId.value) return null
    return commonEditableFields.value.find(f => f.id === selectedFieldId.value) ?? null
  })

  const applyBatchField = () => {
    if (!selectedFieldId.value) return
    emit('batch-set-field', selectedFieldId.value as PropertyFieldId, batchFieldValue.value)
    batchFieldOpen.value = false
    selectedFieldId.value = ''
    batchFieldValue.value = ''
  }

  // ── Delete confirmation ────────────────────────────────────────────────────

  const deleteConfirmOpen = ref(false)

  const confirmDelete = () => {
    emit('batch-delete')
    deleteConfirmOpen.value = false
  }
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0">
    <div
      v-if="selectionCount > 0"
      class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-lg px-4 py-2.5"
      :class="{ 'opacity-60 pointer-events-none': loading }">

      <!-- Selection count + clear -->
      <div class="flex items-center gap-2 pr-3 border-r border-border">
        <div class="flex items-center justify-center h-6 min-w-6 rounded-md bg-primary text-primary-foreground text-xs font-semibold px-1.5">
          {{ selectionCount }}
        </div>
        <span class="text-sm text-foreground whitespace-nowrap">selected</span>
        <button
          type="button"
          class="ml-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Clear selection (Esc)"
          @click="emit('clear-selection')">
          <Icon name="lucide:x" class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Batch set field -->
      <UiPopover v-if="commonEditableFields.length > 0" v-model:open="batchFieldOpen">
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors">
            <Icon name="lucide:pen-line" class="h-3.5 w-3.5" />
            Set field
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="center" :side-offset="8" side="top" class="w-64 p-3 space-y-3">
          <p class="text-xs font-medium text-muted-foreground">
            Update field on {{ selectionCount }} item{{ selectionCount !== 1 ? 's' : '' }}
          </p>

          <!-- Field picker -->
          <select
            v-model="selectedFieldId"
            class="w-full h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary">
            <option value="">Choose field...</option>
            <option v-for="f in commonEditableFields" :key="f.id" :value="f.id">
              {{ f.label }}
            </option>
          </select>

          <!-- Value input (based on selected field type) -->
          <template v-if="selectedFieldConfig">
            <!-- Select field: show options -->
            <select
              v-if="selectedFieldConfig.editorType === 'select' && selectedFieldConfig.config.options"
              v-model="batchFieldValue"
              class="w-full h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary">
              <option value="">Choose value...</option>
              <option
                v-for="opt in selectedFieldConfig.config.options"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </option>
            </select>

            <!-- Toggle field -->
            <div v-else-if="selectedFieldConfig.editorType === 'toggle'" class="flex items-center gap-2">
              <UiCheckbox
                :checked="!!batchFieldValue"
                @update:checked="batchFieldValue = $event" />
              <span class="text-xs">{{ selectedFieldConfig.label }}</span>
            </div>

            <!-- Text/number/etc -->
            <input
              v-else
              v-model="batchFieldValue"
              :type="selectedFieldConfig.editorType === 'number' ? 'number' : 'text'"
              :placeholder="selectedFieldConfig.config.placeholder"
              class="w-full h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50" />
          </template>

          <UiButton
            size="sm"
            class="w-full h-7 text-xs"
            :disabled="!selectedFieldId || batchFieldValue === ''"
            @click="applyBatchField">
            Apply to {{ selectionCount }} item{{ selectionCount !== 1 ? 's' : '' }}
          </UiButton>
        </UiPopoverContent>
      </UiPopover>

      <!-- Duplicate -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
        @click="emit('batch-duplicate')">
        <Icon name="lucide:copy" class="h-3.5 w-3.5" />
        Duplicate
      </button>

      <!-- Delete -->
      <UiPopover v-model:open="deleteConfirmOpen">
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            Delete
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="center" :side-offset="8" side="top" class="w-56 p-3 space-y-3">
          <p class="text-sm font-medium">Delete {{ selectionCount }} item{{ selectionCount !== 1 ? 's' : '' }}?</p>
          <p class="text-xs text-muted-foreground">This action cannot be undone.</p>
          <div class="flex items-center gap-2">
            <UiButton
              variant="outline"
              size="sm"
              class="flex-1 h-7 text-xs"
              @click="deleteConfirmOpen = false">
              Cancel
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              class="flex-1 h-7 text-xs"
              @click="confirmDelete">
              Delete
            </UiButton>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>
  </Transition>
</template>
