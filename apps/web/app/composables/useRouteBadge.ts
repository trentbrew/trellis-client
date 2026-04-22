/**
 * useRouteBadge — Reactive badge count provider for navigation routes.
 *
 * Maps a route path to a reactive, iOS-style badge (unread count) for the
 * icon rail and any other navigation surface that wants to surface counts.
 *
 * Counts are derived from `useTrellisNotifications().unread` and are therefore
 * automatically SSE-reactive — mutations to the notification graph stream
 * into the composable and every consumer re-renders.
 *
 * Known mappings:
 *   /mail          → notifications with kind='email'
 *   /messages      → notifications with kind='message'
 *   /calendar      → notifications with kind='calendar' or kind='reminder'
 *   /notifications → total unread count (all kinds)
 *
 * Unknown paths return a null badge (no render).
 */

import type { BadgeConfig } from '~/config/routes'
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'

export type RouteBadge = BadgeConfig | null

/**
 * Classify a route path into a notification "bucket" used for counting.
 * Uses `startsWith` matching so nested routes (e.g. `/mail/thread/123`)
 * continue to badge-up the parent rail icon.
 */
function bucketForPath(path: string): 'email' | 'message' | 'calendar' | 'all' | null {
  // Strip workspace prefix if present. Supports both shapes:
  //   /w/<slug>/<route>         →  /<route>
  //   /w/<org>/<app>/<route>    →  /<route>
  // We iteratively strip leading `/w/<seg>` pairs until we hit a known route.
  let clean = path
  while (clean.startsWith('/w/')) {
    // Drop `/w/<seg>` once — repeated calls handle multi-segment prefixes.
    clean = clean.replace(/^\/w\/[^/]+/, '')
    if (
      !clean.startsWith('/') ||
      clean.startsWith('/mail') ||
      clean.startsWith('/messages') ||
      clean.startsWith('/calendar') ||
      clean.startsWith('/notifications')
    )
      break
  }
  const p = clean.split('?')[0] || clean
  if (p === '/mail' || p.startsWith('/mail/')) return 'email'
  if (p === '/messages' || p.startsWith('/messages/')) return 'message'
  if (p === '/calendar' || p.startsWith('/calendar/')) return 'calendar'
  if (p === '/notifications' || p.startsWith('/notifications/')) return 'all'
  return null
}

/**
 * Format a raw count as an iOS-style badge label.
 * - 0        → null (hide the badge)
 * - 1..99    → the number
 * - 100+     → '99+'
 */
function formatBadge(count: number): BadgeConfig | null {
  if (!Number.isFinite(count) || count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  return { label, variant: 'destructive' }
}

/**
 * Composable: returns a reactive badge for the given route path.
 * Safe to call from any Vue component (including during SSR — empty badge
 * is returned when notifications haven't loaded yet).
 */
export function useRouteBadge(routePath: MaybeRefOrGetter<string>): ComputedRef<RouteBadge> {
  const { unread } = useTrellisNotifications()

  return computed(() => {
    const path = toValue(routePath)
    if (!path) return null
    const bucket = bucketForPath(path)
    if (!bucket) return null

    const list = unread.value
    if (!list || list.length === 0) return null

    let count = 0
    if (bucket === 'all') {
      count = list.length
    } else if (bucket === 'email') {
      count = list.filter((n) => n.kind === 'email').length
    } else if (bucket === 'message') {
      // `message` is not yet a formal NotificationKind — messages flow
      // through `source='user'` with a custom kind in metadata. Match by
      // loose string comparison so adding a 'message' kind later Just Works.
      count = list.filter((n) => (n.kind as string) === 'message' || (n.source as string) === 'chat').length
    } else if (bucket === 'calendar') {
      // Calendar pill covers both calendar events and timed reminders so
      // "you have something coming up" shows up consistently.
      count = list.filter((n) => n.kind === 'calendar' || n.kind === 'reminder').length
    }

    return formatBadge(count)
  })
}
