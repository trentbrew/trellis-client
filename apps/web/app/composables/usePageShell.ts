/**
 * Composable for page-level shell state
 *
 * Allows Page component to communicate with layout shell components
 * (AppHeader, AppSidebar) about visibility preferences.
 */

export function usePageShell() {
  // Whether the current page has disabled the sidebar
  const sidebarDisabled = useState<boolean>('pageShell:sidebarDisabled', () => false)

  const setSidebarDisabled = (disabled: boolean) => {
    sidebarDisabled.value = disabled
  }

  return {
    sidebarDisabled: computed(() => sidebarDisabled.value),
    setSidebarDisabled,
  }
}
