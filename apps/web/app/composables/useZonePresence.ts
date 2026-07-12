import { getOrCreatePresenceIdentity, initialsForName } from '~/lib/presence/identity'
import { zonePresenceRoom } from '~/lib/presence/config'
import { useJoinedPresenceRoom } from '~/lib/presence/use-joined-room'

export type ZonePresencePeer = {
  id: string
  name: string
  initials: string
  color: string
  self: boolean
  away: boolean
  route?: string
}

type ZonePresenceApi = {
  peers: ComputedRef<ZonePresencePeer[]>
  enabled: ComputedRef<boolean>
  zoneId: Ref<string>
  roomName: ComputedRef<string>
}

let clientSingleton: ZonePresenceApi | null = null

function createClientZonePresence(): ZonePresenceApi {
  const { zoneId } = useZoneContext()
  const route = useRoute()
  const identity = getOrCreatePresenceIdentity()

  const enabled = computed(() => true)
  const roomName = computed(() => (zoneId.value ? zonePresenceRoom(zoneId.value) : ''))

  const joined = useJoinedPresenceRoom({
    peerId: identity.peerId,
    roomName,
    pageId: computed(() => String(route.path || '')),
    zoneId,
    initial: { name: identity.name, color: identity.color },
    enabled,
  })

  watch(
    () => route.path,
    (path) => {
      joined.setPresence({ pageId: path, zoneId: zoneId.value })
    },
  )

  const peers = computed<ZonePresencePeer[]>(() => {
    const list = joined.presence.value.map((p) => ({
      id: p.id,
      name: p.state.name || 'Peer',
      initials: initialsForName(p.state.name || 'P'),
      color: p.state.color || '#8b5cf6',
      self: p.self === true,
      away: false,
      route: p.state.pageId || undefined,
    }))
    if (list.length === 0) {
      return [
        {
          id: identity.peerId,
          name: identity.name,
          initials: initialsForName(identity.name),
          color: identity.color,
          self: true,
          away: false,
          route: String(route.path || ''),
        },
      ]
    }
    if (!list.some((p) => p.self)) {
      list.unshift({
        id: identity.peerId,
        name: identity.name,
        initials: initialsForName(identity.name),
        color: identity.color,
        self: true,
        away: false,
        route: String(route.path || ''),
      })
    }
    return list
  })

  return { peers, enabled, zoneId, roomName }
}

/**
 * Shell-wide zone presence (ADR-002 D3).
 * One join per client tab — header + decks share the subscription.
 */
export function useZonePresence(): ZonePresenceApi {
  if (!import.meta.client) {
    return {
      peers: computed(() => []),
      enabled: computed(() => false),
      zoneId: computed(() => '') as unknown as Ref<string>,
      roomName: computed(() => ''),
    }
  }
  if (!clientSingleton) {
    clientSingleton = createClientZonePresence()
  }
  return clientSingleton
}
