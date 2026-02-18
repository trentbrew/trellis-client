/**
 * useChatPresence — Tracks typing indicators and last-seen for a chat channel.
 *
 * Uses InstantDB Rooms (chat room type) for ephemeral presence data.
 * Typing state auto-clears after 3 seconds of inactivity.
 *
 * Usage:
 *   const { typingUsers, publishTyping, markSeen } = useChatPresence(channelId)
 */
export interface ChatPeer {
  userId: string
  channelId: string
  isTyping: boolean
  lastSeen: number
}

export function useChatPresence(channelId: Ref<string | undefined> | string) {
  const adapter = useDataAdapter()
  const { user } = useInstantAuth()
  const isCloudMode = adapter.mode === 'cloud'

  const resolvedId = computed(() =>
    typeof channelId === 'string' ? channelId : channelId.value,
  )

  const peers = ref<Record<string, ChatPeer>>({})
  let activeRoom: any = null
  let typingTimer: ReturnType<typeof setTimeout> | null = null

  const typingUsers = computed(() =>
    Object.values(peers.value).filter(
      (p) => p.isTyping && p.userId !== user.value?.id,
    ),
  )

  function setup(id: string) {
    cleanup()
    if (!isCloudMode || !adapter._rawDb || !user.value?.id) return

    const db = adapter._rawDb as any
    const room = db.joinRoom('chat', id)
    activeRoom = room

    room.subscribePresence({}, (presenceData: any) => {
      const peersMap: Record<string, ChatPeer> = {}
      for (const [peerId, peer] of Object.entries(presenceData.peers ?? {})) {
        const p = peer as any
        if (p.userId) {
          peersMap[peerId] = {
            userId: p.userId,
            channelId: p.channelId ?? id,
            isTyping: p.isTyping ?? false,
            lastSeen: p.lastSeen ?? 0,
          }
        }
      }
      peers.value = peersMap
    })

    room.publishPresence({
      userId: user.value.id,
      channelId: id,
      isTyping: false,
      lastSeen: Date.now(),
    })
  }

  function cleanup() {
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
    if (activeRoom) {
      try { activeRoom.leaveRoom() } catch { /* noop */ }
      activeRoom = null
    }
    peers.value = {}
  }

  function publishTyping(isTyping: boolean) {
    if (!activeRoom || !user.value?.id) return

    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }

    activeRoom.publishPresence({
      userId: user.value.id,
      channelId: resolvedId.value ?? '',
      isTyping,
      lastSeen: Date.now(),
    })

    if (isTyping) {
      typingTimer = setTimeout(() => {
        publishTyping(false)
      }, 3000)
    }
  }

  function markSeen() {
    if (!activeRoom || !user.value?.id) return
    activeRoom.publishPresence({
      userId: user.value.id,
      channelId: resolvedId.value ?? '',
      isTyping: false,
      lastSeen: Date.now(),
    })
  }

  if (import.meta.client) {
    watch(
      resolvedId,
      (id) => {
        if (id && isCloudMode) setup(id)
        else cleanup()
      },
      { immediate: true },
    )

    onScopeDispose(cleanup)
  }

  return {
    peers,
    typingUsers,
    publishTyping,
    markSeen,
  }
}
