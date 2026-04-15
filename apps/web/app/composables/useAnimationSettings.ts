/**
 * Composable for managing animation settings
 * Persists to localStorage and provides global state for enabling/disabling animations
 */
export const useAnimationSettings = () => {
  const STORAGE_KEY = 'animation-settings'

  // Global state using useState for SSR compatibility
  const animationsEnabled = useState<boolean>('animations:enabled', () => true)

  // Load from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored)
        animationsEnabled.value = parsed.enabled ?? true
      } catch {
        // Invalid JSON, use default
      }
    }
  }

  const setAnimationsEnabled = (enabled: boolean) => {
    animationsEnabled.value = enabled
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled }))
    }
  }

  const toggleAnimations = () => {
    setAnimationsEnabled(!animationsEnabled.value)
  }

  const resetAnimationSettings = () => {
    setAnimationsEnabled(true)
  }

  return {
    animationsEnabled: readonly(animationsEnabled),
    setAnimationsEnabled,
    toggleAnimations,
    resetAnimationSettings,
  }
}
