import type { DataAdapter } from '~/lib/data-adapter'

/**
 * Returns the active DataAdapter with full type information.
 *
 * Use this when you need access to adapter metadata (mode, entityBackend,
 * ontologyBackend). For plain db operations, `useInstantDb()` still works.
 */
export function useDataAdapter(): DataAdapter {
  const { $instantDb } = useNuxtApp()
  return $instantDb as unknown as DataAdapter
}
