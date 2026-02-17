const _openCount = ref(0)

export function useAnyDialogOpen() {
  const isAnyDialogOpen = computed(() => _openCount.value > 0)

  const registerOpen = () => { _openCount.value++ }
  const registerClose = () => { _openCount.value = Math.max(0, _openCount.value - 1) }

  return { isAnyDialogOpen, registerOpen, registerClose }
}
