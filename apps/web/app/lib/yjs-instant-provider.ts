/**
 * InstantDBProvider — Custom Y.js provider that syncs document updates
 * via InstantDB Room Topics.
 *
 * Four topics are used:
 *   - `yjs-update`         — incremental Y.js updates (broadcast)
 *   - `yjs-awareness`      — awareness state (cursor positions, user info)
 *   - `yjs-state-request`  — new peer requests full document state
 *   - `yjs-state-response` — existing peer responds with encoded state
 *
 * This provider is ephemeral — Y.js state is NOT persisted.
 * HTML content in the database remains the durable source of truth.
 */
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { fromBase64, toBase64 } from 'lib0/buffer'

export interface InstantDBProviderOptions {
  /** The Y.js document to sync. */
  ydoc: Y.Doc
  /** An InstantDB room handle (from db.joinRoom()). */
  room: any
  /** Unique ID for this peer (e.g. `${peerId}-${random}`). */
  peerId: string
  /** Optional user info for awareness (cursor labels). */
  user?: {
    name: string
    color: string
    avatar?: string
  }
}

type TopicCleanup = () => void

export class InstantDBProvider {
  readonly ydoc: Y.Doc
  readonly peerId: string
  readonly awareness: Awareness

  private room: any
  private cleanups: TopicCleanup[] = []
  private destroyed = false

  /** Whether this provider has received initial state from a peer. */
  synced = false

  /** Timestamp when the last remote update was applied. */
  lastRemoteUpdate = 0

  constructor(opts: InstantDBProviderOptions) {
    this.ydoc = opts.ydoc
    this.room = opts.room
    this.peerId = opts.peerId

    // Create awareness instance
    this.awareness = new Awareness(this.ydoc)

    // Set local user state if provided
    if (opts.user) {
      this.awareness.setLocalState({
        user: opts.user,
      })
    }

    this._bindYjsUpdateHandler()
    this._subscribeTopics()
    this._syncAwareness()
    this._requestState()
  }

  // ── Y.js → Room (outbound) ───────────────────────────────────────────

  private _bindYjsUpdateHandler() {
    const handler = (update: Uint8Array, origin: any) => {
      // Don't re-broadcast updates that came from remote peers
      if (origin === 'remote' || this.destroyed) return

      try {
        this.room.publishTopic('yjs-update', {
          peerId: this.peerId,
          update: toBase64(update),
        })
      } catch (err) {
        console.warn('[InstantDBProvider] Failed to publish update:', err)
      }
    }

    // Y.Doc has .on() at runtime but TypeScript doesn't expose it
    ;(this.ydoc as any).on('update', handler)
    this.cleanups.push(() => (this.ydoc as any).off('update', handler))
  }

  // ── Awareness sync via topic ─────────────────────────────────────────

  private _syncAwareness() {
    // Outbound: local awareness changes → broadcast via topic
    const awarenessHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: any,
    ) => {
      if (this.destroyed || origin === 'remote') return

      const changedClients = added.concat(updated).concat(removed)
      try {
        const encoded = encodeAwarenessUpdate(this.awareness, changedClients)
        this.room.publishTopic('yjs-awareness', {
          peerId: this.peerId,
          update: toBase64(encoded),
        })
      } catch (err) {
        console.warn('[InstantDBProvider] Failed to publish awareness:', err)
      }
    }

    this.awareness.on('update', awarenessHandler)
    this.cleanups.push(() => this.awareness.off('update', awarenessHandler))

    // Inbound: remote awareness updates → apply locally
    const unsubAwareness = this.room.subscribeTopic('yjs-awareness', (data: any, _peer: any) => {
      if (this.destroyed) return
      const { peerId, update } = data || {}
      if (peerId === this.peerId || !update) return

      try {
        const decoded = fromBase64(update)
        applyAwarenessUpdate(this.awareness, decoded, 'remote')
      } catch (err) {
        console.warn('[InstantDBProvider] Failed to apply awareness update:', err)
      }
    })
    this.cleanups.push(unsubAwareness)
  }

  // ── Room → Y.js (inbound) ────────────────────────────────────────────

  private _subscribeTopics() {
    // 1. Incremental updates from other peers
    const unsubUpdate = this.room.subscribeTopic('yjs-update', (data: any, _peer: any) => {
      if (this.destroyed) return
      const { peerId, update } = data || {}
      if (peerId === this.peerId || !update) return

      try {
        const decoded = fromBase64(update)
        Y.applyUpdate(this.ydoc, decoded, 'remote')
        this.lastRemoteUpdate = Date.now()
      } catch (err) {
        console.warn('[InstantDBProvider] Failed to apply remote update:', err)
      }
    })
    this.cleanups.push(unsubUpdate)

    // 2. State requests — respond if we're the "leader" (always respond for simplicity;
    //    the requesting peer deduplicates by taking only the first response)
    const unsubReq = this.room.subscribeTopic('yjs-state-request', (data: any) => {
      if (this.destroyed) return
      const { requestId, peerId: requesterPeerId } = data || {}
      if (requesterPeerId === this.peerId || !requestId) return

      try {
        const state = Y.encodeStateAsUpdate(this.ydoc)
        this.room.publishTopic('yjs-state-response', {
          requestId,
          peerId: this.peerId,
          state: toBase64(state),
        })
      } catch (err) {
        console.warn('[InstantDBProvider] Failed to send state response:', err)
      }
    })
    this.cleanups.push(unsubReq)

    // 3. State responses — apply the first one we receive for our request
    const unsubRes = this.room.subscribeTopic('yjs-state-response', (data: any) => {
      if (this.destroyed || this.synced) return
      const { requestId, state, peerId } = data || {}
      if (peerId === this.peerId || !state) return
      if (requestId !== this._pendingRequestId) return

      try {
        const decoded = fromBase64(state)
        Y.applyUpdate(this.ydoc, decoded, 'remote')
        this.synced = true
        this.lastRemoteUpdate = Date.now()
      } catch (err) {
        console.warn('[InstantDBProvider] Failed to apply state response:', err)
      }
    })
    this.cleanups.push(unsubRes)
  }

  // ── Initial state sync ────────────────────────────────────────────────

  private _pendingRequestId: string | null = null

  private _requestState() {
    const requestId = `${this.peerId}-${Date.now()}`
    this._pendingRequestId = requestId

    try {
      this.room.publishTopic('yjs-state-request', {
        requestId,
        peerId: this.peerId,
      })
    } catch (err) {
      console.warn('[InstantDBProvider] Failed to request state:', err)
    }

    // If no response within 400ms, assume we're the first peer — mark as synced
    setTimeout(() => {
      if (!this.synced && !this.destroyed) {
        this.synced = true
      }
    }, 400)
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  destroy() {
    this.destroyed = true
    // Remove local awareness state so remote peers see cursor disappear
    this.awareness.setLocalState(null)
    this.awareness.destroy()
    for (const cleanup of this.cleanups) {
      try { cleanup() } catch { /* noop */ }
    }
    this.cleanups = []
  }
}
