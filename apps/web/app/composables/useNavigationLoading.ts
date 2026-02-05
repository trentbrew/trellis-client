/**
 * Composable for managing navigation loading state
 * Provides immediate visual feedback during route transitions
 */
export const useNavigationLoading = () => {
  const isNavigating = useState<boolean>('navigation:isNavigating', () => false)
  const targetPath = useState<string | null>('navigation:targetPath', () => null)

  const startNavigation = (path: string) => {
    isNavigating.value = true
    targetPath.value = path
  }

  const endNavigation = () => {
    isNavigating.value = false
    targetPath.value = null
  }

  return {
    isNavigating: readonly(isNavigating),
    targetPath: readonly(targetPath),
    startNavigation,
    endNavigation,
  }
}
