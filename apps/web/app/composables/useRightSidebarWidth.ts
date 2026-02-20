const _rightSidebarWidth = ref(0)
const _isRightSidebarOpen = ref(false)

export function useRightSidebarWidth() {
  return {
    rightSidebarWidth: readonly(_rightSidebarWidth),
    setRightSidebarWidth: (w: number) => {
      _rightSidebarWidth.value = w
    },
    isRightSidebarOpen: readonly(_isRightSidebarOpen),
    toggleRightSidebar: () => {
      _isRightSidebarOpen.value = !_isRightSidebarOpen.value
    },
    setRightSidebarOpen: (v: boolean) => {
      _isRightSidebarOpen.value = v
    },
  }
}
