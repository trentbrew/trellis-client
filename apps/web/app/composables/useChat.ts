import type { Message, EntityRef } from '~/types/database'
import { entityId as toEntityId, entityQuery } from '~/lib/tql-namespace'

/**
 * useChat — Manages messages for a single channel.
 *
 * Dual-mode:
 * - **Cloud mode**: InstantDB `messages` table with realtime subscriptions.
 * - **Local mode**: TQL graph entities with type='message'.
 *
 * Usage:
 *   const { messages, sendMessage, editMessage, deleteMessage } = useChat(channelId)
 */
export function useChat(
  channelId: Ref<string | undefined> | string,
  context?: { orgId?: string; channelTitle?: string },
) {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const adapter = useDataAdapter()
  const isCloudMode = adapter.mode === 'cloud'

  const resolvedId = computed(() =>
    typeof channelId === 'string' ? channelId : channelId.value,
  )

  const messages = ref<Message[]>([])
  const loading = ref(true)
  const hasMore = ref(true)
  const PAGE_SIZE = 50

  // ── Cloud subscription ────────────────────────────────────────────
  let unsub: (() => void) | null = null

  function subscribeCloud(id: string) {
    unsub?.()
    unsub = null
    loading.value = true

    unsub = db.subscribeQuery(
      {
        messages: {
          $: {
            where: { channelId: id },
            order: { createdAt: 'asc' },
            limit: PAGE_SIZE,
          },
        },
      },
      (result: any) => {
        if (result.error) {
          console.error('[useChat] subscription error:', result.error)
          loading.value = false
          return
        }
        messages.value = ((result.data?.messages ?? []) as Message[]).filter((m) => !m.deletedAt)
        loading.value = false
      },
    )
  }

  // ── Local (TQL) subscription ──────────────────────────────────────
  function initLocal() {
    const { query, fetchNodes } = useTrellisGraph()

    const eqls = computed(() => {
      const id = resolvedId.value
      if (!id) return ''
      return `${entityQuery('?m')} WHERE ?m.entityKind = "message" AND ?m.channelId = "${id}"`
    })

    const { data: msgIds, loading: queryLoading } = query(eqls)

    watch(
      msgIds,
      async (ids) => {
        if (!ids || ids.length === 0) {
          messages.value = []
          loading.value = false
          return
        }
        try {
          const idList = ids.map((row) => (row as any)['?m'] as string)
          const rawNodes = await fetchNodes(idList)
          messages.value = rawNodes
            .map((node) => {
              const fullId = node['@id'] as string
              const id = fullId.replace('entity:', '')
              const { '@id': _a, '@type': _b, entityKind: _k, ...rest } = node
              return { id, ...rest } as unknown as Message
            })
            .filter((m) => !m.deletedAt)
            .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        } catch (err) {
          console.error('[useChat] TQL hydration error:', err)
        } finally {
          loading.value = false
        }
      },
      { immediate: true },
    )

    watch(queryLoading, (v) => { if (v) loading.value = true })
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function _extractMentionedUserIds(html: string): string[] {
    if (!html || !import.meta.client) return []
    const div = document.createElement('div')
    div.innerHTML = html
    const chips = div.querySelectorAll('[data-type="mention"][data-id], .mention-chip[data-id]')
    const ids: string[] = []
    chips.forEach((el) => {
      const id = el.getAttribute('data-id')
      if (id && !ids.includes(id)) ids.push(id)
    })
    return ids
  }

  // ── CRUD ─────────────────────────────────────────────────────────
  async function sendMessage(content: string, opts?: {
    entityRefs?: EntityRef[]
    replyToId?: string
  }) {
    const id = resolvedId.value
    const userId = user.value?.id
    if (!id || !userId || !content.trim()) return

    const msgId = crypto.randomUUID()
    const now = Date.now()

    const data: any = {
      channelId: id,
      authorId: userId,
      authorName: (user.value as any)?.name || (user.value as any)?.email || 'Anonymous',
      authorAvatar: (user.value as any)?.avatar || undefined,
      content: content.trim(),
      createdAt: now,
    }

    if (opts?.replyToId) data.replyToId = opts.replyToId
    if (opts?.entityRefs?.length) data.entityRefs = opts.entityRefs

    if (isCloudMode) {
      await db.transact(db.tx.messages[msgId].update(data))
      await db.transact(db.tx.channels[id].update({ lastMessageAt: now }))

      // Detect @mentioned user IDs from mention chips in the HTML content
      const mentionedUserIds = _extractMentionedUserIds(data.content)

      // Fire mention notifications (higher priority than new_message)
      if (mentionedUserIds.length > 0 && context?.orgId) {
        for (const mentionedUserId of mentionedUserIds) {
          if (mentionedUserId === userId) continue
          $fetch('/api/notify', {
            method: 'POST',
            body: {
              recipientId: mentionedUserId,
              orgId: context.orgId,
              type: 'mention',
              title: `#${context.channelTitle ?? id}`,
              message: `${data.authorName} mentioned you: ${data.content.replace(/<[^>]+>/g, '').slice(0, 80)}`,
              actionUrl: `/messages/${id}`,
              icon: 'lucide:at-sign',
              variant: 'default',
              actorId: userId,
              actorName: data.authorName,
              metadata: { channelId: id, messageId: msgId },
            },
          }).catch((err) => {
            console.warn('[useChat] mention notify failed (non-fatal):', err?.message)
          })
        }
      }

      // Fire-and-forget: notify other org members about the new message
      // (skip users who already received a mention notification)
      if (context?.orgId) {
        $fetch('/api/chat/notify-message', {
          method: 'POST',
          body: {
            channelId: id,
            channelTitle: context.channelTitle ?? id,
            orgId: context.orgId,
            authorId: userId,
            authorName: data.authorName,
            content: data.content,
            skipUserIds: mentionedUserIds,
          },
        }).catch((err) => {
          console.warn('[useChat] notify-message failed (non-fatal):', err?.message)
        })
      }
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({
        action: 'createNode',
        entityId: toEntityId(msgId),
        type: 'entity',
        data: { ...data, entityKind: 'message' },
      })
    }

    return msgId
  }

  async function editMessage(messageId: string, content: string) {
    const update = { content: content.trim(), edited: true, editedAt: Date.now() }
    if (isCloudMode) {
      await db.transact(db.tx.messages[messageId].update(update))
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({ action: 'updateNode', entityId: toEntityId(messageId), type: 'entity', data: update })
    }
  }

  async function deleteMessage(messageId: string) {
    const update = { deletedAt: Date.now() }
    if (isCloudMode) {
      await db.transact(db.tx.messages[messageId].update(update))
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({ action: 'updateNode', entityId: toEntityId(messageId), type: 'entity', data: update })
    }
  }

  async function addReaction(messageId: string, emoji: string) {
    const userId = user.value?.id
    if (!userId) return

    const msg = messages.value.find((m) => m.id === messageId)
    if (!msg) return

    const reactions = { ...(msg.reactions ?? {}) }
    const users = reactions[emoji] ?? []
    if (!users.includes(userId)) {
      reactions[emoji] = [...users, userId]
      if (isCloudMode) {
        await db.transact(db.tx.messages[messageId].update({ reactions }))
      } else {
        const { mutate } = useTrellisGraph()
        await mutate({ action: 'updateNode', entityId: toEntityId(messageId), type: 'entity', data: { reactions } })
      }
    }
  }

  async function removeReaction(messageId: string, emoji: string) {
    const userId = user.value?.id
    if (!userId) return

    const msg = messages.value.find((m) => m.id === messageId)
    if (!msg) return

    const existing = msg.reactions ?? {}
    const users = (existing[emoji] ?? []).filter((id: string) => id !== userId)
    const reactions: Record<string, string[]> = {}
    for (const [key, val] of Object.entries(existing)) {
      if (key !== emoji) reactions[key] = val as string[]
    }
    if (users.length > 0) reactions[emoji] = users

    if (isCloudMode) {
      await db.transact(db.tx.messages[messageId].update({ reactions }))
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({ action: 'updateNode', entityId: toEntityId(messageId), type: 'entity', data: { reactions } })
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  if (import.meta.client) {
    if (isCloudMode) {
      watch(
        resolvedId,
        (id) => {
          if (id) subscribeCloud(id)
          else {
            unsub?.()
            unsub = null
            messages.value = []
            loading.value = false
          }
        },
        { immediate: true },
      )
      onScopeDispose(() => unsub?.())
    } else {
      initLocal()
    }
  }

  return {
    messages,
    loading,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  }
}
