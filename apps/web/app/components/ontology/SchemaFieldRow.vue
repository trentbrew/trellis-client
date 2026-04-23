<script lang="ts" setup>
  /**
   * SchemaFieldRow — single field row in the schema editor.
   *
   * Renders the field's name, type, required flag, description, and controls
   * inline. When expanded, hosts a `SchemaFieldDrawer` that exposes advanced
   * settings (icon, default value, select options, relation target, …).
   *
   * Emits `update`, `remove`, `move`, and `drag-start` / `drag-over` / `drop`
   * events; the parent owns the fields array.
   */
  import { ONTOLOGY_VALUE_TYPES, getValueTypeIcon } from '~/lib/ontology-value-types'
  import SchemaFieldDrawer from './SchemaFieldDrawer.vue'

  interface EditableField {
    name: string
    valueType: string
    required?: boolean
    description?: string
    selectOptions?: any[]
    relation?: {
      targetSchema?: string
      cardinality?: 'one' | 'many'
      syncedProperty?: string
    }
    defaultValue?: any
    icon?: string
  }

  const props = defineProps<{
    field: EditableField
    /** Zero-based position within the parent's fields array (for Move ↑/↓). */
    index: number
    /** Total number of fields (used to disable end-of-list move). */
    total: number
    /** When true, all inputs are disabled (system/core tier). */
    readonly?: boolean
    /** Forces the drawer open from the outside (e.g., when a new field is added). */
    defaultExpanded?: boolean
  }>()

  const emit = defineEmits<{
    update: [patch: Partial<EditableField>]
    remove: []
    move: [direction: -1 | 1]
    'drag-start': [index: number]
    'drag-over': [index: number]
    drop: [index: number]
    'drag-end': []
  }>()

  const isTitleField = computed(() => props.field.valueType === 'title')

  // ── Drawer state ────────────────────────────────────────────────────

  const expanded = ref(!!props.defaultExpanded)

  /** Whether this field type exposes any advanced settings worth showing. */
  const hasAdvanced = computed(() => {
    // All types get icon + default value; select/relation add more.
    return true
  })

  function toggleExpanded() {
    if (!hasAdvanced.value) return
    expanded.value = !expanded.value
  }

  // ── Input handlers ──────────────────────────────────────────────────

  function onNameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value
    emit('update', { name: value })
  }

  function onDescriptionInput(event: Event) {
    const value = (event.target as HTMLInputElement).value
    emit('update', { description: value })
  }

  function onValueTypeChange(value: string) {
    // Reset type-specific metadata if the shape changed incompatibly.
    const patch: Partial<EditableField> = { valueType: value }
    const current = props.field.valueType
    const nextIsSelect = value === 'select' || value === 'multi_select'
    const wasSelect = current === 'select' || current === 'multi_select'
    if (wasSelect && !nextIsSelect) patch.selectOptions = undefined
    const nextIsRelation = value === 'relation'
    const wasRelation = current === 'relation'
    if (wasRelation && !nextIsRelation) patch.relation = undefined
    patch.defaultValue = undefined
    emit('update', patch)
  }

  function onToggleRequired() {
    emit('update', { required: !props.field.required })
  }

  // ── Drag & drop ─────────────────────────────────────────────────────

  function onDragStart(event: DragEvent) {
    if (props.readonly) {
      event.preventDefault()
      return
    }
    // Firefox refuses to drag without dataTransfer payload.
    event.dataTransfer?.setData('text/plain', String(props.index))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    emit('drag-start', props.index)
  }

  function onDragOver(event: DragEvent) {
    if (props.readonly) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    emit('drag-over', props.index)
  }

  function onDrop(event: DragEvent) {
    if (props.readonly) return
    event.preventDefault()
    emit('drop', props.index)
  }

  function onDragEnd() {
    emit('drag-end')
  }
</script>

<template>
  <div
    class="group flex flex-col border-b border-border/60 last:border-b-0 transition-colors"
    :class="readonly ? 'opacity-70' : 'hover:bg-muted/10'"
    @dragover.prevent="onDragOver"
    @drop="onDrop">
    <div class="flex items-start gap-2 px-3 py-2.5">
      <!-- Drag handle / reorder controls -->
      <div class="flex flex-col items-center gap-0.5 pt-1 shrink-0 w-5">
        <button
          type="button"
          :draggable="!readonly"
          class="text-muted-foreground/40 hover:text-foreground disabled:opacity-30 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          :disabled="readonly"
          :title="readonly ? 'Read-only' : 'Drag to reorder'"
          @dragstart="onDragStart"
          @dragend="onDragEnd"
          @click.prevent>
          <Icon name="lucide:grip-vertical" class="h-3.5 w-3.5" />
        </button>
        <div class="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            class="text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
            :disabled="readonly || index === 0"
            title="Move up"
            @click="emit('move', -1)">
            <Icon name="lucide:chevron-up" class="h-3 w-3" />
          </button>
          <button
            type="button"
            class="text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
            :disabled="readonly || index === total - 1"
            title="Move down"
            @click="emit('move', 1)">
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
        </div>
      </div>

      <!-- Expand / collapse chevron -->
      <button
        type="button"
        class="flex h-7 w-5 shrink-0 items-center justify-center text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors"
        :disabled="!hasAdvanced"
        :title="expanded ? 'Collapse advanced settings' : 'Expand advanced settings'"
        @click="toggleExpanded">
        <Icon
          :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
          class="h-3.5 w-3.5" />
      </button>

      <!-- Type icon -->
      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted/30">
        <Icon
          :name="field.icon || getValueTypeIcon(field.valueType)"
          class="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <!-- Main field content -->
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <!-- Row 1: name + type picker + required + delete -->
        <div class="flex items-center gap-2">
          <input
            :value="field.name"
            type="text"
            placeholder="field_name"
            spellcheck="false"
            :disabled="readonly"
            class="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring/40 rounded px-1 -mx-1 disabled:cursor-not-allowed"
            @input="onNameInput" />

          <UiSelect
            :model-value="field.valueType"
            :disabled="readonly"
            @update:model-value="onValueTypeChange">
            <UiSelectTrigger class="w-[140px] h-7 text-xs">
              <UiSelectValue />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="vt in ONTOLOGY_VALUE_TYPES" :key="vt.value" :value="vt.value">
                <div class="flex items-center gap-2">
                  <Icon :name="vt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{{ vt.label }}</span>
                </div>
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>

          <button
            type="button"
            class="shrink-0 h-7 w-7 rounded flex items-center justify-center transition-colors"
            :class="field.required
              ? 'bg-amber-500/10 text-amber-500'
              : 'text-muted-foreground/40 hover:text-muted-foreground'"
            :title="field.required ? 'Required field' : 'Mark as required'"
            :disabled="readonly || isTitleField"
            @click="onToggleRequired">
            <Icon name="lucide:asterisk" class="h-3 w-3" />
          </button>

          <button
            type="button"
            class="shrink-0 h-7 w-7 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            :disabled="readonly || isTitleField"
            :title="isTitleField ? 'Title field cannot be removed' : 'Remove field'"
            @click="emit('remove')">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Row 2: description -->
        <input
          :value="field.description ?? ''"
          type="text"
          placeholder="Description (optional)"
          :disabled="readonly"
          class="w-full bg-transparent text-[11px] text-muted-foreground/80 outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-ring/30 rounded px-1 -mx-1 disabled:cursor-not-allowed"
          @input="onDescriptionInput" />
      </div>
    </div>

    <!-- Advanced drawer -->
    <SchemaFieldDrawer
      v-if="expanded"
      :field="field"
      :readonly="readonly"
      @update="(patch) => emit('update', patch)" />
  </div>
</template>
