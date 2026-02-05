import { computed, watch } from 'vue'
import { useThemeStore } from '~/stores/theme'
import { useColorMode } from '#imports'
import type { ThemePreset, ThemePresetId } from '~/types/theme'

/**
 * Composable for managing theme presets
 * Integrates with Nuxt's color-mode module
 */
export function useTheme() {
  const themeStore = useThemeStore()
  const colorMode = useColorMode()

  // Initialize theme on mount
  if (import.meta.client) {
    themeStore.initTheme()
  }

  // Watch for color mode changes and reapply theme
  watch(
    () => colorMode.value,
    (mode) => {
      if (themeStore.currentPresetId) {
        themeStore.setPreset(themeStore.currentPresetId, mode as 'light' | 'dark')
      }
    },
  )

  const currentPreset = computed(() => themeStore.currentPreset)
  const currentPresetId = computed(() => themeStore.currentPresetId)
  const allPresets = computed(() => themeStore.allPresets)
  const builtInPresets = computed(() => themeStore.builtInPresets)
  const customPresets = computed(() => themeStore.customPresetsOnly)

  /**
   * Set the active theme preset
   */
  const setPreset = (presetId: ThemePresetId) => {
    themeStore.setPreset(presetId, colorMode.value as 'light' | 'dark')
  }

  /**
   * Create a new custom theme preset
   */
  const createPreset = (presetId: ThemePresetId, preset: ThemePreset) => {
    themeStore.registerPreset(presetId, preset)
  }

  /**
   * Update an existing preset
   */
  const updatePreset = (presetId: ThemePresetId, updates: Partial<ThemePreset>) => {
    themeStore.updatePreset(presetId, updates)
  }

  /**
   * Delete a custom preset
   */
  const deletePreset = (presetId: ThemePresetId) => {
    themeStore.deletePreset(presetId)
  }

  /**
   * Reset to default theme (graphite)
   */
  const resetTheme = () => {
    themeStore.setPreset('graphite', colorMode.value as 'light' | 'dark')
  }

  return {
    // State
    currentPreset,
    currentPresetId,
    allPresets,
    builtInPresets,
    customPresets,
    colorMode,

    // Actions
    setPreset,
    createPreset,
    updatePreset,
    deletePreset,
    resetTheme,
  }
}
