import type { CalendarItem, CalendarItemType } from '~/types/calendarItem'
import type { EntityReference, EntityType } from '~/types/entity'

/**
 * TQL-backed replacement for useCalendarItems.
 *
 * Same API surface as the instant-local version:
 * - `items`        — reactive ref of all CalendarItem[]
 * - `loading`      — true until first fetch
 * - `byType(type)` — filtered computed for a specific CalendarItemType
 * - `create(item)` — persist a new item via graph API
 * - `update(item)` — update an existing item via graph API
 * - `remove(id)`   — delete an item via graph API
 */
export function useTrellisCalendarItems() {
  const { query, mutate, fetchNodes } = useTrellisGraph()

  const items = ref<CalendarItem[]>([])
  const loading = ref(true)

  // Query all calendar items from the graph
  const { data: entityIds, loading: queryLoading } = query('FIND calendaritem AS ?e')

  // When entity IDs change, batch-hydrate full nodes (single request)
  watch(
    entityIds,
    async (ids) => {
      if (!ids || ids.length === 0) {
        items.value = []
        loading.value = false
        return
      }

      try {
        const entityIdList = ids.map((row) => (row as any)['?e'] as string)
        const rawNodes = await fetchNodes(entityIdList)

        // Build a lookup of entityId → node for resolving link titles
        const nodeMap = new Map<string, Record<string, any>>()
        for (const n of rawNodes) {
          nodeMap.set(n['@id'] as string, n)
        }

        items.value = rawNodes.map((node) => {
          const entityId = node['@id'] as string
          const id = entityId.replace('calendaritem:', '')
          const { '@id': _ld_id, '@type': _ld_type, _links, ...rest } = node

          // Hydrate entity references from TQL links
          const links = _links as { outgoing?: Array<{ relation: string; target: string }>; incoming?: Array<{ relation: string; source: string }> } | undefined
          const LINK_RELATIONS = new Set(['references', 'mentions'])
          const outgoingRefs: EntityReference[] = (links?.outgoing || [])
            .filter((l) => LINK_RELATIONS.has(l.relation))
            .map((l) => {
              const targetNode = nodeMap.get(l.target)
              return {
                kind: 'entity' as const,
                id: `ref-${l.relation}-${l.target}`,
                entityId: l.target.replace('calendaritem:', ''),
                entityType: (targetNode?.['@type'] || targetNode?.type || 'task') as EntityType,
                title: (targetNode?.title as string) || 'Untitled',
                direction: 'outgoing' as const,
              }
            })
          const incomingRefs: EntityReference[] = (links?.incoming || [])
            .filter((l) => LINK_RELATIONS.has(l.relation))
            .map((l) => {
              const sourceNode = nodeMap.get(l.source)
              return {
                kind: 'entity' as const,
                id: `ref-${l.relation}-${l.source}`,
                entityId: l.source.replace('calendaritem:', ''),
                entityType: (sourceNode?.['@type'] || sourceNode?.type || 'task') as EntityType,
                title: (sourceNode?.title as string) || 'Untitled',
                direction: 'incoming' as const,
              }
            })

          return {
            id,
            ...rest,
            type: node['@type'] || node.type,
            tags: normalizeArray(node.tags),
            involved: normalizeArray(node.involved),
            reminders: parseJsonArray(node.reminders),
            checklist: parseJsonArray(node.checklist),
            attachments: parseJsonArray(node.attachments),
            references: [...outgoingRefs, ...incomingRefs],
          } as unknown as CalendarItem
        })
      } catch (err) {
        console.error('[useTrellisCalendarItems] hydration error:', err)
      } finally {
        loading.value = false
      }
    },
    { immediate: true },
  )

  // Also sync loading from query
  watch(queryLoading, (v) => {
    if (v) loading.value = true
  })

  // Filtered view by type
  function byType(type: CalendarItemType) {
    return computed(() => items.value.filter((i) => i.type === type))
  }

  // CRUD operations
  async function create(item: Partial<CalendarItem> & { type: CalendarItemType; title: string }) {
    // Always generate a fresh UUID — dialog may reuse stale IDs across creates
    const itemId = crypto.randomUUID()
    const { id: _id, ...data } = item
    const now = Date.now()

    await mutate({
      action: 'createNode',
      entityId: `calendaritem:${itemId}`,
      type: 'calendaritem',
      data: prepareDataForEAV({
        ...data,
        createdAt: now,
        updatedAt: now,
      }),
    })

    return itemId
  }

  async function update(item: CalendarItem) {
    const { id: itemId, ...fields } = item

    await mutate({
      action: 'updateNode',
      entityId: `calendaritem:${itemId}`,
      type: 'calendaritem',
      data: prepareDataForEAV({
        ...fields,
        updatedAt: Date.now(),
      }),
    })
  }

  async function remove(itemId: string) {
    await mutate({
      action: 'deleteNode',
      entityId: `calendaritem:${itemId}`,
    })
  }

  return {
    items,
    loading,
    byType,
    create,
    update,
    remove,
  }
}

/** Normalize a value to an array — EAV stores may flatten single values */
function normalizeArray(val: unknown): any[] {
  if (Array.isArray(val)) return val
  if (val === undefined || val === null || val === '') return []
  return [val]
}

/** Parse a JSON-serialized array, falling back to normalizeArray */
function parseJsonArray(val: unknown): any[] {
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch { /* not JSON */ }
  }
  return normalizeArray(val)
}

/** Fields that contain complex nested objects — serialized as JSON strings in EAV */
const JSON_ARRAY_FIELDS = ['checklist', 'attachments', 'reminders'] as const

/**
 * Prepare entity data for EAV storage:
 * - Strip `references` (managed as TQL links, not entity data)
 * - JSON-stringify complex nested arrays
 */
function prepareDataForEAV(data: Record<string, any>): Record<string, any> {
  const cleaned = { ...data }
  // References are stored as TQL links, not EAV facts
  delete cleaned.references
  // JSON-serialize complex nested arrays
  for (const key of JSON_ARRAY_FIELDS) {
    if (Array.isArray(cleaned[key]) && cleaned[key].length > 0) {
      cleaned[key] = JSON.stringify(cleaned[key])
    }
  }
  return cleaned
}
