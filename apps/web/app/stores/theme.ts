import { defineStore } from 'pinia'
import type { ThemePreset, ThemePresetId, ThemePresets } from '~/types/theme'
import { defaultPresets } from '~/config/presets'
import { getDefaultThemePresetId, getThemePresetsFromConfig } from '~/lib/appConfig'
import { applyThemePreset } from '~/utils/theme'

interface ThemeStoreState {
  presets: ThemePresets
  currentPresetId: ThemePresetId | null
  customPresets: ThemePresets
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeStoreState => ({
    presets: { ...defaultPresets, ...getThemePresetsFromConfig() },
    currentPresetId: null,
    customPresets: {},
  }),

  getters: {
    /**
     * Get all available presets (built-in + custom)
     */
    allPresets: (state): ThemePresets => {
      return {
        ...state.presets,
        ...state.customPresets,
      }
    },

    /**
     * Get the current active preset
     */
    currentPreset: (state): ThemePreset | null => {
      if (!state.currentPresetId) return null
      const allPresets = {
        ...state.presets,
        ...state.customPresets,
      }
      return allPresets[state.currentPresetId] || null
    },

    /**
     * Get built-in presets only
     */
    builtInPresets: (state): ThemePresets => {
      const allPresets = {
        ...state.presets,
        ...state.customPresets,
      }
      return Object.fromEntries(Object.entries(allPresets).filter(([, preset]) => preset.source !== 'CUSTOM'))
    },

    /**
     * Get custom presets only
     */
    customPresetsOnly: (state): ThemePresets => {
      return state.customPresets
    },
  },

  actions: {
    /**
     * Set the current theme preset
     */
    setPreset(presetId: ThemePresetId, mode: 'light' | 'dark' = 'light') {
      const preset = this.allPresets[presetId]
      if (!preset) {
        console.warn(`Theme preset "${presetId}" not found`)
        return
      }

      this.currentPresetId = presetId
      applyThemePreset(preset, mode)

      // Persist to localStorage
      if (import.meta.client) {
        localStorage.setItem('theme-preset-id', presetId)
        localStorage.setItem('theme-mode', mode)
      }
    },

    /**
     * Register a new custom preset
     */
    registerPreset(presetId: ThemePresetId, preset: ThemePreset) {
      this.customPresets[presetId] = {
        ...preset,
        source: 'CUSTOM',
      }

      // Persist custom presets to localStorage
      if (import.meta.client) {
        this.saveCustomPresets()
      }
    },

    /**
     * Update an existing preset
     */
    updatePreset(presetId: ThemePresetId, preset: Partial<ThemePreset>) {
      if (this.presets[presetId]) {
        this.presets[presetId] = { ...this.presets[presetId], ...preset }
      } else if (this.customPresets[presetId]) {
        this.customPresets[presetId] = { ...this.customPresets[presetId], ...preset }
      }

      // If this is the current preset, reapply it
      if (this.currentPresetId === presetId) {
        const mode = (import.meta.client && localStorage.getItem('theme-mode')) || 'light'
        this.setPreset(presetId, mode as 'light' | 'dark')
      }

      if (import.meta.client) {
        this.saveCustomPresets()
      }
    },

    /**
     * Delete a custom preset
     */
    deletePreset(presetId: ThemePresetId) {
      if (this.customPresets[presetId]) {
        // Avoid dynamic delete (eslint) by reconstructing object without the key
        const { [presetId]: _removed, ...rest } = this.customPresets
        this.customPresets = rest

        // If this was the current preset, reset to default
        if (this.currentPresetId === presetId) {
          this.currentPresetId = null
          if (import.meta.client) {
            localStorage.removeItem('theme-preset-id')
          }
        }

        if (import.meta.client) {
          this.saveCustomPresets()
        }
      }
    },

    /**
     * Load custom presets from localStorage
     */
    loadCustomPresets() {
      if (!import.meta.client) return

      try {
        const stored = localStorage.getItem('theme-custom-presets')
        if (stored) {
          this.customPresets = JSON.parse(stored)
        }
      } catch (error) {
        console.error('Failed to load custom presets:', error)
      }
    },

    /**
     * Save custom presets to localStorage
     */
    saveCustomPresets() {
      if (!import.meta.client) return

      try {
        localStorage.setItem('theme-custom-presets', JSON.stringify(this.customPresets))
      } catch (error) {
        console.error('Failed to save custom presets:', error)
      }
    },

    /**
     * Initialize theme from localStorage
     */
    initTheme() {
      if (!import.meta.client) return

      this.loadCustomPresets()

      const configDefaultPreset = getDefaultThemePresetId()

      const savedPresetId = localStorage.getItem('theme-preset-id')
      const storedColorMode = localStorage.getItem('platform-sandbox-color-mode')
      const storedThemeMode = localStorage.getItem('theme-mode')
      const savedMode = (storedColorMode || storedThemeMode || 'dark') as 'light' | 'dark'

      if (savedPresetId && this.allPresets[savedPresetId]) {
        this.setPreset(savedPresetId, savedMode)
      } else if (configDefaultPreset && this.allPresets[configDefaultPreset]) {
        this.setPreset(configDefaultPreset, savedMode)
      } else {
        // Set graphite as the default theme
        this.setPreset('graphite', savedMode)
      }
    },
  },
})
