/**
 * useCollaborativeEditor — Sets up a Y.js document, InstantDB provider,
 * and TipTap Collaboration extension for real-time co-editing.
 *
 * Only active in cloud mode when `enabled` is true.
 * In local mode or when disabled, returns empty extensions and no-op helpers.
 *
 * Usage:
 *   const { ydoc, collabExtensions, connectionStatus, getHTML, destroy } =
 *     useCollaborativeEditor(entityId, { initialContent, enabled })
 */
import * as Y from 'yjs'
import Collaboration from '@tiptap/extension-collaboration'
import { InstantDBProvider } from '~/lib/yjs-instant-provider'

export type CollabConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export function useCollaborativeEditor(
  entityId: Ref<string | undefined> | ComputedRef<string | undefined>,
  options: {
    /** HTML content from the entity — used to seed the Y.js doc. */
    initialContent: Ref<string> | ComputedRef<string>
    /** Whether collaborative editing is enabled (cloud mode + edit mode). */
    enabled: Ref<boolean> | ComputedRef<boolean>
  },
) {
  const adapter = useDataAdapter()
  const { user } = useInstantAuth()
  const isCloudMode = adapter.mode === 'cloud'

  const ydoc = shallowRef<Y.Doc | null>(null)
  const provider = shallowRef<InstantDBProvider | null>(null)
  const connectionStatus = ref<CollabConnectionStatus>('disconnected')
  const collabExtensions = shallowRef<any[]>([])

  let activeRoom: any = null
  let activeEntityId: string | null = null
  let peerId = ''

  /**
   * Whether this peer is the "leader" — the one responsible for auto-saving.
   * Simple heuristic: the peer that was first to connect (has synced = true
   * and no other peer responded to state request) OR lowest peerId.
   */
  const isLeader = ref(false)

  function setup(id: string) {
    // Skip if already connected to the same entity
    if (activeEntityId === id && provider.value) return
    cleanup()

    if (!isCloudMode || !adapter._rawDb || !user.value?.id) return
    activeEntityId = id

    peerId = `${user.value.id}-${Date.now().toString(36)}`
    connectionStatus.value = 'connecting'

    // 1. Create Y.js document
    const doc = new Y.Doc()
    ydoc.value = doc

    // 2. Join a dedicated collab room (separate from presence room)
    const db = adapter._rawDb as any
    const room = db.joinRoom('entity-collab', id)
    activeRoom = room

    // 3. Create provider
    const p = new InstantDBProvider({ ydoc: doc, room, peerId })
    provider.value = p

    // 4. Build TipTap Collaboration extension bound to our Y.doc
    collabExtensions.value = [
      Collaboration.configure({
        document: doc,
      }),
    ]

    connectionStatus.value = 'connected'

    // Leader election: if we synced without receiving state from a peer,
    // we're the first one here → we're the leader
    setTimeout(() => {
      if (p.synced && !p.lastRemoteUpdate) {
        isLeader.value = true
      }
    }, 2500)
  }

  function cleanup() {
    if (provider.value) {
      provider.value.destroy()
      provider.value = null
    }
    if (ydoc.value) {
      ydoc.value.destroy()
      ydoc.value = null
    }
    if (activeRoom) {
      try { activeRoom.leaveRoom() } catch { /* noop */ }
      activeRoom = null
    }
    collabExtensions.value = []
    connectionStatus.value = 'disconnected'
    isLeader.value = false
    activeEntityId = null
  }

  // Watch for entityId + enabled + user auth changes.
  // user.value?.id is included so setup() re-fires when auth resolves
  // (the watcher fires immediately but user may still be null).
  if (import.meta.client) {
    watch(
      [() => unref(entityId), () => unref(options.enabled), () => user.value?.id],
      ([id, enabled, _uid]) => {
        if (id && enabled && isCloudMode) {
          setup(id)
        } else {
          cleanup()
        }
      },
      { immediate: true },
    )

    onScopeDispose(cleanup)
  }

  return {
    /** The Y.js document (null when not in collaborative mode). */
    ydoc,
    /** The InstantDB provider (null when not in collaborative mode). */
    provider,
    /** TipTap extensions to add when collaborative mode is active. */
    collabExtensions,
    /** Reactive connection status. */
    connectionStatus,
    /** Whether this peer is the save-leader. */
    isLeader,
    /** Tear down the collaborative session. */
    destroy: cleanup,
  }
}
