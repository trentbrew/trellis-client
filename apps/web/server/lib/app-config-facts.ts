/** Reconstruct a node object from EAV facts (shared by graph API + app config snapshot). */
export function factsToNode(
  entityId: string,
  facts: Array<{ e: string; a: string; v: unknown }>,
): Record<string, unknown> {
  const node: Record<string, unknown> = { '@id': entityId }
  const attrCounts: Record<string, number> = {}
  for (const fact of facts) {
    attrCounts[fact.a] = (attrCounts[fact.a] || 0) + 1
  }
  for (const fact of facts) {
    if (fact.a === 'type') {
      node['@type'] = fact.v
    } else if (attrCounts[fact.a]! > 1) {
      if (!Array.isArray(node[fact.a])) {
        node[fact.a] = []
      }
      ;(node[fact.a] as unknown[]).push(fact.v)
    } else {
      node[fact.a] = fact.v
    }
  }
  return node
}

export const APP_CONFIG_ENTITY_TYPES = [
  'app_route',
  'trellis_schema',
  'app_projection',
  'app_projection_view',
] as const

export function isAppConfigEntityType(type: unknown): boolean {
  return typeof type === 'string' && (APP_CONFIG_ENTITY_TYPES as readonly string[]).includes(type)
}
