// @vitest-environment node

/**
 * DataAdapter contract tests.
 *
 * Verifies that LocalAdapter (and eventually CloudAdapter) conform to the
 * DataAdapter interface and behave correctly for basic operations.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createLocalAdapter } from '~/lib/data-adapter/local-adapter'
import type { DataAdapter } from '~/lib/data-adapter/types'

const instantMock = vi.hoisted(() => {
  const rawDb = {
    subscribeQuery: vi.fn(),
    queryOnce: vi.fn(),
    transact: vi.fn(),
    tx: { organizations: {} },
    subscribeAuth: vi.fn(),
    auth: {
      signOut: vi.fn(),
      signInWithIdToken: vi.fn(),
      signInWithToken: vi.fn(),
      signInWithCustomToken: vi.fn(),
      sendMagicCode: vi.fn(),
      signInWithMagicCode: vi.fn(),
    },
    getAuth: vi.fn(),
  }

  return {
    rawDb,
    init: vi.fn(() => rawDb),
  }
})

vi.mock('@instantdb/core', () => ({
  init: instantMock.init,
}))

describe('DataAdapter interface', () => {
  describe('LocalAdapter', () => {
    let adapter: DataAdapter

    beforeEach(() => {
      adapter = createLocalAdapter({
        storageKey: `test-${Date.now()}`,
        verbose: false,
      })
    })

    it('has mode "local"', () => {
      expect(adapter.mode).toBe('local')
    })

    it('has entityBackend "tql"', () => {
      expect(adapter.entityBackend).toBe('tql')
    })

    it('has ontologyBackend "tql"', () => {
      expect(adapter.ontologyBackend).toBe('tql')
    })

    it('exposes tx proxy', () => {
      expect(adapter.tx).toBeDefined()
    })

    it('exposes auth object with signOut and signInWithIdToken', () => {
      expect(adapter.auth).toBeDefined()
      expect(typeof adapter.auth.signOut).toBe('function')
      expect(typeof adapter.auth.signInWithIdToken).toBe('function')
    })

    it('getAuth returns a user', async () => {
      const user = await adapter.getAuth()
      expect(user).toBeDefined()
      expect(user?.id).toBeTruthy()
    })

    it('subscribeAuth fires callback with user', () => {
      const cb = vi.fn()
      const unsub = adapter.subscribeAuth(cb)
      expect(cb).toHaveBeenCalled()
      const payload = cb.mock.calls[0]?.[0]
      expect(payload).toBeDefined()
      expect(payload != null && 'user' in payload).toBe(true)
      unsub()
    })

    it('queryOnce returns data object', async () => {
      const result = await adapter.queryOnce({ organizations: {} })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('organizations')
    })

    it('subscribeQuery fires callback and returns unsub', () => {
      return new Promise<void>((resolve) => {
        const unsub = adapter.subscribeQuery({ organizations: {} }, (result) => {
          expect(result).toHaveProperty('data')
          unsub()
          resolve()
        })
      })
    })

    it('transact creates and queries an entity', async () => {
      const id = `test-${Date.now()}`
      await adapter.transact([
        adapter.tx.organizations[id].create({
          name: 'Test Org',
          slug: 'test-org',
        }),
      ])

      const result = await adapter.queryOnce({ organizations: {} })
      const orgs = result.data.organizations || []
      const found = orgs.find((o: any) => o.id === id)
      expect(found).toBeDefined()
      expect(found.name).toBe('Test Org')
    })

    it('transact updates an entity', async () => {
      const id = `test-update-${Date.now()}`
      await adapter.transact([
        adapter.tx.organizations[id].create({
          name: 'Original',
          slug: 'original',
        }),
      ])

      await adapter.transact([
        adapter.tx.organizations[id].update({
          name: 'Updated',
        }),
      ])

      const result = await adapter.queryOnce({ organizations: {} })
      const orgs = result.data.organizations || []
      const found = orgs.find((o: any) => o.id === id)
      expect(found?.name).toBe('Updated')
    })

    it('transact deletes an entity', async () => {
      const id = `test-delete-${Date.now()}`
      await adapter.transact([
        adapter.tx.organizations[id].create({
          name: 'To Delete',
          slug: 'to-delete',
        }),
      ])

      await adapter.transact([adapter.tx.organizations[id].delete()])

      const result = await adapter.queryOnce({ organizations: {} })
      const orgs = result.data.organizations || []
      const found = orgs.find((o: any) => o.id === id)
      expect(found).toBeUndefined()
    })

    it('exposes _store for local adapter', () => {
      expect(adapter._store).toBeDefined()
    })

    it('exposes demoUsers for local adapter', () => {
      expect(adapter.demoUsers).toBeDefined()
      expect(adapter.demoUsers?.admin).toBeDefined()
    })
  })

  describe('CloudAdapter', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      instantMock.rawDb.subscribeQuery.mockReturnValue(() => {})
      instantMock.rawDb.queryOnce.mockResolvedValue({ data: {}, pageInfo: undefined })
      instantMock.rawDb.transact.mockResolvedValue(undefined)
      instantMock.rawDb.subscribeAuth.mockReturnValue(() => {})
      instantMock.rawDb.auth.signOut.mockResolvedValue(undefined)
      instantMock.rawDb.auth.signInWithIdToken.mockResolvedValue(undefined)
      instantMock.rawDb.auth.signInWithToken.mockResolvedValue(undefined)
      instantMock.rawDb.auth.signInWithCustomToken.mockResolvedValue(undefined)
      instantMock.rawDb.auth.sendMagicCode.mockResolvedValue(undefined)
      instantMock.rawDb.auth.signInWithMagicCode.mockResolvedValue(undefined)
      instantMock.rawDb.getAuth.mockResolvedValue(null)
    })

    it('throws without appId', async () => {
      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')
      expect(() => createCloudAdapter({ appId: '' })).toThrow('[CloudAdapter] appId is required')
    })

    it('initializes InstantDB with only defined connection options', async () => {
      const schema = { entities: {}, links: {} }
      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')

      const adapter = createCloudAdapter({
        appId: 'app-123',
        schema,
        verbose: true,
        devtool: false,
      })

      expect(adapter.mode).toBe('cloud')
      expect(adapter.entityBackend).toBe('adapter')
      expect(adapter.ontologyBackend).toBe('adapter')
      expect(adapter._rawDb).toBe(instantMock.rawDb)
      expect(instantMock.init).toHaveBeenCalledWith({
        appId: 'app-123',
        schema,
        verbose: true,
        devtool: false,
      })
    })

    it('passes explicit InstantDB websocket and API URIs when provided', async () => {
      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')

      createCloudAdapter({
        appId: 'app-123',
        websocketURI: 'wss://instant.example.test/runtime/session',
        apiURI: 'https://instant.example.test/api',
      })

      expect(instantMock.init).toHaveBeenCalledWith({
        appId: 'app-123',
        schema: undefined,
        verbose: undefined,
        devtool: undefined,
        websocketURI: 'wss://instant.example.test/runtime/session',
        apiURI: 'https://instant.example.test/api',
      })
    })

    it('maps subscribeQuery data and errors through the DataAdapter result shape', async () => {
      const unsubscribe = vi.fn()
      instantMock.rawDb.subscribeQuery.mockImplementation((_query, callback) => {
        callback({ data: { organizations: [{ id: 'org-1' }] } })
        callback({ error: new Error('query failed') })
        return unsubscribe
      })

      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')
      const adapter = createCloudAdapter({ appId: 'app-123' })
      const callback = vi.fn()

      const result = adapter.subscribeQuery({ organizations: {} }, callback)

      expect(result).toBe(unsubscribe)
      expect(callback).toHaveBeenNthCalledWith(1, { data: { organizations: [{ id: 'org-1' }] } })
      expect(callback.mock.calls[1]?.[0]?.error?.message).toBe('query failed')
    })

    it('maps queryOnce data and pageInfo', async () => {
      instantMock.rawDb.queryOnce.mockResolvedValue({
        data: { organizations: [{ id: 'org-1' }] },
        pageInfo: { organizations: { hasNextPage: false } },
      })

      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')
      const adapter = createCloudAdapter({ appId: 'app-123' })

      await expect(adapter.queryOnce({ organizations: {} })).resolves.toEqual({
        data: { organizations: [{ id: 'org-1' }] },
        pageInfo: { organizations: { hasNextPage: false } },
      })
    })

    it('delegates transactions, tx proxy, and auth actions to InstantDB', async () => {
      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')
      const adapter = createCloudAdapter({ appId: 'app-123' })
      const chunk = { __txChunk: true, namespace: 'organizations', entityId: 'org-1', actions: [] } as any

      await adapter.transact(chunk)
      await adapter.auth.signOut()
      await adapter.auth.signInWithIdToken({ idToken: 'token' })
      await adapter.auth.signInWithCustomToken?.('custom-token')
      await adapter.auth.sendMagicCode({ email: 'test@example.com' })
      await adapter.auth.verifyMagicCode({ email: 'test@example.com', code: '123456' })

      expect(instantMock.rawDb.transact).toHaveBeenCalledWith([chunk])
      expect(adapter.tx).toBe(instantMock.rawDb.tx)
      expect(instantMock.rawDb.auth.signOut).toHaveBeenCalled()
      expect(instantMock.rawDb.auth.signInWithIdToken).toHaveBeenCalledWith({ idToken: 'token' })
      expect(instantMock.rawDb.auth.signInWithToken).toHaveBeenCalledWith('custom-token')
      expect(instantMock.rawDb.auth.sendMagicCode).toHaveBeenCalledWith({ email: 'test@example.com' })
      expect(instantMock.rawDb.auth.signInWithMagicCode).toHaveBeenCalledWith({
        email: 'test@example.com',
        code: '123456',
      })
    })

    it('normalizes subscribeAuth payloads', async () => {
      const error = new Error('auth failed')
      instantMock.rawDb.subscribeAuth.mockImplementation((callback) => {
        callback({ user: { id: 'user-1', email: 'u@example.com', name: 'User', imageURL: 'avatar.png' } })
        callback({ error })
        callback({})
        return () => {}
      })

      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')
      const adapter = createCloudAdapter({ appId: 'app-123' })
      const callback = vi.fn()

      adapter.subscribeAuth(callback)

      expect(callback).toHaveBeenNthCalledWith(1, {
        user: {
          id: 'user-1',
          email: 'u@example.com',
          name: 'User',
          avatar: 'avatar.png',
          role: null,
        },
      })
      expect(callback).toHaveBeenNthCalledWith(2, { error })
      expect(callback).toHaveBeenNthCalledWith(3, { user: null })
    })

    it('normalizes getAuth results and returns null on failures', async () => {
      instantMock.rawDb.getAuth
        .mockResolvedValueOnce({ id: 'user-1', email: 'u@example.com', name: 'User', avatar: 'avatar.png' })
        .mockRejectedValueOnce(new Error('not signed in'))

      const { createCloudAdapter } = await import('~/lib/data-adapter/cloud-adapter')
      const adapter = createCloudAdapter({ appId: 'app-123' })

      await expect(adapter.getAuth()).resolves.toEqual({
        id: 'user-1',
        email: 'u@example.com',
        name: 'User',
        avatar: 'avatar.png',
        role: null,
      })
      await expect(adapter.getAuth()).resolves.toBeNull()
    })
  })
})
