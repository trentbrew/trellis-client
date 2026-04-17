<script lang="ts" setup>
  /**
   * DynamicEntityDialog — Schema-driven create/edit dialog for custom ontology entities.
   *
   * Renders fields dynamically from DynamicEntityTypeConfig.fields.
   * Uses EntityDialogShell for consistent dialog chrome.
   * Features: auto-save, select/multi_select dropdowns with schema options,
   * references sidebar, comments/activity, mention sync, required indicators.
   */

  import type { Entity, EntityReference } from '~/types/entity'
  import { createSmartDefaultItem } from '~/utils/dynamicDefaults'
  import type { DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import { useComments } from '~/composables/useComments'

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: Entity | null
      typeConfig: DynamicEntityTypeConfig
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
    }>(),
    {
      mode: 'edit',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [item: Entity]
    delete: [item: Entity]
    navigatePrev: []
    navigateNext: []
  }>()

  const mode = computed(() => props.mode)
  const isViewMode = computed(() => mode.value === 'view')
  const isCreateMode = computed(() => mode.value === 'create')
  const isEditMode = computed(() => mode.value === 'edit')

  // ── Editable item ──────────────────────────────────────────────────

  const editableItem: any = reactive(createSmartDefaultItem(props.typeConfig.type, props.typeConfig.fields))

  // Track loaded entity ID to prevent subscription clobbering
  const _loadedItemId = ref<string | null>(null)

  watch(
    () => props.item?.id,
    (newId) => {
      if (newId && newId !== _loadedItemId.value) {
        const newItem = props.item!
        const defaults = createSmartDefaultItem(props.typeConfig.type, props.typeConfig.fields)
        Object.assign(editableItem, { ...defaults, ...newItem })
        editableItem.type = props.typeConfig.type
        _loadedItemId.value = newId
      } else if (!newId && isCreateMode.value) {
        const defaults = createSmartDefaultItem(props.typeConfig.type, props.typeConfig.fields)
        Object.assign(editableItem, { ...defaults })
        editableItem.type = props.typeConfig.type
        _loadedItemId.value = null
      }
    },
    { immediate: true },
  )

  // Reset on create mode open
  watch(
    () => props.open,
    (open) => {
      if (open && isCreateMode.value && !props.item) {
        const defaults = createSmartDefaultItem(props.typeConfig.type, props.typeConfig.fields)
        Object.assign(editableItem, defaults)
        editableItem.type = props.typeConfig.type
        _loadedItemId.value = null
      }
    },
  )

  // ── Auto-save in edit mode ──────────────────────────────────────────

  // ── AI summary ──────────────────────────────────────────────────────
  const {
    ensure: _ensureSummary,
    regenerate: _regenerateSummary,
    isGenerating: _isSummaryGenerating,
  } = useEntitySummary()

  watch(
    () => [editableItem.id, editableItem.description] as const,
    () => {
      if (isCreateMode.value) return
      if (!editableItem.id || !editableItem.description) return
      void _ensureSummary(editableItem)
    },
    { immediate: true },
  )

  const entitySummary = computed(() => (editableItem.summary || '').trim())
  const isGeneratingSummary = computed(() => !!editableItem.id && _isSummaryGenerating(editableItem.id))
  function regenerateSummary() {
    if (!editableItem.id) return
    void _regenerateSummary(editableItem)
  }

  const { status: saveStatus, formatLastSaved } = useAutoSave(editableItem, {
    enabled: isEditMode,
    beforeSave: (item) => {
      item.type = props.typeConfig.type
    },
  })

  // ── Comments ────────────────────────────────────────────────────────

  const currentEntityId = computed(() => editableItem.id || undefined)
  const { displayActivity, addComment: persistComment, loading: commentsLoading } = useComments(currentEntityId)

  const newComment = ref('')
  const handleAddComment = async () => {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }

  // ── Ontology field management (user-tier only) ─────────────────────

  const { removeFieldFromType } = useOntologyRegistry()

  // ── Mention/image link sync ─────────────────────────────────────────

  useMentionLinks(editableItem)
  useImageLinks(editableItem)

  // ── Entity references ───────────────────────────────────────────────

  const {
    addEntityRef,
    removeRef: removeEntityRef,
    openEntityRef: handleOpenEntityRef,
    createAndOpenEntityRef,
    createEntityAndLink,
  } = useEntityReferences(editableItem)
  const handleAddEntityRef = (ref: EntityReference) => addEntityRef(ref)
  const handleCreatedEntityRef = (ref: EntityReference) => createAndOpenEntityRef(ref)
  const handleCreateEntityOfType = (type: string, title: string) => {
    void createEntityAndLink(type, title)
  }
  const handleRemoveRef = (refId: string) => removeEntityRef(refId)

  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  // ── Sidebar state ───────────────────────────────────────────────────

  const rightSidebarTab = ref<'references' | 'activity'>('references')
  const rightSidebarW = ref(360)
  const rightSidebarCollapsed = ref(false)
  const isResizingSidebar = ref(false)

  const toggleSidebar = () => {
    rightSidebarCollapsed.value = !rightSidebarCollapsed.value
  }

  const startSidebarResize = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizingSidebar.value = true
    const startX = e.clientX
    const startW = rightSidebarW.value
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      rightSidebarW.value = Math.max(200, Math.min(480, startW - dx))
    }
    const onUp = () => {
      isResizingSidebar.value = false
      document.body.style.cursor = ''
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  // ── Schema field parsing ────────────────────────────────────────────

  interface SchemaFieldSource {
    name: string
    valueType: string
    required: boolean
    description: string
    selectOptions: { name: string; color?: string }[]
    relation?: {
      targetSchema?: string
      cardinality?: 'one' | 'many'
    }
  }

  const VALUE_TYPE_ICONS: Record<string, string> = {
    title: 'lucide:type',
    text: 'lucide:type',
    rich_text: 'lucide:align-left',
    number: 'lucide:hash',
    select: 'lucide:chevrons-up-down',
    multi_select: 'lucide:list-checks',
    status: 'lucide:circle-dot',
    date: 'lucide:calendar',
    checkbox: 'lucide:check-square',
    url: 'lucide:link',
    email: 'lucide:mail',
    phone_number: 'lucide:phone',
    people: 'lucide:users',
    files: 'lucide:paperclip',
    relation: 'lucide:git-branch',
  }

  /** Full schema field metadata (preserving selectOptions) */
  const schemaFields = computed<SchemaFieldSource[]>(() => {
    if (!props.typeConfig?.fields) return []
    return props.typeConfig.fields
      .filter((f) => f.valueType !== 'title')
      .map((f) => ({
        name: f.name,
        valueType: f.valueType,
        required: f.required || false,
        description: f.description || '',
        selectOptions: (f.selectOptions as { name: string; color?: string }[]) || [],
        relation: f.relation
          ? { targetSchema: f.relation.targetSchema, cardinality: f.relation.cardinality }
          : undefined,
      }))
  })

  /** Quick lookup: field name → schema source */
  const _fieldMap = computed(() => {
    const m = new Map<string, SchemaFieldSource>()
    for (const f of schemaFields.value) m.set(f.name, f)
    return m
  })

  function getFieldIcon(valueType: string): string {
    return VALUE_TYPE_ICONS[valueType] || 'lucide:circle'
  }

  // User-tier: allow inline field CRUD. system/core tiers are always explicitly set.
  // Treat null/undefined tier as 'user' (dynamic ontologies without explicit tier).
  const isUserTier = computed(() => !props.typeConfig?.tier || props.typeConfig.tier === 'user')

  // Split into property fields (inline row) and content fields (main area)
  const PROPERTY_VALUE_TYPES = new Set(['select', 'multi_select', 'status', 'date', 'checkbox', 'people', 'number'])

  const propertyFields = computed(() => schemaFields.value.filter((f) => PROPERTY_VALUE_TYPES.has(f.valueType)))

  const bodyFields = computed(() => schemaFields.value.filter((f) => !PROPERTY_VALUE_TYPES.has(f.valueType)))

  // ── Popover state per property field (keyed by field name) ──────────

  const popoverState = reactive<Record<string, boolean>>({})

  function isPopoverOpen(name: string): boolean {
    return popoverState[name] ?? false
  }

  function setPopoverOpen(name: string, val: boolean) {
    popoverState[name] = val
  }

  // ── Multi-select helpers ────────────────────────────────────────────

  function toggleMultiSelectValue(fieldName: string, optionName: string) {
    const current: string[] = Array.isArray(editableItem[fieldName]) ? editableItem[fieldName] : []
    const idx = current.indexOf(optionName)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(optionName)
    }
    editableItem[fieldName] = [...current]
  }

  function isMultiSelectSelected(fieldName: string, optionName: string): boolean {
    const current = editableItem[fieldName]
    return Array.isArray(current) && current.includes(optionName)
  }

  // ── Relation field helpers ─────────────────────────────────────────

  function openRelationPicker(field: SchemaFieldSource) {
    const targetSchema = field.relation?.targetSchema
    entityPickerFilterType.value = targetSchema?.split('/').pop()
    entityPickerOpen.value = true
  }

  function relationPickerLabel(field: SchemaFieldSource): string {
    const targetSlug = field.relation?.targetSchema?.split('/').pop()
    return titleCase(targetSlug || field.name)
  }

  // ── Title case helper ──────────────────────────────────────────────

  function titleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  }

  // ── Field value helpers ─────────────────────────────────────────────

  function handleSelectOption(fieldName: string, optionName: string) {
    editableItem[fieldName] = optionName
    setPopoverOpen(fieldName, false)
  }

  function handleClearSelect(fieldName: string) {
    editableItem[fieldName] = ''
    setPopoverOpen(fieldName, false)
  }

  function handleToggleCheckbox(fieldName: string) {
    editableItem[fieldName] = !editableItem[fieldName]
  }

  // ── Save / Delete / Close ──────────────────────────────────────────

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    editableItem.type = props.typeConfig.type
    emit('save', { ...editableItem } as Entity)
    closeDialog()
  }

  const handleDelete = () => {
    emit('delete', { ...editableItem } as Entity)
    closeDialog()
  }

  const isFormValid = computed(() => !!editableItem.title?.trim())

  const typeBadge = computed(() => ({
    icon: props.typeConfig.icon || 'lucide:database',
    label: props.typeConfig.label || props.typeConfig.type,
  }))

  // Share dialog
  const showShareDialog = ref(false)
</script>

<template>
  <EntityDialogShell
    :open="props.open"
    :title="editableItem.title || ''"
    :description="editableItem.description || ''"
    :mode="mode"
    :entity-id="editableItem.id || undefined"
    :type-badge="typeBadge"
    :title-placeholder="`New ${typeConfig.label}...`"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :dialog-title="isCreateMode ? `New ${typeConfig.label}` : editableItem.title || typeConfig.label"
    :dialog-description="
      isCreateMode
        ? `Create a new ${typeConfig.label.toLowerCase()}.`
        : `View and edit ${typeConfig.label.toLowerCase()} details.`
    "
    :summary="entitySummary"
    :is-generating-summary="isGeneratingSummary"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')"
    @regenerate-summary="regenerateSummary">
    <!-- Header badges: Tags -->
    <template #header-badges>
      <template v-if="editableItem.tags">
        <span class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />
        <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
      </template>
    </template>

    <!-- Properties row -->
    <template v-if="propertyFields.length > 0 || isUserTier" #properties>
      <template v-for="field in propertyFields" :key="field.name">
        <div class="group/field relative inline-flex items-center">
          <!-- ── Select (with dropdown if options exist) ──────────────── -->
          <UiPopover
            v-if="field.valueType === 'select' && field.selectOptions.length > 0"
            :open="isPopoverOpen(field.name)"
            @update:open="setPopoverOpen(field.name, $event)">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="
                  editableItem[field.name]
                    ? 'bg-muted/50 hover:bg-muted'
                    : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                ">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                <span class="text-xs">{{ editableItem[field.name] || titleCase(field.name) }}</span>
                <span v-if="field.required && !editableItem[field.name]" class="text-destructive text-[9px]">*</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in field.selectOptions"
                :key="opt.name"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="handleSelectOption(field.name, opt.name)">
                <span v-if="opt.color" class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: opt.color }" />
                <span class="flex-1">{{ opt.name }}</span>
                <Icon
                  v-if="editableItem[field.name] === opt.name"
                  name="lucide:check"
                  class="h-3.5 w-3.5 text-primary" />
              </button>
              <button
                v-if="editableItem[field.name]"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted text-muted-foreground border-t border-border mt-1 pt-1.5"
                @click="handleClearSelect(field.name)">
                Clear
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Select fallback (no options — free text) -->
          <div
            v-else-if="field.valueType === 'select'"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
            <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-if="!isViewMode"
              v-model="editableItem[field.name]"
              type="text"
              :placeholder="titleCase(field.name)"
              class="bg-transparent text-xs outline-none w-20 placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs">{{ editableItem[field.name] || titleCase(field.name) }}</span>
          </div>

          <!-- ── Status (with colored dropdown) ───────────────────────── -->
          <UiPopover
            v-else-if="field.valueType === 'status' && field.selectOptions.length > 0"
            :open="isPopoverOpen(field.name)"
            @update:open="setPopoverOpen(field.name, $event)">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="
                  editableItem[field.name]
                    ? 'bg-muted/50 hover:bg-muted'
                    : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                ">
                <span
                  v-if="editableItem[field.name]"
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{
                    backgroundColor:
                      field.selectOptions.find((o) => o.name === editableItem[field.name])?.color ||
                      'var(--color-muted-foreground)',
                  }" />
                <Icon v-else name="lucide:circle-dot" class="h-3.5 w-3.5" />
                <span class="text-xs">{{ editableItem[field.name] || titleCase(field.name) }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in field.selectOptions"
                :key="opt.name"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="handleSelectOption(field.name, opt.name)">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ backgroundColor: opt.color || 'var(--color-muted-foreground)' }" />
                <span class="flex-1">{{ opt.name }}</span>
                <Icon
                  v-if="editableItem[field.name] === opt.name"
                  name="lucide:check"
                  class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Status fallback (free text) -->
          <div
            v-else-if="field.valueType === 'status'"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
            <Icon name="lucide:circle-dot" class="h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-if="!isViewMode"
              v-model="editableItem[field.name]"
              type="text"
              :placeholder="titleCase(field.name)"
              class="bg-transparent text-xs outline-none w-20 placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs">{{ editableItem[field.name] || titleCase(field.name) }}</span>
          </div>

          <!-- ── Multi-select (chip-style dropdown) ───────────────────── -->
          <UiPopover
            v-else-if="field.valueType === 'multi_select'"
            :open="isPopoverOpen(field.name)"
            @update:open="setPopoverOpen(field.name, $event)">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                :class="
                  Array.isArray(editableItem[field.name]) && editableItem[field.name].length
                    ? 'bg-muted/50 hover:bg-muted'
                    : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                ">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                <template v-if="Array.isArray(editableItem[field.name]) && editableItem[field.name].length">
                  <span
                    v-for="val in editableItem[field.name].slice(0, 3)"
                    :key="val"
                    class="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-primary/10 text-primary">
                    {{ val }}
                  </span>
                  <span v-if="editableItem[field.name].length > 3" class="text-[10px] text-muted-foreground">
                    +{{ editableItem[field.name].length - 3 }}
                  </span>
                </template>
                <span v-else class="text-xs">{{ titleCase(field.name) }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-1">
              <button
                v-for="opt in field.selectOptions"
                :key="opt.name"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="toggleMultiSelectValue(field.name, opt.name)">
                <Icon
                  :name="isMultiSelectSelected(field.name, opt.name) ? 'lucide:check-square' : 'lucide:square'"
                  class="h-3.5 w-3.5"
                  :class="isMultiSelectSelected(field.name, opt.name) ? 'text-primary' : 'text-muted-foreground'" />
                <span v-if="opt.color" class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: opt.color }" />
                <span class="flex-1">{{ opt.name }}</span>
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Date ─────────────────────────────────────────────────── -->
          <div
            v-else-if="field.valueType === 'date'"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
            <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-if="!isViewMode"
              v-model="editableItem[field.name]"
              type="date"
              class="bg-transparent text-xs outline-none placeholder:text-muted-foreground/50" />
            <span v-else-if="editableItem[field.name]" class="text-xs">
              {{
                new Date(editableItem[field.name]).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              }}
            </span>
            <span v-else class="text-xs text-muted-foreground/50">{{ titleCase(field.name) }}</span>
          </div>

          <!-- ── Number ───────────────────────────────────────────────── -->
          <UiPopover
            v-else-if="field.valueType === 'number'"
            :open="isPopoverOpen(field.name)"
            @update:open="setPopoverOpen(field.name, $event)">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="
                  editableItem[field.name] != null && editableItem[field.name] !== ''
                    ? 'bg-muted/50 hover:bg-muted'
                    : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                ">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                <span class="text-xs">
                  {{
                    editableItem[field.name] != null && editableItem[field.name] !== ''
                      ? editableItem[field.name]
                      : titleCase(field.name)
                  }}
                </span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-40 p-2">
              <input
                v-model.number="editableItem[field.name]"
                type="number"
                :placeholder="titleCase(field.name)"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="setPopoverOpen(field.name, false)" />
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Checkbox ─────────────────────────────────────────────── -->
          <button
            v-else-if="field.valueType === 'checkbox'"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
            :class="
              editableItem[field.name]
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            "
            :disabled="isViewMode"
            @click="handleToggleCheckbox(field.name)">
            <Icon :name="editableItem[field.name] ? 'lucide:check-square' : 'lucide:square'" class="h-3.5 w-3.5" />
            <span>{{ titleCase(field.name) }}</span>
          </button>

          <!-- ── People (text fallback) ───────────────────────────────── -->
          <div
            v-else-if="field.valueType === 'people'"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
            <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5 text-muted-foreground" />
            <input
              v-if="!isViewMode"
              v-model="editableItem[field.name]"
              type="text"
              :placeholder="titleCase(field.name)"
              class="bg-transparent text-xs outline-none w-24 placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs">{{ editableItem[field.name] || titleCase(field.name) }}</span>
          </div>

          <!-- Trash button — user-tier edit mode only -->
          <button
            v-if="isUserTier && !isViewMode"
            class="ml-0.5 h-5 w-5 rounded flex items-center justify-center text-muted-foreground/0 group-hover/field:text-muted-foreground/50 hover:text-destructive! hover:bg-destructive/10 transition-colors"
            :title="`Remove ${titleCase(field.name)} field`"
            @click.stop="removeFieldFromType(typeConfig.schemaId, field.name)">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
      </template>

      <!-- Add property button (user-tier only) -->
      <AddPropertyPopover
        v-if="isUserTier && !isViewMode"
        :schema-id="typeConfig.schemaId"
        :existing-field-names="schemaFields.map((f) => f.name)"
        @added="() => {}" />
    </template>

    <!-- Main content: body fields + right sidebar -->
    <div class="flex-1 flex min-w-0 overflow-y-auto">
      <!-- Center: body field sections -->
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div class="divide-y divide-border">
          <template v-for="field in bodyFields" :key="field.name">
            <!-- Plain text (single-line string) -->
            <div v-if="field.valueType === 'text'" class="p-4 group/body-field">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
                <span v-if="field.required" class="text-destructive text-[9px]">*</span>
                <button
                  v-if="isUserTier && !isViewMode"
                  class="ml-auto h-4 w-4 rounded flex items-center justify-center text-muted-foreground/0 group-hover/body-field:text-muted-foreground/40 hover:text-destructive! hover:bg-destructive/10 transition-colors"
                  :title="`Remove ${titleCase(field.name)} field`"
                  @click.stop="removeFieldFromType(typeConfig.schemaId, field.name)">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </label>
              <div class="mt-2">
                <input
                  v-if="!isViewMode"
                  v-model="editableItem[field.name]"
                  type="text"
                  :placeholder="`Add ${titleCase(field.name).toLowerCase()}…`"
                  class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
                <p v-else-if="editableItem[field.name]" class="text-sm">{{ editableItem[field.name] }}</p>
                <p v-else class="text-sm text-muted-foreground/50 italic">No content</p>
              </div>
            </div>

            <!-- Rich text -->
            <div v-else-if="field.valueType === 'rich_text'" class="p-4 group/body-field">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
                <span v-if="field.required" class="text-destructive text-[9px]">*</span>
                <button
                  v-if="isUserTier && !isViewMode"
                  class="ml-auto h-4 w-4 rounded flex items-center justify-center text-muted-foreground/0 group-hover/body-field:text-muted-foreground/40 hover:text-destructive! hover:bg-destructive/10 transition-colors"
                  :title="`Remove ${titleCase(field.name)} field`"
                  @click.stop="removeFieldFromType(typeConfig.schemaId, field.name)">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </label>
              <div class="mt-2">
                <UiRichTextEditor
                  v-if="!isViewMode"
                  v-model="editableItem[field.name]"
                  :placeholder="`Add ${titleCase(field.name).toLowerCase()}...`"
                  mentions
                  tasklist
                  images
                  tables
                  mathematics
                  templates
                  :entity-id="editableItem.id" />
                <div
                  v-else-if="editableItem[field.name]"
                  class="prose prose-sm max-w-none"
                  v-html="editableItem[field.name]" />
                <p v-else class="text-sm text-muted-foreground/50 italic">No content</p>
              </div>
            </div>

            <!-- URL -->
            <div v-else-if="field.valueType === 'url'" class="p-4 group/body-field">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
                <button
                  v-if="isUserTier && !isViewMode"
                  class="ml-auto h-4 w-4 rounded flex items-center justify-center text-muted-foreground/0 group-hover/body-field:text-muted-foreground/40 hover:text-destructive! hover:bg-destructive/10 transition-colors"
                  :title="`Remove ${titleCase(field.name)} field`"
                  @click.stop="removeFieldFromType(typeConfig.schemaId, field.name)">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </label>
              <div class="mt-2">
                <input
                  v-if="!isViewMode"
                  v-model="editableItem[field.name]"
                  type="url"
                  placeholder="https://..."
                  class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring font-mono" />
                <a
                  v-else-if="editableItem[field.name]"
                  :href="editableItem[field.name]"
                  target="_blank"
                  class="text-sm text-primary hover:underline">
                  {{ editableItem[field.name] }}
                </a>
                <p v-else class="text-sm text-muted-foreground/50 italic">No URL</p>
              </div>
            </div>

            <!-- Email -->
            <div v-else-if="field.valueType === 'email'" class="p-4 group/body-field">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
                <button
                  v-if="isUserTier && !isViewMode"
                  class="ml-auto h-4 w-4 rounded flex items-center justify-center text-muted-foreground/0 group-hover/body-field:text-muted-foreground/40 hover:text-destructive! hover:bg-destructive/10 transition-colors"
                  :title="`Remove ${titleCase(field.name)} field`"
                  @click.stop="removeFieldFromType(typeConfig.schemaId, field.name)">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </label>
              <div class="mt-2">
                <input
                  v-if="!isViewMode"
                  v-model="editableItem[field.name]"
                  type="email"
                  placeholder="email@example.com"
                  class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
                <a
                  v-else-if="editableItem[field.name]"
                  :href="`mailto:${editableItem[field.name]}`"
                  class="text-sm text-primary hover:underline">
                  {{ editableItem[field.name] }}
                </a>
                <p v-else class="text-sm text-muted-foreground/50 italic">No email</p>
              </div>
            </div>

            <!-- Phone -->
            <div v-else-if="field.valueType === 'phone_number'" class="p-4 group/body-field">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
                <button
                  v-if="isUserTier && !isViewMode"
                  class="ml-auto h-4 w-4 rounded flex items-center justify-center text-muted-foreground/0 group-hover/body-field:text-muted-foreground/40 hover:text-destructive! hover:bg-destructive/10 transition-colors"
                  :title="`Remove ${titleCase(field.name)} field`"
                  @click.stop="removeFieldFromType(typeConfig.schemaId, field.name)">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </label>
              <div class="mt-2">
                <input
                  v-if="!isViewMode"
                  v-model="editableItem[field.name]"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
                <a
                  v-else-if="editableItem[field.name]"
                  :href="`tel:${editableItem[field.name]}`"
                  class="text-sm text-primary hover:underline">
                  {{ editableItem[field.name] }}
                </a>
                <p v-else class="text-sm text-muted-foreground/50 italic">No phone</p>
              </div>
            </div>

            <!-- Relation (renders as "Add [TargetType]" button) -->
            <div v-else-if="field.valueType === 'relation'" class="p-4">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
              </label>
              <div class="mt-2">
                <p class="text-[11px] text-muted-foreground mb-2">
                  Linked entities are shown in the References sidebar.
                  <template v-if="field.relation?.targetSchema">
                    Target:
                    <code class="text-[10px] bg-muted/50 px-1 py-0.5 rounded">{{ field.relation.targetSchema }}</code>
                  </template>
                </p>
                <button
                  v-if="!isViewMode"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/40 text-xs text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30 transition-colors"
                  @click="openRelationPicker(field)">
                  <Icon name="lucide:plus" class="h-3 w-3" />
                  Add {{ relationPickerLabel(field) }}
                </button>
              </div>
            </div>

            <!-- Fallback: generic text input -->
            <div v-else class="p-4">
              <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon :name="getFieldIcon(field.valueType)" class="h-3.5 w-3.5" />
                {{ titleCase(field.name) }}
                <span v-if="field.required" class="text-destructive text-[9px]">*</span>
              </label>
              <div class="mt-2">
                <input
                  v-if="!isViewMode"
                  v-model="editableItem[field.name]"
                  type="text"
                  :placeholder="`Add ${titleCase(field.name).toLowerCase()}...`"
                  class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
                <p v-else-if="editableItem[field.name]" class="text-sm">{{ editableItem[field.name] }}</p>
                <p v-else class="text-sm text-muted-foreground/50 italic">Empty</p>
              </div>
            </div>
          </template>

          <!-- Empty state when no body fields -->
          <div v-if="bodyFields.length === 0" class="p-8 text-center">
            <p class="text-sm text-muted-foreground">All fields are shown in the properties row above.</p>
          </div>
        </div>
      </div>

      <!-- Right sidebar: references + activity (collapsible) -->
      <!-- Collapsed strip -->
      <div
        v-if="rightSidebarCollapsed"
        class="shrink-0 border-l border-border flex flex-col items-center py-2 w-10 bg-card/50">
        <button
          class="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Expand sidebar"
          @click="toggleSidebar">
          <Icon name="lucide:panel-right-open" class="h-4 w-4" />
        </button>
      </div>

      <!-- Expanded sidebar -->
      <aside
        v-else
        data-slot="right-sidebar"
        class="shrink-0 border-l border-border overflow-hidden flex flex-col relative transition-[width] duration-200 ease-out"
        :class="isResizingSidebar ? 'select-none' : ''"
        :style="{ width: rightSidebarW + 'px' }">
        <!-- Resize handle -->
        <div
          class="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
          @pointerdown="startSidebarResize($event)" />
        <!-- Tab bar -->
        <div class="flex border-b border-border shrink-0">
          <button
            class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
            :class="
              rightSidebarTab === 'references'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="rightSidebarTab = 'references'">
            References
          </button>
          <button
            v-if="!isCreateMode"
            class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
            :class="
              rightSidebarTab === 'activity'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="rightSidebarTab = 'activity'">
            Activity
            <span v-if="displayActivity.length" class="ml-1 text-[9px] bg-muted rounded-full px-1.5 py-0.5">
              {{ displayActivity.length }}
            </span>
          </button>
          <!-- Collapse button -->
          <button
            class="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Collapse sidebar"
            @click="toggleSidebar">
            <Icon name="lucide:panel-right-close" class="h-3.5 w-3.5" />
          </button>
        </div>
        <!-- Tab content -->
        <div class="flex-1 overflow-y-auto">
          <!-- References tab -->
          <ReferencesSection
            v-if="rightSidebarTab === 'references'"
            v-model="editableItem.references"
            :readonly="isViewMode"
            @open-entity="handleOpenEntityRef"
            @remove-ref="handleRemoveRef"
            @add-entity="
              () => {
                entityPickerFilterType = undefined
                entityPickerOpen = true
              }
            "
            @create-entity="handleCreateEntityOfType"
            @add-entity-of-type="
              (type: string) => {
                entityPickerFilterType = type
                entityPickerOpen = true
              }
            " />
          <!-- Activity tab -->
          <div v-if="rightSidebarTab === 'activity' && !isCreateMode" class="p-4 space-y-2">
            <div v-if="commentsLoading" class="flex items-center py-2">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="displayActivity.length" class="space-y-1.5 mb-2">
              <div v-for="activityItem in displayActivity" :key="activityItem.id" class="flex items-start gap-2">
                <div class="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon
                    v-if="activityItem.type === 'created'"
                    name="lucide:plus"
                    class="h-2.5 w-2.5 text-muted-foreground" />
                  <Icon
                    v-else-if="activityItem.type === 'comment'"
                    name="lucide:message-circle"
                    class="h-2.5 w-2.5 text-muted-foreground" />
                  <Icon v-else name="lucide:activity" class="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-1 flex-wrap">
                    <span class="text-[11px] font-medium">{{ activityItem.authorName }}</span>
                    <span class="text-[10px] text-muted-foreground">
                      {{ formatRelativeTime(activityItem.createdAt) }}
                    </span>
                  </div>
                  <p v-if="activityItem.content" class="text-xs text-foreground/80 mt-0.5">
                    {{ activityItem.content }}
                  </p>
                  <p v-else-if="activityItem.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">
                    created this {{ typeConfig.label.toLowerCase() }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <Icon name="lucide:user" class="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <input
                v-model="newComment"
                type="text"
                placeholder="Add a comment..."
                class="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                @keydown.enter="newComment.trim() && handleAddComment()" />
              <button
                v-if="newComment.trim()"
                class="text-primary hover:text-primary/80 transition-colors"
                @click="handleAddComment">
                <Icon name="lucide:send" class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <div class="flex items-center gap-2">
        <Icon name="lucide:info" class="h-3.5 w-3.5" />
        <span v-if="editableItem.id && !isCreateMode">ID: {{ editableItem.id }}</span>
        <span v-else>New {{ typeConfig.label.toLowerCase() }}</span>
      </div>
    </template>

    <template #footer-right>
      <template v-if="isViewMode">
        <UiButton size="sm" @click="mode === 'view'">
          <Icon name="lucide:pencil" class="h-3.5 w-3.5 mr-1.5" />
          Edit
        </UiButton>
      </template>
      <template v-else-if="isEditMode">
        <span class="text-[11px] text-muted-foreground flex items-center gap-1 mr-2 h-4 overflow-hidden">
          <Transition name="save-fade" mode="out-in">
            <span v-if="saveStatus === 'saving'" key="saving" class="flex items-center gap-1">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
              Saving…
            </span>
            <span v-else-if="saveStatus === 'error'" key="error" class="flex items-center gap-1 text-destructive">
              <Icon name="lucide:alert-circle" class="h-3 w-3" />
              Error
            </span>
            <span v-else-if="formatLastSaved" key="saved" class="flex items-center gap-1">
              <Icon name="lucide:check" class="h-3 w-3 text-emerald-500" />
              Last saved at {{ formatLastSaved }}
            </span>
          </Transition>
        </span>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline" size="icon" class="h-8 w-8">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-40">
            <UiDropdownMenuItem icon="lucide:share" title="Share" @click="showShareDialog = true" />
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem icon="lucide:trash-2" title="Delete" variant="destructive" @click="handleDelete" />
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </template>
      <template v-else-if="isCreateMode">
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
        <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
      </template>
    </template>
  </EntityDialogShell>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker
    v-model:open="entityPickerOpen"
    :exclude-id="editableItem.id"
    :filter-type="entityPickerFilterType"
    @select="handleAddEntityRef"
    @created="handleCreatedEntityRef" />

  <!-- Share Dialog -->
  <ShareDialog
    v-model:open="showShareDialog"
    :entity-id="editableItem.id"
    entity-type="entity"
    :entity-title="editableItem.title" />
</template>

<style scoped>
  .save-fade-enter-active,
  .save-fade-leave-active {
    transition: all 0.15s ease;
  }
  .save-fade-enter-from {
    opacity: 0;
    transform: translateY(4px);
  }
  .save-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
</style>
