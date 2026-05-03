<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { TableMap } from '@tiptap/pm/tables'
import { useTableHandleState } from '~/composables/useTableHandleState'
import {
  EMPTY_CELL_HEIGHT,
  EMPTY_CELL_WIDTH,
  countEmptyRowsFromEnd,
  countEmptyColumnsFromEnd,
  marginRound,
  selectLastCell,
  runPreservingCursor,
} from '~/lib/table/utils'

const props = defineProps<{
  editor: Editor | null
}>()

const editorRef = computed(() => props.editor) as Ref<Editor | null>
const state = useTableHandleState(editorRef)

const widgetContainer = computed(() => state.value?.widgetContainer)

const containerRect = computed((): DOMRect | null => {
  // Access state.value so this re-measures after every plugin state change
  // (e.g. after adding/removing rows or columns)
  const _s = state.value
  if (!widgetContainer.value) return null
  const container = widgetContainer.value.parentElement?.querySelector('.table-container')
  return container?.getBoundingClientRect() ?? null
})

const rowButtonStyle = computed(() => {
  const s = state.value
  if (!s?.showAddOrRemoveRowsButton || !s?.referencePosTable) return { display: 'none' }

  const rect = containerRect.value ?? s.referencePosTable
  return {
    position: 'fixed' as const,
    top: `${rect.bottom + 2}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 50,
  }
})

const colButtonStyle = computed(() => {
  const s = state.value
  if (!s?.showAddOrRemoveColumnsButton || !s?.referencePosTable) return { display: 'none' }

  const rect = containerRect.value ?? s.referencePosTable
  return {
    position: 'fixed' as const,
    top: `${rect.top}px`,
    left: `${rect.right + 2}px`,
    height: `${rect.height}px`,
    display: 'flex',
    alignItems: 'center',
    zIndex: 50,
  }
})

// --- Drag-to-resize logic ---
const dragState = ref<{
  orientation: 'row' | 'column'
  startPos: number
  originalHeight: number
  originalWidth: number
} | null>(null)
const movedRef = ref(false)

function startDrag(orientation: 'row' | 'column', ev: MouseEvent) {
  const s = state.value
  if (!s) return

  const dims = TableMap.get(s.block)
  movedRef.value = false

  dragState.value = {
    orientation,
    startPos: orientation === 'row' ? ev.clientY : ev.clientX,
    originalHeight: dims.height,
    originalWidth: dims.width,
  }

  props.editor?.commands.freezeHandles()
  ev.preventDefault()
}

function handleClick(orientation: 'row' | 'column') {
  if (movedRef.value || !props.editor || !state.value) return

  const editor = props.editor
  const s = state.value
  const isRow = orientation === 'row'

  runPreservingCursor(editor, () => {
    selectLastCell(editor, s.block, s.blockPos, orientation)
    if (isRow) {
      editor.commands.addRowAfter()
    } else {
      editor.commands.addColumnAfter()
    }
  })
}

function handleMove(ev: MouseEvent) {
  const ds = dragState.value
  if (!ds || !props.editor || !state.value) return

  movedRef.value = true
  const editor = props.editor
  const s = state.value
  const isRow = ds.orientation === 'row'

  const currentPos = isRow ? ev.clientY : ev.clientX
  const diff = currentPos - ds.startPos
  const cellSize = isRow ? EMPTY_CELL_HEIGHT : EMPTY_CELL_WIDTH

  const currentDims = TableMap.get(s.block)
  const currentCount = isRow ? currentDims.height : currentDims.width
  const originalCount = isRow ? ds.originalHeight : ds.originalWidth

  const newCount = Math.max(1, originalCount + marginRound(diff / cellSize, 0.3))
  const delta = newCount - currentCount

  if (delta === 0) return

  if (delta > 0) {
    runPreservingCursor(editor, () => {
      selectLastCell(editor, s.block, s.blockPos, ds.orientation)
      for (let i = 0; i < delta; i++) {
        if (isRow) editor.commands.addRowAfter()
        else editor.commands.addColumnAfter()
      }
    })
  } else {
    runPreservingCursor(editor, () => {
      const absDelta = Math.abs(delta)
      const emptyCount = isRow
        ? countEmptyRowsFromEnd(editor, s.blockPos)
        : countEmptyColumnsFromEnd(editor, s.blockPos)

      const safeToRemove = Math.min(absDelta, emptyCount, currentCount - 1)
      selectLastCell(editor, s.block, s.blockPos, ds.orientation)

      for (let i = 0; i < safeToRemove; i++) {
        if (isRow) editor.commands.deleteRow()
        else editor.commands.deleteColumn()
      }
    })
  }
}

function handleUp() {
  dragState.value = null
  props.editor?.commands.unfreezeHandles()
}

onMounted(() => {
  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('mouseup', handleUp)
})
</script>

<template>
  <Teleport v-if="widgetContainer && state" to="body">
    <!-- Add row button (below table) -->
    <div :style="rowButtonStyle">
      <button
        class="table-extend-button table-extend-button--row"
        type="button"
        aria-label="Add or remove rows"
        :class="{ editing: dragState?.orientation === 'row' }"
        @click="handleClick('row')"
        @mousedown="startDrag('row', $event)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="6" y1="2" x2="6" y2="10" />
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      </button>
    </div>

    <!-- Add column button (right of table) -->
    <div :style="colButtonStyle">
      <button
        class="table-extend-button table-extend-button--col"
        type="button"
        aria-label="Add or remove columns"
        :class="{ editing: dragState?.orientation === 'column' }"
        @click="handleClick('column')"
        @mousedown="startDrag('column', $event)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="6" y1="2" x2="6" y2="10" />
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.table-extend-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-neutral-300);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-neutral-400);
  background: transparent;
  transition: all 150ms ease;
  opacity: 0.6;
}

.table-extend-button:hover {
  opacity: 1;
  background: var(--color-neutral-50);
  border-color: var(--color-neutral-400);
  color: var(--color-neutral-600);
}

.table-extend-button.editing {
  opacity: 1;
  cursor: ns-resize;
}

.table-extend-button--row {
  width: 100%;
  height: 20px;
  margin-top: 2px;
}

.table-extend-button--col {
  width: 20px;
  height: 100%;
  margin-left: 2px;
}

.table-extend-button--col.editing {
  cursor: ew-resize;
}

:root.dark .table-extend-button {
  border-color: var(--color-neutral-700);
  color: var(--color-neutral-500);
}

:root.dark .table-extend-button:hover {
  background: var(--color-neutral-800);
  border-color: var(--color-neutral-500);
  color: var(--color-neutral-300);
}
</style>
