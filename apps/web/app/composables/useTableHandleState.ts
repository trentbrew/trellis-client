import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { Editor } from '@tiptap/core'
import type { TableHandlesState } from '~/lib/table/table-handle-plugin'

export function useTableHandleState(editor: Ref<Editor | null | undefined>) {
  const state = ref<TableHandlesState | null>(null)

  const updateState = (newState: TableHandlesState) => {
    state.value = newState
  }

  let currentEditor: Editor | null = null

  const bind = (ed: Editor | null | undefined) => {
    if (currentEditor) {
      currentEditor.off('tableHandleState', updateState)
    }
    currentEditor = ed ?? null
    if (currentEditor) {
      currentEditor.on('tableHandleState', updateState)
    } else {
      state.value = null
    }
  }

  watch(editor, (ed) => bind(ed), { immediate: true })

  onUnmounted(() => {
    if (currentEditor) {
      currentEditor.off('tableHandleState', updateState)
      currentEditor = null
    }
  })

  return state
}
