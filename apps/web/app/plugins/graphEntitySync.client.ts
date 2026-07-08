/**
 * Keeps browse/TQL entity queries in sync when external agents (MCP, CLI) mutate
 * the graph. Kernel-bridge live subscribers refetch via sse-realtime.ts; this
 * plugin bumps the TQL graph version so useTrellisEntities query watchers also
 * re-hydrate (and covers the live→fallback path).
 */
import { bumpGraphVersion } from '~/composables/useTrellisGraph'
import { shouldRefetchBrowseEntitiesFromSSE } from '~/lib/entity-mutation-sse'
import { useSSESubscribe } from '~/composables/useTrellisSSE'

export default defineNuxtPlugin(() => {
  useSSESubscribe('mutation', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}') as Record<string, unknown>
      if (shouldRefetchBrowseEntitiesFromSSE(payload)) {
        bumpGraphVersion()
      }
    } catch {
      // ignore malformed SSE payloads
    }
  })
})
