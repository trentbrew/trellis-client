/** SSE mutation patterns that should invalidate app config (ADR-002 P1). */
export function shouldRefetchAppConfigFromSSE(data: Record<string, unknown>): boolean {
  const action = typeof data.action === 'string' ? data.action : ''
  if (action.includes('Ontology') || action.includes('Route')) return true
  if (data.type === 'ontology' || data.type === 'route') return true

  const entityId = typeof data.entityId === 'string' ? data.entityId : ''
  if (/^(route:|ontology:|projection:|projection-view:)/.test(entityId)) return true

  const payload = data.data
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const nodeType = (payload as Record<string, unknown>).type
    if (
      nodeType === 'app_route'
      || nodeType === 'trellis_schema'
      || nodeType === 'app_projection'
      || nodeType === 'app_projection_view'
    ) {
      return true
    }
  }

  return false
}
