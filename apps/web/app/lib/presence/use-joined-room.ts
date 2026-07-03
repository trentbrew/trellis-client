import { joinPresence, type PresencePeer, type RealtimeRoom } from 'trellis/realtime'
import { resolvePresenceRelayUrl } from './config'

export type PagePresenceState = {
  name: string
  color: string
  zoneId: string
  pageId: string
  editingField?: string
  caret?: number | null
  caretAt?: number | null
}

const EMPTY_PRESENCE: PresencePeer<PagePresenceState>[] = []

function resolveRef<T>(value: Ref<T> | T): T {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value
}

export function useJoinedPresenceRoom(opts: {
  peerId: string
  roomName: Ref<string> | string
  pageId: Ref<string> | string
  zoneId: Ref<string> | string
  relayUrl?: string
  initial: Pick<PagePresenceState, 'name' | 'color'>
  enabled?: Ref<boolean> | boolean
}) {
  const roomRef = shallowRef<RealtimeRoom<PagePresenceState> | null>(null)
  const presence = ref<PresencePeer<PagePresenceState>[]>(EMPTY_PRESENCE)
  const editingFieldRef = ref<string | undefined>(undefined)

  const roomName = computed(() => resolveRef(opts.roomName))
  const pageId = computed(() => resolveRef(opts.pageId))
  const zoneId = computed(() => resolveRef(opts.zoneId))
  const isEnabled = computed(() => {
    const e = opts.enabled
    return e === undefined ? true : typeof e === 'boolean' ? e : e.value
  })

  const snapshot = (): PagePresenceState => ({
    name: opts.initial.name,
    color: opts.initial.color,
    zoneId: zoneId.value,
    pageId: pageId.value,
    editingField: editingFieldRef.value,
  })

  let cleanup: (() => void) | null = null

  async function connect() {
    cleanup?.()
    cleanup = null
    roomRef.value?.leave()
    roomRef.value = null
    presence.value = EMPTY_PRESENCE

    const name = roomName.value
    if (!isEnabled.value || !name || !zoneId.value) return

    const relayUrl = opts.relayUrl ?? resolvePresenceRelayUrl()
    const joined = joinPresence<PagePresenceState>({
      peerId: opts.peerId,
      room: name,
      relayUrl,
      initialPresence: snapshot(),
    })
    roomRef.value = joined

    const unsub = joined.presenceSignal.subscribe((peers) => {
      presence.value = peers
    })
    joined.setPresence(snapshot())

    cleanup = () => {
      unsub()
      joined.leave()
      if (roomRef.value === joined) roomRef.value = null
      presence.value = EMPTY_PRESENCE
    }
  }

  watch([isEnabled, roomName], () => {
    void connect()
  }, { immediate: true })

  watch([pageId, zoneId], () => {
    if (roomRef.value) roomRef.value.setPresence(snapshot())
  })

  onScopeDispose(() => {
    cleanup?.()
  })

  function setPresence(partial: Partial<PagePresenceState>) {
    if (partial.editingField !== undefined) {
      editingFieldRef.value = partial.editingField || undefined
    }
    roomRef.value?.setPresence({ ...snapshot(), ...partial })
  }

  return {
    room: roomRef,
    presence,
    setPresence,
  }
}
