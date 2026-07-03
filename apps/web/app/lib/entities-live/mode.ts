export type EntityTransportMode = 'live' | 'fallback'

export function shouldAttemptLiveEntities(client: unknown): boolean {
  return client != null
}

export function resolveEntityTransportMode(
  client: unknown,
  liveRowCount: number,
  liveLoading: boolean,
): EntityTransportMode {
  if (!shouldAttemptLiveEntities(client)) return 'fallback'
  if (liveLoading) return 'fallback'
  return liveRowCount > 0 ? 'live' : 'fallback'
}
