/** Agents whose graph writes should not surface user-facing toasts. */
export const SILENT_MUTATION_AGENTS = new Set([
  'system',
  'browser',
  'graph-notifier',
  'gmail-notifier',
  'calendar-notifier',
  'job-notifier',
  'ops-notifier',
  'workflow-server',
  'sidebar',
  'template-installer',
  'decision-capture',
  'campus-migration',
])

const GRAPH_ENTITY_ACTIONS = new Set(['createNode', 'updateNode', 'deleteNode', 'link', 'unlink'])

const ONTOLOGY_ACTIONS = new Set(['createOntology', 'updateOntology', 'deleteOntology'])

const AGENT_LABELS: Record<string, string> = {
  cursor: 'Cursor',
  mcp: 'MCP',
  'claude-code': 'Claude Code',
  claude: 'Claude',
  opencode: 'OpenCode',
  gemini: 'Gemini',
}

export interface MutationToastPayload {
  action?: string
  agentId?: string
  entityId?: string
  type?: string
  data?: Record<string, unknown>
}

export function isExternalAgentMutation(payload: MutationToastPayload): boolean {
  const agentId = payload.agentId?.trim()
  if (!agentId) return false
  if (SILENT_MUTATION_AGENTS.has(agentId)) return false
  return true
}

export function shouldToastMutation(payload: MutationToastPayload): boolean {
  if (!isExternalAgentMutation(payload)) return false
  const action = payload.action || ''
  return GRAPH_ENTITY_ACTIONS.has(action) || ONTOLOGY_ACTIONS.has(action)
}

export function formatAgentLabel(agentId: string): string {
  if (AGENT_LABELS[agentId]) return AGENT_LABELS[agentId]
  return agentId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function actionVerb(action: string): string {
  switch (action) {
    case 'createNode':
      return 'created'
    case 'updateNode':
      return 'updated'
    case 'deleteNode':
      return 'deleted'
    case 'link':
      return 'linked'
    case 'unlink':
      return 'unlinked'
    case 'createOntology':
      return 'added schema'
    case 'updateOntology':
      return 'updated schema'
    case 'deleteOntology':
      return 'removed schema'
    default:
      return action
  }
}

function entityLabel(payload: MutationToastPayload): string {
  const data = payload.data
  const title = data && typeof data.title === 'string' ? data.title.trim() : ''
  if (title) return title

  const entityType =
    (data && typeof data.type === 'string' ? data.type : undefined) ||
    (payload.type && payload.type !== 'entity' ? payload.type : undefined)

  if (payload.entityId) {
    const shortId = payload.entityId.includes(':') ? payload.entityId.split(':').pop()! : payload.entityId
    return entityType ? `${entityType} · ${shortId}` : shortId
  }

  if (payload.type && ONTOLOGY_ACTIONS.has(payload.action || '')) {
    return payload.type.replace(/^trellis:schema\//, '')
  }

  return 'entity'
}

export function formatMutationToast(payload: MutationToastPayload): {
  title: string
  description?: string
  kind: 'success' | 'info' | 'warning'
  entityId?: string
} {
  const agent = formatAgentLabel(payload.agentId || 'agent')
  const verb = actionVerb(payload.action || 'mutated')
  const target = entityLabel(payload)

  const kind =
    payload.action === 'deleteNode' || payload.action === 'deleteOntology'
      ? 'warning'
      : payload.action === 'createNode' || payload.action === 'createOntology'
        ? 'success'
        : 'info'

  return {
    title: `${agent} ${verb}`,
    description: target,
    kind,
    entityId: payload.entityId,
  }
}
