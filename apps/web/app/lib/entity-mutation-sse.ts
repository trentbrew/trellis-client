import { isBrowseDomainType } from '~/lib/entities-live/browse-domain-types'

const BROWSE_MUTATION_ACTIONS = new Set([
  'createNode',
  'updateNode',
  'deleteNode',
  'link',
  'unlink',
])

/** SSE mutation patterns that should invalidate KernelBrowse live entity lists. */
export function shouldRefetchBrowseEntitiesFromSSE(data: Record<string, unknown>): boolean {
  const action = typeof data.action === 'string' ? data.action : ''
  if (!BROWSE_MUTATION_ACTIONS.has(action)) return false

  const entityId = typeof data.entityId === 'string' ? data.entityId : ''
  if (!entityId.startsWith('entity:')) return false

  if (action === 'deleteNode' || action === 'unlink') return true

  const payload = data.data
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const nodeType = (payload as Record<string, unknown>).type
    if (isBrowseDomainType(nodeType)) return true
  }

  return false
}
