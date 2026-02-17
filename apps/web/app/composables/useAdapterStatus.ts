import type { DataMode } from '~/lib/data-adapter'

/**
 * Reactive adapter status — surfaces connection health, mode info,
 * and recent errors for the UI (e.g. Settings page, toast notifications).
 */
export function useAdapterStatus() {
  const adapter = useDataAdapter()

  const mode = computed<DataMode>(() => adapter.mode)
  const entityBackend = computed(() => adapter.entityBackend)
  const ontologyBackend = computed(() => adapter.ontologyBackend)
  const isCloud = computed(() => adapter.mode === 'cloud')
  const isLocal = computed(() => adapter.mode === 'local')

  // Reactive error state — set by adapter operations, cleared on success
  const lastError = useState<{ message: string; timestamp: number } | null>('adapter:lastError', () => null)
  const isHealthy = computed(() => !lastError.value)

  function reportError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    lastError.value = { message, timestamp: Date.now() }

    if (import.meta.dev) {
      console.error(`[DataAdapter:${adapter.mode}] ${message}`)
    }
  }

  function clearError() {
    lastError.value = null
  }

  /**
   * Wrap an async adapter operation with error handling.
   * On success, clears lastError. On failure, sets lastError and re-throws.
   */
  async function withErrorBoundary<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn()
      clearError()
      return result
    } catch (err) {
      reportError(err)
      throw err
    }
  }

  return {
    mode,
    entityBackend,
    ontologyBackend,
    isCloud,
    isLocal,
    lastError: computed(() => lastError.value),
    isHealthy,
    reportError,
    clearError,
    withErrorBoundary,
  }
}
