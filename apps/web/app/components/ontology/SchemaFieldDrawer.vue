<script lang="ts" setup>
  /**
   * SchemaFieldDrawer — advanced settings panel for a single schema field.
   *
   * Renders beneath a collapsed SchemaFieldRow when the user expands the row.
   * Contents are type-aware: the panel shows default-value, select options,
   * relation target, etc. based on the field's `valueType`.
   *
   * All edits are emitted upward via a single `update` event; the parent owns
   * the canonical field state so the drawer stays stateless apart from local
   * input-buffer reactive refs.
   */
  import { ONTOLOGY_POPULAR_ICONS, getValueTypeIcon } from '~/lib/ontology-value-types'

  interface SelectOption {
    label: string
    color?: string
    value?: string
  }

  interface RelationMeta {
    targetSchema?: string
    cardinality?: 'one' | 'many'
    syncedProperty?: string
  }

  interface EditableField {
    name: string
    valueType: string
    required?: boolean
    description?: string
    selectOptions?: any[]
    relation?: RelationMeta
    defaultValue?: any
    icon?: string
  }

  const props = defineProps<{
    field: EditableField
    /** When true, all inputs are disabled (system/core tier). */
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    update: [patch: Partial<EditableField>]
  }>()

  const { serverTypes } = useOntologyRegistry()

  // ── Derived ─────────────────────────────────────────────────────────

  const isSelect = computed(() => props.field.valueType === 'select' || props.field.valueType === 'multi_select')
  const isRelation = computed(() => props.field.valueType === 'relation')
  const isCheckbox = computed(() => props.field.valueType === 'checkbox')
  const isNumber = computed(() => props.field.valueType === 'number')
  const isSelectMulti = computed(() => props.field.valueType === 'multi_select')

  const defaultIcon = computed(() => props.field.icon || getValueTypeIcon(props.field.valueType))

  // ── Select option editor ────────────────────────────────────────────

  /** Normalize server option to the editor shape. Accepts either strings or `{label,color}`. */
  function normalizeOption(opt: any): SelectOption {
    if (typeof opt === 'string') return { label: opt }
    if (opt && typeof opt === 'object') {
      return {
        label: String(opt.label ?? opt.value ?? ''),
        color: typeof opt.color === 'string' ? opt.color : undefined,
        value: typeof opt.value === 'string' ? opt.value : undefined,
      }
    }
    return { label: '' }
  }

  const options = computed<SelectOption[]>(() => (props.field.selectOptions || []).map(normalizeOption))

  /** Palette used by the color picker (Tailwind shades, semantic labels). */
  const SELECT_COLORS = [
    { value: 'gray', class: 'bg-gray-400' },
    { value: 'red', class: 'bg-red-400' },
    { value: 'orange', class: 'bg-orange-400' },
    { value: 'amber', class: 'bg-amber-400' },
    { value: 'yellow', class: 'bg-yellow-400' },
    { value: 'lime', class: 'bg-lime-400' },
    { value: 'green', class: 'bg-green-400' },
    { value: 'teal', class: 'bg-teal-400' },
    { value: 'cyan', class: 'bg-cyan-400' },
    { value: 'sky', class: 'bg-sky-400' },
    { value: 'blue', class: 'bg-blue-400' },
    { value: 'indigo', class: 'bg-indigo-400' },
    { value: 'violet', class: 'bg-violet-400' },
    { value: 'fuchsia', class: 'bg-fuchsia-400' },
    { value: 'pink', class: 'bg-pink-400' },
    { value: 'rose', class: 'bg-rose-400' },
  ]

  function colorClassFor(value?: string): string {
    return SELECT_COLORS.find((c) => c.value === value)?.class || 'bg-muted-foreground/40'
  }

  function commitOptions(next: SelectOption[]) {
    // Strip empty labels and uniquify. Emit plain strings for color-less options
    // to stay compatible with the simple string-array form used by existing
    // system ontologies; promote to `{label,color}` only when a color is set.
    const cleaned: (string | SelectOption)[] = []
    const seen = new Set<string>()
    for (const opt of next) {
      const label = opt.label.trim()
      if (!label) continue
      if (seen.has(label)) continue
      seen.add(label)
      if (opt.color) {
        cleaned.push({ label, color: opt.color })
      } else {
        cleaned.push(label)
      }
    }
    emit('update', { selectOptions: cleaned })
  }

  function updateOption(index: number, patch: Partial<SelectOption>) {
    const next = [...options.value]
    next[index] = { ...next[index]!, ...patch }
    commitOptions(next)
  }

  function addOption() {
    if (props.readonly) return
    const next = [...options.value, { label: `Option ${options.value.length + 1}` }]
    commitOptions(next)
  }

  function removeOption(index: number) {
    if (props.readonly) return
    const next = options.value.filter((_, i) => i !== index)
    commitOptions(next)
  }

  // Draft ref for new-option label input so typing doesn't cause rerender thrash.
  const editingLabels = ref<Record<number, string>>({})

  function onLabelInput(index: number, value: string) {
    editingLabels.value = { ...editingLabels.value, [index]: value }
  }

  function commitLabel(index: number) {
    const buffered = editingLabels.value[index]
    if (buffered === undefined) return
    const clearBuffer = () => {
      editingLabels.value = Object.fromEntries(Object.entries(editingLabels.value).filter(([k]) => Number(k) !== index))
    }
    if (buffered === options.value[index]?.label) {
      clearBuffer()
      return
    }
    updateOption(index, { label: buffered })
    clearBuffer()
  }

  // ── Relation editor ─────────────────────────────────────────────────

  const relationTargetOptions = computed(() => {
    const list = serverTypes.value
      .filter((t) => t.schemaId)
      .map((t) => ({ value: t.schemaId, label: t.label, tier: t.tier || 'user', icon: t.icon }))
    // Sort user-tier first for easier scanning.
    return list.sort((a, b) => {
      const tierOrder: Record<string, number> = { user: 0, system: 1, core: 2 }
      const ta = tierOrder[a.tier] ?? 99
      const tb = tierOrder[b.tier] ?? 99
      if (ta !== tb) return ta - tb
      return a.label.localeCompare(b.label)
    })
  })

  function onRelationTarget(next: unknown) {
    if (props.readonly) return
    if (typeof next !== 'string' || !next) return
    const current = props.field.relation || {}
    emit('update', { relation: { ...current, targetSchema: next } })
  }

  const selectedRelationTarget = computed(
    () => relationTargetOptions.value.find((o) => o.value === props.field.relation?.targetSchema) || null,
  )

  function onRelationCardinality(next: 'one' | 'many') {
    if (props.readonly) return
    const current = props.field.relation || {}
    if ((current.cardinality || 'one') === next) return
    emit('update', { relation: { ...current, cardinality: next } })
  }

  // ── Default value editor ────────────────────────────────────────────

  const defaultValueDraft = ref<string>(
    props.field.defaultValue === undefined || props.field.defaultValue === null ? '' : String(props.field.defaultValue),
  )

  watch(
    () => props.field.defaultValue,
    (next) => {
      defaultValueDraft.value = next === undefined || next === null ? '' : String(next)
    },
  )

  function commitDefaultValue() {
    if (props.readonly) return
    const raw = defaultValueDraft.value.trim()

    // Empty → clear default.
    if (raw === '') {
      if (props.field.defaultValue === undefined) return
      emit('update', { defaultValue: undefined })
      return
    }

    // Type-aware parse.
    let parsed: any = raw
    if (isNumber.value) {
      const n = Number(raw)
      if (!Number.isFinite(n)) return
      parsed = n
    } else if (isCheckbox.value) {
      parsed = raw === 'true' || raw === '1' || raw === 'yes'
    }

    if (parsed === props.field.defaultValue) return
    emit('update', { defaultValue: parsed })
  }

  function commitCheckboxDefault(value: boolean | null) {
    if (props.readonly) return
    if (value === null) {
      if (props.field.defaultValue === undefined) return
      emit('update', { defaultValue: undefined })
      return
    }
    if (value === props.field.defaultValue) return
    emit('update', { defaultValue: value })
  }

  /** Sentinel used for the "no default" option since reka-ui forbids empty-string values. */
  const SELECT_DEFAULT_NONE = '__none__'

  function commitSelectDefault(value: unknown) {
    if (props.readonly) return
    if (value === null || value === undefined || value === '' || value === SELECT_DEFAULT_NONE) {
      if (props.field.defaultValue === undefined) return
      emit('update', { defaultValue: undefined })
      return
    }
    const next = String(value)
    if (next === props.field.defaultValue) return
    emit('update', { defaultValue: next })
  }

  // ── Icon picker ─────────────────────────────────────────────────────

  function onIconSelect(next: string) {
    if (props.readonly) return
    if (next === props.field.icon) return
    emit('update', { icon: next })
  }

  function clearIcon() {
    if (props.readonly) return
    if (!props.field.icon) return
    emit('update', { icon: undefined })
  }
</script>

<template>
  <div class="flex flex-col gap-4 px-10 py-3 border-t border-border/60 bg-muted/10">
    <!-- ── Row 1: icon + default value ─────────────────────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Icon picker -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Icon</label>
        <div class="flex items-center gap-2">
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded border border-border bg-background hover:bg-muted transition-colors disabled:cursor-not-allowed"
                :disabled="readonly"
                :title="readonly ? 'Read-only' : 'Pick icon'">
                <Icon :name="defaultIcon" class="h-4 w-4 text-muted-foreground" />
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-[260px] p-2">
              <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
                Pick icon
              </div>
              <div class="grid grid-cols-6 gap-1">
                <button
                  v-for="ic in ONTOLOGY_POPULAR_ICONS"
                  :key="ic"
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded border border-transparent hover:bg-muted transition-colors"
                  :class="{ 'border-primary bg-accent': field.icon === ic }"
                  @click="onIconSelect(ic)">
                  <Icon :name="ic" class="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                v-if="field.icon"
                type="button"
                class="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground py-1 rounded hover:bg-muted transition-colors"
                @click="clearIcon">
                Reset to type default
              </button>
            </UiPopoverContent>
          </UiPopover>
          <span class="text-[11px] text-muted-foreground">
            {{ field.icon ? 'Custom' : 'Default for ' + field.valueType }}
          </span>
        </div>
      </div>

      <!-- Default value (type-aware) -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Default value</label>

        <!-- Checkbox → tri-state segmented -->
        <div v-if="isCheckbox" class="flex items-center gap-1 rounded border border-border bg-background p-0.5 w-max">
          <button
            type="button"
            class="px-2 py-0.5 text-[11px] rounded transition-colors"
            :class="
              field.defaultValue === false ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="readonly"
            @click="commitCheckboxDefault(false)">
            false
          </button>
          <button
            type="button"
            class="px-2 py-0.5 text-[11px] rounded transition-colors"
            :class="
              field.defaultValue === true ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="readonly"
            @click="commitCheckboxDefault(true)">
            true
          </button>
          <button
            type="button"
            class="px-2 py-0.5 text-[11px] rounded transition-colors"
            :class="
              field.defaultValue === undefined
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="readonly"
            @click="commitCheckboxDefault(null)">
            none
          </button>
        </div>

        <!-- Select default → dropdown of option labels -->
        <UiSelect
          v-else-if="isSelect && !isSelectMulti"
          :model-value="typeof field.defaultValue === 'string' ? field.defaultValue : SELECT_DEFAULT_NONE"
          :disabled="readonly || options.length === 0"
          @update:model-value="commitSelectDefault">
          <UiSelectTrigger class="h-8 text-xs">
            <UiSelectValue :placeholder="options.length ? 'No default' : 'Add options first'" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem :value="SELECT_DEFAULT_NONE">
              <span class="italic text-muted-foreground">No default</span>
            </UiSelectItem>
            <UiSelectItem v-for="opt in options" :key="opt.label" :value="opt.label">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :class="colorClassFor(opt.color)" />
                <span>{{ opt.label }}</span>
              </div>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>

        <!-- Multi-select default is intentionally unsupported for simplicity -->
        <div v-else-if="isSelectMulti" class="text-[11px] text-muted-foreground italic py-1.5">
          Multi-select defaults aren't configurable from the editor yet.
        </div>

        <!-- Relation → unsupported here (would require entity picker) -->
        <div v-else-if="isRelation" class="text-[11px] text-muted-foreground italic py-1.5">
          Set relation defaults on individual records.
        </div>

        <!-- Fallback: text/number/date/etc. → plain input -->
        <input
          v-else
          v-model="defaultValueDraft"
          :disabled="readonly"
          :type="isNumber ? 'number' : 'text'"
          placeholder="(none)"
          class="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring/40 disabled:cursor-not-allowed"
          @blur="commitDefaultValue"
          @keydown.enter.prevent="commitDefaultValue" />
      </div>
    </div>

    <!-- ── Select/Multi-select options editor ──────────────────────── -->
    <div v-if="isSelect" class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {{ isSelectMulti ? 'Multi-select options' : 'Select options' }}
        </label>
        <UiButton v-if="!readonly" variant="ghost" size="xs" class="h-6 text-[11px]" @click="addOption">
          <Icon name="lucide:plus" class="mr-1 h-3 w-3" />
          Add option
        </UiButton>
      </div>

      <div v-if="options.length > 0" class="flex flex-col gap-1 rounded border border-border bg-background p-1.5">
        <div v-for="(opt, i) in options" :key="`${opt.label}-${i}`" class="flex items-center gap-1.5 group/opt">
          <!-- Color swatch with popover palette -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button
                type="button"
                class="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:cursor-not-allowed"
                :disabled="readonly"
                :title="opt.color || 'Pick color'">
                <span class="h-3 w-3 rounded-full" :class="colorClassFor(opt.color)" />
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-[160px] p-2">
              <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 px-1">Color</div>
              <div class="grid grid-cols-8 gap-1">
                <button
                  v-for="c in SELECT_COLORS"
                  :key="c.value"
                  type="button"
                  class="h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors"
                  :class="[
                    c.class,
                    opt.color === c.value ? 'border-foreground' : 'border-transparent hover:border-muted-foreground/40',
                  ]"
                  :title="c.value"
                  @click="updateOption(i, { color: c.value })" />
              </div>
              <button
                v-if="opt.color"
                type="button"
                class="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground py-1 rounded hover:bg-muted transition-colors"
                @click="updateOption(i, { color: undefined })">
                Reset color
              </button>
            </UiPopoverContent>
          </UiPopover>

          <input
            :value="editingLabels[i] ?? opt.label"
            type="text"
            placeholder="Option label"
            :disabled="readonly"
            class="flex-1 h-6 rounded bg-transparent px-1.5 text-xs outline-none focus:ring-1 focus:ring-ring/30 disabled:cursor-not-allowed"
            @input="onLabelInput(i, ($event.target as HTMLInputElement).value)"
            @blur="commitLabel(i)"
            @keydown.enter.prevent="commitLabel(i)" />

          <button
            type="button"
            class="opacity-0 group-hover/opt:opacity-100 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30 transition-all"
            :disabled="readonly"
            title="Remove option"
            @click="removeOption(i)">
            <Icon name="lucide:trash-2" class="h-3 w-3" />
          </button>
        </div>
      </div>

      <div v-else class="text-[11px] text-muted-foreground italic">
        No options yet. Click "Add option" to create the first.
      </div>
    </div>

    <!-- ── Relation editor ─────────────────────────────────────────── -->
    <div v-if="isRelation" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Target type</label>
        <UiSelect
          :model-value="field.relation?.targetSchema || ''"
          :disabled="readonly"
          @update:model-value="onRelationTarget">
          <UiSelectTrigger class="h-8 text-xs">
            <span v-if="selectedRelationTarget" class="flex items-center gap-2 text-xs">
              <Icon :name="selectedRelationTarget.icon || 'lucide:box'" class="h-3.5 w-3.5 text-muted-foreground" />
              {{ selectedRelationTarget.label }}
            </span>
            <span v-else class="text-muted-foreground/60 text-xs">Pick a target type…</span>
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem v-for="opt in relationTargetOptions" :key="opt.value" :value="opt.value">
              <div class="flex items-center gap-2 w-full">
                <Icon :name="opt.icon || 'lucide:box'" class="h-3.5 w-3.5 text-muted-foreground" />
                <span>{{ opt.label }}</span>
                <span class="text-[10px] text-muted-foreground/60 ml-auto">{{ opt.tier }}</span>
              </div>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cardinality</label>
        <div class="flex items-center gap-1 rounded border border-border bg-background p-0.5 w-max">
          <button
            type="button"
            class="px-2 py-0.5 text-[11px] rounded transition-colors"
            :class="
              (field.relation?.cardinality || 'one') === 'one'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="readonly"
            @click="onRelationCardinality('one')">
            One
          </button>
          <button
            type="button"
            class="px-2 py-0.5 text-[11px] rounded transition-colors"
            :class="
              (field.relation?.cardinality || 'one') === 'many'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="readonly"
            @click="onRelationCardinality('many')">
            Many
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
