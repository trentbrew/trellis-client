// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createKernelBridgeSubscribe,
  type KernelBridgePatchedDb,
} from './sse-realtime'

const sseCallbacks = new Set<(event: MessageEvent) => void>()

vi.mock('~/composables/useTrellisSSE', () => ({
  useSSESubscribe: (_type: string, callback: (event: MessageEvent) => void) => {
    sseCallbacks.add(callback)
    return () => {
      sseCallbacks.delete(callback)
    }
  },
}))

function mockDb(listRows: unknown[] = []): KernelBridgePatchedDb {
  return {
    _subCallbacks: new Map(),
    _subQueries: new Map(),
    _kernelBridgeSseCleanup: null,
    list: vi.fn().mockResolvedValue({ data: listRows, total: listRows.length, limit: 100, offset: 0 }),
  } as unknown as KernelBridgePatchedDb
}

function emitMutation(data: Record<string, unknown>) {
  const event = { data: JSON.stringify(data) } as MessageEvent
  for (const cb of sseCallbacks) {
    cb(event)
  }
}

describe('kernel-bridge SSE realtime', () => {
  afterEach(() => {
    sseCallbacks.clear()
    vi.clearAllMocks()
  })

  it('hydrates subscriber with entity list on subscribe', async () => {
    const rows = [{ id: 'route:home', type: 'AppRoute', title: 'Home', configJson: '{}' }]
    const db = mockDb(rows)
    const subscribe = createKernelBridgeSubscribe(db)
    const callback = vi.fn()

    subscribe('FIND AppRoute AS ?r', callback, { entityType: 'AppRoute' })

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalled()
    })

    expect(db.list).toHaveBeenCalledWith('AppRoute')
    expect(callback).toHaveBeenCalledWith(
      rows,
      { added: [], updated: rows, removed: [] },
      { resolved: true },
    )
  })

  it('refetches on app_route kernel mutation SSE event', async () => {
    const initial = [{ id: 'route:home', type: 'AppRoute', title: 'Home', configJson: '{}' }]
    const updated = [{ id: 'route:home', type: 'AppRoute', title: 'Updated', configJson: '{}' }]
    const db = mockDb(initial)
    const subscribe = createKernelBridgeSubscribe(db)
    const callback = vi.fn()

    subscribe('FIND AppRoute AS ?r', callback, { entityType: 'AppRoute' })
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))

    vi.mocked(db.list).mockResolvedValueOnce({
      data: updated,
      total: updated.length,
      limit: 100,
      offset: 0,
    })

    emitMutation({
      action: 'updateNode',
      entityId: 'route:home',
      data: { type: 'app_route', title: 'Updated' },
    })

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledTimes(2)
    })

    expect(callback).toHaveBeenLastCalledWith(
      updated,
      { added: [], updated, removed: [] },
      { resolved: true },
    )
  })
})
