import type { Share, SharePermission } from '~/types/database'

/**
 * Composable for managing entity-level shares (guest access).
 *
 * Subscribes to shares for the current org and provides CRUD operations.
 * Used by the share UI on entity detail and the guest invite flow.
 */
export function useShares() {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const currentOrg = useState<any>('currentOrg')

  // ── Query shares for a specific entity ─────────────────────────────
  const getEntityShares = (entityId: string) => {
    const shares = ref<Share[]>([])
    const loading = ref(true)

    if (import.meta.client && entityId) {
      db.subscribeQuery(
        {
          shares: {
            $: {
              where: { entityId },
            },
          },
        },
        (result: any) => {
          shares.value = (result.data?.shares || []) as Share[]
          loading.value = false
        },
      )
    }

    return { shares, loading }
  }

  // ── Query shares for the current user (what's shared WITH me) ──────
  const getMyShares = () => {
    const shares = ref<Share[]>([])
    const loading = ref(true)

    if (import.meta.client) {
      watch(
        () => user.value?.id,
        (userId) => {
          if (!userId) {
            shares.value = []
            loading.value = false
            return
          }
          db.subscribeQuery(
            {
              shares: {
                $: {
                  where: { userId },
                },
              },
            },
            (result: any) => {
              shares.value = (result.data?.shares || []) as Share[]
              loading.value = false
            },
          )
        },
        { immediate: true },
      )
    }

    return { shares, loading }
  }

  // ── Create a share ─────────────────────────────────────────────────
  const createShare = async (params: {
    entityId: string
    entityType: 'entity' | 'collection'
    userId: string
    permission?: SharePermission
  }) => {
    const orgId = currentOrg.value?.id
    if (!orgId || !user.value?.id) {
      throw new Error('Must be in an org context to share')
    }

    const shareId = crypto.randomUUID()
    const now = Date.now()

    await db.transact([
      db.tx.shares[shareId].update({
        entityId: params.entityId,
        entityType: params.entityType,
        userId: params.userId,
        orgId,
        permission: params.permission || 'view',
        sharedBy: user.value.id,
        sharedByName: (user.value as any)?.name || (user.value as any)?.email || '',
        createdAt: now,
      }),
      // Link share to entity and org
      db.tx.entities[params.entityId].link({ shares: shareId }),
      db.tx.organizations[orgId].link({ shares: shareId }),
    ])

    return shareId
  }

  // ── Update a share's permission ────────────────────────────────────
  const updateShare = async (shareId: string, permission: SharePermission) => {
    await db.transact([
      db.tx.shares[shareId].update({ permission }),
    ])
  }

  // ── Remove a share ─────────────────────────────────────────────────
  const removeShare = async (shareId: string) => {
    await db.transact([
      db.tx.shares[shareId].delete(),
    ])
  }

  // ── Bulk share entity with multiple users ──────────────────────────
  const shareWithUsers = async (params: {
    entityId: string
    entityType: 'entity' | 'collection'
    userIds: string[]
    permission?: SharePermission
  }) => {
    const ids: string[] = []
    for (const userId of params.userIds) {
      const id = await createShare({
        entityId: params.entityId,
        entityType: params.entityType,
        userId,
        permission: params.permission,
      })
      ids.push(id)
    }
    return ids
  }

  return {
    getEntityShares,
    getMyShares,
    createShare,
    updateShare,
    removeShare,
    shareWithUsers,
  }
}
