import type { Ref } from 'vue'
import { entityId as toEntityId } from '~/lib/tql-namespace'

export interface Comment {
  id: string
  entityId: string
  entityType: string
  authorId: string
  authorName: string
  authorAvatar?: string
  content: string
  type: 'comment' | 'status_change' | 'attachment' | 'created'
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt?: number
  deletedAt?: number
}

/**
 * Reactive composable for entity comments/activity feed.
 *
 * Dual-mode:
 * - **Cloud mode**: Uses InstantDB adapter for realtime comment sync across sessions.
 * - **Local mode**: Uses TQL graph API for local-only comments.
 *
 * @param entityId - Reactive or static ID of the parent entity
 * @param entityType - Type discriminator (e.g. 'entity')
 */
export function useComments(entityId: Ref<string | undefined> | string, entityType: string = 'entity') {
  const { user: currentUser } = useInstantAuth()
  const adapter = useDataAdapter()
  const isCloudMode = adapter.mode === 'cloud'

  const comments = ref<Comment[]>([])
  const loading = ref(true)

  const resolvedId = computed(() => (typeof entityId === 'string' ? entityId : entityId.value))

  if (isCloudMode) {
    _initCloudComments()
  } else {
    _initTqlComments()
  }

  // ── Cloud mode: InstantDB adapter ────────────────────────────────────

  function _initCloudComments() {
    let unsub: (() => void) | null = null

    const subscribe = (parentId: string | null) => {
      if (unsub) { unsub(); unsub = null }

      if (!parentId) {
        comments.value = []
        loading.value = false
        return
      }

      loading.value = true
      unsub = adapter.subscribeQuery(
        { comments: { $: { where: { entityId: parentId } } } },
        (result) => {
          if (result.error) {
            console.error('[useComments] adapter query error:', result.error)
            loading.value = false
            return
          }

          const raw = ((result.data as any)?.comments || []) as any[]
          comments.value = raw
            .filter((c) => !c.deletedAt)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) as Comment[]
          loading.value = false
        },
      )
    }

    // Subscribe immediately, re-subscribe when entityId changes
    subscribe(resolvedId.value || null)
    watch(resolvedId, (newId) => subscribe(newId || null))

    onScopeDispose(() => { if (unsub) unsub() })
  }

  // ── Local mode: TQL graph API ────────────────────────────────────────

  function _initTqlComments() {
    const { query, mutate: _tqlMutate, fetchNodes } = useTrellisGraph()

    const _commentCreatedThisSession = ref(false)

    const eqls = computed(() => {
      if (!resolvedId.value) return ''
      if (!_commentCreatedThisSession.value) return ''
      return `FIND comment AS ?c WHERE ?c.entityId = "${resolvedId.value}" AND ?c.entityType = "${entityType}"`
    })

    const { data: commentIds, loading: queryLoading } = query(eqls)

    watch(
      commentIds,
      async (ids) => {
        if (!ids || ids.length === 0) {
          comments.value = []
          loading.value = false
          return
        }

        try {
          const idList = ids.map((row) => (row as any)['?c'] as string)
          const rawNodes = await fetchNodes(idList)

          comments.value = rawNodes
            .map((node) => {
              const fullId = node['@id'] as string
              const id = fullId.replace('comment:', '')
              const { '@id': _ld_id, '@type': _ld_type, ...rest } = node
              return { id, ...rest } as unknown as Comment
            })
            .filter((c) => !c.deletedAt)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        } catch (err) {
          console.error('[useComments] hydration error:', err)
        } finally {
          loading.value = false
        }
      },
      { immediate: true },
    )

    watch(queryLoading, (v) => {
      if (v) loading.value = true
    })

    // Expose _commentCreatedThisSession for TQL addComment
    ;(comments as any)._tqlCreated = _commentCreatedThisSession
  }

  // ── Shared CRUD ──────────────────────────────────────────────────────

  async function addComment(content: string, type: Comment['type'] = 'comment', metadata?: Record<string, unknown>) {
    const parentId = resolvedId.value
    if (!parentId || !content.trim()) return

    const commentId = crypto.randomUUID()
    const now = Date.now()

    const data: Omit<Comment, 'id'> = {
      entityId: parentId,
      entityType,
      authorId: currentUser.value?.id || 'anonymous',
      authorName: currentUser.value?.name || currentUser.value?.email || 'Anonymous',
      authorAvatar: currentUser.value?.avatar || undefined,
      content: content.trim(),
      type,
      metadata,
      createdAt: now,
    }

    if (isCloudMode) {
      // Cloud: create via InstantDB adapter + link to parent entity
      const txs: any[] = [
        adapter.tx.comments[commentId].update({
          ...data,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        }),
        adapter.tx.entities[parentId].link({ comments: commentId }),
      ]
      await adapter.transact(txs)
    } else {
      // Local: create via TQL graph
      const { mutate } = useTrellisGraph()
      await mutate({
        action: 'createNode',
        entityId: `comment:${commentId}`,
        type: 'comment',
        data,
      })
      await mutate({
        action: 'link',
        e1: toEntityId(parentId),
        relation: 'hasComment',
        e2: `comment:${commentId}`,
      })
      // Enable TQL query now that comment attributes exist
      const tqlCreated = (comments as any)._tqlCreated
      if (tqlCreated) tqlCreated.value = true
    }

    return commentId
  }

  async function removeComment(commentId: string) {
    if (isCloudMode) {
      await adapter.transact([
        adapter.tx.comments[commentId].update({ deletedAt: Date.now() }),
      ])
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({
        action: 'updateNode',
        entityId: `comment:${commentId}`,
        type: 'comment',
        data: { deletedAt: Date.now() },
      })
    }
  }

  async function logActivity(content: string, type: Comment['type'] = 'created', metadata?: Record<string, unknown>) {
    return addComment(content, type, metadata)
  }

  const displayActivity = computed(() => {
    if (comments.value.length > 0) return comments.value
    return [
      {
        id: '_synthetic-created',
        entityId: resolvedId.value || '',
        entityType,
        authorId: 'system',
        authorName: 'System',
        content: '',
        type: 'created' as const,
        createdAt: Date.now(),
      },
    ] as Comment[]
  })

  return {
    comments,
    displayActivity,
    loading,
    addComment,
    removeComment,
    logActivity,
  }
}
