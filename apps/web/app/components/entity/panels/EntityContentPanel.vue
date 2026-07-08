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
  import { getEntityClass } from '~/types/entity'
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
    canvas: defineAsyncComponent(() => import('./document/CanvasContent.vue')),
    diagram: defineAsyncComponent(() => import('~/components/editor-blocks/DiagramContent.vue')),
    email: defineAsyncComponent(() => import('./document/EmailContent.vue')),
    person: defineAsyncComponent(() => import('./actor/ActorBodyContent.vue')),
    contact: defineAsyncComponent(() => import('./actor/ActorBodyContent.vue')),
    vendor: defineAsyncComponent(() => import('./actor/ActorBodyContent.vue')),
    organization: defineAsyncComponent(() => import('./actor/ActorBodyContent.vue')),
    goal: defineAsyncComponent(() => import('./container/GoalContent.vue')),
    project: defineAsyncComponent(() => import('./container/ProjectContent.vue')),
  }

  // Class-level fallbacks for types without a specific panel
  const classFallbacks: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    temporal: defineAsyncComponent(() => import('./temporal/TaskContent.vue')),
    document: defineAsyncComponent(() => import('./document/NoteContent.vue')),
  }

  const SummaryPanel = defineAsyncComponent(() => import('./shared/EntitySummaryPanel.vue'))

  const currentPanel = computed(() => {
    if (!entityType.value) return SummaryPanel
    return panelComponents[entityType.value] ?? classFallbacks[getEntityClass(entityType.value)] ?? SummaryPanel
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
