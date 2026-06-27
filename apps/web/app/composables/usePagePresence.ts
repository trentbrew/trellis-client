/**
 * usePagePresence — Tracks which pages are currently being viewed across all users.
 *
 * Cloud mode: Uses a single InstantDB Room ('pages-index') scoped to the current org.
 *   All users publish their current pageId + editingField.
 *   Sidebar calls getViewers(pageId) which filters the flat peer list.
 *   publishField(pageId, field) broadcasts cursor position for title/description.
 *   Self is included in getViewers() results (keyed 'self').
 *
 * Local mode: Tab-local useState fallback (single-user, cross-user presence N/A).
 */

import { getPresenceBg } from '~/utils/presenceColor'

export interface PageViewer {
  peerId: string
  userId: string
  name: string
  initials: string
  color: string        // bg-* Tailwind class from presenceColor
  pageId: string
  editingField?: string
  isMe?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_ID = import.meta.client ? crypto.randomUUID().slice(0, 8) : 'ssr'

function _initials(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return '?'
  const prefix = cleaned.includes('@') ? cleaned.split('@')[0]! : cleaned
  const parts = prefix.split(/[\s._-]+/g).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return `${first}${second}`.toUpperCase().slice(0, 2)
}

// ── Module-level cloud singleton ──────────────────────────────────────────────
let _cloudRoom: any = null
let _cloudRoomOrgId: string | null = null
let _cloudRoomCleanup: (() => void) | null = null

export function usePagePresence() {
  const adapter = useDataAdapter()
  const { user } = useInstantAuth()
  const currentOrg = useState<any>('currentOrg')
  const isCloudMode = adapter.mode === 'cloud'
  const { enabled: sidecarEnabled } = useTrellisSidecar()
  const trellisViewers = useState<Record<string, PageViewer[]>>('trellis:pageViewers', () => ({}))

  // Cloud mode: flat map of peerId → PageViewer (includes 'self' key)
  const cloudPeers = useState<Record<string, PageViewer>>('pagePresence:cloudPeers', () => ({}))

  // Local mode fallback: pageId → PageViewer[]
  const localViewers = useState<Record<string, PageViewer[]>>('pagePresence:localViewers', () => ({}))

  // ── Cloud mode setup ──────────────────────────────────────────────────────

  if (import.meta.client && isCloudMode && adapter._rawDb) {
    const db = adapter._rawDb as any

    const setupRoom = (orgId: string | null) => {
      if (orgId && orgId === _cloudRoomOrgId && _cloudRoom) return

      if (_cloudRoomCleanup) { _cloudRoomCleanup(); _cloudRoomCleanup = null }
      _cloudRoom = null
      _cloudRoomOrgId = null
      cloudPeers.value = {}

      if (!orgId || !user.value?.id) return

      try {
        const userId = user.value.id
        const myName = (user.value as any).name || (user.value as any).email || 'Anonymous'

        const room = db.joinRoom('pages-index', orgId, {
          initialPresence: {
            userId,
            name: myName,
            initials: _initials(myName),
            color: getPresenceBg(userId),
            pageId: '',
            editingField: '',
          },
        })

        _cloudRoom = room
        _cloudRoomOrgId = orgId

        const unsubPres = room.subscribePresence({}, (presenceData: any) => {
          try {
            const result: Record<string, PageViewer> = {}

            // Always include self so own avatar shows in sidebar/page stack
            const selfName = (user.value as any)?.name || (user.value as any)?.email || 'Anonymous'
            const selfData = presenceData?.user
            result['self'] = {
              peerId: 'self',
              userId,
              name: selfName,
              initials: _initials(selfName),
              color: getPresenceBg(userId),
              pageId: selfData?.pageId || '',
              editingField: selfData?.editingField || undefined,
              isMe: true,
            }

            // Add peers
            if (presenceData?.peers) {
              for (const [peerId, peer] of Object.entries(presenceData.peers) as [string, any][]) {
                if (peer?.userId === userId) continue
                if (!peer?.userId || !peer?.pageId) continue
                result[peerId] = {
                  peerId,
                  userId: peer.userId,
                  name: peer.name || '',
                  initials: peer.initials || _initials(peer.name || ''),
                  color: getPresenceBg(peer.userId),
                  pageId: peer.pageId,
                  editingField: peer.editingField || undefined,
                  isMe: false,
                }
              }
            }

            cloudPeers.value = result
          } catch {
            // Non-fatal
          }
        })

        _cloudRoomCleanup = () => {
          unsubPres()
          try { room.leaveRoom() } catch { /* non-fatal */ }
          _cloudRoom = null
          _cloudRoomOrgId = null
        }
      } catch (err) {
        console.warn('[usePagePresence] Room setup failed:', (err as any)?.message)
      }
    }

    watch(() => currentOrg.value?.id, (orgId) => setupRoom(orgId || null), { immediate: true })
    watch(() => user.value?.id, () => setupRoom(currentOrg.value?.id || null))
  }

  // ── Internal publish helper ───────────────────────────────────────────────

  function _publishCloud(pageId: string, editingField?: string) {
    if (!_cloudRoom || !user.value?.id) return
    const myName = (user.value as any).name || (user.value as any).email || 'Anonymous'
    try {
      _cloudRoom.publishPresence({
        userId: user.value.id,
        name: myName,
        initials: _initials(myName),
        color: getPresenceBg(user.value.id),
        pageId: pageId || '',
        editingField: editingField || '',
      })
      // Keep self entry in sync locally
      cloudPeers.value = {
        ...cloudPeers.value,
        self: {
          peerId: 'self',
          userId: user.value.id,
          name: myName,
          initials: _initials(myName),
          color: getPresenceBg(user.value.id),
          pageId: pageId || '',
          editingField: editingField || undefined,
          isMe: true,
        },
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function getViewers(pageId: string): PageViewer[] {
    if (sidecarEnabled) {
      return trellisViewers.value[pageId] ?? []
    }
    if (isCloudMode) {
      return Object.values(cloudPeers.value).filter((v) => v.pageId === pageId)
    }
    return localViewers.value[pageId] ?? []
  }

  function register(pageId: string) {
    if (!import.meta.client || !pageId) return
    if (sidecarEnabled) return
    if (isCloudMode) {
      _publishCloud(pageId)
    } else {
      const name = (user.value as any)?.name || (user.value as any)?.email || 'You'
      const userId = user.value?.id || SESSION_ID
      const viewer: PageViewer = {
        peerId: SESSION_ID,
        userId,
        name,
        initials: _initials(name),
        color: getPresenceBg(userId),
        pageId,
        isMe: true,
      }
      const current = localViewers.value[pageId] ?? []
      localViewers.value = {
        ...localViewers.value,
        [pageId]: [...current.filter((v) => v.peerId !== SESSION_ID), viewer],
      }
    }
  }

  function deregister(pageId: string) {
    if (!import.meta.client || !pageId) return
    if (sidecarEnabled) return
    if (isCloudMode) {
      _publishCloud('')
    } else {
      const current = localViewers.value[pageId] ?? []
      const next = current.filter((v) => v.peerId !== SESSION_ID)
      localViewers.value = Object.fromEntries(
        Object.entries({ ...localViewers.value, [pageId]: next }).filter(([, v]) => v.length > 0),
      )
    }
  }

  function publishField(pageId: string, field?: string) {
    if (!import.meta.client || !pageId) return
    if (sidecarEnabled) return
    if (isCloudMode) {
      _publishCloud(pageId, field)
    }
  }

  return {
    getViewers,
    register,
    deregister,
    publishField,
    peers: isCloudMode
      ? computed(() => cloudPeers.value)
      : computed(() => localViewers.value),
  }
}
