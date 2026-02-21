/**
 * Format a Unix millisecond timestamp as a human-readable relative time string.
 * e.g. "Just now", "5m ago", "3h ago", "2d ago", "Jan 5"
 */
export function formatRelativeTime(timestamp: number | string | undefined | null): string {
  if (!timestamp) return ''
  const ms = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp
  if (Number.isNaN(ms)) return ''
  const now = Date.now()
  const diff = now - ms
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
