import type { DatabaseSchema, ProjectionType } from '~/types/database'
import type { CollectionViewOption, ProjectionRegistryNode } from './types'
import { getSchemaFieldTypes } from './field-signals'
import { getProjectionRegistryNodes, PROJECTION_REGISTRY_NODES } from './nodes'

export { PROJECTION_REGISTRY_NODES, getProjectionRegistryNodes }

function nodeSupported(node: ProjectionRegistryNode, schema?: DatabaseSchema | null): boolean {
  const required = node.requirements?.schema?.fieldTypes
  if (!required?.length) return true
  if (!schema?.fields?.length) return false
  const fieldTypes = getSchemaFieldTypes(schema)
  return required.some((type) => fieldTypes.has(type))
}

export function suggestCollectionViews(schema?: DatabaseSchema | null): CollectionViewOption[] {
  return PROJECTION_REGISTRY_NODES.map((node) => {
    const supported = nodeSupported(node, schema)
    return {
      mode: node.projectionType as ProjectionType,
      label: node.label,
      supported,
      isDefault: node.projectionType === 'table',
      reason: supported ? undefined : `Needs ${node.requirements?.schema?.fieldTypes?.join(' or ')} field`,
    }
  })
}

export function suggestDefaultCollectionView(schema?: DatabaseSchema | null): ProjectionType {
  const options = suggestCollectionViews(schema).filter((o) => o.supported)
  return options[0]?.mode ?? 'table'
}
