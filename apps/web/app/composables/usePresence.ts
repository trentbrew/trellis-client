/**
 * Workspace presence composable — tracks who's online in the current org.
 *
 * Uses InstantDB Rooms for ephemeral presence data.
 * Only active in cloud mode — local mode returns static defaults.
 *
 * Exposes:
 *   - onlineUserIds  — Set of user IDs currently in the room
 *   - onlineCount    — number of online users (including self)
 *   - totalMembers   — total active members in the org
 *   - isUserOnline(userId) — check if a specific user is online
 */

export function usePresence() {
  const adapter = useDataAdapter()
  const { user } = useInstantAuth()
  const currentOrg = useState<any>('currentOrg')

  const onlineUserIds = useState<Set<string>>('presence:onlineUserIds', () => new Set())
  const totalMembers = useState<number>('presence:totalMembers', () => 0)
  const members = useState<any[]>('presence:members', () => [])

  const onlineCount = computed(() => onlineUserIds.value.size)

  function isUserOnline(userId: string): boolean {
    return onlineUserIds.value.has(userId)
  }

  // Only run on client in cloud mode
  if (import.meta.client && adapter.mode === 'cloud' && adapter._rawDb) {
    const db = adapter._rawDb as any
    let unsubPresence: (() => void) | null = null
    let unsubMembers: (() => void) | null = null

    const setupRoom = (orgId: string | null) => {
      // Clean up previous subscriptions
      if (unsubPresence) { unsubPresence(); unsubPresence = null }
      if (unsubMembers) { unsubMembers(); unsubMembers = null }

      if (!orgId || !user.value?.id) {
        onlineUserIds.value = new Set()
        totalMembers.value = 0
        return
      }

      // Subscribe to org members count
      unsubMembers = adapter.subscribeQuery(
        { members: { $: { where: { orgId, status: 'active' } } } },
        (result) => {
          const m = (result.data as any)?.members || []
          members.value = m
          // +1 for the org owner who may not have a member record
          totalMembers.value = m.length + 1
        },
      )

      // Join the room and publish presence
      try {
        const userId = user.value.id
        const room = db.joinRoom('workspace', orgId, {
          initialPresence: { userId, joinedAt: Date.now() },
        })

        // Subscribe to presence changes via the core SDK's subscribePresence
        const unsubPres = room.subscribePresence({}, (presenceData: any) => {
          try {
            const ids = new Set<string>()
            // Add self
            if (userId) ids.add(userId)
            // Add peers
            if (presenceData?.peers) {
              for (const peer of Object.values(presenceData.peers) as any[]) {
                if (peer?.userId) ids.add(peer.userId)
              }
            }
            onlineUserIds.value = ids
          } catch {
            // Presence not available yet
          }
        })

        unsubPresence = () => {
          unsubPres()
          room.leaveRoom()
        }
      } catch (err) {
        console.warn('[usePresence] Room setup failed (non-fatal):', (err as any)?.message)
      }
    }

    // Set up room when org changes
    watch(
      () => currentOrg.value?.id,
      (orgId) => setupRoom(orgId || null),
      { immediate: true },
    )

    // Also react to user changes (e.g. login)
    watch(
      () => user.value?.id,
      () => setupRoom(currentOrg.value?.id || null),
    )

    // Cleanup on unmount
    onScopeDispose(() => {
      if (unsubPresence) unsubPresence()
      if (unsubMembers) unsubMembers()
    })
  }

  return {
    onlineUserIds: computed(() => onlineUserIds.value),
    onlineCount,
    totalMembers,
    members: computed(() => members.value),
    isUserOnline,
  }
}
