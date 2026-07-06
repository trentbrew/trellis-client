import type { TrellisNotification } from '~/types/notification'
import { resolveNotificationDelivery } from '~/types/notification'

export interface NotificationDayGroup {
  label: string
  items: TrellisNotification[]
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function dayLabelForDate(date: Date, now = new Date()): string {
  const day = startOfDay(date)
  const today = startOfDay(now)
  const yesterday = today - 86_400_000
  if (day === today) return 'Today'
  if (day === yesterday) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function groupNotificationsByDay(
  items: TrellisNotification[],
  now = new Date(),
): NotificationDayGroup[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const groups = new Map<string, TrellisNotification[]>()
  for (const item of sorted) {
    const label = dayLabelForDate(new Date(item.createdAt), now)
    const list = groups.get(label) ?? []
    list.push(item)
    groups.set(label, list)
  }
  return Array.from(groups.entries()).map(([label, groupItems]) => ({ label, items: groupItems }))
}

export function filterActivityNotifications(
  items: TrellisNotification[],
  tab: 'status' | 'alerts',
): TrellisNotification[] {
  const active = items.filter((n) => n.status !== 'archived' && n.status !== 'snoozed')
  if (tab === 'alerts') {
    return active.filter((n) => resolveNotificationDelivery(n) === 'interrupt')
  }
  return active
}
