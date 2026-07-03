/**
 * Transport mode for useTrellisConfig — live (trellis/vue) vs fallback (SSE snapshot).
 */

export type AppConfigTransportMode = 'live' | 'fallback'

/** True when TrellisDb client is available (sidecar plugin registered a client). */
export function shouldAttemptLiveAppConfig(client: unknown): boolean {
  return client != null
}

/** Live path is active only when sidecar rows exist after hydration. */
export function resolveAppConfigTransportMode(
  client: unknown,
  liveRowCount: number,
  liveLoading: boolean,
): AppConfigTransportMode {
  if (!shouldAttemptLiveAppConfig(client)) return 'fallback'
  if (liveLoading) return 'fallback'
  return liveRowCount > 0 ? 'live' : 'fallback'
}
