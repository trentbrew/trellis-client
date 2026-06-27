// @vitest-environment node

/**
 * DataAdapter contract tests — LocalAdapter only.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createLocalAdapter } from '~/lib/data-adapter/local-adapter'
import type { DataAdapter } from '~/lib/data-adapter/types'

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
})
