import { isBrowseDomainType } from '~/lib/entities-live/browse-domain-types'

const BROWSE_MUTATION_ACTIONS = new Set([
  'createNode',
  'updateNode',
  'deleteNode',
  'link',
  'unlink',
])

const NON_BROWSE_ENTITY_TYPES = new Set([
  'entity',
  'ontology',
  'notification',
  'platform',
  'comment',
])

function resolveMutationEntityType(data: Record<string, unknown>): string | undefined {
  if (typeof data.type === 'string' && data.type && !NON_BROWSE_ENTITY_TYPES.has(data.type)) {
    return data.type
  }
  const payload = data.data
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const nodeType = (payload as Record<string, unknown>).type
    if (typeof nodeType === 'string' && nodeType) return nodeType
  }
  return undefined
}

/** SSE mutation patterns that should invalidate KernelBrowse live entity lists. */
export function shouldRefetchBrowseEntitiesFromSSE(data: Record<string, unknown>): boolean {
  const action = typeof data.action === 'string' ? data.action : ''
  if (!BROWSE_MUTATION_ACTIONS.has(action)) return false

  const entityId = typeof data.entityId === 'string' ? data.entityId : ''
  if (!entityId || entityId === '*') return false
  if (!entityId.startsWith('entity:')) return false

  if (action === 'deleteNode' || action === 'unlink') return true

  const entityType = resolveMutationEntityType(data)
  if (entityType && isBrowseDomainType(entityType)) return true

  // MCP/CLI updates often patch title/fields without repeating `type` in data —
  // still invalidate browse for any entity:* graph mutation.
  if (action === 'createNode' || action === 'updateNode' || action === 'link') return true

  return false
}
