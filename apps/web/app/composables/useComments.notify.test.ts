/**
 * Tests for comment notification trigger in useComments.
 *
 * Verifies:
 * - addComment fires /api/notify with type:'comment' to entity owner
 * - Self-comments (commenter === owner) do NOT trigger a notification
 * - Activity log entries (type !== 'comment') do NOT trigger a notification
 * - Notification is skipped when context is not provided
 * - Notification is skipped in local (non-cloud) mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockTransact = vi.fn().mockResolvedValue(undefined)
const mockFetch = vi.fn().mockResolvedValue({})

vi.stubGlobal('$fetch', mockFetch)

// Shared adapter mock — mode can be overridden per test
let adapterMode = 'cloud'
const mockTx = new Proxy({}, {
  get: (_t, table: string) => new Proxy({}, {
    get: (_t2, id: string) => ({
      update: (d: any) => ({ table, id, data: d }),
      link: (d: any) => ({ table, id, link: d }),
    }),
  }),
})

vi.mock('~/composables/useDataAdapter', () => ({
  useDataAdapter: () => ({
    get mode() { return adapterMode },
    tx: mockTx,
    transact: mockTransact,
    subscribeQuery: vi.fn((_q, cb) => { cb({ data: { comments: [] } }); return () => {} }),
  }),
}))

vi.mock('~/composables/useInstantAuth', () => ({
  useInstantAuth: () => ({
    user: ref({ id: 'user-commenter', name: 'Bob', email: 'bob@example.com' }),
  }),
}))

vi.mock('~/composables/useTrellisGraph', () => ({
  useTrellisGraph: () => ({
    mutate: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(() => ({ data: ref([]), loading: ref(false) })),
    fetchNodes: vi.fn().mockResolvedValue([]),
  }),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useComments — comment notifications', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockTransact.mockClear()
    adapterMode = 'cloud'
  })

  it('fires /api/notify with type:comment to entity owner after addComment', async () => {
    const { addComment } = useComments(
      ref('entity-1'),
      'entity',
      { orgId: 'org-1', entityOwnerId: 'user-owner', entityTitle: 'My Task' },
    )

    await addComment('Great progress!')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(1)
    expect(notifyCalls[0]![1].body).toMatchObject({
      recipientId: 'user-owner',
      orgId: 'org-1',
      type: 'comment',
    })
    expect(notifyCalls[0]![1].body.title).toContain('My Task')
    expect(notifyCalls[0]![1].body.message).toContain('Great progress!')
  })

  it('does NOT notify when commenter is the entity owner (self-comment)', async () => {
    const { addComment } = useComments(
      ref('entity-1'),
      'entity',
      { orgId: 'org-1', entityOwnerId: 'user-commenter', entityTitle: 'My Task' },
    )

    await addComment('Note to self')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })

  it('does NOT notify for activity log entries (type !== comment)', async () => {
    const { addComment } = useComments(
      ref('entity-1'),
      'entity',
      { orgId: 'org-1', entityOwnerId: 'user-owner', entityTitle: 'My Task' },
    )

    await addComment('Task created', 'created')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })

  it('does NOT notify when context is not provided', async () => {
    const { addComment } = useComments(ref('entity-1'), 'entity')

    await addComment('A comment without context')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })

  it('does NOT notify in local (non-cloud) mode', async () => {
    adapterMode = 'local'
    const { addComment } = useComments(
      ref('entity-1'),
      'entity',
      { orgId: 'org-1', entityOwnerId: 'user-owner', entityTitle: 'My Task' },
    )

    await addComment('Local comment')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })

  it('truncates long comment content in the notification message', async () => {
    const { addComment } = useComments(
      ref('entity-1'),
      'entity',
      { orgId: 'org-1', entityOwnerId: 'user-owner', entityTitle: 'My Task' },
    )

    const longComment = 'x'.repeat(200)
    await addComment(longComment)

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(1)
    expect(notifyCalls[0]![1].body.message.length).toBeLessThanOrEqual(150)
  })
})
