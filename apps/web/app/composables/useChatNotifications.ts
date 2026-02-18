import type { ChatNotificationLevel, ChatNotificationPref } from '~/types/database'

/**
 * useChatNotifications — Manages per-user, per-channel notification preferences.
 *
 * Provides reactive prefs, global default, and per-channel overrides.
 * Integrates with the existing notification chime system.
 *
 * Usage:
 *   const { getEffectiveLevel, updatePref, muteChannel } = useChatNotifications()
 */
export function useChatNotifications() {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const adapter = useDataAdapter()

  const prefs = useState<ChatNotificationPref[]>('chat:notif:prefs', () => [])
  const loading = useState<boolean>('chat:notif:loading', () => true)

  // ── Subscription ─────────────────────────────────────────────────
  let unsub: (() => void) | null = null

  function subscribe() {
    unsub?.()
    unsub = null

    const userId = user.value?.id
    if (!userId || adapter.mode !== 'cloud') {
      loading.value = false
      return
    }

    unsub = db.subscribeQuery(
      {
        chatNotificationPrefs: {
          $: { where: { userId } },
        },
      },
      (result: any) => {
        if (result.error) {
          console.error('[useChatNotifications] error:', result.error)
          loading.value = false
          return
        }
        prefs.value = (result.data?.chatNotificationPrefs ?? []) as ChatNotificationPref[]
        loading.value = false
      },
    )
  }

  // ── Computed helpers ─────────────────────────────────────────────
  const globalPref = computed(() =>
    prefs.value.find((p) => !p.channelId),
  )

  function getChannelPref(channelId: string) {
    return prefs.value.find((p) => p.channelId === channelId)
  }

  function getEffectiveLevel(channelId: string): ChatNotificationLevel {
    const channelPref = getChannelPref(channelId)
    if (channelPref) return channelPref.level
    return globalPref.value?.level ?? 'mentions'
  }

  function isSoundEnabled(channelId?: string): boolean {
    if (channelId) {
      const p = getChannelPref(channelId)
      if (p?.soundEnabled !== undefined) return p.soundEnabled
    }
    return globalPref.value?.soundEnabled ?? true
  }

  function isDesktopEnabled(channelId?: string): boolean {
    if (channelId) {
      const p = getChannelPref(channelId)
      if (p?.desktopEnabled !== undefined) return p.desktopEnabled
    }
    return globalPref.value?.desktopEnabled ?? true
  }

  // ── CRUD ─────────────────────────────────────────────────────────
  async function updatePref(opts: {
    channelId?: string
    level?: ChatNotificationLevel
    soundEnabled?: boolean
    desktopEnabled?: boolean
  }) {
    const userId = user.value?.id
    if (!userId) return

    const existing = opts.channelId
      ? getChannelPref(opts.channelId)
      : globalPref.value

    const id = existing?.id ?? crypto.randomUUID()

    await db.transact(
      db.tx.chatNotificationPrefs[id].update({
        userId,
        channelId: opts.channelId ?? null,
        level: opts.level ?? existing?.level ?? 'mentions',
        soundEnabled: opts.soundEnabled ?? existing?.soundEnabled ?? true,
        desktopEnabled: opts.desktopEnabled ?? existing?.desktopEnabled ?? true,
      } as any),
    )
  }

  async function muteChannel(channelId: string) {
    await updatePref({ channelId, level: 'none' })
  }

  async function unmuteChannel(channelId: string) {
    await updatePref({ channelId, level: 'mentions' })
  }

  // ── Notification delivery ─────────────────────────────────────────
  function shouldNotify(channelId: string, isMention: boolean): boolean {
    const level = getEffectiveLevel(channelId)
    if (level === 'none') return false
    if (level === 'mentions') return isMention
    return true
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  if (import.meta.client) {
    watch(
      () => user.value?.id,
      () => subscribe(),
      { immediate: true },
    )

    onScopeDispose(() => unsub?.())
  }

  return {
    prefs,
    loading,
    globalPref,
    getChannelPref,
    getEffectiveLevel,
    isSoundEnabled,
    isDesktopEnabled,
    updatePref,
    muteChannel,
    unmuteChannel,
    shouldNotify,
  }
}
