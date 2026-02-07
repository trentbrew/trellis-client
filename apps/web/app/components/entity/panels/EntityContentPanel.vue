<script lang="ts" setup>
  /**
   * Dynamic Entity Content Panel
   *
   * Resolves the correct type-specific content panel based on the entity's
   * `type` field. This is the bridge between the dialog shell and the
   * extracted panel components.
   *
   * Usage:
   *   <EntityContentPanel v-model="editableItem" :mode="mode" />
   */
  import type { CalendarItemType } from '~/types/calendarItem'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const entityType = computed(() => props.modelValue?.type as CalendarItemType | undefined)

  const panelComponents: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    task: defineAsyncComponent(() => import('./temporal/TaskContent.vue')),
    event: defineAsyncComponent(() => import('./temporal/EventContent.vue')),
    trip: defineAsyncComponent(() => import('./temporal/TripContent.vue')),
    payment: defineAsyncComponent(() => import('./temporal/PaymentContent.vue')),
    note: defineAsyncComponent(() => import('./document/NoteContent.vue')),
  }

  const currentPanel = computed(() => {
    if (!entityType.value) return null
    return panelComponents[entityType.value] ?? null
  })
</script>

<template>
  <component
    :is="currentPanel"
    v-if="currentPanel"
    :model-value="modelValue"
    :mode="mode"
    @update:model-value="$emit('update:modelValue', $event)" />
</template>
