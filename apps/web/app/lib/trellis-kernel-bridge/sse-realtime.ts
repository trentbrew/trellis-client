import type { SubscriptionCallback, SubscribeOptions, TrellisDb } from 'trellis/browser'
import { shouldRefetchAppConfigFromSSE } from '~/lib/app-config-sse'
import { shouldRefetchBrowseEntitiesFromSSE } from '~/lib/entity-mutation-sse'
import { useSSESubscribe } from '~/composables/useTrellisSSE'

type SubRecord = {
  eql: string
  opts?: SubscribeOptions
}

export type KernelBridgePatchedDb = TrellisDb & {
  _subCallbacks: Map<string, SubscriptionCallback<unknown>>
  _subQueries: Map<string, SubRecord>
  _kernelBridgeInstalled?: boolean
  _kernelBridgeSseCleanup?: (() => void) | null
  list: TrellisDb['list']
}

const EMPTY_DIFF = { added: [] as unknown[], updated: [] as unknown[], removed: [] as unknown[] }

function shouldRefetchForSubscription(
  payload: Record<string, unknown>,
  entityType?: string,
): boolean {
  if (!entityType) return false
  if (entityType === 'KernelBrowse') return shouldRefetchBrowseEntitiesFromSSE(payload)
  return shouldRefetchAppConfigFromSSE(payload)
}

async function fetchEntityList(
  db: KernelBridgePatchedDb,
  entityType?: string,
): Promise<unknown[]> {
  if (!entityType) return []
  const result = await db.list(entityType)
  return result.data ?? []
}

function deliverRows(
  callback: SubscriptionCallback<unknown>,
  rows: unknown[],
): void {
  callback(rows, { added: [], updated: rows, removed: [] }, { resolved: true })
}

function ensureSseListener(db: KernelBridgePatchedDb): void {
  if (db._kernelBridgeSseCleanup) return

  db._kernelBridgeSseCleanup = useSSESubscribe('mutation', (event) => {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>
    } catch {
      return
    }

    for (const [subId, callback] of db._subCallbacks) {
      const record = db._subQueries.get(subId)
      const entityType = record?.opts?.entityType
      if (!shouldRefetchForSubscription(payload, entityType)) continue

      void fetchEntityList(db, entityType).then((rows) => {
        if (db._subCallbacks.has(subId)) {
          deliverRows(callback, rows)
        }
      })
    }
  })
}

function maybeTeardownSseListener(db: KernelBridgePatchedDb): void {
  if (db._subCallbacks.size > 0) return
  db._kernelBridgeSseCleanup?.()
  db._kernelBridgeSseCleanup = null
}

export function createKernelBridgeSubscribe(db: KernelBridgePatchedDb) {
  return <T>(eql: string, callback: SubscriptionCallback<T>, opts?: SubscribeOptions) => {
    const subId = `sub_${crypto.randomUUID()}`
    db._subCallbacks.set(subId, callback as SubscriptionCallback<unknown>)
    db._subQueries.set(subId, { eql, opts })

    void fetchEntityList(db, opts?.entityType)
      .then((rows) => {
        deliverRows(callback as SubscriptionCallback<unknown>, rows)
      })
      .catch(() => {
        callback([], EMPTY_DIFF, { resolved: true })
      })

    ensureSseListener(db)

    return {
      unsubscribe: () => {
        db._subCallbacks.delete(subId)
        db._subQueries.delete(subId)
        maybeTeardownSseListener(db)
      },
    }
  }
}

export function installKernelBridgeSseRealtime(db: KernelBridgePatchedDb): void {
  if (db._kernelBridgeInstalled) return
  db._kernelBridgeInstalled = true

  if (!db._subCallbacks) {
    db._subCallbacks = new Map()
  }
  if (!db._subQueries) {
    db._subQueries = new Map()
  }

  db.subscribe = createKernelBridgeSubscribe(db)
}
