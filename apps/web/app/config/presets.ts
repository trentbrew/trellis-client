// Re-export all presets from the root theme-presets.ts file
// This file contains 23 carefully crafted theme presets

export { defaultPresets } from '../../theme-presets'

// Helper to load additional presets from PRESETS.md if needed
export async function loadPresetsFromDocs() {
  // This can be implemented to dynamically load from docs/PRESETS.md
  // For now, the defaultPresets already contains all built-in themes
  const { defaultPresets } = await import('../../theme-presets')
  return defaultPresets
}
