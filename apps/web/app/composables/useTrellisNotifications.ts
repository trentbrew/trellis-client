/**
 * useTrellisNotifications
 *
 * Reactive notifications backed by the local TQL graph (`notification` namespace).
 * Subscribes to SSE mutation events so the list auto-refreshes when a
 * notification is created / updated / deleted — no matter which client did it.
 *
 * Paired with:
 *   - server/utils/notification-service.ts   (server-side creation helpers)
 *   - server/api/notifications/*             (CRUD endpoints)
 *   - types/notification.ts                  (shared types + visual mapping)
 */

import type {
  CreateNotificationInput,
  NotificationAction,
  NotificationSound,
  NotificationStatus,
  TrellisNotification,
} from '~/types/notification'
import { NOTIFICATION_KIND_VISUALS, NOTIFICATION_SOUND_FILES, resolveNotificationVisual } from '~/types/notification'
import { useSSESubscribe } from '~/composables/useTrellisSSE'
import { useTrellisGraph } from '~/composables/useTrellisGraph'

const NOTIFICATION_TYPE = 'notification'

// ── Singleton state ─────────────────────────────────────────────────────────
const _list = ref<TrellisNotification[]>([])
const _loading = ref(true)
const _initialized = ref(false)
const _lastSeenIds = new Set<string>()
let _subscribedSSE = false
let _audioCache: Partial<Record<NotificationSound, HTMLAudioElement>> = {}

// ── Parsing ─────────────────────────────────────────────────────────────────

function parseActions(raw: unknown): NotificationAction[] | undefined {
  if (!raw) return undefined
  if (Array.isArray(raw)) return raw as NotificationAction[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as NotificationAction[]) : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

function parseMetadata(raw: unknown): Record<string, any> | undefined {
  if (!raw) return undefined
  if (typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  return undefined
}

function rowToNotification(row: Record<string, any>): TrellisNotification {
  // EQL-S RETURN clause produces keys like ?n.title, ?n.body, etc.
  // Helper to get value from either ?n.field or field key
  const get = (field: string): any => {
    return row[`?n.${field}`] ?? row[field]
  }
  // Entity ID comes from ?n (the base variable) or @id
  const id = row['?n'] || row['@id'] || row.id || ''
  return {
    id: id.toString(),
    title: get('title') || '',
    body: get('body'),
    kind: (get('kind') || 'info') as TrellisNotification['kind'],
    source: (get('source') || 'system') as TrellisNotification['source'],
    sourceId: get('sourceId'),
    priority: (get('priority') || 'normal') as TrellisNotification['priority'],
    status: (get('status') || 'unread') as NotificationStatus,
    readAt: get('readAt'),
    snoozeUntil: get('snoozeUntil'),
    archivedAt: get('archivedAt'),
    icon: get('icon'),
    color: get('color'),
    sound: get('sound'),
    entityId: get('entityId'),
    entityType: get('entityType'),
    url: get('url'),
    actions: parseActions(get('actions')),
    metadata: parseMetadata(get('metadata')),
    groupKey: get('groupKey'),
    createdAt: get('createdAt') || new Date().toISOString(),
    updatedAt: get('updatedAt'),
  }
}

// ── Audio ───────────────────────────────────────────────────────────────────

function playSound(sound: NotificationSound | undefined) {
  if (!sound || sound === 'none') return
  if (typeof window === 'undefined') return
  const src = NOTIFICATION_SOUND_FILES[sound as Exclude<NotificationSound, 'none'>]
  if (!src) return
  let audio = _audioCache[sound]
  if (!audio) {
    audio = new Audio(src)
    audio.volume = 0.4
    _audioCache[sound] = audio
  }
  try {
    audio.currentTime = 0
    void audio.play().catch(() => {
      // Autoplay likely blocked — safe to ignore
    })
  } catch {
    // ignore
  }
}

// ── Composable ──────────────────────────────────────────────────────────────

export function useTrellisNotifications() {
  const { queryOnce, mutate } = useTrellisGraph()
  const { $toast } = useNuxtApp() as any

  async function refresh() {
    try {
      const result = await queryOnce(
        `FIND ${NOTIFICATION_TYPE} AS ?n RETURN ?n.title, ?n.body, ?n.kind, ?n.source, ?n.sourceId, ?n.priority, ?n.status, ?n.readAt, ?n.snoozeUntil, ?n.archivedAt, ?n.icon, ?n.color, ?n.sound, ?n.entityId, ?n.entityType, ?n.url, ?n.actions, ?n.metadata, ?n.groupKey, ?n.createdAt, ?n.updatedAt ORDER BY ?n.createdAt DESC LIMIT 100`,
      )
      const next = (result.data || []).map(rowToNotification)
      const incoming = next.filter((n) => !_lastSeenIds.has(n.id) && n.status === 'unread')

      // After first load, detect genuinely new notifications → play sound + toast
      if (_initialized.value && incoming.length > 0 && typeof window !== 'undefined') {
        for (const n of incoming) {
          const visual = resolveNotificationVisual(n)
          playSound(visual.sound)
          $toast?.info?.(n.title, { description: n.body })
        }
      }

      _list.value = next
      _lastSeenIds.clear()
      for (const n of next) _lastSeenIds.add(n.id)
      _initialized.value = true
    } catch (err: any) {
      console.error('[useTrellisNotifications] refresh failed:', err?.message)
    } finally {
      _loading.value = false
    }
  }

  // Subscribe to SSE once per client
  if (typeof window !== 'undefined' && !_subscribedSSE) {
    _subscribedSSE = true
    useSSESubscribe('mutation', (e) => {
      try {
        const payload = JSON.parse(e.data || '{}')
        if (payload?.type === NOTIFICATION_TYPE) refresh()
      } catch {
        // ignore parse errors
      }
    })
    // Initial fetch
    refresh()
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const notifications = computed(() => _list.value)
  const unread = computed(() => _list.value.filter((n) => n.status === 'unread'))
  const unreadCount = computed(() => unread.value.length)
  const snoozed = computed(() => _list.value.filter((n) => n.status === 'snoozed'))
  const archived = computed(() => _list.value.filter((n) => n.status === 'archived'))
  const loading = computed(() => _loading.value)

  // ── Actions ───────────────────────────────────────────────────────────────

  async function emit(input: CreateNotificationInput): Promise<TrellisNotification | null> {
    try {
      const res = await $fetch<{ ok: boolean; notification: TrellisNotification }>('/api/notifications', {
        method: 'POST',
        body: input,
      })
      return res.notification
    } catch (err: any) {
      console.error('[useTrellisNotifications] emit failed:', err?.message)
      return null
    }
  }

  async function patch(
    id: string,
    p: Partial<Pick<TrellisNotification, 'status' | 'readAt' | 'snoozeUntil' | 'archivedAt'>>,
  ) {
    try {
      await $fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: p,
      })
    } catch (err: any) {
      console.error('[useTrellisNotifications] patch failed:', err?.message)
    }
  }

  async function markAsRead(id: string) {
    await patch(id, { status: 'read', readAt: new Date().toISOString() })
  }

  async function markAllAsRead() {
    const ids = _list.value.filter((n) => n.status === 'unread').map((n) => n.id)
    await Promise.all(ids.map((id) => markAsRead(id)))
  }

  async function archive(id: string) {
    await patch(id, { status: 'archived', archivedAt: new Date().toISOString() })
  }

  async function snooze(id: string, minutes: number) {
    const until = new Date(Date.now() + minutes * 60_000).toISOString()
    await patch(id, { status: 'snoozed', snoozeUntil: until })
  }

  async function dismiss(id: string) {
    try {
      await $fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch (err: any) {
      console.error('[useTrellisNotifications] dismiss failed:', err?.message)
    }
  }

  async function runAction(n: TrellisNotification, action: NotificationAction) {
    switch (action.kind) {
      case 'link':
        if (action.target) {
          if (/^https?:\/\//.test(action.target)) {
            window.open(action.target, '_blank', 'noopener')
          } else {
            await navigateTo(action.target)
          }
        }
        await markAsRead(n.id)
        break
      case 'dismiss':
        await dismiss(n.id)
        break
      case 'mark_read':
        await markAsRead(n.id)
        break
      case 'snooze':
        await snooze(n.id, action.minutes || 60)
        break
      case 'workflow':
        if (action.workflow) {
          try {
            await $fetch('/api/workflows/run', {
              method: 'POST',
              body: { id: action.workflow, context: { notificationId: n.id, entityId: n.entityId } },
            })
          } catch (err: any) {
            console.error('[useTrellisNotifications] workflow run failed:', err?.message)
          }
        }
        break
      case 'create_entity':
        if (action.entityType) {
          await mutate({
            action: 'createNode',
            entityId: `entity:${crypto.randomUUID().slice(0, 8)}`,
            type: 'entity',
            data: { type: action.entityType, title: n.title, ...(action.entitySeed || {}) },
          })
        }
        break
      case 'api':
        if (action.apiPath) {
          try {
            await $fetch(action.apiPath, {
              method: (action.apiMethod || 'POST') as any,
              body: action.apiBody,
            })
          } catch (err: any) {
            console.error('[useTrellisNotifications] api action failed:', err?.message)
          }
        }
        break
    }
    if (action.closesNotification) await dismiss(n.id)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  return {
    notifications,
    unread,
    unreadCount,
    snoozed,
    archived,
    loading,

    refresh,
    emit,
    markAsRead,
    markAllAsRead,
    archive,
    snooze,
    dismiss,
    runAction,

    timeAgo,
    NOTIFICATION_KIND_VISUALS,
    resolveNotificationVisual,
  }
}
