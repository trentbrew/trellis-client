const _rightSidebarWidth = ref(0)

export function useRightSidebarWidth() {
  return {
    rightSidebarWidth: readonly(_rightSidebarWidth),
    setRightSidebarWidth: (w: number) => {
      _rightSidebarWidth.value = w
    },
  }
}
