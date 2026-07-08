<script setup lang="ts">
  import type { NodeProps } from '@vue-flow/core'
  import type { CanvasLayoutNode } from '~/types/canvas'
  import CanvasNodeWrapper from '~/components/canvas/CanvasNodeWrapper.vue'

  export type CanvasStickyNodeData = {
    layoutNode: CanvasLayoutNode
  }

  const props = defineProps<NodeProps<CanvasStickyNodeData>>()

  const updateCanvasSticky = inject<(nodeId: string, body: string) => void>('updateCanvasSticky', () => {})

  const isEditing = ref(false)

  const body = computed({
    get: () => props.data.layoutNode.body ?? '',
    set: (value: string) => updateCanvasSticky(props.id, value),
  })

  const displayBody = computed(() => body.value || 'New note')

  function enterEditing() {
    isEditing.value = true
  }

  function exitEditing() {
    isEditing.value = false
  }

  watch(
    () => props.selected,
    (selected) => {
      if (!selected) {
        isEditing.value = false
        return
      }
      if (body.value === 'New note' || !body.value.trim()) {
        isEditing.value = true
      }
    },
  )
</script>

<template>
  <CanvasNodeWrapper
    :node-id="id"
    :selected="selected"
    label="Sticky note"
    :min-width="140"
    :min-height="96"
    bg-class="bg-[#fef08a]"
    border-class="border-[#facc15]/60"
    selected-ring-class="ring-2 ring-violet-400/70"
    @dblclick.stop="enterEditing">
    <template #icon>
      <Icon name="lucide:sticky-note" class="h-3.5 w-3.5 text-[#713f12]" />
    </template>

    <div class="flex h-full flex-col px-3 py-2 text-[#422006]" data-testid="canvas-sticky-node">
      <textarea
        v-if="isEditing"
        v-model="body"
        class="nodrag min-h-0 flex-1 w-full resize-none border-none bg-transparent text-xs leading-relaxed outline-none"
        aria-label="Sticky note"
        autofocus
        @click.stop
        @mousedown.stop
        @blur="exitEditing" />
      <p
        v-else
        class="nodrag min-h-0 flex-1 whitespace-pre-wrap text-xs leading-relaxed"
        @dblclick.stop="enterEditing">
        {{ displayBody }}
      </p>
    </div>
  </CanvasNodeWrapper>
</template>
