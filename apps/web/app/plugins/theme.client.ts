import { watch } from 'vue'
import { useThemeStore } from '~/stores/theme'

/**
 * Client-side plugin to initialize theme on app startup.
 * The store's setPreset() already calls applyThemePreset(), so we only
 * need to re-apply when colorMode changes (light ↔ dark toggle).
 */
export default defineNuxtPlugin(() => {
  const themeStore = useThemeStore()
  const colorMode = useColorMode()

  // Default to dark if no stored preference
  if (!localStorage.getItem('platform-sandbox-color-mode')) {
    colorMode.preference = 'dark'
  }

  // Initialize theme (loads saved preset + applies it)
  themeStore.initTheme()

  // Re-apply current preset when color mode toggles
  watch(
    () => colorMode.value,
    (mode) => {
      if (themeStore.currentPresetId) {
        themeStore.setPreset(themeStore.currentPresetId, mode as 'light' | 'dark')
      }
    },
  )
})
