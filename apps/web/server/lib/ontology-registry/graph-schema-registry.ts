import type { TrellisKernel, SchemaDefinition } from '@turtle.tech/trellis-kernel'
import { createWorkspaceConfig } from '../../utils/trellis-ontologies'
import { factsToNode } from '../app-config-facts'
import { parseSchemaDefinition } from './parse-schema'

function collectEntitiesByDomainType(store: ReturnType<TrellisKernel['getStore']>, domainType: string): string[] {
  const ids = new Set<string>()
  for (const fact of store.getAllFacts()) {
    if (fact.a === 'type' && fact.v === domainType) {
      ids.add(fact.e)
    }
  }
  return [...ids]
}

function listSchemasFromGraphEntities(kernel: TrellisKernel): SchemaDefinition[] {
  const store = kernel.getStore()
  const schemas: SchemaDefinition[] = []

  for (const entityId of collectEntitiesByDomainType(store, 'trellis_schema')) {
    const node = factsToNode(entityId, store.getFactsByEntity(entityId))
    const schemaId = typeof node.schemaId === 'string' ? node.schemaId : undefined
    const schema = parseSchemaDefinition(node.configJson, entityId)
      ?? (schemaId ? parseSchemaDefinition({ ...node, '@id': schemaId }, entityId) : null)

    if (!schema) {
      console.warn(`[ontology-registry] skipping invalid trellis_schema entity ${entityId}`)
      continue
    }

    const key = schema['@id'] ?? schemaId
    if (!key) continue
    if (schema['@id'] !== key) {
      schemas.push({ ...schema, '@id': key })
    } else {
      schemas.push(schema)
    }
  }

  return schemas
}

function moduleFallbackSchemas(): SchemaDefinition[] {
  const workspace = createWorkspaceConfig().workspace
  return Object.values(workspace.ontologies ?? {}) as SchemaDefinition[]
}

/** Primary: trellis_schema graph entities; fallback: module ontologies when graph is empty. */
export function listSchemasFromGraph(kernel: TrellisKernel): SchemaDefinition[] {
  const fromGraph = listSchemasFromGraphEntities(kernel)
  if (fromGraph.length > 0) return fromGraph
  return moduleFallbackSchemas()
}

export function getSchemaFromGraph(
  kernel: TrellisKernel,
  schemaId: string,
): SchemaDefinition | undefined {
  const fromGraph = listSchemasFromGraphEntities(kernel)
  const graphHit = fromGraph.find((s) => s['@id'] === schemaId)
  if (graphHit) return graphHit

  if (fromGraph.length > 0) return undefined

  const fallback = createWorkspaceConfig().workspace.ontologies ?? {}
  return fallback[schemaId] as SchemaDefinition | undefined
}

export function schemasToRecord(schemas: SchemaDefinition[]): Record<string, SchemaDefinition> {
  const record: Record<string, SchemaDefinition> = {}
  for (const schema of schemas) {
    record[schema['@id']] = schema
  }
  return record
}

/** Find trellis_schema document entity id for a schema @id (e.g. ontology:task). */
export function findTrellisSchemaEntityIdBySchemaId(
  kernel: TrellisKernel,
  schemaId: string,
): string | undefined {
  const store = kernel.getStore()
  for (const entityId of collectEntitiesByDomainType(store, 'trellis_schema')) {
    const facts = store.getFactsByEntity(entityId)
    for (const fact of facts) {
      if (fact.a === 'schemaId' && fact.v === schemaId) {
        return entityId
      }
    }
  }
  return undefined
}

export function schemaEntityIdFromSchemaId(schemaId: string): string {
  const slug = schemaId.replace(/^trellis:schema\//, '').replace(/[:/]/g, '-')
  return `ontology:${slug}`
}
