import type { Channel, ChannelType } from '~/types/database'
import { entityId as toEntityId, entityQuery } from '~/lib/tql-namespace'

/**
 * useChannels — Manages chat channels for the current org.
 *
 * Dual-mode:
 * - **Cloud mode**: InstantDB `channels` table with realtime subscriptions.
 * - **Local mode**: TQL graph entities with type='channel'.
 *
 * Usage:
 *   const { channels, dms, threads, createChannel, unreadCounts } = useChannels()
 */
export function useChannels() {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const adapter = useDataAdapter()
  const currentOrg = useState<any>('currentOrg')
  const isCloudMode = adapter.mode === 'cloud'

  const channels = useState<Channel[]>('chat:channels', () => [])
  const loading = useState<boolean>('chat:channels:loading', () => true)

  // ── Derived lists ────────────────────────────────────────────────
  const publicChannels = computed(() => channels.value.filter((c) => c.type === 'public' || c.type === 'private'))

  const dms = computed(() => channels.value.filter((c) => c.type === 'dm'))

  const threads = computed(() => channels.value.filter((c) => c.type === 'thread'))

  // ── Folder grouping ───────────────────────────────────────────────
  const channelFolders = computed(() => {
    const folders = new Set<string>()
    for (const ch of publicChannels.value) {
      if (ch.folder) folders.add(ch.folder)
    }
    return [...folders].sort()
  })

  const ungroupedPublicChannels = computed(() => publicChannels.value.filter((c) => !c.folder))

  const channelsByFolder = computed(() => {
    const map = new Map<string, Channel[]>()
    for (const ch of publicChannels.value) {
      if (!ch.folder) continue
      if (!map.has(ch.folder)) map.set(ch.folder, [])
      map.get(ch.folder)!.push(ch)
    }
    return [...map.entries()].map(([folder, chans]) => ({ folder, channels: chans }))
  })

  // ── Unread tracking ──────────────────────────────────────────────
  const lastReadMap = useState<Record<string, number>>('chat:lastRead', () => ({}))

  const unreadCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const ch of channels.value) {
      const lastRead = lastReadMap.value[ch.id] ?? 0
      const lastMsg = ch.lastMessageAt ?? 0
      counts[ch.id] = lastMsg > lastRead ? 1 : 0
    }
    return counts
  })

  const totalUnread = computed(() => Object.values(unreadCounts.value).reduce((sum, n) => sum + n, 0))

  function markRead(channelId: string) {
    lastReadMap.value[channelId] = Date.now()
  }

  // ── Cloud subscription ────────────────────────────────────────────
  let unsub: (() => void) | null = null

  function subscribeCloud() {
    unsub?.()
    unsub = null

    const orgId = currentOrg.value?.id
    if (!orgId) {
      loading.value = false
      return
    }

    unsub = db.subscribeQuery(
      {
        channels: {
          $: {
            where: { orgId },
            order: { serverCreatedAt: 'asc' },
          },
        },
      },
      (result: any) => {
        if (result.error) {
          console.error('[useChannels] subscription error:', result.error)
          loading.value = false
          return
        }
        channels.value = (result.data?.channels ?? []) as Channel[]
        loading.value = false
      },
    )
  }

  // ── Local (TQL) subscription ──────────────────────────────────────
  function initLocal() {
    const { query, fetchNodes } = useTrellisGraph()

    const eqls = `${entityQuery('?c')} WHERE ?c.entityKind = "channel"`
    const { data: channelIds, loading: queryLoading } = query(computed(() => eqls))

    watch(
      channelIds,
      async (ids) => {
        if (!ids || ids.length === 0) {
          channels.value = []
          loading.value = false
          return
        }
        try {
          const idList = ids.map((row) => (row as any)['?c'] as string)
          const rawNodes = await fetchNodes(idList)
          channels.value = rawNodes.map((node) => {
            const fullId = node['@id'] as string
            const id = fullId.replace('entity:', '')
            const { '@id': _a, '@type': _b, entityKind: _k, channelType, ...rest } = node
            return { id, type: channelType ?? 'public', ...rest } as unknown as Channel
          })
        } catch (err) {
          console.error('[useChannels] TQL hydration error:', err)
        } finally {
          loading.value = false
        }
      },
      { immediate: true },
    )

    watch(queryLoading, (v) => {
      if (v) loading.value = true
    })
  }

  // ── CRUD ─────────────────────────────────────────────────────────
  async function createChannel(opts: {
    title: string
    type?: ChannelType
    description?: string
    icon?: string
    memberIds?: string[]
    entityId?: string
    slug?: string
  }) {
    const orgId = currentOrg.value?.id
    const userId = user.value?.id
    if (!userId) throw new Error('Not authenticated')

    const slug =
      opts.slug ??
      opts.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    const existing = channels.value.find((c) => c.slug === slug && c.type === (opts.type ?? 'public'))
    if (existing) throw new Error(`Channel #${slug} already exists`)

    const id = crypto.randomUUID()
    const now = Date.now()

    if (isCloudMode) {
      if (!orgId) throw new Error('No org')
      const cloudData = {
        orgId,
        type: opts.type ?? 'public',
        title: opts.title,
        slug,
        description: opts.description,
        icon: opts.icon,
        memberIds: opts.memberIds ?? [],
        entityId: opts.entityId,
        createdBy: userId,
        createdAt: now,
      }
      await db.transact([db.tx.channels[id].update(cloudData), db.tx.organizations[orgId].link({ channels: id })])
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({
        action: 'createNode',
        entityId: toEntityId(id),
        type: 'entity',
        data: {
          entityKind: 'channel',
          channelType: opts.type ?? 'public',
          title: opts.title,
          slug,
          description: opts.description,
          icon: opts.icon,
          memberIds: opts.memberIds ?? [],
          entityId: opts.entityId,
          createdBy: userId,
          createdAt: now,
          orgId: orgId ?? 'local',
        },
      })
    }

    return id
  }

  async function updateChannel(
    channelId: string,
    data: Partial<Omit<Channel, 'id' | 'orgId' | 'createdBy' | 'createdAt'>>,
  ) {
    if (isCloudMode) {
      await db.transact(db.tx.channels[channelId].update(data as any))
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({ action: 'updateNode', entityId: toEntityId(channelId), type: 'entity', data })
    }
  }

  async function deleteChannel(channelId: string) {
    if (isCloudMode) {
      await db.transact(db.tx.channels[channelId].delete())
    } else {
      const { mutate } = useTrellisGraph()
      await mutate({ action: 'deleteNode', entityId: toEntityId(channelId) })
    }
  }

  async function createDm(targetUserId: string, targetUserName: string) {
    const userId = user.value?.id
    if (!userId) throw new Error('Not authenticated')

    const existing = dms.value.find((c) => c.memberIds?.includes(targetUserId) && c.memberIds?.includes(userId))
    if (existing) return existing.id

    return createChannel({
      title: targetUserName,
      type: 'dm',
      memberIds: [userId, targetUserId],
    })
  }

  // ── Ensure #general channel exists ──────────────────────────────
  const isCreatingGeneral = useState<boolean>('chat:creating-general', () => false)

  async function ensureGeneralChannel() {
    if (loading.value) return
    if (isCreatingGeneral.value) return

    const hasGeneral = channels.value.some(
      (c) => c.type === 'public' && (c.slug === 'general' || c.title.toLowerCase() === 'general'),
    )
    if (hasGeneral) return

    isCreatingGeneral.value = true
    try {
      await createChannel({
        title: 'general',
        slug: 'general',
        type: 'public',
        description: 'Company-wide announcements and work-based matters',
      })
    } finally {
      isCreatingGeneral.value = false
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  if (import.meta.client) {
    if (isCloudMode) {
      watch(
        () => currentOrg.value?.id,
        () => subscribeCloud(),
        { immediate: true },
      )
      onScopeDispose(() => unsub?.())
    } else {
      initLocal()
    }
  }

  return {
    channels,
    publicChannels,
    ungroupedPublicChannels,
    channelsByFolder,
    channelFolders,
    dms,
    threads,
    loading,
    unreadCounts,
    totalUnread,
    markRead,
    createChannel,
    updateChannel,
    deleteChannel,
    createDm,
    ensureGeneralChannel,
  }
}
