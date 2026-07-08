<script setup lang="ts">
import type { Entity } from '~/types/entity'
import type { ViewFieldDefinition } from '~/lib/view-field-catalog'
import { schemaFieldToPropertyFieldId } from '~/lib/ontology-sidebar-fields'
import { formatFieldValue } from '~/utils/fieldFormatters'
import EntityFieldEditor from '~/components/entity/EntityFieldEditor.vue'

const props = withDefaults(
  defineProps<{
    item: Entity
    field: ViewFieldDefinition
    editable?: boolean
    showEmpty?: boolean
    /** `stack` = labeled block; `badge` = compact icon + value pill */
    variant?: 'stack' | 'badge'
  }>(),
  { editable: false, showEmpty: false, variant: 'stack' },
)

const emit = defineEmits<{
  'column-update': [key: string, value: unknown]
}>()

const record = computed(() => props.item as Record<string, unknown>)
const rawValue = computed(() => record.value[props.field.key])
const valueType = computed(() => props.field.valueType ?? 'rich_text')

const displayValue = computed(() => formatFieldValue(rawValue.value, valueType.value))

const isEmpty = computed(() => displayValue.value === '')

const propertyFieldId = computed(() => schemaFieldToPropertyFieldId(props.field.key))

const isEditable = computed(() => props.editable && !!propertyFieldId.value)

const showBadge = computed(() => props.showEmpty || !isEmpty.value)

const fieldIcon = computed(() => {
  switch (valueType.value) {
    case 'status':
    case 'select':
      return 'lucide:circle'
    case 'date':
      return 'lucide:calendar'
    case 'checkbox':
      return 'lucide:toggle-right'
    case 'number':
      return 'lucide:hash'
    case 'email':
      return 'lucide:mail'
    case 'phone_number':
      return 'lucide:phone'
    case 'url':
      return 'lucide:link'
    default:
      return 'lucide:text'
  }
})

function onEditorUpdate(value: unknown) {
  emit('column-update', props.field.key, value)
}
</script>

<template>
  <!-- Compact badge: icon + value, no label -->
  <span
    v-if="variant === 'badge' && showBadge"
    class="no-drag inline-flex max-w-full items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
    :title="isEmpty ? `${field.label}: —` : `${field.label}: ${displayValue}`"
    @click.stop>
    <Icon :name="fieldIcon" class="h-3 w-3 shrink-0 opacity-60" />
    <span v-if="isEditable" class="min-w-0" @click.stop>
      <EntityFieldEditor
        :field-id="propertyFieldId!"
        :model-value="rawValue"
        :entity-type="item.type"
        compact
        display="pill"
        @update:model-value="onEditorUpdate" />
    </span>
    <span v-else class="truncate text-foreground/85">{{ isEmpty ? '—' : displayValue }}</span>
  </span>

  <!-- Default stacked label + value -->
  <span
    v-else-if="showBadge"
    class="inline-flex min-h-8 max-w-full min-w-[5.5rem] flex-col justify-center gap-0.5 rounded bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground"
    :title="`${field.label}: ${isEmpty ? '—' : displayValue}`"
    @click.stop>
    <span class="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground/55">
      {{ field.label }}
    </span>
    <span v-if="isEditable" class="min-h-4 w-full min-w-0 overflow-hidden" @click.stop>
      <EntityFieldEditor
        :field-id="propertyFieldId!"
        :model-value="rawValue"
        :entity-type="item.type"
        compact
        display="pill"
        @update:model-value="onEditorUpdate" />
    </span>
    <span v-else class="truncate text-xs font-medium text-foreground/85">
      {{ isEmpty ? '—' : displayValue }}
    </span>
  </span>
</template>
