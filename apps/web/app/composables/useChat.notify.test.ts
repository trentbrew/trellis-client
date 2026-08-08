/**
 * Tests for chat @mention notification trigger in useChat.
 *
 * Verifies:
 * - _extractMentionedUserIds parses mention chips from HTML
 * - sendMessage fires /api/notify for each mentioned user (not the author)
 * - sendMessage passes skipUserIds to notify-message so mentioned users
 *   don't also receive a new_message notification
 * - Self-mentions are skipped
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockDbTransact = vi.fn().mockResolvedValue(undefined)
const mockFetch = vi.fn().mockResolvedValue({})

vi.stubGlobal('$fetch', mockFetch)

vi.mock('~/composables/useInstantDb', () => ({
  useInstantDb: () => ({
    transact: mockDbTransact,
    tx: new Proxy({}, {
      get: (_t, table: string) => new Proxy({}, {
        get: (_t2, id: string) => ({ update: (d: any) => ({ table, id, data: d }) }),
      }),
    }),
    subscribeQuery: vi.fn(),
  }),
}))

vi.mock('~/composables/useInstantAuth', () => ({
  useInstantAuth: () => ({
    user: ref({ id: 'user-author', name: 'Alice', email: 'alice@example.com' }),
  }),
}))

vi.mock('~/composables/useDataAdapter', () => ({
  useDataAdapter: () => ({ mode: 'cloud' }),
}))

vi.mock('~/composables/useTrellisGraph', () => ({
  useTrellisGraph: () => ({ mutate: vi.fn(), query: vi.fn(), fetchNodes: vi.fn() }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mentionHtml(userId: string, displayName: string) {
  return `<span data-type="mention" data-id="${userId}">@${displayName}</span>`
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useChat — @mention notifications', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockDbTransact.mockClear()
  })

  it('fires /api/notify with type:mention for a mentioned user', async () => {
    const { sendMessage } = useChat(ref('channel-1'), { orgId: 'org-1', channelTitle: 'general' })

    await sendMessage(mentionHtml('user-bob', 'Bob') + ' hey there')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(1)
    expect(notifyCalls[0]![1].body).toMatchObject({
      recipientId: 'user-bob',
      orgId: 'org-1',
      type: 'mention',
    })
  })

  it('skips self-mentions (author === mentioned user)', async () => {
    const { sendMessage } = useChat(ref('channel-1'), { orgId: 'org-1', channelTitle: 'general' })

    await sendMessage(mentionHtml('user-author', 'Alice') + ' note to self')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })

  it('passes skipUserIds to notify-message for mentioned users', async () => {
    const { sendMessage } = useChat(ref('channel-1'), { orgId: 'org-1', channelTitle: 'general' })

    await sendMessage(mentionHtml('user-bob', 'Bob') + mentionHtml('user-carol', 'Carol'))

    const notifyMsgCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/chat/notify-message')
    expect(notifyMsgCalls).toHaveLength(1)
    expect(notifyMsgCalls[0]![1].body.skipUserIds).toEqual(
      expect.arrayContaining(['user-bob', 'user-carol']),
    )
  })

  it('fires one /api/notify per distinct mentioned user', async () => {
    const { sendMessage } = useChat(ref('channel-1'), { orgId: 'org-1', channelTitle: 'general' })

    await sendMessage(mentionHtml('user-bob', 'Bob') + mentionHtml('user-carol', 'Carol'))

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(2)
    const recipients = notifyCalls.map((c: any[]) => c[1].body.recipientId)
    expect(recipients).toContain('user-bob')
    expect(recipients).toContain('user-carol')
  })

  it('deduplicates repeated mentions of the same user', async () => {
    const { sendMessage } = useChat(ref('channel-1'), { orgId: 'org-1', channelTitle: 'general' })

    await sendMessage(mentionHtml('user-bob', 'Bob') + ' again ' + mentionHtml('user-bob', 'Bob'))

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(1)
  })

  it('does not fire /api/notify when no mentions present', async () => {
    const { sendMessage } = useChat(ref('channel-1'), { orgId: 'org-1', channelTitle: 'general' })

    await sendMessage('plain text message with no mentions')

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })

  it('does not fire notifications when orgId context is missing', async () => {
    const { sendMessage } = useChat(ref('channel-1')) // no context

    await sendMessage(mentionHtml('user-bob', 'Bob'))

    const notifyCalls = mockFetch.mock.calls.filter((c: any[]) => c[0] === '/api/notify')
    expect(notifyCalls).toHaveLength(0)
  })
})
