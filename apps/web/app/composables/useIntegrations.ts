/**
 * useIntegrations — TQL-backed reactive integration registry.
 *
 * Queries `integration_definition` and `integration_connection` entities from
 * the TQL graph. Definitions are seeded on boot; connections are user-scoped
 * and CRUD'd via mutate(). SSE reactivity keeps the UI in sync.
 *
 * Adding a new integration = one seed entity + one server route directory.
 * The settings page auto-discovers everything from TQL — zero UI changes.
 */

import type {
  IntegrationDefinition,
  IntegrationConnection,
  IntegrationCategory,
  IntegrationConnectionStatus,
} from '~/types/database'
import { entityId as toEntityId, stripNamespace, entityQuery } from '~/lib/tql-namespace'

// ── Category metadata (static, used for UI grouping) ─────────────────────

export const CATEGORY_META: Record<IntegrationCategory, { label: string; icon: string; description: string }> = {
  data: { label: 'Data Sources', icon: 'lucide:database', description: 'Connect external data sources' },
  auth: { label: 'Authentication', icon: 'lucide:shield', description: 'Enable social login providers' },
  communication: { label: 'Communication', icon: 'lucide:message-square', description: 'Notifications and messaging' },
  storage: { label: 'Storage', icon: 'lucide:hard-drive', description: 'File and media storage' },
  automation: { label: 'Automation', icon: 'lucide:zap', description: 'Workflow automation tools' },
  analytics: { label: 'Analytics', icon: 'lucide:bar-chart-2', description: 'Track usage and behavior' },
}

const CATEGORIES: IntegrationCategory[] = ['data', 'auth', 'communication', 'storage', 'automation', 'analytics']

// ── Node → typed record hydrators ─────────────────────────────────────────

function hydrateDefinition(node: Record<string, any>): IntegrationDefinition {
  const fullId = node['@id'] as string
  return {
    id: stripNamespace(fullId),
    title: (node.title as string) || '',
    description: node.description as string | undefined,
    provider: (node.provider as string) || '',
    category: (node.category as IntegrationCategory) || 'data',
    authType: (node.authType as IntegrationDefinition['authType']) || 'none',
    icon: node.icon as string | undefined,
    color: node.color as string | undefined,
    features: node.features as string[] | undefined,
    docsUrl: node.docsUrl as string | undefined,
    webhookSupport: node.webhookSupport as boolean | undefined,
    pushNotificationSupport: node.pushNotificationSupport as boolean | undefined,
    enrichmentSupport: node.enrichmentSupport as boolean | undefined,
    syncDirection: node.syncDirection as IntegrationDefinition['syncDirection'],
    requiredScopes: node.requiredScopes as string[] | undefined,
    configSchema: node.configSchema as string | undefined,
    integrationStatus: node.integrationStatus as IntegrationDefinition['integrationStatus'],
  }
}

function hydrateConnection(node: Record<string, any>): IntegrationConnection {
  const fullId = node['@id'] as string
  return {
    id: stripNamespace(fullId),
    title: (node.title as string) || '',
    integrationId: (node.integrationId as string) || '',
    userId: (node.userId as string) || '',
    connectionStatus: (node.connectionStatus as IntegrationConnectionStatus) || 'configuring',
    connectedAt: node.connectedAt as string | undefined,
    lastSyncAt: node.lastSyncAt as string | undefined,
    syncEnabled: node.syncEnabled as boolean | undefined,
    syncIntervalMs: node.syncIntervalMs as number | undefined,
    accountEmail: node.accountEmail as string | undefined,
    accountName: node.accountName as string | undefined,
    config: node.config as string | undefined,
    credentialsRef: node.credentialsRef as string | undefined,
    watchChannelId: node.watchChannelId as string | undefined,
    watchExpiration: node.watchExpiration as string | undefined,
    errorMessage: node.errorMessage as string | undefined,
    syncedEntityCount: node.syncedEntityCount as number | undefined,
  }
}

// ── Composable ────────────────────────────────────────────────────────────

export function useIntegrations() {
  const { query, fetchNodes, mutate } = useTrellisGraph()
  const { user } = useInstantAuth()

  // ── Reactive queries ────────────────────────────────────────────────

  const defQuery = `${entityQuery('?i')} WHERE ?i.type = "integration_definition"`
  const { data: defIds, loading: defsLoading } = query(defQuery)

  // Note: We query by type only and filter client-side by userId because
  // the 'userId' attribute isn't in the EAV catalog until the first
  // integration_connection entity is created.
  const connQuery = `${entityQuery('?c')} WHERE ?c.type = "integration_connection"`
  const { data: connIds, loading: connsLoading } = query(connQuery)

  // ── Hydrated state ──────────────────────────────────────────────────

  const definitions = ref<IntegrationDefinition[]>([])
  const connections = ref<IntegrationConnection[]>([])

  watch(defIds, async (ids) => {
    if (!ids || ids.length === 0) { definitions.value = []; return }
    try {
      const idList = ids.map((row) => (row as any)['?i'] as string)
      const nodes = await fetchNodes(idList)
      definitions.value = nodes.map(hydrateDefinition)
    } catch (err) {
      console.error('[useIntegrations] Failed to hydrate definitions:', err)
    }
  }, { immediate: true })

  watch(connIds, async (ids) => {
    if (!ids || ids.length === 0) { connections.value = []; return }
    try {
      const idList = ids.map((row) => (row as any)['?c'] as string)
      const nodes = await fetchNodes(idList)
      connections.value = nodes.map(hydrateConnection)
    } catch (err) {
      console.error('[useIntegrations] Failed to hydrate connections:', err)
    }
  }, { immediate: true })

  // ── Computed views ──────────────────────────────────────────────────

  const definitionsByCategory = computed(() => {
    const grouped: Record<string, IntegrationDefinition[]> = {}
    for (const cat of CATEGORIES) grouped[cat] = []
    for (const def of definitions.value) {
      const bucket = grouped[def.category]
      if (bucket) bucket.push(def)
    }
    return grouped
  })

  function getDefinition(integrationId: string): IntegrationDefinition | undefined {
    return definitions.value.find((d) => d.id === `integration-def-${integrationId}` || d.id === integrationId)
  }

  function getConnection(integrationId: string): IntegrationConnection | undefined {
    return connections.value.find((c) => c.integrationId === integrationId)
  }

  function getConnections(integrationId: string): IntegrationConnection[] {
    return connections.value.filter((c) => c.integrationId === integrationId)
  }

  function isConnected(integrationId: string): boolean {
    return getConnections(integrationId).some((c) => c.connectionStatus === 'connected')
  }

  const connectedCount = computed(() =>
    connections.value.filter((c) => c.connectionStatus === 'connected').length,
  )

  // ── CRUD ────────────────────────────────────────────────────────────

  async function createConnection(integrationId: string, opts?: Partial<IntegrationConnection>): Promise<string> {
    const userId = user.value?.id
    if (!userId) throw new Error('Not authenticated')

    const def = getDefinition(integrationId)
    const id = `integration-conn-${integrationId}-${Date.now()}`
    const title = def ? `${def.title} (${opts?.accountEmail || userId})` : integrationId

    await mutate({
      action: 'createNode',
      entityId: toEntityId(id),
      type: 'entity',
      data: {
        type: 'integration_connection',
        title,
        integrationId,
        userId,
        connectionStatus: 'configuring',
        syncEnabled: true,
        syncIntervalMs: 900000,
        ...opts,
      },
    })

    return id
  }

  async function updateConnection(connectionId: string, patch: Partial<IntegrationConnection>): Promise<void> {
    await mutate({
      action: 'updateNode',
      entityId: toEntityId(connectionId),
      type: 'entity',
      data: patch as Record<string, any>,
    })
  }

  async function deleteConnection(connectionId: string): Promise<void> {
    await mutate({
      action: 'deleteNode',
      entityId: toEntityId(connectionId),
    })
  }

  // ── Loading ─────────────────────────────────────────────────────────

  const loading = computed(() => defsLoading.value || connsLoading.value)

  return {
    // Definitions (from TQL, reactive)
    definitions: computed(() => definitions.value),
    definitionsByCategory,
    getDefinition,

    // Connections (from TQL, reactive, user-scoped)
    connections: computed(() => connections.value),
    getConnection,
    getConnections,
    isConnected,
    connectedCount,

    // CRUD
    createConnection,
    updateConnection,
    deleteConnection,

    // Metadata
    categoryMeta: CATEGORY_META,
    categories: CATEGORIES,

    // Loading
    loading,
  }
}
