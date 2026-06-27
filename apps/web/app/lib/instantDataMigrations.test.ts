import { describe, expect, it } from 'vitest'

import { migrateUserToV1 } from '~/lib/instantDataMigrations'

const createTxProxy = () => {
  return {
    settings: new Proxy(
      {},
      {
        get: (_target, prop) => {
          const id = String(prop)
          return {
            update: (payload: any) => ({ op: 'update', id, payload }),
          }
        },
      },
    ),
  }
}

describe('instantDataMigrations', () => {
  it('repairs malformed collection schema settings by writing canonical settingKey and normalized value', async () => {
    const ownerId = 'user_1'
    const collectionId = 'col_1'

    const instant: any = {
      tx: createTxProxy(),
      queryOnce: async (_query: any) => {
        return {
          data: {
            settings: [
              {
                id: 'setting_1',
                ownerId,
                entityType: 'collection',
                entityId: collectionId,
                key: 'schema',
                settingKey: 'broken_key',
                value: {
                  id: 'setting_1',
                  collectionId,
                  fields: [{ id: 'f1', name: 'Name', type: 'text', required: true, order: 0 }],
                  views: [],
                  createdAt: 1,
                  updatedAt: 2,
                },
              },
            ],
          },
        }
      },
      transact: async (chunks: any[]) => {
        instant.__chunks = chunks
      },
      __chunks: [] as any[],
    }

    await migrateUserToV1(instant, ownerId)

    expect(Array.isArray(instant.__chunks)).toBe(true)
    expect(instant.__chunks.length).toBe(1)

    const chunk = instant.__chunks[0]
    expect(chunk.op).toBe('update')
    expect(chunk.id).toBe('setting_1')

    expect(chunk.payload.ownerId).toBe(ownerId)
    expect(chunk.payload.entityType).toBe('collection')
    expect(chunk.payload.entityId).toBe(collectionId)
    expect(chunk.payload.key).toBe('schema')
    expect(chunk.payload.settingKey).toBe(`collection:${collectionId}:schema`)

    expect(chunk.payload.value.collectionId).toBe(collectionId)
    expect(Array.isArray(chunk.payload.value.fields)).toBe(true)
    expect(Array.isArray(chunk.payload.value.views)).toBe(true)
    expect(chunk.payload.value.views.length).toBeGreaterThan(0)
  })

  it('does not transact when no repairs are needed', async () => {
    const ownerId = 'user_1'
    const collectionId = 'col_1'

    const instant: any = {
      tx: createTxProxy(),
      queryOnce: async (_query: any) => {
        return {
          data: {
            settings: [
              {
                id: 'setting_1',
                ownerId,
                entityType: 'collection',
                entityId: collectionId,
                key: 'schema',
                settingKey: `collection:${collectionId}:schema`,
                value: {
                  id: 'setting_1',
                  collectionId,
                  fields: [],
                  views: [{ id: 'v1', name: 'All Records', type: 'table', filters: [], sorts: [], isDefault: true }],
                  createdAt: 1,
                  updatedAt: 2,
                },
              },
            ],
          },
        }
      },
      transact: async (chunks: any[]) => {
        instant.__chunks = chunks
      },
      __chunks: [] as any[],
    }

    await migrateUserToV1(instant, ownerId)
    expect(instant.__chunks.length).toBe(0)
  })
})
