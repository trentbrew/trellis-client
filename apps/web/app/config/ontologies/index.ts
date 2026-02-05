/**
 * Ontology Registry
 *
 * Loads and merges vertical ontologies into a unified graph.
 * Provides runtime access to types, fields, workflows, and terminology.
 */

import coreOntologyRaw from './core/core.jsonld'
import ecmsOntologyRaw from './ecms/ecms.jsonld'

// Forward declarations - actual casting happens after interface definitions
let coreOntology: OntologyGraph
let ecmsOntology: OntologyGraph
const ecmsOntology = ecmsOntologyRaw as unknown as OntologyGraph

export interface OntologyNode {
  '@id': string
  '@type'?: string | string[]
  label?: string
  comment?: string
  icon?: string
  component?: string
  projectionTypes?: string[]
  fields?: Array<{ '@id': string } | OntologyNode>
  subClassOf?: { '@id': string }
  options?: Array<{ value: string; label: string; color?: string; icon?: string }>
  [key: string]: unknown
}

export interface OntologyGraph {
  '@context': Record<string, unknown>
  '@id': string
  '@type': string
  '@graph': OntologyNode[]
  label?: string
  comment?: string
  'owl:versionInfo'?: string
}

export interface LoadedOntology {
  id: string
  name: string
  version: string
  description: string
  types: Map<string, OntologyNode>
  fields: Map<string, OntologyNode>
  workflows: Map<string, OntologyNode>
  terminology: OntologyNode | null
  raw: OntologyGraph
}

export interface OntologyRegistry {
  core: LoadedOntology
  verticals: Map<string, LoadedOntology>
  merged: {
    types: Map<string, OntologyNode>
    fields: Map<string, OntologyNode>
    workflows: Map<string, OntologyNode>
  }
}

/**
 * Parse an ontology JSON-LD document into a LoadedOntology
 */
function parseOntology(ontology: OntologyGraph): LoadedOntology {
  const types = new Map<string, OntologyNode>()
  const fields = new Map<string, OntologyNode>()
  const workflows = new Map<string, OntologyNode>()
  let terminology: OntologyNode | null = null

  for (const node of ontology['@graph']) {
    const id = node['@id']
    const type = node['@type']

    if (typeof type === 'string') {
      if (type === 'rdfs:Class' || type.endsWith(':Class')) {
        types.set(id, node)
      } else if (type === 'core:Field' || type.endsWith(':Field')) {
        fields.set(id, node)
      } else if (type === 'core:Workflow' || type.endsWith(':Workflow')) {
        workflows.set(id, node)
      } else if (type === 'core:TerminologyConfig' || type.endsWith(':TerminologyConfig')) {
        terminology = node
      }
    }
  }

  return {
    id: ontology['@id'],
    name: ontology.label || ontology['@id'],
    version: ontology['owl:versionInfo'] || '0.0.0',
    description: ontology.comment || '',
    types,
    fields,
    workflows,
    terminology,
    raw: ontology,
  }
}

/**
 * Create the ontology registry with core and loaded verticals
 */
export function createOntologyRegistry(verticalIds: string[] = []): OntologyRegistry {
  const core = parseOntology(coreOntology as OntologyGraph)
  const verticals = new Map<string, LoadedOntology>()

  // Load requested verticals
  for (const verticalId of verticalIds) {
    if (verticalId === 'ecms') {
      verticals.set('ecms', parseOntology(ecmsOntology as OntologyGraph))
    }
    // Add more verticals here as they are created
  }

  // Merge all ontologies
  const merged = {
    types: new Map<string, OntologyNode>(),
    fields: new Map<string, OntologyNode>(),
    workflows: new Map<string, OntologyNode>(),
  }

  // Start with core
  for (const [id, node] of core.types) merged.types.set(id, node)
  for (const [id, node] of core.fields) merged.fields.set(id, node)
  for (const [id, node] of core.workflows) merged.workflows.set(id, node)

  // Layer in verticals (later ones override earlier)
  for (const vertical of verticals.values()) {
    for (const [id, node] of vertical.types) merged.types.set(id, node)
    for (const [id, node] of vertical.fields) merged.fields.set(id, node)
    for (const [id, node] of vertical.workflows) merged.workflows.set(id, node)
  }

  return { core, verticals, merged }
}

/**
 * Get a type definition by ID from the registry
 */
export function getType(registry: OntologyRegistry, typeId: string): OntologyNode | undefined {
  return registry.merged.types.get(typeId)
}

/**
 * Get a field definition by ID from the registry
 */
export function getField(registry: OntologyRegistry, fieldId: string): OntologyNode | undefined {
  return registry.merged.fields.get(fieldId)
}

/**
 * Get all types that extend a given base type
 */
export function getSubtypes(registry: OntologyRegistry, baseTypeId: string): OntologyNode[] {
  const subtypes: OntologyNode[] = []
  for (const [_id, node] of registry.merged.types) {
    const parent = node.subClassOf
    if (parent && typeof parent === 'object' && parent['@id'] === baseTypeId) {
      subtypes.push(node)
    }
  }
  return subtypes
}

/**
 * Get the terminology config for the active ontologies
 * Verticals override core terminology
 */
export function getTerminology(registry: OntologyRegistry): OntologyNode | null {
  // Check verticals first (last one wins)
  for (const vertical of registry.verticals.values()) {
    if (vertical.terminology) return vertical.terminology
  }
  return registry.core.terminology
}

/**
 * Check if a vertical is loaded
 */
export function hasVertical(registry: OntologyRegistry, verticalId: string): boolean {
  return registry.verticals.has(verticalId)
}

/**
 * Get list of available vertical IDs
 */
export function getAvailableVerticals(): string[] {
  return ['ecms'] // Add more as they are created
}

// Export raw ontologies for direct access if needed
export { coreOntology, ecmsOntology }
