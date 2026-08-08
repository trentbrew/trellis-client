<script lang="ts" setup>
  import type { OntologySchemaField } from '~/lib/ontology-registry/schemas-to-server-types'
  import { resolveOntologyFieldWidget } from '~/lib/ontology-field-widget'
  import { titleCaseFieldName } from '~/lib/ontology-sidebar-fields'

  const props = withDefaults(
    defineProps<{
      field: OntologySchemaField
      modelValue: unknown
      readonly?: boolean
      variant?: 'pill' | 'stacked' | 'survey'
      owners?: { id: string; name: string }[]
      error?: string | null
    }>(),
    {
      readonly: false,
      variant: 'stacked',
      owners: () => [],
      error: null,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: unknown]
  }>()

  const widget = computed(() => resolveOntologyFieldWidget(props.field))
  const label = computed(() => titleCaseFieldName(props.field.name))
  const popoverOpen = ref(false)
  const localText = ref('')

  watch(
    () => props.modelValue,
    (value) => {
      localText.value = value != null ? String(value) : ''
    },
    { immediate: true },
  )

  const hasValue = computed(() => {
    const value = props.modelValue
    if (value == null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  })

  const triggerClass = computed(() => {
    const base =
      'max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left'
    return hasValue.value
      ? `${base} bg-muted/50 hover:bg-muted`
      : `${base} border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30`
  })

  const displayValue = computed(() => {
    const value = props.modelValue
    if (value == null || value === '') return null
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (props.field.valueType === 'date') {
      const date = new Date(value as string | number)
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }
    return String(value)
  })

  const ownerName = computed(() => {
    if (!props.modelValue) return null
    return props.owners?.find((owner) => owner.id === props.modelValue)?.name ?? String(props.modelValue)
  })

  function emitValue(value: unknown) {
    emit('update:modelValue', value)
  }

  function commitText() {
    let next: unknown = localText.value
    if (props.field.valueType === 'number') {
      const num = Number(localText.value)
      next = Number.isNaN(num) ? props.modelValue : num
    }
    emitValue(next)
    popoverOpen.value = false
  }

  function handleTextKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      commitText()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      localText.value = props.modelValue != null ? String(props.modelValue) : ''
      popoverOpen.value = false
    }
  }

  function selectOption(name: string) {
    emitValue(name)
    popoverOpen.value = false
  }

  function clearSelect() {
    emitValue('')
    popoverOpen.value = false
  }

  function toggleMultiSelect(name: string) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = current.indexOf(name)
    if (index === -1) current.push(name)
    else current.splice(index, 1)
    emitValue(current)
  }

  function isMultiSelected(name: string) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(name)
  }

  function toggleCheckbox() {
    if (props.readonly) return
    emitValue(!props.modelValue)
  }

  const stackedLabelClass = computed(() =>
    props.variant === 'survey'
      ? 'text-lg font-medium text-foreground'
      : 'text-sm font-medium text-foreground',
  )
</script>

<template>
  <!-- Stacked / survey: labeled full-width controls -->
  <div v-if="variant === 'stacked' || variant === 'survey'" class="space-y-1.5">
    <label :class="stackedLabelClass">
      {{ label }}
      <span v-if="field.required" class="text-destructive ml-0.5">*</span>
    </label>
    <p v-if="field.description" class="text-xs text-muted-foreground">{{ field.description }}</p>

    <UiCheckbox
      v-if="widget.kind === 'checkbox'"
      :checked="!!modelValue"
      :disabled="readonly"
      @update:checked="emitValue($event)" />

    <UiSelect
      v-else-if="(widget.kind === 'select' || widget.kind === 'status') && widget.hasSelectOptions"
      :model-value="(modelValue as string) || ''"
      :disabled="readonly"
      @update:model-value="emitValue($event)">
      <UiSelectTrigger>
        <UiSelectValue :placeholder="`Select ${label.toLowerCase()}`" />
      </UiSelectTrigger>
      <UiSelectContent>
        <UiSelectItem v-for="option in widget.selectOptions" :key="option.name" :value="option.name">
          {{ option.name }}
        </UiSelectItem>
      </UiSelectContent>
    </UiSelect>

    <div v-else-if="widget.kind === 'multi_select'" class="flex flex-wrap gap-2">
      <UiButton
        v-for="option in widget.selectOptions"
        :key="option.name"
        type="button"
        size="sm"
        :variant="isMultiSelected(option.name) ? 'default' : 'outline'"
        :disabled="readonly"
        @click="toggleMultiSelect(option.name)">
        {{ option.name }}
      </UiButton>
    </div>

    <UiDatepicker
      v-else-if="widget.kind === 'date'"
      :model-value="modelValue ? new Date(modelValue as string | number) : null"
      :disabled="readonly"
      @update:model-value="emitValue($event ? $event.getTime() : null)" />

    <UiSelect
      v-else-if="widget.kind === 'people' && owners.length"
      :model-value="(modelValue as string) || ''"
      :disabled="readonly"
      @update:model-value="emitValue($event)">
      <UiSelectTrigger>
        <UiSelectValue :placeholder="`Select ${label.toLowerCase()}`" />
      </UiSelectTrigger>
      <UiSelectContent>
        <UiSelectItem v-for="owner in owners" :key="owner.id" :value="owner.id">
          {{ owner.name }}
        </UiSelectItem>
      </UiSelectContent>
    </UiSelect>

    <UiTextarea
      v-else-if="widget.kind === 'rich_text'"
      :model-value="(modelValue as string) || ''"
      :placeholder="label"
      :disabled="readonly"
      :rows="4"
      @update:model-value="emitValue($event)" />

    <UiInput
      v-else-if="widget.kind === 'text'"
      :model-value="(modelValue as string) || ''"
      :type="widget.htmlInputType"
      :placeholder="label"
      :disabled="readonly"
      @update:model-value="emitValue($event)" />

    <p v-else class="text-sm text-muted-foreground">{{ displayValue || '—' }}</p>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
  </div>

  <!-- Pill: compact popover triggers (sidebar / property row) -->
  <template v-else>
    <button
      v-if="widget.kind === 'checkbox'"
      type="button"
      :class="triggerClass"
      :disabled="readonly"
      @click="toggleCheckbox">
      <Icon :name="modelValue ? 'lucide:check-square' : 'lucide:square'" class="h-3.5 w-3.5 shrink-0" />
      <span>{{ displayValue || 'No' }}</span>
    </button>

    <UiPopover
      v-else-if="(widget.kind === 'select' || widget.kind === 'status') && widget.hasSelectOptions"
      v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClass" :disabled="readonly">
          <span
            v-if="widget.kind === 'status' && modelValue"
            class="h-2 w-2 rounded-full shrink-0"
            :style="{
              backgroundColor:
                widget.selectOptions.find((option) => option.name === modelValue)?.color ||
                'var(--color-muted-foreground)',
            }" />
          <Icon v-else :name="widget.icon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate max-w-[140px]">{{ displayValue || label }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-44 p-1">
        <button
          v-for="option in widget.selectOptions"
          :key="option.name"
          type="button"
          class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
          @click="selectOption(option.name)">
          <span
            v-if="option.color"
            class="h-2.5 w-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: option.color }" />
          <span class="flex-1">{{ option.name }}</span>
          <Icon v-if="modelValue === option.name" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
        </button>
        <button
          v-if="hasValue"
          type="button"
          class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted text-muted-foreground border-t border-border mt-1 pt-1.5"
          @click="clearSelect">
          Clear
        </button>
      </UiPopoverContent>
    </UiPopover>

    <UiPopover v-else-if="widget.kind === 'multi_select'" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClass" :disabled="readonly">
          <Icon :name="widget.icon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate max-w-[140px]">{{ displayValue || label }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-48 p-1">
        <button
          v-for="option in widget.selectOptions"
          :key="option.name"
          type="button"
          class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
          @click="toggleMultiSelect(option.name)">
          <Icon
            :name="isMultiSelected(option.name) ? 'lucide:check-square' : 'lucide:square'"
            class="h-3.5 w-3.5"
            :class="isMultiSelected(option.name) ? 'text-primary' : 'text-muted-foreground'" />
          <span class="flex-1">{{ option.name }}</span>
        </button>
      </UiPopoverContent>
    </UiPopover>

    <UiPopover v-else-if="widget.kind === 'date'" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClass" :disabled="readonly">
          <Icon :name="widget.icon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate max-w-[140px]">{{ displayValue || label }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-auto p-0">
        <UiDatepicker
          :model-value="modelValue ? new Date(modelValue as string | number) : null"
          @update:model-value="emitValue($event ? $event.getTime() : null)" />
      </UiPopoverContent>
    </UiPopover>

    <UiPopover v-else-if="widget.kind === 'people' && owners.length" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClass" :disabled="readonly">
          <Icon :name="widget.icon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate max-w-[140px]">{{ ownerName || label }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-y-auto">
        <button
          v-for="owner in owners"
          :key="owner.id"
          type="button"
          class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
          @click="
            () => {
              emitValue(owner.id)
              popoverOpen = false
            }
          ">
          <span class="flex-1 truncate">{{ owner.name }}</span>
          <Icon v-if="modelValue === owner.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
        </button>
      </UiPopoverContent>
    </UiPopover>

    <UiPopover v-else-if="widget.isTextLike" v-model:open="popoverOpen">
      <UiPopoverTrigger as-child>
        <button type="button" :class="triggerClass" :disabled="readonly">
          <Icon :name="widget.icon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate max-w-[140px]">{{ displayValue || label }}</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-56 p-2">
        <input
          v-model="localText"
          :type="widget.htmlInputType"
          :placeholder="label"
          :readonly="readonly"
          class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
          @blur="commitText"
          @keydown="handleTextKeydown" />
      </UiPopoverContent>
    </UiPopover>

    <span
      v-else
      class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground truncate">
      {{ displayValue || '—' }}
    </span>
  </template>
</template>
