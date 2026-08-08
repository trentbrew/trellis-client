<script setup lang="ts">
  import type { EntityType, PropertyFieldId, PropertyFieldConfig } from '~/types/entity'
  import { resolveFieldEditorConfig, type SelectOption } from '~/lib/fieldEditorConfig'

  interface Props {
    /** The field ID from PropertyFieldId */
    fieldId: PropertyFieldId
    /** Current value of the field */
    modelValue: unknown
    /** Entity type — needed to resolve type-specific options (e.g. status) */
    entityType?: EntityType
    /** PropertyFieldConfig from the registry (optional — resolved from fieldId if omitted) */
    fieldConfig?: PropertyFieldConfig
    /** Display variant */
    display?: 'pill' | 'cell' | 'badge'
    /** Read-only mode */
    readonly?: boolean
    /** Owner list for the owner picker */
    owners?: { id: string; name: string }[]
    /** Compact — hide label, smaller trigger */
    compact?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    entityType: undefined,
    fieldConfig: undefined,
    display: 'pill',
    readonly: false,
    owners: () => [],
    compact: false,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: unknown]
  }>()

  // ── Resolve editor config ──────────────────────────────────────────────────

  const editorConfig = computed(() => resolveFieldEditorConfig(props.fieldId, props.entityType))

  const fieldLabel = computed(() => props.fieldConfig?.label ?? props.fieldId)
  const fieldIcon = computed(() => props.fieldConfig?.icon ?? 'lucide:circle')

  // ── Popover state ──────────────────────────────────────────────────────────

  const popoverOpen = ref(false)

  // ── Local value for text-like inputs (commit on blur/enter) ────────────────

  const localTextValue = ref('')

  watch(
    () => props.modelValue,
    (v) => { localTextValue.value = v != null ? String(v) : '' },
    { immediate: true },
  )

  const commitTextValue = () => {
    const type = editorConfig.value.editorType
    let processed: unknown = localTextValue.value
    if (type === 'number') {
      const num = Number(localTextValue.value)
      processed = isNaN(num) ? props.modelValue : num
    }
    emit('update:modelValue', processed)
    popoverOpen.value = false
  }

  const handleTextKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitTextValue()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      localTextValue.value = props.modelValue != null ? String(props.modelValue) : ''
      popoverOpen.value = false
    }
  }

  // ── Select helpers ─────────────────────────────────────────────────────────

  const currentOption = computed((): SelectOption | undefined => {
    if (editorConfig.value.editorType !== 'select') return undefined
    return editorConfig.value.options?.find(o => o.value === props.modelValue)
  })

  const selectOption = (value: string) => {
    emit('update:modelValue', value)
    popoverOpen.value = false
  }

  const clearSelect = () => {
    emit('update:modelValue', '')
    popoverOpen.value = false
  }

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  const toggleValue = () => {
    if (props.readonly) return
    emit('update:modelValue', !props.modelValue)
  }

  // ── Date helpers ───────────────────────────────────────────────────────────

  const dateDisplay = computed(() => {
    if (!props.modelValue) return null
    try {
      return new Date(props.modelValue as string | number).toLocaleDateString()
    } catch {
      return String(props.modelValue)
    }
  })

  const dateModelValue = computed({
    get: () => {
      if (!props.modelValue) return null
      try {
        return new Date(props.modelValue as string | number)
      } catch {
        return null
      }
    },
    set: (v: Date | null) => {
      if (!v) return
      emit('update:modelValue', v.getTime())
      popoverOpen.value = false
    },
  })

  // ── Owner picker helpers ───────────────────────────────────────────────────

  const ownerSearch = ref('')

  const filteredOwners = computed(() => {
    let list = props.owners
    if (ownerSearch.value) {
      const q = ownerSearch.value.toLowerCase()
      list = list.filter(o => o.name.toLowerCase().includes(q))
    }
    return list
  })

  const currentOwnerName = computed(() => {
    if (!props.modelValue) return null
    return props.owners.find(o => o.id === props.modelValue)?.name ?? null
  })

  const selectOwner = (ownerId: string | undefined) => {
    emit('update:modelValue', ownerId)
    popoverOpen.value = false
    ownerSearch.value = ''
  }

  // ── Color mapping ──────────────────────────────────────────────────────────

  const dotColor = (color?: string): string => {
    if (!color) return 'bg-muted-foreground'
    const map: Record<string, string> = {
      red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-500',
      yellow: 'bg-yellow-500', lime: 'bg-lime-500', green: 'bg-green-500',
      emerald: 'bg-emerald-500', teal: 'bg-teal-500', cyan: 'bg-cyan-500',
      sky: 'bg-sky-500', blue: 'bg-blue-500', indigo: 'bg-indigo-500',
      violet: 'bg-violet-500', purple: 'bg-purple-500', fuchsia: 'bg-fuchsia-500',
      pink: 'bg-pink-500', rose: 'bg-rose-500', slate: 'bg-slate-500',
      gray: 'bg-muted-foreground',
    }
    return map[color ?? ''] || map.gray || 'bg-muted-foreground'
  }

  const hasBadgeColor = (color?: string) => !!color?.includes(' ')

  const optionBadgeClass = (opt: SelectOption) =>
    hasBadgeColor(opt.color)
      ? ['inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none', opt.color]
      : ['inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium leading-none text-muted-foreground']

  const showSelectAsBadge = computed(
    () =>
      props.display === 'badge' ||
      props.display === 'pill' ||
      (props.display === 'cell' && !!currentOption.value && hasBadgeColor(currentOption.value.color)),
  )

  // ── Pill trigger classes ───────────────────────────────────────────────────

  const hasValue = computed(() => {
    const v = props.modelValue
    if (v == null || v === '' || v === false) return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  })

  const triggerClasses = computed(() => {
    if (props.display === 'cell' && !showSelectAsBadge.value) {
      return 'flex min-h-8 w-full items-center gap-1.5 px-1 text-left'
    }
    if (props.display === 'cell' && showSelectAsBadge.value) {
      return 'flex min-h-8 w-full items-center px-1 text-left'
    }
    // pill / badge
    const base = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors text-xs'
    if (!hasValue.value) {
      return `${base} border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30`
    }
    return `${base} bg-muted/50 hover:bg-muted`
  })

  // ── Input type resolution ──────────────────────────────────────────────────

  const htmlInputType = computed(() => {
    switch (editorConfig.value.editorType) {
      case 'number': return 'number'
      case 'email': return 'email'
      case 'url': return 'url'
      case 'tel': return 'tel'
      default: return 'text'
    }
  })

  const isTextLike = computed(() => {
    return ['text', 'number', 'email', 'url', 'tel'].includes(editorConfig.value.editorType)
  })
</script>

<template>
  <div class="entity-field-editor" :class="{ 'opacity-60 pointer-events-none': readonly && display !== 'badge' }">

    <!-- ── Toggle (inline, no popover) ──────────────────────────────────── -->
    <button
      v-if="editorConfig.editorType === 'toggle'"
      type="button"
      :class="[
        triggerClasses,
        modelValue ? 'text-primary' : '',
      ]"
      :disabled="readonly"
      @click="toggleValue">
      <Icon :name="fieldIcon" class="h-3.5 w-3.5" />
      <span v-if="!compact">{{ fieldLabel }}</span>
      <Icon
        :name="modelValue ? 'lucide:toggle-right' : 'lucide:toggle-left'"
        class="h-4 w-4"
        :class="modelValue ? 'text-primary' : 'text-muted-foreground'" />
    </button>

    <!-- ── Readonly / badge ─────────────────────────────────────────────── -->
    <div
      v-else-if="editorConfig.editorType === 'readonly' || display === 'badge'"
      :class="triggerClasses">
      <Icon :name="fieldIcon" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="truncate max-w-[120px]">{{ modelValue || fieldLabel }}</span>
    </div>

    <!-- ── Tags (special — uses TagsSection) ────────────────────────────── -->
    <div v-else-if="editorConfig.editorType === 'tags'" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/30 border border-border/40">
      <slot name="tags">
        <Icon name="lucide:hash" class="h-3 w-3 text-muted-foreground" />
        <span class="text-xs text-muted-foreground">{{ Array.isArray(modelValue) && modelValue.length ? `${modelValue.length} tags` : 'Tags' }}</span>
      </slot>
    </div>

    <!-- ── Select (popover with option list) ────────────────────────────── -->
    <UiPopover v-else-if="editorConfig.editorType === 'select'" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClasses" :disabled="readonly">
          <template v-if="currentOption && showSelectAsBadge">
            <span :class="optionBadgeClass(currentOption)">
              <Icon v-if="currentOption.icon" :name="currentOption.icon" class="h-3 w-3 shrink-0" />
              <span class="truncate">{{ currentOption.label }}</span>
            </span>
          </template>
          <template v-else-if="currentOption">
            <span
              v-if="currentOption.color && !hasBadgeColor(currentOption.color)"
              class="h-2 w-2 shrink-0 rounded-full"
              :class="dotColor(currentOption.color)" />
            <Icon v-else-if="currentOption.icon" :name="currentOption.icon" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate max-w-[120px]">{{ currentOption.label }}</span>
          </template>
          <template v-else>
            <Icon :name="fieldIcon" class="h-3.5 w-3.5" />
            <span v-if="!compact">{{ editorConfig.placeholder || fieldLabel }}</span>
          </template>
          <Icon
            v-if="display === 'cell' && !showSelectAsBadge"
            name="lucide:chevron-down"
            class="ml-auto h-3 w-3 shrink-0 opacity-50" />
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" :side-offset="4" class="w-52 p-1">
        <button
          v-for="opt in editorConfig.options"
          :key="opt.value"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
          @click="selectOption(opt.value)">
          <span v-if="hasBadgeColor(opt.color)" :class="optionBadgeClass(opt)">
            <Icon v-if="opt.icon" :name="opt.icon" class="h-3 w-3 shrink-0" />
            <span class="truncate">{{ opt.label }}</span>
          </span>
          <template v-else>
            <span
              v-if="opt.color"
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :class="dotColor(opt.color)" />
            <Icon v-else-if="opt.icon" :name="opt.icon" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
          </template>
          <Icon v-if="modelValue === opt.value" name="lucide:check" class="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />
        </button>
        <button
          v-if="hasValue"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors text-left border-t border-border mt-1 pt-1"
          @click="clearSelect">
          <Icon name="lucide:x" class="h-3 w-3" />
          <span>Clear</span>
        </button>
      </UiPopoverContent>
    </UiPopover>

    <!-- ── Date (popover with date picker) ──────────────────────────────── -->
    <UiPopover v-else-if="editorConfig.editorType === 'date'" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClasses" :disabled="readonly">
          <Icon :name="fieldIcon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">{{ dateDisplay || editorConfig.placeholder || fieldLabel }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" :side-offset="4" class="w-auto p-0">
        <UiDatepicker v-model="dateModelValue" />
      </UiPopoverContent>
    </UiPopover>

    <!-- ── Owner picker (popover with search) ───────────────────────────── -->
    <UiPopover v-else-if="editorConfig.editorType === 'owner'" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClasses" :disabled="readonly">
          <Icon name="lucide:user" class="h-3.5 w-3.5" />
          <span class="truncate max-w-[120px]">{{ currentOwnerName || 'Owner' }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
        <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
          <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            v-model="ownerSearch"
            type="text"
            placeholder="Search..."
            class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            @click.stop />
        </div>
        <div class="overflow-y-auto max-h-52">
          <button
            v-if="hasValue"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
            @click="selectOwner(undefined)">
            <Icon name="lucide:x" class="h-3.5 w-3.5" />
            No assignee
          </button>
          <button
            v-for="o in filteredOwners"
            :key="o.id"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="selectOwner(o.id)">
            <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
              {{ o.name.slice(0, 2).toUpperCase() }}
            </div>
            <span class="flex-1">{{ o.name }}</span>
            <Icon v-if="modelValue === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
          <div v-if="filteredOwners.length === 0" class="px-2 py-3 text-center text-xs text-muted-foreground">
            No people found
          </div>
        </div>
      </UiPopoverContent>
    </UiPopover>

    <!-- ── Text-like inputs (popover with text input) ───────────────────── -->
    <UiPopover v-else-if="isTextLike" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClasses" :disabled="readonly">
          <Icon :name="fieldIcon" class="h-3.5 w-3.5" />
          <span class="truncate max-w-[120px]">{{ modelValue || editorConfig.placeholder || fieldLabel }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-56 p-2">
        <input
          v-model="localTextValue"
          :type="htmlInputType"
          :placeholder="editorConfig.placeholder"
          :readonly="readonly"
          class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
          @blur="commitTextValue"
          @keydown="handleTextKeydown" />
      </UiPopoverContent>
    </UiPopover>
  </div>
</template>
