/** Optional cross-browser presence relay (universal-presence pattern). */
export function resolvePresenceRelayUrl(): string | undefined {
  const raw = import.meta.env.VITE_PRESENCE_RELAY_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '')
  }
  return undefined
}

/** ADR-002 D3: ephemeral room scope follows Campus zone, not page. */
export function zonePresenceRoom(zoneId: string): string {
  return `zone:${zoneId}`
}

/** @deprecated Use zone room + `pageId` in presence state (ADR-002 P0). */
export function pagePresenceRoom(pageId: string): string {
  return `page:${pageId}`
}
