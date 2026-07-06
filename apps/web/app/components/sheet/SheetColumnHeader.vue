<script setup lang="ts">
  import type { SheetColumn } from '~/types/sheet'
  import TypeTag from '~/components/data/TypeTag.vue'
  import { columnIndexToLetter } from '~/lib/sheet-a1'

  const props = defineProps<{
    column: SheetColumn
    colIndex: number
    dragging?: boolean
    dropBefore?: boolean
  }>()

  const emit = defineEmits<{
    dragstart: [colIndex: number]
    dragover: [colIndex: number]
    dragend: []
    drop: [colIndex: number]
  }>()

  function onDragStart(e: DragEvent) {
    e.dataTransfer?.setData('text/plain', String(props.colIndex))
    e.dataTransfer!.effectAllowed = 'move'
    emit('dragstart', props.colIndex)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'move'
    emit('dragover', props.colIndex)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    emit('drop', props.colIndex)
  }
</script>

<template>
  <th
    class="border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-opacity"
    :class="{
      'opacity-45 bg-muted': dragging,
      'shadow-[inset_3px_0_0_var(--selection)]': dropBefore,
    }"
    scope="col"
    draggable="true"
    :aria-label="`Reorder column ${column.label || column.attribute}`"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragend="emit('dragend')"
    @drop="onDrop"
  >
    <div class="flex items-center gap-2">
      <span
        class="cursor-grab select-none font-mono text-[12px] text-muted-foreground/50 active:cursor-grabbing"
        aria-hidden="true"
      >
        ≡
      </span>
      <span class="font-data text-[10px] text-muted-foreground/70">{{ columnIndexToLetter(colIndex) }}</span>
      <span class="truncate">{{ column.label || column.attribute }}</span>
      <TypeTag :kind="column.kind" :relation-target="column.relationType" />
    </div>
  </th>
</template>
