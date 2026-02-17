import { defineStore } from 'pinia'
import type { ThemePreset, ThemePresetId, ThemePresets } from '~/types/theme'
import { defaultPresets } from '~/config/presets'
import { applyThemePreset } from '~/utils/theme'

const DEFAULT_PRESET_ID = 'graphite'

interface ThemeStoreState {
  currentPresetId: ThemePresetId | null
  customPresets: ThemePresets
  workspacePresetId: ThemePresetId | null
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeStoreState => ({
    currentPresetId: null,
    customPresets: {},
    workspacePresetId: null,
  }),

  getters: {
    allPresets: (state): ThemePresets => ({
      ...defaultPresets,
      ...state.customPresets,
    }),

    currentPreset(): ThemePreset | null {
      if (!this.currentPresetId) return null
      return this.allPresets[this.currentPresetId] || null
    },

    builtInPresets(): ThemePresets {
      return Object.fromEntries(
        Object.entries(this.allPresets).filter(([, preset]) => preset.source !== 'CUSTOM'),
      )
    },

    customPresetsOnly: (state): ThemePresets => state.customPresets,
  },

  actions: {
    setPreset(presetId: ThemePresetId, mode: 'light' | 'dark' = 'light') {
      const preset = this.allPresets[presetId]
      if (!preset) {
        console.warn(`Theme preset "${presetId}" not found`)
        return
      }

      this.currentPresetId = presetId
      applyThemePreset(preset, mode)

      if (import.meta.client) {
        localStorage.setItem('theme-preset-id', presetId)
      }
    },

    registerPreset(presetId: ThemePresetId, preset: ThemePreset) {
      this.customPresets[presetId] = { ...preset, source: 'CUSTOM' }
      if (import.meta.client) this.saveCustomPresets()
    },

    updatePreset(presetId: ThemePresetId, updates: Partial<ThemePreset>) {
      if (this.customPresets[presetId]) {
        this.customPresets[presetId] = { ...this.customPresets[presetId], ...updates }
      }

      if (this.currentPresetId === presetId) {
        const mode = (import.meta.client && localStorage.getItem('platform-sandbox-color-mode')) || 'dark'
        this.setPreset(presetId, mode as 'light' | 'dark')
      }

      if (import.meta.client) this.saveCustomPresets()
    },

    deletePreset(presetId: ThemePresetId) {
      if (!this.customPresets[presetId]) return

      const { [presetId]: _removed, ...rest } = this.customPresets
      this.customPresets = rest

      if (this.currentPresetId === presetId) {
        const mode = (import.meta.client && localStorage.getItem('platform-sandbox-color-mode')) || 'dark'
        this.setPreset(DEFAULT_PRESET_ID, mode as 'light' | 'dark')
      }

      if (import.meta.client) this.saveCustomPresets()
    },

    loadCustomPresets() {
      if (!import.meta.client) return
      try {
        const stored = localStorage.getItem('theme-custom-presets')
        if (stored) this.customPresets = JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load custom presets:', error)
      }
    },

    saveCustomPresets() {
      if (!import.meta.client) return
      try {
        localStorage.setItem('theme-custom-presets', JSON.stringify(this.customPresets))
      } catch (error) {
        console.error('Failed to save custom presets:', error)
      }
    },

    /**
     * Set the workspace-level preset (from brand config).
     * When set, this takes priority over the user's localStorage preference.
     */
    setWorkspacePreset(presetId: ThemePresetId | null, mode: 'light' | 'dark' = 'light') {
      this.workspacePresetId = presetId
      if (presetId && this.allPresets[presetId]) {
        this.currentPresetId = presetId
        applyThemePreset(this.allPresets[presetId]!, mode)
      }
    },

    initTheme() {
      if (!import.meta.client) return

      this.loadCustomPresets()

      const colorMode = localStorage.getItem('platform-sandbox-color-mode') || 'dark'
      const mode = colorMode as 'light' | 'dark'

      // Priority: workspace preset → user localStorage → default
      if (this.workspacePresetId && this.allPresets[this.workspacePresetId]) {
        this.setPreset(this.workspacePresetId, mode)
        return
      }

      const savedPresetId = localStorage.getItem('theme-preset-id')
      if (savedPresetId && this.allPresets[savedPresetId]) {
        this.setPreset(savedPresetId, mode)
      } else {
        this.setPreset(DEFAULT_PRESET_ID, mode)
      }
    },
  },
})
