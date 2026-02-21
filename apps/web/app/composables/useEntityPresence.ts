import { getPresenceBg } from '~/utils/presenceColor'

/**
 * Per-entity editing presence — tracks who has a specific entity dialog open.
 *
 * Uses InstantDB Rooms with room type 'entity' and roomId = entityId.
 * When a user opens an entity dialog, they join the room and publish presence.
 * When the dialog closes (scope disposed), they automatically leave.
 *
 * Only active in cloud mode — local mode returns empty defaults.
 *
 * Exposes:
 *   - peers          — reactive map of other users viewing this entity
 *   - peerList       — computed array of peer presence objects (for rendering)
 *   - peerCount      — number of other users viewing
 *   - publishField   — announce which field you're currently editing
 *   - isActive       — whether presence is active
 */

export interface EntityPeer {
  peerId: string
  userId: string
  email: string
  name: string
  avatar?: string
  color: string      // bg-* Tailwind class from presenceColor
  editingField?: string
  openedAt: number
}

export function useEntityPresence(entityId: Ref<string | undefined> | string) {
  const adapter = useDataAdapter()
  const { user } = useInstantAuth()
  const isCloudMode = adapter.mode === 'cloud'

  const peers = ref<Record<string, EntityPeer>>({})
  const isActive = ref(false)

  const resolvedId = computed(() => (typeof entityId === 'string' ? entityId : entityId.value))

  const peerList = computed(() => Object.values(peers.value))
  const peerCount = computed(() => peerList.value.length)

  let cleanupFn: (() => void) | null = null

  // Keep a reference to the active room handle so publishField can use it
  let activeRoom: any = null

  function publishField(fieldName: string | undefined) {
    if (!isActive.value || !isCloudMode || !activeRoom) return

    try {
      activeRoom.publishPresence({
        userId: user.value?.id || '',
        email: user.value?.email || '',
        name: user.value?.name || user.value?.email || '',
        avatar: user.value?.avatar || '',
        editingField: fieldName || '',
        openedAt: Date.now(),
      })
    } catch {
      // Non-fatal
    }
  }

  if (import.meta.client && isCloudMode && adapter._rawDb) {
    const db = adapter._rawDb as any

    const setupRoom = (id: string | null) => {
      // Cleanup previous
      if (cleanupFn) { cleanupFn(); cleanupFn = null }
      activeRoom = null
      peers.value = {}
      isActive.value = false

      if (!id || !user.value?.id) return

      try {
        const room = db.joinRoom('entity', id, {
          initialPresence: {
            userId: user.value.id,
            email: user.value.email || '',
            name: user.value.name || user.value.email || '',
            avatar: user.value.avatar || '',
            editingField: '',
            openedAt: Date.now(),
          },
        })

        activeRoom = room
        isActive.value = true

        // Subscribe to presence changes via the core SDK
        const unsubPres = room.subscribePresence({}, (presenceData: any) => {
          try {
            const result: Record<string, EntityPeer> = {}

            if (presenceData?.peers) {
              for (const [peerId, peer] of Object.entries(presenceData.peers) as [string, any][]) {
                // Skip self
                if (peer?.userId === user.value?.id) continue
                if (!peer?.userId) continue
                result[peerId] = {
                  peerId,
                  userId: peer.userId,
                  email: peer.email || '',
                  name: peer.name || peer.email || '',
                  avatar: peer.avatar || '',
                  color: getPresenceBg(peer.userId),
                  editingField: peer.editingField || undefined,
                  openedAt: peer.openedAt || 0,
                }
              }
            }

            peers.value = result
          } catch {
            // Presence not available yet
          }
        })

        cleanupFn = () => {
          unsubPres()
          room.leaveRoom()
          activeRoom = null
          isActive.value = false
        }
      } catch (err) {
        console.warn('[useEntityPresence] Room setup failed (non-fatal):', (err as any)?.message)
      }
    }

    // Setup when entityId is available/changes
    watch(resolvedId, (id) => setupRoom(id || null), { immediate: true })

    // Cleanup on scope dispose (dialog closes)
    onScopeDispose(() => {
      if (cleanupFn) { cleanupFn(); cleanupFn = null }
    })
  }

  return {
    peers,
    peerList,
    peerCount,
    publishField,
    isActive,
  }
}
