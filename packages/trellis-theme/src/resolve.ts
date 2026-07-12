import type { ActiveTheme, ColorMode, ThemePreference, ThemePresets } from './types'

export const DEFAULT_PRESET_ID = 'graphite'
export const DEFAULT_MODE: ColorMode = 'dark'

export function parseThemePreference(value: unknown): ThemePreference {
  if (!value || typeof value !== 'object')
    return {}

  const record = value as Record<string, unknown>

  return {
    presetId: typeof record.presetId === 'string' ? record.presetId : undefined,
    mode: record.mode === 'light' || record.mode === 'dark' ? record.mode : undefined,
  }
}

export function resolveActiveTheme(
  presets: ThemePresets,
  preference: ThemePreference = {},
): ActiveTheme {
  const requestedPresetId = preference.presetId
  const presetId = requestedPresetId && presets[requestedPresetId]
    ? requestedPresetId
    : DEFAULT_PRESET_ID
  const mode = preference.mode ?? DEFAULT_MODE
  const preset = presets[presetId] ?? presets[DEFAULT_PRESET_ID]

  if (!preset)
    throw new Error(`Theme preset "${presetId}" not found`)

  return {
    presetId,
    mode,
    label: preset.label,
    styles: { ...preset.styles[mode] },
    source: requestedPresetId || preference.mode ? 'platform' : 'default',
    requestedPresetId,
    presetFallback: Boolean(requestedPresetId && requestedPresetId !== presetId),
  }
}
