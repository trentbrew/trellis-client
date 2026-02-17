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
  import type { EntityType } from '~/types/entity'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const entityType = computed(() => props.modelValue?.type as EntityType | undefined)

  const panelComponents: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    task: defineAsyncComponent(() => import('./temporal/TaskContent.vue')),
    event: defineAsyncComponent(() => import('./temporal/EventContent.vue')),
    note: defineAsyncComponent(() => import('./document/NoteContent.vue')),
    file: defineAsyncComponent(() => import('./document/FileContent.vue')),
    bookmark: defineAsyncComponent(() => import('./document/BookmarkContent.vue')),
    diagram: defineAsyncComponent(() => import('~/components/editor/DiagramContent.vue')),
    goal: defineAsyncComponent(() => import('./container/GoalContent.vue')),
    // trip, sprint, milestone, budget, payment — use summary fallback
  }

  const SummaryPanel = defineAsyncComponent(() => import('./shared/EntitySummaryPanel.vue'))

  const currentPanel = computed(() => {
    if (!entityType.value) return SummaryPanel
    return panelComponents[entityType.value] ?? SummaryPanel
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
