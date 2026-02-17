import type { Notification, NotificationType } from '~/types/database'

/**
 * Realtime notifications composable backed by InstantDB.
 *
 * Subscribes to the current user's notifications across all orgs (user-scoped).
 * Provides reactive state, mark-read/dismiss actions, and audio chime
 * when new notifications arrive.
 *
 * Usage:
 *   const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
 */

// ── Notification metadata ────────────────────────────────────────────
const NOTIFICATION_META: Record<NotificationType, { icon: string; defaultVariant: string }> = {
  invite_accepted: { icon: 'lucide:user-check', defaultVariant: 'success' },
  invite_sent: { icon: 'lucide:send', defaultVariant: 'default' },
  member_joined: { icon: 'lucide:user-plus', defaultVariant: 'success' },
  member_removed: { icon: 'lucide:user-x', defaultVariant: 'warning' },
  role_changed: { icon: 'lucide:shield', defaultVariant: 'info' },
  mention: { icon: 'lucide:at-sign', defaultVariant: 'default' },
  comment: { icon: 'lucide:message-circle', defaultVariant: 'default' },
  entity_updated: { icon: 'lucide:file-edit', defaultVariant: 'default' },
  system: { icon: 'lucide:info', defaultVariant: 'default' },
}

export function useNotifications() {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const { $toast } = useNuxtApp()

  // ── Reactive state ──────────────────────────────────────────────────
  const notifications = useState<Notification[]>('notifications:list', () => [])
  const loading = useState<boolean>('notifications:loading', () => true)
  const _prevIds = useState<Set<string>>('notifications:prevIds', () => new Set())
  const _hasInitialized = useState<boolean>('notifications:initialized', () => false)

  // ── Audio ───────────────────────────────────────────────────────────
  let chimeAudio: HTMLAudioElement | null = null
  if (import.meta.client) {
    chimeAudio = new Audio('/sounds/notify.mp3')
    chimeAudio.volume = 0.3
  }

  // ── Notification preferences ────────────────────────────────────────
  const notificationPrefs = useState<{
    soundEnabled: boolean
    mutedTypes: NotificationType[]
  }>('notifications:prefs', () => ({
    soundEnabled: true,
    mutedTypes: [],
  }))

  // Load prefs from settings
  if (import.meta.client) {
    const prefsKey = computed(() => user.value?.id ? `user:${user.value.id}:notificationPrefs` : null)

    watch(prefsKey, (key) => {
      if (!key) return
      db.subscribeQuery(
        { settings: { $: { where: { settingKey: key } } } },
        (result: any) => {
          const setting = (result.data?.settings || [])[0]
          if (setting?.value) {
            notificationPrefs.value = {
              soundEnabled: setting.value.soundEnabled ?? true,
              mutedTypes: setting.value.mutedTypes ?? [],
            }
          }
        },
      )
    }, { immediate: true })
  }

  // ── Computed ─────────────────────────────────────────────────────────
  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)
  const unreadNotifications = computed(() => notifications.value.filter((n) => !n.isRead))

  const notificationBadgeVariant = computed(() => {
    const unread = unreadNotifications.value
    if (unread.some((n) => n.variant === 'destructive')) return 'destructive'
    if (unread.some((n) => n.variant === 'warning')) return 'warning'
    if (unread.some((n) => n.variant === 'success')) return 'success'
    return 'default'
  })

  // ── Subscription ────────────────────────────────────────────────────
  let unsub: (() => void) | null = null

  const subscribe = () => {
    unsub?.()
    unsub = null

    const userId = user.value?.id
    if (!userId) {
      notifications.value = []
      loading.value = false
      return
    }

    unsub = db.subscribeQuery(
      {
        notifications: {
          $: {
            where: {
              recipientId: userId,
            },
            order: { serverCreatedAt: 'desc' as const },
            limit: 50,
          },
        },
      },
      (result: any) => {
        const incoming: Notification[] = (result.data?.notifications || []).map((n: any) => ({
          ...n,
          icon: n.icon || NOTIFICATION_META[n.type as NotificationType]?.icon || 'lucide:bell',
          variant: n.variant || NOTIFICATION_META[n.type as NotificationType]?.defaultVariant || 'default',
        }))

        // Detect genuinely new notifications (not just initial load)
        if (_hasInitialized.value && import.meta.client) {
          const newItems = incoming.filter(
            (n) => !_prevIds.value.has(n.id) && !n.isRead,
          )
          if (newItems.length > 0) {
            // Play chime
            if (notificationPrefs.value.soundEnabled && chimeAudio) {
              chimeAudio.currentTime = 0
              chimeAudio.play().catch(() => {
                // Autoplay blocked — user hasn't interacted yet
              })
            }
            // Show toast for the first new one
            const first = newItems[0]!
            $toast?.info(first.title, { description: first.message })
          }
        }

        // Update tracked IDs
        _prevIds.value = new Set(incoming.map((n) => n.id))
        _hasInitialized.value = true

        notifications.value = incoming
        loading.value = false
      },
    ) || null
  }

  if (import.meta.client) {
    watch(
      () => user.value?.id,
      () => subscribe(),
      { immediate: true },
    )

    onScopeDispose(() => {
      unsub?.()
    })
  }

  // ── Actions ─────────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    try {
      await db.transact([db.tx.notifications[id].update({ isRead: true })])
    } catch (err: any) {
      console.error('[useNotifications] markAsRead failed:', err?.message)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.value.filter((n) => !n.isRead)
    if (!unread.length) return
    try {
      await db.transact(
        unread.map((n) => db.tx.notifications[n.id].update({ isRead: true })),
      )
    } catch (err: any) {
      console.error('[useNotifications] markAllAsRead failed:', err?.message)
    }
  }

  const dismiss = async (id: string) => {
    try {
      await db.transact([db.tx.notifications[id].delete()])
    } catch (err: any) {
      console.error('[useNotifications] dismiss failed:', err?.message)
    }
  }

  const updatePrefs = async (prefs: Partial<typeof notificationPrefs.value>) => {
    const userId = user.value?.id
    if (!userId) return

    const merged = { ...notificationPrefs.value, ...prefs }
    notificationPrefs.value = merged

    const settingKey = `user:${userId}:notificationPrefs`
    try {
      // Check if setting exists
      const existing = await new Promise<any>((resolve) => {
        const u = db.subscribeQuery(
          { settings: { $: { where: { settingKey } } } },
          (result: any) => {
            u?.()
            resolve(result.data?.settings?.[0] || null)
          },
        )
      })

      if (existing?.id) {
        await db.transact([
          db.tx.settings[existing.id].update({ value: merged, updatedAt: Date.now() }),
        ])
      } else {
        const id = crypto.randomUUID()
        await db.transact([
          db.tx.settings[id].update({
            ownerId: userId,
            settingKey,
            entityType: 'user',
            entityId: userId,
            key: 'notificationPrefs',
            value: merged,
            updatedAt: Date.now(),
          }),
        ])
      }
    } catch (err: any) {
      console.error('[useNotifications] updatePrefs failed:', err?.message)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
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
    // State
    notifications: computed(() => notifications.value),
    unreadNotifications,
    unreadCount,
    notificationBadgeVariant,
    loading: computed(() => loading.value),
    notificationPrefs: computed(() => notificationPrefs.value),

    // Actions
    markAsRead,
    markAllAsRead,
    dismiss,
    updatePrefs,

    // Helpers
    timeAgo,
    NOTIFICATION_META,
  }
}
