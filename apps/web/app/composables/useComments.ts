import type { Ref } from 'vue'

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
 * Uses TQL graph API to persist comments as first-class entities
 * linked to their parent (calendarItem, task, etc.).
 *
 * @param entityId - Reactive or static ID of the parent entity
 * @param entityType - Type discriminator (e.g. 'calendarItem')
 */
export function useComments(entityId: Ref<string | undefined> | string, entityType: string = 'calendarItem') {
  const { query, mutate, fetchNodes } = useTrellisGraph()
  const { user: currentUser } = useInstantAuth()

  const comments = ref<Comment[]>([])
  const loading = ref(true)

  const resolvedId = computed(() => (typeof entityId === 'string' ? entityId : entityId.value))

  // Build reactive EQL-S query for this entity's comments
  const eqls = computed(() => {
    if (!resolvedId.value) return ''
    return `FIND comment AS ?c WHERE ?c.entityId = "${resolvedId.value}" AND ?c.entityType = "${entityType}"`
  })

  // Query comment IDs from the graph
  const { data: commentIds, loading: queryLoading } = query(eqls)

  // Hydrate full comment nodes when IDs change
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

  /**
   * Add a new comment to the current entity.
   */
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

    await mutate({
      action: 'createNode',
      entityId: `comment:${commentId}`,
      type: 'comment',
      data,
    })

    // Also link to parent entity
    await mutate({
      action: 'link',
      e1: `calendaritem:${parentId}`,
      relation: 'hasComment',
      e2: `comment:${commentId}`,
    })

    return commentId
  }

  /**
   * Soft-delete a comment.
   */
  async function removeComment(commentId: string) {
    await mutate({
      action: 'updateNode',
      entityId: `comment:${commentId}`,
      type: 'comment',
      data: { deletedAt: Date.now() },
    })
  }

  /**
   * Log a system activity entry (e.g. "created this note", "changed status").
   */
  async function logActivity(content: string, type: Comment['type'] = 'created', metadata?: Record<string, unknown>) {
    return addComment(content, type, metadata)
  }

  /**
   * Display-ready activity list: user comments + system entries.
   * Falls back to a synthetic "created" entry if no activity exists.
   */
  const displayActivity = computed(() => {
    if (comments.value.length > 0) return comments.value
    // Fallback: synthetic "created" entry
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
