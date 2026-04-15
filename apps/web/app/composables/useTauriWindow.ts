/**
 * Detect whether we're running inside a Tauri desktop shell.
 * Also exposes the platform for OS-specific UI adjustments
 * (e.g. macOS traffic light padding).
 */
export const useTauriWindow = () => {
  const isTauri = computed(() =>
    import.meta.client && !!(window as any).__TAURI__,
  )

  const platform = useState<'macos' | 'windows' | 'linux' | 'unknown'>(
    'tauri:platform',
    () => 'unknown',
  )

  if (import.meta.client && (window as any).__TAURI__) {
    // Tauri v2 injects navigator.userAgentData or we can check navigator.platform
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('mac')) platform.value = 'macos'
    else if (ua.includes('win')) platform.value = 'windows'
    else if (ua.includes('linux')) platform.value = 'linux'
  }

  return {
    isTauri: readonly(isTauri),
    platform: readonly(platform),
    isMacOS: computed(() => platform.value === 'macos'),
    isWindows: computed(() => platform.value === 'windows'),
  }
}
