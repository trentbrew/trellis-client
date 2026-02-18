/**
 * useSidebarTree — Graph-backed sidebar navigation tree
 *
 * Queries SidebarNode entities from the TQL graph, builds a nested tree,
 * and provides CRUD + reorder operations. Subscribes to SSE for realtime
 * updates. Falls back to the legacy hardcoded sidebar when no nodes exist.
 *
 * Each node lives in the `sidebar_node` TQL namespace with `parentOf` links
 * for hierarchy.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type SidebarScope = 'workspace' | 'database' | 'settings' | 'graph'
export type SidebarNodeType = 'section' | 'group' | 'item' | 'separator'

export interface SidebarTreeNode {
  /** TQL entity ID, e.g. `sidebar_node:workspace-pinned` */
  id: string
  label: string
  icon: string
  routePath?: string
  entityType?: string
  scope: SidebarScope
  nodeType: SidebarNodeType
  locked: boolean
  collapsed: boolean
  order: number
  worldId?: string
  /** Maps to the legacy sidebarSections key for backward compat */
  sectionKey?: string
  /** Special item resolution keyword: 'pinned', 'unpinned', 'pages', etc. */
  specialItems?: string
  /** Whether the section supports + button for adding items */
  editable: boolean
  /** Resolved child nodes */
  children: SidebarTreeNode[]
  /** Parent node ID (null for root sections) */
  parentId?: string
}

export interface SidebarNodeSeed {
  id: string
  label: string
  icon: string
  routePath?: string
  entityType?: string
  scope: SidebarScope
  nodeType: SidebarNodeType
  locked?: boolean
  collapsed?: boolean
  order: number
  sectionKey?: string
  specialItems?: string
  editable?: boolean
  children?: SidebarNodeSeed[]
}

// ── TQL Namespace ──────────────────────────────────────────────────────

const SIDEBAR_NS = 'sidebar_node'
const sidebarNodeId = (slug: string) => `${SIDEBAR_NS}:${slug}`

// ── Module-level state (singleton) ─────────────────────────────────────

const _nodes = ref<Map<string, SidebarTreeNode>>(new Map())
const _parentMap = ref<Map<string, string>>(new Map()) // childId → parentId
const _loading = ref(false)
const _initialized = ref(false)
const _error = ref<string | null>(null)
let _sseCleanup: (() => void) | null = null

// ── Fetch from TQL ─────────────────────────────────────────────────────

function parseNode(n: Record<string, any>): SidebarTreeNode {
  const id = (n['@id'] || '') as string
  return {
    id,
    label: (n.label || n.title || '') as string,
    icon: (n.icon || 'lucide:circle') as string,
    routePath: n.routePath as string | undefined,
    entityType: n.entityType as string | undefined,
    scope: (n.scope || 'workspace') as SidebarScope,
    nodeType: (n.nodeType || 'item') as SidebarNodeType,
    locked: n.locked === true || n.locked === 'true',
    collapsed: n.collapsed === true || n.collapsed === 'true',
    order: typeof n.order === 'number' ? n.order : 0,
    worldId: n.worldId as string | undefined,
    sectionKey: n.sectionKey as string | undefined,
    specialItems: n.specialItems as string | undefined,
    editable: n.editable === true || n.editable === 'true',
    children: [],
    parentId: undefined,
  }
}

async function fetchSidebarNodes(): Promise<void> {
  _loading.value = true
  _error.value = null

  try {
    // Query all sidebar_node entity IDs
    const queryResult = await $fetch<{
      data: Record<string, unknown>[]
      meta?: any
    }>('/api/graph/query', {
      method: 'POST',
      body: { query: `FIND ${SIDEBAR_NS} AS ?n` },
    })

    const rows = queryResult.data || []
    const ids = rows.map((row) => (row['?n'] as string) || '').filter(Boolean)

    if (ids.length === 0) {
      _nodes.value = new Map()
      _parentMap.value = new Map()
      _loading.value = false
      _initialized.value = true
      return
    }

    // Batch-fetch all nodes with their links
    const batchResult = await $fetch<{
      nodes: Array<Record<string, any>>
    }>('/api/graph/nodes', {
      method: 'POST',
      body: { ids },
    })

    const nodeMap = new Map<string, SidebarTreeNode>()
    const parentMap = new Map<string, string>()

    for (const raw of batchResult.nodes || []) {
      const node = parseNode(raw)
      if (!node.id) continue
      nodeMap.set(node.id, node)

      // Extract parent from incoming `parentOf` links (batch endpoint includes _links)
      const links = raw._links as { incoming?: Array<{ relation: string; source: string }> } | undefined
      if (links?.incoming) {
        for (const link of links.incoming) {
          if (link.relation === 'parentOf') {
            parentMap.set(node.id, link.source)
          }
        }
      }
    }

    _nodes.value = nodeMap
    _parentMap.value = parentMap
  } catch (err: any) {
    _error.value = err.message || 'Failed to fetch sidebar nodes'
    console.error('[useSidebarTree] Fetch error:', err)
  } finally {
    _loading.value = false
    _initialized.value = true
  }
}

// ── SSE subscription ───────────────────────────────────────────────────

function subscribeToSSE(): void {
  if (!import.meta.client) return
  if (_sseCleanup) return

  const eventSource = new EventSource('/api/graph/events')

  eventSource.addEventListener('mutation', (event) => {
    try {
      const data = JSON.parse(event.data)
      // Re-fetch on sidebar_node mutations or link mutations
      if (
        data.entityId?.startsWith(`${SIDEBAR_NS}:`) ||
        data.type === SIDEBAR_NS ||
        (data.action === 'link' && data.data?.e1?.startsWith(`${SIDEBAR_NS}:`)) ||
        (data.action === 'unlink' && data.data?.e1?.startsWith(`${SIDEBAR_NS}:`))
      ) {
        fetchSidebarNodes()
      }
    } catch {
      // Ignore malformed events
    }
  })

  eventSource.onerror = () => {
    // EventSource auto-reconnects
  }

  _sseCleanup = () => {
    eventSource.close()
    _sseCleanup = null
  }
}

// ── Tree builder ───────────────────────────────────────────────────────

function buildTree(scope: SidebarScope, worldId?: string): SidebarTreeNode[] {
  const nodes = Array.from(_nodes.value.values())

  // Filter by scope and worldId.
  // Nodes seeded by the default workspace seeder have worldId === scope (e.g. 'workspace').
  // Nodes seeded by the template installer have worldId === actual world UUID.
  // When no explicit worldId is given, only include nodes whose worldId matches
  // the scope string (default nodes). This prevents template-installed nodes from
  // orphaned/deleted worlds from leaking into the sidebar.
  const scopeNodes = nodes.filter((n) => {
    if (n.scope !== scope) return false
    if (worldId) {
      // Explicit filter: include nodes for this world OR default scope nodes
      if (n.worldId && n.worldId !== worldId && n.worldId !== scope) return false
    } else {
      // No worldId given: only include nodes whose worldId is the scope string
      // (i.e., default seed nodes). Exclude world-specific UUID nodes.
      if (n.worldId && n.worldId !== scope) return false
    }
    return true
  })

  // Build parent→children map
  const childrenMap = new Map<string, SidebarTreeNode[]>()
  const rootNodes: SidebarTreeNode[] = []

  for (const node of scopeNodes) {
    const parentId = _parentMap.value.get(node.id)
    if (parentId && _nodes.value.has(parentId)) {
      node.parentId = parentId
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, [])
      childrenMap.get(parentId)!.push(node)
    } else {
      rootNodes.push(node)
    }
  }

  // Recursively attach children
  const attachChildren = (node: SidebarTreeNode): SidebarTreeNode => {
    const kids = childrenMap.get(node.id) || []
    return {
      ...node,
      children: kids.sort((a, b) => a.order - b.order).map(attachChildren),
    }
  }

  return rootNodes.sort((a, b) => a.order - b.order).map(attachChildren)
}

// ── Mutation helpers ───────────────────────────────────────────────────

async function createSidebarNode(
  slug: string,
  data: Omit<SidebarNodeSeed, 'id' | 'children'>,
  parentSlug?: string,
): Promise<string> {
  const id = sidebarNodeId(slug)
  await $fetch('/api/graph/mutate', {
    method: 'POST',
    body: {
      action: 'createNode',
      entityId: id,
      type: SIDEBAR_NS,
      data: {
        label: data.label,
        icon: data.icon || 'lucide:circle',
        routePath: data.routePath || '',
        entityType: data.entityType || '',
        scope: data.scope,
        nodeType: data.nodeType,
        locked: data.locked ?? false,
        collapsed: data.collapsed ?? false,
        order: data.order,
        worldId: data.scope, // default to scope as worldId for now
        sectionKey: data.sectionKey || '',
        specialItems: data.specialItems || '',
        editable: data.editable ?? false,
      },
      agentId: 'sidebar',
    },
  })

  // Link to parent if provided
  if (parentSlug) {
    const parentId = sidebarNodeId(parentSlug)
    await $fetch('/api/graph/mutate', {
      method: 'POST',
      body: {
        action: 'link',
        e1: parentId,
        relation: 'parentOf',
        e2: id,
        agentId: 'sidebar',
      },
    })
  }

  return id
}

async function updateSidebarNode(
  id: string,
  data: Partial<Pick<SidebarTreeNode, 'label' | 'icon' | 'order' | 'collapsed' | 'routePath' | 'entityType'>>,
): Promise<void> {
  await $fetch('/api/graph/mutate', {
    method: 'POST',
    body: {
      action: 'updateNode',
      entityId: id,
      type: SIDEBAR_NS,
      data,
      agentId: 'sidebar',
    },
  })
}

async function deleteSidebarNode(id: string): Promise<void> {
  // Check if locked
  const node = _nodes.value.get(id)
  if (node?.locked) {
    console.warn('[useSidebarTree] Cannot delete locked node:', id)
    return
  }

  await $fetch('/api/graph/mutate', {
    method: 'POST',
    body: {
      action: 'deleteNode',
      entityId: id,
      agentId: 'sidebar',
    },
  })
}

async function moveNode(
  nodeId: string,
  newParentId: string | null,
  newOrder: number,
): Promise<void> {
  // Remove old parent link
  const oldParentId = _parentMap.value.get(nodeId)
  if (oldParentId) {
    await $fetch('/api/graph/mutate', {
      method: 'POST',
      body: {
        action: 'unlink',
        e1: oldParentId,
        relation: 'parentOf',
        e2: nodeId,
        agentId: 'sidebar',
      },
    })
  }

  // Add new parent link
  if (newParentId) {
    await $fetch('/api/graph/mutate', {
      method: 'POST',
      body: {
        action: 'link',
        e1: newParentId,
        relation: 'parentOf',
        e2: nodeId,
        agentId: 'sidebar',
      },
    })
  }

  // Update order
  await updateSidebarNode(nodeId, { order: newOrder })
}

// ── Seed helpers ───────────────────────────────────────────────────────

async function seedFromTemplate(seeds: SidebarNodeSeed[]): Promise<void> {
  for (const seed of seeds) {
    await createSidebarNode(seed.id, seed)

    if (seed.children?.length) {
      for (const child of seed.children) {
        await createSidebarNode(child.id, child, seed.id)

        if (child.children?.length) {
          for (const grandchild of child.children) {
            await createSidebarNode(grandchild.id, grandchild, child.id)
          }
        }
      }
    }
  }

  // Re-fetch after seeding
  await fetchSidebarNodes()
}

async function hasNodesForScope(scope: SidebarScope): Promise<boolean> {
  try {
    const result = await $fetch<{ data: Record<string, unknown>[] }>('/api/graph/query', {
      method: 'POST',
      body: { query: `FIND ${SIDEBAR_NS} AS ?n WHERE ?n.scope = "${scope}" LIMIT 1` },
    })
    return (result.data?.length || 0) > 0
  } catch {
    return false
  }
}

// ── Auto-seed guard ────────────────────────────────────────────────────

let _seeding = false

async function ensureSeeded(scope: SidebarScope): Promise<void> {
  if (_seeding) return
  _seeding = true

  try {
    const hasNodes = buildTree(scope).length > 0
    if (!hasNodes) {
      // Dynamically import to avoid circular deps & keep tree-shakeable
      const { DEFAULT_WORKSPACE_SIDEBAR } = await import('~/lib/sidebarSeeds')

      let seeds: SidebarNodeSeed[] = []
      if (scope === 'workspace') seeds = DEFAULT_WORKSPACE_SIDEBAR

      if (seeds.length > 0) {
        console.log(`[useSidebarTree] Auto-seeding ${seeds.length} nodes for scope "${scope}"`)
        await seedFromTemplate(seeds)
      }
    }
  } catch (err) {
    console.error('[useSidebarTree] Auto-seed failed:', err)
  } finally {
    _seeding = false
  }
}

// ── Composable ─────────────────────────────────────────────────────────

export function useSidebarTree(scope: SidebarScope) {
  // Initialize on first use (client-side only)
  if (import.meta.client && !_initialized.value && !_loading.value) {
    fetchSidebarNodes().then(() => {
      ensureSeeded(scope)
    })
    subscribeToSSE()
  }

  const tree = computed(() => buildTree(scope))

  const flatNodes = computed(() => {
    const result: SidebarTreeNode[] = []
    const walk = (nodes: SidebarTreeNode[]) => {
      for (const node of nodes) {
        result.push(node)
        walk(node.children)
      }
    }
    walk(tree.value)
    return result
  })

  return {
    tree,
    flatNodes,
    loading: computed(() => _loading.value),
    initialized: computed(() => _initialized.value),
    error: computed(() => _error.value),

    // Mutations
    createNode: createSidebarNode,
    updateNode: updateSidebarNode,
    deleteNode: deleteSidebarNode,
    moveNode,
    toggleCollapsed: (id: string) => {
      const node = _nodes.value.get(id)
      if (node) updateSidebarNode(id, { collapsed: !node.collapsed })
    },

    // Seeding
    seedFromTemplate,
    hasNodesForScope,

    // Re-fetch
    refresh: fetchSidebarNodes,
  }
}
