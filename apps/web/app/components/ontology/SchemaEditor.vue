<script lang="ts" setup>
  /**
   * SchemaEditor — full-page editor for a single ontology schema.
   *
   * Responsibilities:
   * - Show type metadata (label, icon, description, entityClass)
   * - Edit, add, remove, and reorder fields
   * - Tier enforcement: only `user`-tier schemas are mutable
   * - Persist via `useOntologyRegistry` methods; SSE propagates changes
   *
   * This component owns a local draft of the fields array and meta fields;
   * it flushes changes on blur or explicit Save depending on the control.
   */
  import type { DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import { ONTOLOGY_POPULAR_ICONS } from '~/lib/ontology-value-types'
  import SchemaFieldRow from './SchemaFieldRow.vue'

  interface DraftField {
    /** Stable client key, used for v-for stability across reorders/renames. */
    _key: string
    /** Original field name on the server; used to identify renames. */
    _originalName: string
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
    config: DynamicEntityTypeConfig
    /** Number of records that use this type (shown in the header). */
    recordCount: number
    /** When true, the type cannot be modified from the UI. */
    readonly?: boolean
  }>()

  const nuxtApp = useNuxtApp()
  const { wp } = useWorkspacePath()
  const { addFieldToType, removeFieldFromType, updateFieldOnType, replaceFieldsOnType, updateTypeMeta, refresh } =
    useOntologyRegistry()

  /** Show link to unified browse when this type is browsable (not routed/core-hidden). */
  const showBrowseRecordsLink = computed(() => {
    if (props.config.routed) return false
    if (props.config.browse?.enabled === false) return false
    return true
  })

  // ── Draft state ─────────────────────────────────────────────────────

  const label = ref(props.config.label)
  const icon = ref(props.config.icon || 'lucide:database')
  const description = ref((props.config as any).description ?? '')
  const fields = ref<DraftField[]>([])

  /** True while a network request is in flight — disables inputs. */
  const isSaving = ref(false)

  /**
   * Hydrate the local draft from the server config. Called on mount and
   * every time `props.config` changes (SSE propagation after a save).
   */
  function syncFromConfig() {
    label.value = props.config.label
    icon.value = props.config.icon || 'lucide:database'
    description.value = (props.config as any).description ?? ''
    fields.value = (props.config.fields || []).map((f: any) => ({
      _key: crypto.randomUUID(),
      _originalName: f.name,
      name: f.name,
      valueType: f.valueType,
      required: f.required,
      description: f.description,
      selectOptions: f.selectOptions,
      relation: f.relation,
      defaultValue: f.defaultValue,
      icon: f.icon,
    }))
  }

  onMounted(syncFromConfig)

  // When SSE updates the registry with a newer schema version, re-hydrate.
  watch(
    () => props.config.schemaVersion,
    () => syncFromConfig(),
  )

  // ── Derived ─────────────────────────────────────────────────────────

  const fieldCount = computed(() => fields.value.length)
  const requiredCount = computed(() => fields.value.filter((f) => f.required).length)
  const hasTitleField = computed(() => fields.value.some((f) => f.valueType === 'title'))

  const tierLabel = computed(() => {
    switch (props.config.tier) {
      case 'core':
        return 'Core (kernel-managed, immutable)'
      case 'system':
        return 'System (built-in, immutable)'
      case 'user':
        return 'Custom (user-created)'
      default:
        return 'Unknown tier'
    }
  })

  const tierBadgeClass = computed(() => {
    switch (props.config.tier) {
      case 'core':
        return 'bg-destructive/10 text-destructive'
      case 'system':
        return 'bg-muted/40 text-muted-foreground'
      case 'user':
        return 'bg-blue-500/10 text-blue-400'
      default:
        return 'bg-muted/40 text-muted-foreground'
    }
  })

  // ── Meta mutations ──────────────────────────────────────────────────

  async function saveMeta(patch: { label?: string; icon?: string; description?: string }) {
    if (props.readonly) return
    isSaving.value = true
    try {
      await updateTypeMeta(props.config.schemaId, patch)
      ;(nuxtApp as any).$toast?.success('Schema updated')
    } catch (err: any) {
      ;(nuxtApp as any).$toast?.error(err?.message || 'Failed to update schema')
      // Revert on failure
      syncFromConfig()
    } finally {
      isSaving.value = false
    }
  }

  function onLabelBlur() {
    const trimmed = label.value.trim()
    if (!trimmed) {
      label.value = props.config.label
      return
    }
    if (trimmed === props.config.label) return
    saveMeta({ label: trimmed })
  }

  function onDescriptionBlur() {
    const current = (props.config as any).description ?? ''
    if (description.value === current) return
    saveMeta({ description: description.value })
  }

  function onIconSelect(next: string) {
    if (next === icon.value) return
    icon.value = next
    saveMeta({ icon: next })
  }

  // ── Field mutations ─────────────────────────────────────────────────

  function makeField(partial: Partial<DraftField> = {}): DraftField {
    return {
      _key: crypto.randomUUID(),
      _originalName: '',
      name: partial.name ?? '',
      valueType: partial.valueType ?? 'rich_text',
      required: partial.required ?? false,
      description: partial.description ?? '',
    }
  }

  async function handleAddField() {
    if (props.readonly) return
    // Pick a default name that doesn't collide.
    const base = 'field'
    let i = 1
    while (fields.value.some((f) => f.name === (i === 1 ? base : `${base}_${i}`))) i++
    const name = i === 1 ? base : `${base}_${i}`

    const draft = makeField({ name, valueType: 'rich_text' })
    // Optimistically append so the user sees the new row immediately.
    fields.value.push(draft)

    isSaving.value = true
    try {
      await addFieldToType(props.config.schemaId, {
        name: draft.name,
        valueType: draft.valueType,
        required: false,
      })
      ;(nuxtApp as any).$toast?.success(`Added field "${draft.name}"`)
      // SSE will re-hydrate via watch on schemaVersion. If it hasn't by the
      // time the response resolves, fetch anyway so the _originalName is set.
      await refresh()
    } catch (err: any) {
      // Roll back optimistic append.
      fields.value = fields.value.filter((f) => f._key !== draft._key)
      ;(nuxtApp as any).$toast?.error(err?.message || 'Failed to add field')
    } finally {
      isSaving.value = false
    }
  }

  async function handleFieldUpdate(index: number, patch: Partial<DraftField>) {
    if (props.readonly) return
    const current = fields.value[index]
    if (!current) return

    // Merge locally first for instant feedback.
    const next: DraftField = { ...current, ...patch }
    fields.value[index] = next

    // If this is a freshly-added field that hasn't been persisted yet
    // (`_originalName` still empty), defer server writes until it has a name.
    if (!current._originalName) {
      if (!next.name.trim()) return
      // Promote it: call addFieldToType to create on the server.
      isSaving.value = true
      try {
        await addFieldToType(props.config.schemaId, {
          name: next.name.trim(),
          valueType: next.valueType,
          required: next.required,
          description: next.description,
          selectOptions: next.selectOptions,
        })
        // Second pass: persist drawer-only fields (relation/defaultValue/icon)
        // the create endpoint doesn't accept.
        const postCreate: Record<string, unknown> = {}
        if (next.relation) postCreate.relation = next.relation
        if (next.defaultValue !== undefined) postCreate.defaultValue = next.defaultValue
        if (next.icon) postCreate.icon = next.icon
        if (Object.keys(postCreate).length > 0) {
          await updateFieldOnType(props.config.schemaId, next.name.trim(), postCreate as any)
        }
        await refresh()
      } catch (err: any) {
        ;(nuxtApp as any).$toast?.error(err?.message || 'Failed to create field')
      } finally {
        isSaving.value = false
      }
      return
    }

    // Only persist if something actually changed.
    const meaningful: Record<string, unknown> = {}
    if (patch.name !== undefined && patch.name !== current._originalName) meaningful.name = patch.name
    if (patch.valueType !== undefined) meaningful.valueType = patch.valueType
    if (patch.required !== undefined) meaningful.required = patch.required
    if (patch.description !== undefined) meaningful.description = patch.description
    if (patch.selectOptions !== undefined) meaningful.selectOptions = patch.selectOptions
    if (patch.relation !== undefined) meaningful.relation = patch.relation
    if (patch.defaultValue !== undefined || 'defaultValue' in patch) meaningful.defaultValue = patch.defaultValue
    if (patch.icon !== undefined || 'icon' in patch) meaningful.icon = patch.icon
    if (Object.keys(meaningful).length === 0) return

    isSaving.value = true
    try {
      await updateFieldOnType(props.config.schemaId, current._originalName, meaningful as any)
      // Update the baseline name so subsequent edits don't think it's a rename.
      if (typeof meaningful.name === 'string') next._originalName = meaningful.name
    } catch (err: any) {
      ;(nuxtApp as any).$toast?.error(err?.message || 'Failed to update field')
      syncFromConfig()
    } finally {
      isSaving.value = false
    }
  }

  async function handleFieldRemove(index: number) {
    if (props.readonly) return
    const current = fields.value[index]
    if (!current) return

    // If unsaved, just drop from the draft.
    if (!current._originalName) {
      fields.value.splice(index, 1)
      return
    }

    if (!window.confirm(`Remove field "${current.name}"? Existing records keep their values.`)) {
      return
    }

    // Optimistic remove
    const backup = [...fields.value]
    fields.value.splice(index, 1)

    isSaving.value = true
    try {
      await removeFieldFromType(props.config.schemaId, current._originalName)
      ;(nuxtApp as any).$toast?.success(`Removed field "${current.name}"`)
    } catch (err: any) {
      fields.value = backup
      ;(nuxtApp as any).$toast?.error(err?.message || 'Failed to remove field')
    } finally {
      isSaving.value = false
    }
  }

  async function persistOrder(nextOrder: DraftField[]) {
    // Only include persisted fields; unsaved drafts remain client-side.
    const persisted = nextOrder
      .filter((f) => f._originalName)
      .map((f) => ({
        name: f.name,
        valueType: f.valueType,
        required: f.required,
        description: f.description,
        selectOptions: f.selectOptions,
        relation: f.relation,
        defaultValue: f.defaultValue,
        icon: f.icon,
      }))

    isSaving.value = true
    try {
      await replaceFieldsOnType(props.config.schemaId, persisted as any)
    } catch (err: any) {
      ;(nuxtApp as any).$toast?.error(err?.message || 'Failed to reorder fields')
      syncFromConfig()
    } finally {
      isSaving.value = false
    }
  }

  async function handleFieldMove(index: number, direction: -1 | 1) {
    if (props.readonly) return
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= fields.value.length) return

    const reordered = [...fields.value]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved!)
    fields.value = reordered

    await persistOrder(reordered)
  }

  // ── Drag & drop reorder ─────────────────────────────────────────────

  /** Source index during a drag; null when idle. */
  const dragSourceIndex = ref<number | null>(null)
  /** Current hovered target index during a drag; null when idle. */
  const dragOverIndex = ref<number | null>(null)

  function onDragStart(index: number) {
    if (props.readonly) return
    dragSourceIndex.value = index
    dragOverIndex.value = index
  }

  function onDragOver(index: number) {
    if (props.readonly) return
    if (dragSourceIndex.value === null) return
    if (dragOverIndex.value === index) return
    dragOverIndex.value = index
  }

  async function onDrop(targetIndex: number) {
    if (props.readonly) return
    const source = dragSourceIndex.value
    dragSourceIndex.value = null
    dragOverIndex.value = null
    if (source === null) return
    if (source === targetIndex) return

    const reordered = [...fields.value]
    const [moved] = reordered.splice(source, 1)
    reordered.splice(targetIndex, 0, moved!)
    fields.value = reordered

    await persistOrder(reordered)
  }

  function onDragEnd() {
    dragSourceIndex.value = null
    dragOverIndex.value = null
  }
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ── Header: identity + meta ─────────────────────────────────── -->
    <div class="rounded-xl border border-border bg-card">
      <div class="flex items-start gap-4 p-5">
        <!-- Icon picker -->
        <UiPopover>
          <UiPopoverTrigger as-child>
            <button
              type="button"
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted/40 border border-border hover:bg-muted transition-colors disabled:cursor-not-allowed"
              :disabled="readonly"
              :title="readonly ? 'Read-only schema' : 'Change icon'">
              <Icon :name="icon" class="h-6 w-6 text-muted-foreground" />
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-[300px] p-3">
            <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Pick an icon</div>
            <div class="grid grid-cols-6 gap-1.5">
              <button
                v-for="ic in ONTOLOGY_POPULAR_ICONS"
                :key="ic"
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-md border border-transparent hover:bg-muted transition-colors"
                :class="{ 'border-primary bg-accent': icon === ic }"
                @click="onIconSelect(ic)">
                <Icon :name="ic" class="h-4 w-4" />
              </button>
            </div>
          </UiPopoverContent>
        </UiPopover>

        <div class="flex-1 min-w-0 space-y-2">
          <!-- Editable label -->
          <input
            v-model="label"
            type="text"
            spellcheck="false"
            placeholder="Type name"
            :disabled="readonly"
            class="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-ring/40 rounded px-1 -mx-1 disabled:cursor-not-allowed"
            @blur="onLabelBlur"
            @keydown.enter.prevent="onLabelBlur" />

          <!-- Identity badges -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" :class="tierBadgeClass">
              <Icon
                :name="
                  config.tier === 'user' ? 'lucide:blocks' : config.tier === 'core' ? 'lucide:shield' : 'lucide:lock'
                "
                class="h-3 w-3" />
              {{ tierLabel }}
            </span>
            <code class="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">
              {{ config.schemaId }}
            </code>
            <span class="text-[10px] text-muted-foreground">v{{ config.schemaVersion }}</span>
          </div>

          <!-- Description -->
          <input
            v-model="description"
            type="text"
            placeholder="Describe what this type represents..."
            :disabled="readonly"
            class="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-ring/30 rounded px-1 -mx-1 disabled:cursor-not-allowed"
            @blur="onDescriptionBlur" />
        </div>

        <!-- Record count link → dedicated /workspace/browse/:entityType page -->
        <NuxtLink
          v-if="showBrowseRecordsLink"
          :to="wp(`/workspace/browse/${config.type}`)"
          class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="View records">
          <Icon name="lucide:database" class="h-3.5 w-3.5" />
          <span class="font-medium">{{ recordCount }}</span>
          <span>{{ recordCount === 1 ? 'record' : 'records' }}</span>
          <Icon name="lucide:arrow-up-right" class="h-3 w-3 opacity-60" />
        </NuxtLink>
      </div>

      <!-- Tier warning -->
      <div
        v-if="readonly"
        class="flex items-start gap-2 border-t border-border/60 bg-muted/20 px-5 py-2.5 rounded-b-xl">
        <Icon name="lucide:lock" class="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p class="text-[11px] text-muted-foreground">
          This schema is managed by the {{ config.tier }}-tier and cannot be modified from the UI. Custom types (tier =
          <code class="bg-muted/40 px-1 rounded">user</code>
          ) can be edited freely.
        </p>
      </div>
    </div>

    <!-- ── Fields ───────────────────────────────────────────────────── -->
    <div class="rounded-xl border border-border bg-card">
      <!-- Fields header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-border">
        <div class="flex items-center gap-2">
          <Icon name="lucide:list" class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-medium">Fields</h2>
          <span class="text-[11px] text-muted-foreground">
            {{ fieldCount }} {{ fieldCount === 1 ? 'field' : 'fields' }}
            <span v-if="requiredCount > 0" class="text-amber-500 ml-1">· {{ requiredCount }} required</span>
          </span>
          <Icon
            v-if="isSaving"
            name="svg-spinners:ring-resize"
            class="h-3 w-3 text-muted-foreground ml-1"
            title="Saving…" />
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="ghost" size="sm" :disabled="readonly || isSaving" @click="handleAddField">
            <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
            Add field
          </UiButton>
        </div>
      </div>

      <!-- Fields list -->
      <div v-if="fields.length > 0" class="divide-y divide-border/60">
        <div
          v-for="(field, index) in fields"
          :key="field._key"
          :class="{
            'bg-primary/5': dragSourceIndex === index,
            'outline outline-primary/40 -outline-offset-1':
              dragOverIndex === index && dragSourceIndex !== null && dragSourceIndex !== index,
          }">
          <SchemaFieldRow
            :field="field"
            :index="index"
            :total="fields.length"
            :readonly="readonly"
            @update="(patch) => handleFieldUpdate(index, patch)"
            @remove="handleFieldRemove(index)"
            @move="(dir) => handleFieldMove(index, dir)"
            @drag-start="(i) => onDragStart(i)"
            @drag-over="(i) => onDragOver(i)"
            @drop="(i) => onDrop(i)"
            @drag-end="onDragEnd" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center gap-2 py-10 text-center">
        <Icon name="lucide:list-plus" class="h-10 w-10 text-muted-foreground/30" />
        <p class="text-sm text-muted-foreground">No fields defined yet</p>
        <UiButton v-if="!readonly" variant="outline" size="sm" @click="handleAddField">
          <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
          Add your first field
        </UiButton>
      </div>

      <!-- Title field warning -->
      <div
        v-if="!hasTitleField && fields.length > 0"
        class="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/5 px-5 py-2.5">
        <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <p class="text-[11px] text-amber-500">
          No
          <code class="bg-amber-500/10 px-1 rounded">title</code>
          field is defined. Records of this type will not have a display name.
        </p>
      </div>
    </div>

    <!-- ── Stats / meta footer ──────────────────────────────────────── -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Entity class</div>
        <div class="text-sm font-medium mt-0.5 capitalize">{{ config.class }}</div>
      </div>
      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Fields</div>
        <div class="text-sm font-medium mt-0.5">{{ fieldCount }}</div>
      </div>
      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Records</div>
        <div class="text-sm font-medium mt-0.5">{{ recordCount }}</div>
      </div>
      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Projections</div>
        <div class="text-sm font-medium mt-0.5 truncate" :title="(config.projections || []).join(', ')">
          {{ (config.projections || []).join(', ') || '—' }}
        </div>
      </div>
    </div>
  </div>
</template>
