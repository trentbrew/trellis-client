<script setup lang="ts">
  import type { CanvasLayoutNode } from '~/types/canvas'

  const props = defineProps<{
    selectedNode: CanvasLayoutNode | null
    entityTitle?: string | null
    entityType?: string | null
  }>()

  const emit = defineEmits<{
    'open-entity': [entityId: string]
    'remove-node': []
    'update-sticky': [body: string]
  }>()

  const stickyDraft = ref('')

  watch(
    () => props.selectedNode,
    (node) => {
      stickyDraft.value = node?.kind === 'sticky' ? node.body ?? '' : ''
    },
    { immediate: true },
  )

  function commitSticky() {
    if (props.selectedNode?.kind === 'sticky') {
      emit('update-sticky', stickyDraft.value)
    }
  }
</script>

<template>
  <aside
    class="flex w-[280px] shrink-0 flex-col border-l border-border bg-card"
    aria-label="Canvas inspector"
    data-testid="canvas-inspector">
    <div class="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      Selection
    </div>

    <div v-if="!selectedNode" class="px-4 py-8 text-center text-xs text-muted-foreground">Select a node</div>

    <div v-else class="flex flex-1 flex-col gap-4 px-4 py-4">
      <div>
        <p class="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Type</p>
        <p class="text-sm text-foreground">
          {{ selectedNode.kind === 'sticky' ? 'Sticky note' : `Entity · ${entityType ?? 'ref'}` }}
        </p>
      </div>

      <div v-if="selectedNode.kind === 'entity-ref'">
        <p class="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Title</p>
        <p class="text-sm text-foreground">{{ entityTitle ?? '—' }}</p>
        <p class="mt-2 font-mono text-[10px] text-muted-foreground">
          x {{ Math.round(selectedNode.x) }} · y {{ Math.round(selectedNode.y) }}
        </p>
        <UiButton
          v-if="selectedNode.entityId"
          size="sm"
          class="mt-3 w-full"
          data-testid="canvas-open-entity"
          @click="emit('open-entity', selectedNode.entityId!)">
          Open entity
        </UiButton>
      </div>

      <div v-else>
        <p class="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Body</p>
        <textarea
          v-model="stickyDraft"
          class="min-h-[120px] w-full rounded-md border border-border bg-background px-2 py-2 text-xs"
          @change="commitSticky"
          @blur="commitSticky" />
      </div>

      <UiButton size="sm" variant="outline" class="mt-auto w-full" data-testid="canvas-remove-node" @click="emit('remove-node')">
        Remove from canvas
      </UiButton>
    </div>
  </aside>
</template>
