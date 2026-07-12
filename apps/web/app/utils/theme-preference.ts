/** Persist platform settings for cross-surface sync (extension, MCP, etc.). */
export async function persistPlatformSetting(key: string, value: unknown) {
  if (!import.meta.client)
    return

  try {
    await fetch('/api/platform/setting/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        scope: 'app',
        value,
        agentId: 'browser',
      }),
    })
  }
  catch {
    // Non-fatal — Studio still works with localStorage.
  }
}

/** Persist active theme preference for cross-surface sync (extension, MCP, etc.). */
export async function persistThemePreference(presetId: string, mode: 'light' | 'dark') {
  await persistPlatformSetting('theme', { presetId, mode })
}

/** Persist custom theme presets so /api/theme/active can resolve them. */
export async function persistCustomThemePresets(presets: Record<string, unknown>) {
  await persistPlatformSetting('theme-custom-presets', presets)
}
