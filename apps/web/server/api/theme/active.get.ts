import { defineEventHandler } from 'h3'
import {
  parseThemePreference,
  resolveActiveTheme,
  type ThemePresets,
} from '@turtle.tech/trellis-theme'
import { defaultPresets } from '../../../theme-presets'
import { readPlatformSettingFromFacts } from '../../lib/platform-setting-facts'
import { useTrellisKernel } from '../../plugins/trellis-kernel'

function readPlatformSetting(kernel: ReturnType<typeof useTrellisKernel>, key: string) {
  const entityId = `platform:setting/app/${key}`
  const facts = kernel.getStore().getFactsByEntity(entityId)
  return readPlatformSettingFromFacts(entityId, facts)
}

export default defineEventHandler(async () => {
  let preference = {}
  let customPresets: ThemePresets = {}

  try {
    const kernel = useTrellisKernel()
    const themeValue = readPlatformSetting(kernel, 'theme')
    if (themeValue)
      preference = parseThemePreference(themeValue)

    const customValue = readPlatformSetting(kernel, 'theme-custom-presets')
    if (customValue && typeof customValue === 'object' && !Array.isArray(customValue))
      customPresets = customValue as ThemePresets
  }
  catch {
    // Kernel unavailable — fall back to built-in defaults.
  }

  const presets: ThemePresets = { ...defaultPresets, ...customPresets }
  const active = resolveActiveTheme(presets, preference)

  return {
    ok: true,
    presetId: active.presetId,
    mode: active.mode,
    label: active.label,
    styles: active.styles,
    source: active.source,
    requestedPresetId: active.requestedPresetId ?? null,
    presetFallback: active.presetFallback ?? false,
    limitations: active.presetFallback ? ['requested_preset_unavailable'] : [],
  }
})
