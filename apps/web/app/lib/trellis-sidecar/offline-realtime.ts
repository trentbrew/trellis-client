import type { SubscriptionCallback, SubscribeOptions } from 'trellis/browser'
import {
  logSidecarUnavailableOnce,
  markSidecarUnavailable,
  probeSidecarAvailable,
} from './sidecar-probe'

type SubRecord = {
  eql: string
  opts?: SubscribeOptions
}

export type RealtimePatchedDb = {
  opts: { url: string; apiKey?: string }
  _subCallbacks: Map<string, SubscriptionCallback<unknown>>
  _subQueries: Map<string, SubRecord>
  _ws: WebSocket | null
  _wsPromise: Promise<WebSocket> | null
  _ensureWs: () => Promise<WebSocket>
  _sidecarGuardInstalled?: boolean
  subscribe?: <T>(
    eql: string,
    callback: SubscriptionCallback<T>,
    opts?: SubscribeOptions,
  ) => { unsubscribe: () => void }
}

const EMPTY_DIFF = { added: [] as unknown[], updated: [] as unknown[], removed: [] as unknown[] }

function realtimeUrl(origin: string, apiKey?: string): string {
  const wsOrigin = origin.replace(/^https?/, origin.startsWith('https') ? 'wss' : 'ws')
  const base = `${wsOrigin}/realtime`
  if (!apiKey) return base
  return `${base}?apiKey=${encodeURIComponent(apiKey)}`
}

function sendSubscribe(ws: WebSocket, subId: string, record: SubRecord): void {
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      id: subId,
      query: record.eql,
      ...(record.opts?.entityType ? { entityType: record.opts.entityType } : {}),
      ...(record.opts?.resolve ? { resolve: record.opts.resolve } : {}),
    }),
  )
}

function resendSubscriptions(internal: RealtimePatchedDb): void {
  const ws = internal._ws
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  for (const [subId, record] of internal._subQueries) {
    if (internal._subCallbacks.has(subId)) {
      sendSubscribe(ws, subId, record)
    }
  }
}

function deliverOfflineSnapshot(callback: SubscriptionCallback<unknown>): void {
  callback([], EMPTY_DIFF, { resolved: true })
}

function connectWebSocket(internal: RealtimePatchedDb, apiKey?: string): Promise<WebSocket> {
  const wsUrl = realtimeUrl(internal.opts.url, apiKey ?? internal.opts.apiKey)
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      internal._ws = ws
      resolve(ws)
    }
    ws.onerror = (event) => {
      reject(event instanceof Error ? event : new Error('WebSocket error'))
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type?: string
          id?: string
          result?: unknown
          diff?: unknown
          resolved?: boolean
        }
        if (msg.type === 'data' && msg.id && internal._subCallbacks.has(msg.id)) {
          const meta = msg.resolved === true ? { resolved: true as const } : undefined
          const rows = Array.isArray(msg.result) ? msg.result : []
          const diff =
            msg.diff && typeof msg.diff === 'object'
              ? (msg.diff as { added: unknown[]; updated: unknown[]; removed: unknown[] })
              : EMPTY_DIFF
          internal._subCallbacks.get(msg.id)?.(rows, diff, meta)
        }
      } catch {
        /* ignore malformed frames */
      }
    }
    ws.onclose = () => {
      if (internal._ws === ws) {
        internal._ws = null
      }
    }
  })
}

export function installGuardedEnsureWs(internal: RealtimePatchedDb, apiKey?: string): void {
  internal._ensureWs = function patchedEnsureWs(this: RealtimePatchedDb) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve(this._ws)
    }
    if (this._wsPromise) {
      return this._wsPromise
    }

    this._wsPromise = probeSidecarAvailable()
      .then((available) => {
        if (!available) {
          logSidecarUnavailableOnce()
          throw new Error('Sidecar unavailable')
        }
        return connectWebSocket(this, apiKey)
      })
      .then((ws) => {
        resendSubscriptions(this)
        return ws
      })
      .catch((err) => {
        markSidecarUnavailable()
        throw err
      })
      .finally(() => {
        this._wsPromise = null
      })

    return this._wsPromise
  }
}

export function createGuardedSubscribe(internal: RealtimePatchedDb) {
  return <T>(eql: string, callback: SubscriptionCallback<T>, opts?: SubscribeOptions) => {
    const subId = `sub_${crypto.randomUUID()}`
    internal._subCallbacks.set(subId, callback as SubscriptionCallback<unknown>)
    internal._subQueries.set(subId, { eql, opts })

    void internal
      ._ensureWs()
      .then((ws) => {
        sendSubscribe(ws, subId, { eql, opts })
      })
      .catch(() => {
        deliverOfflineSnapshot(callback as SubscriptionCallback<unknown>)
      })

    return {
      unsubscribe: () => {
        internal._subCallbacks.delete(subId)
        internal._subQueries.delete(subId)
        internal._ws?.send(JSON.stringify({ type: 'unsubscribe', id: subId }))
      },
    }
  }
}

export function installSidecarGuard(db: RealtimePatchedDb): void {
  if (db._sidecarGuardInstalled) return
  db._sidecarGuardInstalled = true

  if (!db._subCallbacks) {
    db._subCallbacks = new Map()
  }
  if (!db._subQueries) {
    db._subQueries = new Map()
  }

  installGuardedEnsureWs(db)
  db.subscribe = createGuardedSubscribe(db)
}
