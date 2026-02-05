import { watch } from 'vue'
import { useThemeStore } from '~/stores/theme'
import { applyThemePreset } from '~/utils/theme'

/**
 * Client-side plugin to initialize theme on app startup
 */
export default defineNuxtPlugin(() => {
  const themeStore = useThemeStore()
  const colorMode = useColorMode()

  // Initialize theme from localStorage
  themeStore.initTheme()

  // Watch for theme changes and reapply
  watch(
    () => themeStore.currentPresetId,
    (presetId) => {
      if (presetId) {
        const preset = themeStore.allPresets[presetId]
        if (preset) {
          applyThemePreset(preset, colorMode.value as 'light' | 'dark')
        }
      }
    },
    { immediate: true },
  )

  // Watch for color mode changes and reapply theme
  watch(
    () => colorMode.value,
    (mode) => {
      if (themeStore.currentPresetId) {
        const preset = themeStore.allPresets[themeStore.currentPresetId]
        if (preset) {
          applyThemePreset(preset, mode as 'light' | 'dark')
        }
      }
    },
  )
})
