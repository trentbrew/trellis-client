<script setup lang="ts">
  import type { NodeProps } from '@vue-flow/core'
  import type { CanvasLayoutNode } from '~/types/canvas'
  import type { Entity } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import CanvasNodeWrapper from '~/components/canvas/CanvasNodeWrapper.vue'
  import EntityCard from '~/components/entity/cards/EntityCard.vue'

  export type CanvasEntityNodeData = {
    layoutNode: CanvasLayoutNode
  }

  const props = defineProps<NodeProps<CanvasEntityNodeData>>()

  const openCanvasEntity = inject<(entityId: string) => void>('openCanvasEntity', () => {})

  const entityId = computed(() => props.data.layoutNode.entityId ?? '')
  const { items } = useEntities()

  const entity = computed(() => (items.value || []).find((e) => e.id === entityId.value) ?? null)

  const typeConfig = computed(() => {
    const type = entity.value?.type
    return type ? getEntityTypeConfig(type) : null
  })

  const isStale = computed(() => entityId.value && !entity.value)

  const label = computed(() => entity.value?.title || typeConfig.value?.label || 'Entity')

  function openDetails() {
    if (entityId.value) openCanvasEntity(entityId.value)
  }
</script>

<template>
  <CanvasNodeWrapper
    :node-id="id"
    :selected="selected"
    :label="label"
    :min-width="200"
    :min-height="160"
    show-details
    selected-ring-class="ring-2 ring-violet-400/60"
    @details="openDetails"
    @dblclick.stop="openDetails">
    <template #icon>
      <Icon
        :name="typeConfig?.icon ?? 'lucide:box'"
        class="h-3.5 w-3.5 shrink-0 text-violet-400" />
    </template>

    <div class="canvas-entity-node h-full min-h-0 overflow-hidden" data-testid="canvas-entity-node">
      <div
        v-if="isStale"
        class="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground"
        aria-label="Entity removed">
        Entity removed
      </div>
      <div
        v-else-if="entity"
        class="nodrag pointer-events-none h-full min-h-0 overflow-auto canvas-entity-preview">
        <EntityCard :item="entity as Entity" layout="grid" class="canvas-entity-preview-card" />
      </div>
      <div v-else class="flex h-full items-center justify-center px-3 text-xs text-muted-foreground">Loading…</div>
    </div>
  </CanvasNodeWrapper>
</template>

<style scoped>
  .canvas-entity-preview :deep(.canvas-entity-preview-card) {
    height: 100%;
    min-height: 0;
    cursor: default;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .canvas-entity-preview :deep(.canvas-entity-preview-card:hover) {
    box-shadow: none;
  }
</style>
