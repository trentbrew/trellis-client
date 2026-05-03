<script setup lang="ts">
import { ref, computed, watch, type Ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { useTableHandleState } from '~/composables/useTableHandleState'
import { rowDragStart, colDragStart, dragEnd } from '~/lib/table/table-handle-plugin'

const props = defineProps<{
  editor: Editor | null
}>()

const editorRef = computed(() => props.editor) as Ref<Editor | null>
const state = useTableHandleState(editorRef)

const isRowVisible = ref(true)
const isColumnVisible = ref(true)
const menuOpen = ref<null | 'row' | 'column'>(null)

const rowHandleStyle = computed(() => {
  const s = state.value
  if (!s?.referencePosCell || !s?.referencePosTable) return {}

  const tableRect = s.referencePosTable
  const cellRect = s.referencePosCell

  return {
    position: 'fixed' as const,
    left: `${tableRect.left}px`,
    top: `${cellRect.top}px`,
    height: `${cellRect.height}px`,
    transform: 'translateX(-100%)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 50,
  }
})

const colHandleStyle = computed(() => {
  const s = state.value
  if (!s?.referencePosCell || !s?.referencePosTable) return {}

  const tableRect = s.referencePosTable
  const cellRect = s.referencePosCell

  return {
    position: 'fixed' as const,
    top: `${tableRect.top}px`,
    left: `${cellRect.left}px`,
    width: `${cellRect.width}px`,
    transform: 'translateY(-100%)',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 50,
  }
})

const hasValidRowIndex = computed(() => typeof state.value?.rowIndex === 'number')
const hasValidColIndex = computed(() => typeof state.value?.colIndex === 'number')

const shouldShowRow = computed(
  () =>
    (isRowVisible.value && state.value?.show && hasValidRowIndex.value) ||
    menuOpen.value === 'row',
)

const shouldShowColumn = computed(
  () =>
    (isColumnVisible.value && state.value?.show && hasValidColIndex.value) ||
    menuOpen.value === 'column',
)

const widgetContainer = computed(() => state.value?.widgetContainer)

function onRowDragStart(event: DragEvent) {
  const target = event.currentTarget as Element
  rowDragStart({
    dataTransfer: event.dataTransfer,
    currentTarget: target,
    clientY: event.clientY,
  })
}

function onColDragStart(event: DragEvent) {
  const target = event.currentTarget as Element
  colDragStart({
    dataTransfer: event.dataTransfer,
    currentTarget: target,
    clientX: event.clientX,
  })
}

function onDragEnd() {
  dragEnd()
}

function onRowContextMenu(event: MouseEvent) {
  event.preventDefault()
  menuOpen.value = menuOpen.value === 'row' ? null : 'row'
}

function onColContextMenu(event: MouseEvent) {
  event.preventDefault()
  menuOpen.value = menuOpen.value === 'column' ? null : 'column'
}

function onRowClick() {
  if (!props.editor || state.value?.rowIndex === undefined) return
  props.editor.commands.freezeHandles()
  menuOpen.value = menuOpen.value === 'row' ? null : 'row'
}

function onColClick() {
  if (!props.editor || state.value?.colIndex === undefined) return
  const editor = props.editor

  editor.commands.freezeHandles()
  menuOpen.value = menuOpen.value === 'column' ? null : 'column'
}

function closeMenu() {
  menuOpen.value = null
  props.editor?.commands.unfreezeHandles()
}

// Close menu when clicking outside
watch(menuOpen, (val) => {
  if (val) {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.table-handle-menu')) {
        closeMenu()
        document.removeEventListener('mousedown', handler)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
  }
})
</script>

<template>
  <Teleport v-if="widgetContainer && state" to="body">
    <!-- Row handle -->
    <div
      v-if="shouldShowRow"
      :style="rowHandleStyle"
      class="table-handle-row"
      @contextmenu="onRowContextMenu"
    >
      <button
        class="table-handle-button table-handle-button--row"
        draggable="true"
        type="button"
        aria-label="Drag to move row"
        @dragstart="onRowDragStart"
        @dragend="onDragEnd"
        @click="onRowClick"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2.5" cy="2" r="1.5" />
          <circle cx="7.5" cy="2" r="1.5" />
          <circle cx="2.5" cy="7" r="1.5" />
          <circle cx="7.5" cy="7" r="1.5" />
          <circle cx="2.5" cy="12" r="1.5" />
          <circle cx="7.5" cy="12" r="1.5" />
        </svg>
      </button>

      <!-- Row context menu -->
      <div
        v-if="menuOpen === 'row'"
        class="table-handle-menu"
        @mousedown.stop
      >
        <button class="table-handle-menu-item" @click="editor?.chain().focus().addRowBefore().run(); closeMenu()">
          Insert row above
        </button>
        <button class="table-handle-menu-item" @click="editor?.chain().focus().addRowAfter().run(); closeMenu()">
          Insert row below
        </button>
        <div class="table-handle-menu-separator" />
        <button class="table-handle-menu-item" @click="editor?.chain().focus().deleteRow().run(); closeMenu()">
          Delete row
        </button>
      </div>
    </div>

    <!-- Column handle -->
    <div
      v-if="shouldShowColumn"
      :style="colHandleStyle"
      class="table-handle-col"
      @contextmenu="onColContextMenu"
    >
      <button
        class="table-handle-button table-handle-button--col"
        draggable="true"
        type="button"
        aria-label="Drag to move column"
        @dragstart="onColDragStart"
        @dragend="onDragEnd"
        @click="onColClick"
      >
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
          <circle cx="2" cy="2.5" r="1.5" />
          <circle cx="7" cy="2.5" r="1.5" />
          <circle cx="12" cy="2.5" r="1.5" />
          <circle cx="2" cy="7.5" r="1.5" />
          <circle cx="7" cy="7.5" r="1.5" />
          <circle cx="12" cy="7.5" r="1.5" />
        </svg>
      </button>

      <!-- Column context menu -->
      <div
        v-if="menuOpen === 'column'"
        class="table-handle-menu"
        @mousedown.stop
      >
        <button class="table-handle-menu-item" @click="editor?.chain().focus().addColumnBefore().run(); closeMenu()">
          Insert column before
        </button>
        <button class="table-handle-menu-item" @click="editor?.chain().focus().addColumnAfter().run(); closeMenu()">
          Insert column after
        </button>
        <div class="table-handle-menu-separator" />
        <button class="table-handle-menu-item" @click="editor?.chain().focus().deleteColumn().run(); closeMenu()">
          Delete column
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.table-handle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: grab;
  color: var(--color-neutral-400);
  background: var(--color-neutral-100);
  transition: all 150ms ease;
  padding: 2px;
}

.table-handle-button:hover {
  background: var(--color-neutral-200);
  color: var(--color-neutral-600);
}

.table-handle-button:active {
  cursor: grabbing;
}

.table-handle-button--row {
  width: 16px;
  height: 24px;
}

.table-handle-button--col {
  width: 24px;
  height: 16px;
}

:root.dark .table-handle-button {
  background: var(--color-neutral-800);
  color: var(--color-neutral-500);
}

:root.dark .table-handle-button:hover {
  background: var(--color-neutral-700);
  color: var(--color-neutral-300);
}

.table-handle-menu {
  position: absolute;
  z-index: 50;
  min-width: 180px;
  background: var(--color-white, #fff);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 4px;
  top: 100%;
  left: 0;
}

:root.dark .table-handle-menu {
  background: var(--color-neutral-900);
  border-color: var(--color-neutral-700);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.table-handle-menu-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  text-align: left;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-neutral-700);
  cursor: pointer;
  transition: background 100ms ease;
}

.table-handle-menu-item:hover {
  background: var(--color-neutral-100);
}

:root.dark .table-handle-menu-item {
  color: var(--color-neutral-300);
}

:root.dark .table-handle-menu-item:hover {
  background: var(--color-neutral-800);
}

.table-handle-menu-separator {
  height: 1px;
  background: var(--color-neutral-200);
  margin: 4px 8px;
}

:root.dark .table-handle-menu-separator {
  background: var(--color-neutral-700);
}
</style>
