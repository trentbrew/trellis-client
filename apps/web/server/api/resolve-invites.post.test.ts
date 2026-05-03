// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbState = vi.hoisted(() => ({
  pendingMembers: [] as any[],
  placeholderSharesByMemberId: new Map<string, any[]>(),
  existingSettings: new Map<string, any>(),
  queries: [] as any[],
  transactions: [] as any[],
}))

const makeTx = (namespace: string, id: string) => ({
  update: (data: any) => ({ type: 'update', namespace, id, data }),
  create: (data: any) => ({ type: 'create', namespace, id, data }),
  link: (data: any) => ({ type: 'link', namespace, id, data }),
})

const mockDb = vi.hoisted(() => ({
  query: vi.fn(async (query: any) => {
    dbState.queries.push(query)

    const memberWhere = query?.members?.$?.where
    if (memberWhere?.status === 'pending') {
      return { members: dbState.pendingMembers }
    }
    if (memberWhere?.status === 'active') {
      return { members: [] }
    }

    const sharesWhere = query?.shares?.$?.where
    if (sharesWhere?.userId) {
      return { shares: dbState.placeholderSharesByMemberId.get(sharesWhere.userId) || [] }
    }

    const settingsWhere = query?.settings?.$?.where
    if (settingsWhere?.settingKey) {
      const setting = dbState.existingSettings.get(settingsWhere.settingKey)
      return { settings: setting ? [setting] : [] }
    }

    return {}
  }),
  transact: vi.fn(async (ops: any) => {
    dbState.transactions.push(ops)
  }),
  tx: new Proxy(
    {},
    {
      get: (_target, namespace: string) =>
        new Proxy(
          {},
          {
            get: (_target2, id: string) => makeTx(namespace, id),
          },
        ),
    },
  ),
}))
const mockReadBody = vi.hoisted(() => vi.fn())

vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('createError', (input: any) => Object.assign(new Error(input.message), input))
vi.stubGlobal('useInstantAdmin', () => mockDb)
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-uuid') })

async function loadHandler() {
  vi.resetModules()
  const mod = await import('./resolve-invites.post')
  return mod.default as (event: any) => Promise<any>
}

describe('POST /api/resolve-invites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbState.pendingMembers = []
    dbState.placeholderSharesByMemberId = new Map()
    dbState.existingSettings = new Map()
    dbState.queries = []
    dbState.transactions = []
  })

  it('activates pending members and updates guest share placeholders to the authenticated user', async () => {
    const member = {
      id: 'member-1',
      ownerId: 'owner-1',
      orgId: 'org-1',
      worldId: 'app-1',
      email: 'guest@example.com',
      role: 'guest',
      orgName: 'Acme',
    }
    dbState.pendingMembers = [member]
    dbState.placeholderSharesByMemberId.set(member.id, [{ id: 'share-1' }, { id: 'share-2' }])
    mockReadBody.mockResolvedValue({
      userId: 'user-guest',
      email: ' GUEST@EXAMPLE.COM ',
    })

    const handler = await loadHandler()
    const result = await handler({})

    expect(result).toEqual({
      resolved: 1,
      memberships: [{ orgId: 'org-1', worldId: 'app-1', role: 'guest' }],
    })

    expect(mockDb.query).toHaveBeenCalledWith({
      shares: { $: { where: { userId: 'member-1' } } },
    })

    const activationTx = dbState.transactions[0]
    expect(activationTx).toEqual([
      expect.objectContaining({
        type: 'update',
        namespace: 'members',
        id: 'member-1',
        data: expect.objectContaining({
          userId: 'user-guest',
          status: 'active',
          joinedAt: expect.any(Number),
        }),
      }),
      {
        type: 'update',
        namespace: 'shares',
        id: 'share-1',
        data: { userId: 'user-guest' },
      },
      {
        type: 'update',
        namespace: 'shares',
        id: 'share-2',
        data: { userId: 'user-guest' },
      },
    ])
  })

  it('returns no memberships when there are no matching pending invites', async () => {
    mockReadBody.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
    })

    const handler = await loadHandler()
    const result = await handler({})

    expect(result).toEqual({ resolved: 0, memberships: [] })
    expect(mockDb.transact).not.toHaveBeenCalled()
  })
})
