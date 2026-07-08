export interface SystemStatsSnapshot {
  cpuPercent: number
  memoryUsedGb: number
  memoryTotalGb: number
  batteryPercent: number | null
}

/**
 * Host vitals — Tauri desktop only (A.1). Returns null on web.
 */
export function useSystemStats() {
  const { isTauri } = useTauriWindow()
  const stats = ref<SystemStatsSnapshot | null>(null)

  async function poll() {
    if (!isTauri.value || !import.meta.client) return
    try {
      const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: <T>(cmd: string) => Promise<T> } } })
        .__TAURI__
      if (!tauri?.core?.invoke) return
      const result = await tauri.core.invoke<SystemStatsSnapshot>('get_system_stats')
      stats.value = result
    } catch {
      stats.value = null
    }
  }

  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    if (!isTauri.value) return
    void poll()
    timer = setInterval(() => void poll(), 5000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return {
    stats: readonly(stats),
    visible: computed(() => isTauri.value && stats.value !== null),
  }
}
