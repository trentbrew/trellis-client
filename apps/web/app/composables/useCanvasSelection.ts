/** Selected canvas node — no graph writes. */
export function useCanvasSelection() {
  const selectedNodeId = ref<string | null>(null)

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function clearSelection() {
    selectedNodeId.value = null
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, [contenteditable="true"]')) return
    return selectedNodeId.value
  }

  return {
    selectedNodeId,
    selectNode,
    clearSelection,
    onKeyDown,
  }
}
