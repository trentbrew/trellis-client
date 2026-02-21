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
import { Extension } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import { yCursorPlugin } from '@tiptap/y-tiptap'
import { InstantDBProvider } from '~/lib/yjs-instant-provider'
import { getPresenceHex } from '~/utils/presenceColor'

export type CollabConnectionStatus = 'disconnected' | 'connecting' | 'connected'


/**
 * Returns '#000000' or '#ffffff' — whichever has higher contrast against the
 * given hex background color, using the WCAG relative luminance formula.
 */
function contrastTextColor(hexBg: string): string {
  const r = parseInt(hexBg.slice(1, 3), 16) / 255
  const g = parseInt(hexBg.slice(3, 5), 16) / 255
  const b = parseInt(hexBg.slice(5, 7), 16) / 255
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return L > 0.179 ? '#000000' : '#ffffff'
}

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

    // 3. Generate consistent color for this user
    const userColor = getPresenceHex(user.value.id!)
    const userName = user.value.name || user.value.email || 'Anonymous'

    // 4. Create provider with user info for awareness
    const p = new InstantDBProvider({
      ydoc: doc,
      room,
      peerId,
      user: {
        name: userName,
        color: userColor,
        avatar: user.value.avatar || undefined,
      },
    })
    provider.value = p

    // 5. Build TipTap extensions with collaboration and cursor tracking
    // We use a custom extension wrapping yCursorPlugin from @tiptap/y-tiptap
    // (same package the Collaboration v3 extension uses) so the ySyncPluginKey
    // matches. The v2 @tiptap/extension-collaboration-cursor uses y-prosemirror
    // which has a different ySyncPluginKey, causing "Cannot read 'doc'" errors.
    const awareness = p.awareness
    const userTextColor = contrastTextColor(userColor)
    awareness.setLocalStateField('user', { name: userName, color: userColor, textColor: userTextColor })

    const cursorExtension = Extension.create({
      name: 'collaborationCursor',
      priority: 999,
      addProseMirrorPlugins() {
        return [
          yCursorPlugin(awareness, {
            cursorBuilder(user: any) {
              const color: string = user?.color ?? '#888888'
              const name: string = user?.name ?? 'Anonymous'
              const textColor: string = user?.textColor ?? contrastTextColor(color)
              const cursor = document.createElement('span')
              cursor.classList.add('ProseMirror-yjs-cursor')
              cursor.style.borderColor = color
              const label = document.createElement('div')
              label.style.backgroundColor = color
              label.style.color = textColor
              label.textContent = name
              cursor.appendChild(label)
              return cursor
            },
          }),
        ]
      },
    })

    collabExtensions.value = [
      Collaboration.configure({
        document: doc,
      }),
      cursorExtension,
    ]

    connectionStatus.value = 'connected'

    // Leader election: if we synced without receiving state from a peer,
    // we're the first one here → we're the leader
    setTimeout(() => {
      if (p.synced && !p.lastRemoteUpdate) {
        isLeader.value = true
      }
    }, 600)
  }

  function cleanup() {
    if (provider.value) {
      provider.value.destroy()
      provider.value = null
    }
    if (ydoc.value) {
      // Y.Doc has .destroy() at runtime but TypeScript doesn't expose it
      ;(ydoc.value as any).destroy()
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
