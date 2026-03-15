import type { Entity, EntityType, EntityReference } from '~/types/entity'
import { extractYmd, todayYmdLocal } from '~/utils/date'
import { ENTITY_NAMESPACE, entityId as toEntityId, stripNamespace, entityQuery } from '~/lib/tql-namespace'
import type { DataAdapter } from '~/lib/data-adapter'

// ── Singleton state (shared across all consumers) ──────────────────────
const _items = ref<Entity[]>([])
const _loading = ref(true)
let _initialized = false

/**
 * Initialize entity store from TQL kernel (local mode).
 * Queries the graph API for all entities and hydrates them from EAV facts.
 */
function _initStoreFromTql() {
  // Use a detached effect scope so watchers survive component unmounts
  const scope = effectScope(true)
  scope.run(() => {
    const { query, fetchNodes } = useTrellisGraph()

    // Single query watcher for the entire app
    const { data: entityIds, loading: queryLoading } = query(entityQuery('?e'))

    // When entity IDs change, batch-hydrate full nodes (single request)
    watch(
      entityIds,
      async (ids) => {
      if (!ids || ids.length === 0) {
        _items.value = []
        _loading.value = false
        return
      }

      try {
        const entityIdList = ids.map((row) => (row as Record<string, string>)['?e']).filter(Boolean) as string[]
        const rawNodes = await fetchNodes(entityIdList)

        // Build a lookup of entityId → node for resolving link titles
        const nodeMap = new Map<string, Record<string, any>>()
        for (const n of rawNodes) {
          nodeMap.set(n['@id'] as string, n)
        }

        _items.value = rawNodes.map((node) => {
          const fullId = node['@id'] as string
          const id = stripNamespace(fullId)
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
                entityId: stripNamespace(l.target),
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
                entityId: stripNamespace(l.source),
                entityType: (sourceNode?.['@type'] || sourceNode?.type || 'task') as EntityType,
                title: (sourceNode?.title as string) || 'Untitled',
                direction: 'incoming' as const,
              }
            })

          return {
            id,
            ...normalizeScalars(rest),
            type: normalizeScalar(node['@type'] || node.type),
            startDate: extractYmd(rest.startDate as string | undefined),
            endDate: extractYmd(rest.endDate as string | undefined) || undefined,
            tags: normalizeArray(node.tags),
            involved: normalizeArray(node.involved),
            reminders: parseJsonArray(node.reminders),
            checklist: parseJsonArray(node.checklist),
            checklistContent: normalizeScalar(node.checklistContent) || '',
            attachments: parseJsonArray(node.attachments),
            references: [...outgoingRefs, ...incomingRefs],
          } as unknown as Entity
        })
      } catch (err) {
        console.error('[useTrellisEntities] hydration error:', err)
      } finally {
        _loading.value = false
      }
    },
    { immediate: true },
  )

    // Also sync loading from query
    watch(queryLoading, (v) => {
      if (v) _loading.value = true
    })
  }) // end scope.run
}

/**
 * Initialize entity store from the DataAdapter (cloud mode).
 * Subscribes to InstantDB's entities table for reactive entity data.
 * Entities arrive as flat objects — no EAV normalization needed.
 *
 * Scoped by orgId — re-subscribes when the current org changes so all
 * org members see the same entities in realtime.
 */
function _initStoreFromAdapter(adapter: DataAdapter) {
  const currentOrg = useState<any>('currentOrg')
  let unsub: (() => void) | null = null

  const subscribe = (orgId: string | null) => {
    if (unsub) { unsub(); unsub = null }

    _loading.value = true

    // Build query: scope by orgId when available, otherwise fall back to all visible entities
    const query = orgId
      ? { entities: { $: { where: { orgId } } } }
      : { entities: {} }

    unsub = adapter.subscribeQuery(query, (result) => {
      if (result.error) {
        console.error('[useTrellisEntities] adapter query error:', result.error)
        _loading.value = false
        return
      }

      const rawItems = (result.data as Record<string, any>)?.entities || []

      // First pass: build items with outgoing refs parsed from stored JSON
      const items = rawItems.map((item: any) => {
        const { id: itemId, ...fields } = item
        const storedRefs = Array.isArray(fields.references) ? fields.references : []
        const outgoingRefs = storedRefs.filter(
          (r: any) => r?.kind === 'entity' && r?.direction !== 'incoming',
        )
        return {
          id: itemId,
          ...bookmarkUrlFromAdapter(fields),
          tags: Array.isArray(fields.tags) ? fields.tags : [],
          involved: Array.isArray(fields.involved) ? fields.involved : [],
          checklist: Array.isArray(fields.checklist) ? fields.checklist : [],
          checklistContent: fields.checklistContent || '',
          attachments: Array.isArray(fields.attachments) ? fields.attachments : [],
          reminders: Array.isArray(fields.reminders) ? fields.reminders : [],
          references: outgoingRefs,
        }
      })

      // Second pass: compute incoming backlinks by scanning all outgoing refs
      const incomingMap = new Map<string, any[]>()
      for (const item of items) {
        for (const ref of item.references) {
          if (ref.entityId) {
            if (!incomingMap.has(ref.entityId)) incomingMap.set(ref.entityId, [])
            incomingMap.get(ref.entityId)!.push({
              kind: 'entity',
              id: `ref-references-${item.id}`,
              entityId: item.id,
              entityType: item.type,
              title: item.title || 'Untitled',
              direction: 'incoming',
            })
          }
        }
      }

      _items.value = items.map((item: any) => ({
        ...item,
        references: [...item.references, ...(incomingMap.get(item.id) || [])],
      })) as unknown as Entity[]
      _loading.value = false
    })
  }

  // Subscribe immediately with current org, re-subscribe when org changes
  subscribe(currentOrg.value?.id || null)
  watch(() => currentOrg.value?.id, (newOrgId) => {
    subscribe(newOrgId || null)
  })
}

function _initStore() {
  if (_initialized) return
  _initialized = true

  const adapter = useDataAdapter()

  if (adapter.entityBackend === 'adapter') {
    _initStoreFromAdapter(adapter)
  } else {
    _initStoreFromTql()
  }
}

/**
 * TQL-backed entity store (singleton).
 *
 * All consumers share the same reactive state and single query watcher.
 *
 * Provides:
 * - `items`        — reactive ref of all Entity[]
 * - `loading`      — true until first fetch
 * - `byType(type)` — filtered computed for a specific EntityType
 * - `create(item)` — persist a new item via graph API
 * - `update(item)` — update an existing item via graph API
 * - `remove(id)`   — delete an item via graph API
 */
export function useTrellisEntities() {
  const adapter = useDataAdapter()
  const { user } = useInstantAuth()

  // Initialize the singleton store on first call
  _initStore()

  // ── Guest filtering ──────────────────────────────────────────────────
  // When the user is a guest, only show entities they have share records for.
  // Non-guests see all org entities as before.
  const { userRole } = useUserRole()
  const _guestShareIds = ref<Set<string>>(new Set())

  if (import.meta.client && adapter.entityBackend === 'adapter') {
    watch(
      () => [user.value?.id, userRole.value] as const,
      ([userId, role]) => {
        if (role !== 'guest' || !userId) {
          _guestShareIds.value = new Set()
          return
        }
        adapter.subscribeQuery(
          { shares: { $: { where: { userId } } } },
          (result: any) => {
            const shares = (result.data?.shares || []) as Array<{ entityId: string }>
            _guestShareIds.value = new Set(shares.map((s) => s.entityId))
          },
        )
      },
      { immediate: true },
    )
  }

  // Items filtered for guest visibility
  const items = computed(() => {
    if (userRole.value !== 'guest') return _items.value
    return _items.value.filter((item) => _guestShareIds.value.has(item.id))
  })

  // Filtered view by type
  function byType(type: EntityType) {
    return computed(() => items.value.filter((i) => i.type === type))
  }

  // ── CRUD: Adapter backend (cloud mode) ──────────────────────────────

  function isInstantTimeoutError(error: unknown): boolean {
    const e = error as Record<string, any> | null
    const message = typeof e?.message === 'string' ? e.message : String(error ?? '')
    const type = typeof e?.type === 'string' ? e.type : ''
    const bodyType = typeof e?.body?.type === 'string' ? e.body.type : ''
    return /transaction timed out|operation[- ]timed[- ]out/i.test(`${message} ${type} ${bodyType}`)
  }

  async function transactWithRetry(chunks: any[], context: string, retries = 2) {
    let attempt = 0

    while (true) {
      try {
        await adapter.transact(chunks)
        return
      } catch (error) {
        if (!isInstantTimeoutError(error) || attempt >= retries) {
          throw error
        }

        const delayMs = 250 * (attempt + 1)
        console.warn(
          `[useTrellisEntities] ${context} timed out (attempt ${attempt + 1}/${retries + 1}); retrying in ${delayMs}ms`,
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        attempt += 1
      }
    }
  }

  async function createViaAdapter(item: Partial<Entity> & { type: EntityType; title: string }) {
    const currentOrg = useState<any>('currentOrg')
    const itemId = crypto.randomUUID()
    const { id: _id, references, ...data } = item
    // Only persist outgoing refs at creation — incoming backlinks are computed at load time
    const outgoingRefs = Array.isArray(references)
      ? references.filter((r: any) => r?.direction !== 'incoming')
      : []
    const now = Date.now()
    const ownerId = user.value?.id || (await adapter.getAuth())?.id
    const orgId = currentOrg.value?.id

    if (!ownerId) {
      throw new Error('[useTrellisEntities] Cannot create entity: no authenticated user (ownerId required).')
    }

    // Default owner display name to the current user if not set
    const ownerName = (data as Record<string, any>).owner || user.value?.email || ownerId

    // Step 1: Create the entity. Must be a separate transaction from the link
    // because InstantDB evaluates permissions against pre-transaction state.
    // If create + link are batched together, the entity doesn't exist yet when
    // the link's update permission is checked, causing isOwner to fail.
    // Use update (upsert) for idempotency so retrying the same ID after a
    // transient timeout converges cleanly instead of failing duplicate-creates.
    await transactWithRetry([
      adapter.tx.entities[itemId].update({
        ...toAdapterPayload(bookmarkUrlToAdapter(data as Record<string, any>)),
        references: outgoingRefs.length ? toAdapterPayload(outgoingRefs) : null,
        ownerId,
        owner: ownerName,
        orgId: orgId || undefined,
        visibility: (data as Record<string, any>).visibility || 'org',
        involved: (data as Record<string, any>).involved?.length ? (data as Record<string, any>).involved : [ownerId],
        startDate: extractYmd((data as Record<string, any>).startDate) || todayYmdLocal(new Date()),
        endDate: extractYmd((data as Record<string, any>).endDate) || undefined,
        allDay: (data as Record<string, any>).allDay ?? true,
        priority: (data as Record<string, any>).priority || 'medium',
        createdAt: now,
        updatedAt: now,
      }),
    ], `create entity ${itemId}`)

    // Step 2: Link entity to the org so CEL permission rules can traverse the
    // link for isOrgMember checks. Now that the entity exists, isOwner passes.
    if (orgId) {
      await transactWithRetry([
        adapter.tx.entities[itemId].link({ organization: orgId }),
      ], `link entity ${itemId} to org ${orgId}`)
    }

    return itemId
  }

  async function updateViaAdapter(item: Entity) {
    const { id: itemId, references, ...fields } = item as Entity & Record<string, any>
    // Only persist outgoing refs — incoming backlinks are computed at load time
    const outgoingRefs = Array.isArray(references)
      ? references.filter((r: any) => r?.direction !== 'incoming')
      : []
    const existing = _items.value.find((i) => i.id === itemId) as Record<string, any> | undefined
    const ownerId = fields.ownerId || existing?.ownerId || user.value?.id || (await adapter.getAuth())?.id

    if (!ownerId) {
      throw new Error(`[useTrellisEntities] Cannot update entity ${itemId}: no ownerId available for permission checks.`)
    }

    // Ensure the current editor is tracked in the involved array
    const currentUserId = user.value?.id
    const involved = Array.isArray(fields.involved) ? [...fields.involved] : (existing?.involved ? [...existing.involved] : [])
    if (currentUserId && !involved.includes(currentUserId)) {
      involved.push(currentUserId)
    }

    await transactWithRetry([
      adapter.tx.entities[itemId].update({
        ...toAdapterPayload(bookmarkUrlToAdapter(fields as Record<string, any>)),
        references: outgoingRefs.length ? toAdapterPayload(outgoingRefs) : null,
        ownerId,
        involved,
        startDate: extractYmd(fields.startDate as string | undefined),
        endDate: extractYmd(fields.endDate as string | undefined) || undefined,
        updatedAt: Date.now(),
      }),
    ], `update entity ${itemId}`)
  }

  async function removeViaAdapter(itemId: string) {
    await transactWithRetry([
      adapter.tx.entities[itemId].delete(),
    ], `delete entity ${itemId}`)
  }

  // ── CRUD: TQL backend (local mode) ──────────────────────────────────

  async function createViaTql(item: Partial<Entity> & { type: EntityType; title: string }) {
    const { mutate } = useTrellisGraph()
    const itemId = crypto.randomUUID()
    const { id: _id, ...data } = item
    const now = Date.now()

    await mutate({
      action: 'createNode',
      entityId: toEntityId(itemId),
      type: ENTITY_NAMESPACE,
      data: prepareDataForEAV({
        ...data,
        startDate: extractYmd((data as Record<string, any>).startDate),
        endDate: extractYmd((data as Record<string, any>).endDate) || undefined,
        createdAt: now,
        updatedAt: now,
      }),
    })

    return itemId
  }

  async function updateViaTql(item: Entity) {
    const { mutate } = useTrellisGraph()
    const { id: itemId, ...fields } = item

    await mutate({
      action: 'updateNode',
      entityId: toEntityId(itemId),
      type: ENTITY_NAMESPACE,
      data: prepareDataForEAV({
        ...fields,
        startDate: extractYmd((fields as Record<string, any>).startDate),
        endDate: extractYmd((fields as Record<string, any>).endDate) || undefined,
        updatedAt: Date.now(),
      }),
    })
  }

  async function removeViaTql(itemId: string) {
    const { mutate } = useTrellisGraph()
    await mutate({
      action: 'deleteNode',
      entityId: toEntityId(itemId),
    })
  }

  // ── Select backend ──────────────────────────────────────────────────

  const useAdapter = adapter.entityBackend === 'adapter'

  const _create = useAdapter ? createViaAdapter : createViaTql
  const _update = useAdapter ? updateViaAdapter : updateViaTql
  const _remove = useAdapter ? removeViaAdapter : removeViaTql

  // Read-only guard: prevent mutation of externally synced entities (e.g. Google Calendar)
  function isReadOnlyEntity(itemOrId: Entity | string): boolean {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id
    const item = items.value.find((i) => i.id === id)
    return (item as Record<string, any> | undefined)?.source === 'google-calendar'
  }

  async function update(item: Entity) {
    if (isReadOnlyEntity(item)) {
      console.warn('[useTrellisEntities] Cannot edit a Google Calendar synced event. Use the enrichment layer instead.')
      return
    }
    return _update(item)
  }

  async function remove(itemId: string) {
    if (isReadOnlyEntity(itemId)) {
      console.warn('[useTrellisEntities] Cannot delete a Google Calendar synced event.')
      return
    }
    return _remove(itemId)
  }

  return {
    items,
    loading: _loading,
    byType,
    create: _create,
    update,
    remove,
    isReadOnlyEntity,
  }
}

/**
 * BookmarkItem uses `url` in TypeScript but InstantDB schema uses `bookmarkUrl`.
 * These helpers translate at the adapter boundary to avoid schema errors.
 */
function bookmarkUrlToAdapter(data: Record<string, any>): Record<string, any> {
  if (data.type !== 'bookmark') return data
  const { url, ...rest } = data
  return url !== undefined ? { ...rest, bookmarkUrl: url } : rest
}

function bookmarkUrlFromAdapter(fields: Record<string, any>): Record<string, any> {
  if (fields.type !== 'bookmark') return fields
  const { bookmarkUrl, ...rest } = fields
  return bookmarkUrl !== undefined ? { ...rest, url: bookmarkUrl } : rest
}

function toAdapterPayload<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return sanitizeAdapterValue(value) as T
  }
}

function sanitizeAdapterValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value

  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'bigint') return Number(value)
  if (t === 'function' || t === 'symbol') return undefined

  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeAdapterValue(v, seen))
      .filter((v) => v !== undefined)
  }

  if (t === 'object') {
    const obj = value as Record<string, unknown>
    if (seen.has(obj)) return undefined
    seen.add(obj)

    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      const sanitized = sanitizeAdapterValue(val, seen)
      if (sanitized !== undefined) out[key] = sanitized
    }
    return out
  }

  return undefined
}

/** Normalize a value to an array — EAV stores may flatten single values */
function normalizeArray(val: unknown): any[] {
  if (Array.isArray(val)) return val
  if (val === undefined || val === null || val === '') return []
  return [val]
}

/** Collapse arrays back to scalar values for non-array fields.
 *  EAV stores may produce duplicate facts, e.g. title: ["Foo", "Foo"].
 *  Takes the last element (most recent write wins). */
function normalizeScalar(val: unknown): unknown {
  if (!Array.isArray(val)) return val
  if (val.length === 0) return undefined
  return val[val.length - 1]
}

/**
 * Fields that are genuinely multi-valued in the EAV store (stored as
 * separate facts and should remain arrays after hydration).
 *
 * Everything NOT in this set defaults to scalar — new fields are
 * automatically safe without manual registration.
 *
 * Note: `tags`, `involved`, `checklist`, `reminders`, `attachments`,
 * and `references` are handled explicitly in the hydration block and
 * never flow through `normalizeScalars()`.
 */
const MULTI_VALUE_FIELDS = new Set([
  'children', 'relationships', 'dependsOn', 'counterparties', 'lineItems',
])

/** Walk an object and collapse array→scalar for all fields except known multi-value ones */
function normalizeScalars(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, val] of Object.entries(obj)) {
    out[key] = MULTI_VALUE_FIELDS.has(key) ? val : normalizeScalar(val)
  }
  return out
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
