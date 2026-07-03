import { getPresenceBg } from '~/utils/presenceColor'
import { getOrCreatePresenceIdentity, initialsForName } from '~/lib/presence/identity'
import { zonePresenceRoom } from '~/lib/presence/config'
import { useJoinedPresenceRoom } from '~/lib/presence/use-joined-room'
import type { PageViewer } from '~/composables/usePagePresence'

/** Trellis-native page presence (joinPresence) for sidecar mode. */
export function useTrellisPagePresence(pageId: Ref<string>) {
  const { enabled } = useTrellisSidecar()
  const { zoneId } = useZoneContext()
  const identity = import.meta.client ? getOrCreatePresenceIdentity() : { peerId: 'ssr', name: 'You', color: '#888' }

  const roomName = computed(() => (zoneId.value ? zonePresenceRoom(zoneId.value) : ''))

  const joined = useJoinedPresenceRoom({
    peerId: identity.peerId,
    roomName,
    pageId,
    zoneId,
    initial: { name: identity.name, color: identity.color },
    enabled: computed(() => Boolean(enabled && import.meta.client)),
  })

  const activePageId = ref('')

  function toViewer(peer: {
    id: string
    state: { name: string; pageId?: string; zoneId?: string; editingField?: string }
    self?: boolean
  }): PageViewer {
    return {
      peerId: peer.id,
      userId: peer.id,
      name: peer.state.name,
      initials: initialsForName(peer.state.name),
      color: getPresenceBg(peer.id),
      pageId: peer.state.pageId || pageId.value,
      editingField: peer.state.editingField,
      isMe: peer.self === true,
    }
  }

  function getViewers(id: string): PageViewer[] {
    if (!enabled) return []
    return joined.presence.value
      .filter((p) => (p.state.pageId || pageId.value) === id)
      .map((p) => toViewer({ id: p.id, state: p.state, self: p.self }))
  }

  function register(id: string) {
    if (!enabled || !id) return
    activePageId.value = id
    joined.setPresence({ pageId: id, zoneId: zoneId.value, editingField: undefined })
  }

  function deregister(id: string) {
    if (!enabled || !id) return
    if (activePageId.value === id) activePageId.value = ''
    joined.setPresence({ pageId: '', zoneId: zoneId.value, editingField: undefined })
  }

  function publishField(id: string, field?: string) {
    if (!enabled || !id) return
    joined.setPresence({ pageId: id, zoneId: zoneId.value, editingField: field })
  }

  const trellisViewers = useState<Record<string, PageViewer[]>>('trellis:pageViewers', () => ({}))

  watch(
    () => joined.presence.value,
    () => {
      const id = pageId.value
      if (!id || !enabled) return
      trellisViewers.value = {
        ...trellisViewers.value,
        [id]: getViewers(id),
      }
    },
    { deep: true },
  )

  return {
    getViewers,
    register,
    deregister,
    publishField,
    room: joined.room,
    presence: joined.presence,
  }
}
