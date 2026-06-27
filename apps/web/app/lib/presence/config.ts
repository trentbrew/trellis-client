/** Optional cross-browser presence relay (universal-presence pattern). */
export function resolvePresenceRelayUrl(): string | undefined {
  const raw = import.meta.env.VITE_PRESENCE_RELAY_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '')
  }
  return undefined
}

export function pagePresenceRoom(pageId: string): string {
  return `page:${pageId}`
}
