import { computed } from 'vue'
import { useThemeStore } from '~/stores/theme'
import { useColorMode } from '#imports'
import type { ThemePreset, ThemePresetId } from '~/types/theme'

/**
 * Composable for managing theme presets.
 * Theme init + colorMode watching is handled by plugins/theme.client.ts.
 * This composable is a thin reactive wrapper for UI consumers.
 */
export function useTheme() {
  const themeStore = useThemeStore()
  const colorMode = useColorMode()

  const currentPreset = computed(() => themeStore.currentPreset)
  const currentPresetId = computed(() => themeStore.currentPresetId)
  const allPresets = computed(() => themeStore.allPresets)
  const builtInPresets = computed(() => themeStore.builtInPresets)
  const customPresets = computed(() => themeStore.customPresetsOnly)

  const setPreset = (presetId: ThemePresetId) => {
    themeStore.setPreset(presetId, colorMode.value as 'light' | 'dark')
  }

  const createPreset = (presetId: ThemePresetId, preset: ThemePreset) => {
    themeStore.registerPreset(presetId, preset)
  }

  const updatePreset = (presetId: ThemePresetId, updates: Partial<ThemePreset>) => {
    themeStore.updatePreset(presetId, updates)
  }

  const deletePreset = (presetId: ThemePresetId) => {
    themeStore.deletePreset(presetId)
  }

  const resetTheme = () => {
    themeStore.setPreset('graphite', colorMode.value as 'light' | 'dark')
  }

  return {
    currentPreset,
    currentPresetId,
    allPresets,
    builtInPresets,
    customPresets,
    colorMode,
    setPreset,
    createPreset,
    updatePreset,
    deletePreset,
    resetTheme,
  }
}
