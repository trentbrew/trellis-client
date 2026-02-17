import { watch } from 'vue'
import { useThemeStore } from '~/stores/theme'

/**
 * Client-side plugin to initialize theme on app startup.
 * The store's setPreset() already calls applyThemePreset(), so we only
 * need to re-apply when colorMode changes (light ↔ dark toggle).
 *
 * Also watches the workspace brand config for a bound theme preset.
 * When a world has a theme.presetId, it takes priority over the user's
 * localStorage preference.
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

  // Watch brand config for workspace-scoped theme preset
  const { themePresetId } = useBrandConfig()
  watch(
    themePresetId,
    (presetId) => {
      const mode = colorMode.value as 'light' | 'dark'
      themeStore.setWorkspacePreset(presetId, mode)
      if (!presetId) {
        // No workspace preset — fall back to user's saved preference
        themeStore.initTheme()
      }
    },
  )
})
