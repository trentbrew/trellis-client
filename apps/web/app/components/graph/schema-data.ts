/**
 * Schema data for the Ontology Visualizer.
 *
 * Derives Vue Flow nodes and edges dynamically from server ontologies.
 * Uses the `tier` field to split into tabs:
 *   - Core Ontology (tier: 'core') — structural types from the TQL kernel
 *   - Entity Types (tier: 'system') — app entity types
 *
 * Uses `subClassOf` for inheritance edges and `relation` valueType for FK edges.
 */

import type { Edge, Node } from '@vue-flow/core'

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface OntologyField {
  name: string
  type: string
  isPrimary?: boolean
  isRelation?: boolean
}

export interface OntologyNodeData {
  label: string
  icon?: string
  subtitle?: string
  fields: OntologyField[]
  className?: string
  tier?: string
}

export type OntologyNode = Node<OntologyNodeData>

// ── Schema → OntologyField mapping ──────────────────────────────────────────

const RELATION_VALUE_TYPES = new Set(['relation', 'people'])

interface SchemaField {
  name: string
  valueType: string
  required?: boolean
  relation?: { targetSchema?: string; cardinality?: string }
}

interface SchemaDefinitionLike {
  '@id': string
  tier?: string
  subClassOf?: string
  label?: string
  icon?: string
  entityClass?: string
  fields: SchemaField[]
}

function schemaFieldToOntologyField(f: SchemaField): OntologyField {
  return {
    name: f.name,
    type: f.valueType,
    isPrimary: f.name === 'id' || (f.name === 'title' && f.valueType === 'title'),
    isRelation: RELATION_VALUE_TYPES.has(f.valueType) || !!f.relation,
  }
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function estimateNodeHeight(fieldCount: number): number {
  return 68 + fieldCount * 28 + 24
}

// ── Build nodes + edges from SchemaDefinition[] ─────────────────────────────

/**
 * Build Vue Flow nodes from an array of ontology schemas.
 * Auto-layouts in columns grouped by entityClass (for system) or by inheritance depth (for core).
 */
export function buildNodesFromSchemas(schemas: SchemaDefinitionLike[]): OntologyNode[] {
  const tier = schemas[0]?.tier

  if (tier === 'core') {
    return buildCoreNodes(schemas)
  }
  return buildSystemNodes(schemas)
}

function buildCoreNodes(schemas: SchemaDefinitionLike[]): OntologyNode[] {
  // Group by depth in inheritance tree
  const parentMap = new Map<string, string>()
  for (const s of schemas) {
    if (s.subClassOf) parentMap.set(s['@id'], s.subClassOf)
  }

  function depth(id: string): number {
    const parent = parentMap.get(id)
    return parent ? depth(parent) + 1 : 0
  }

  const byDepth = new Map<number, SchemaDefinitionLike[]>()
  for (const s of schemas) {
    const d = depth(s['@id'])
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(s)
  }

  const nodes: OntologyNode[] = []
  const depths = [...byDepth.keys()].sort()

  for (const d of depths) {
    const entries = byDepth.get(d) || []
    const colX = 0
    entries.forEach((s, i) => {
      nodes.push({
        id: s['@id'],
        type: 'ontologyTable',
        position: { x: colX + i * 340, y: d * 320 },
        data: {
          label: s.label || s['@id'].split(':').pop() || s['@id'],
          icon: s.icon,
          subtitle: s.subClassOf ? `extends ${s.subClassOf.split(':').pop()}` : 'Root type',
          tier: s.tier,
          fields: s.fields.map(schemaFieldToOntologyField),
        },
      })
    })
  }

  return nodes
}

function buildSystemNodes(schemas: SchemaDefinitionLike[]): OntologyNode[] {
  // Skip calendaritem and comment (internal/legacy)
  const filtered = schemas.filter(s =>
    !s['@id'].endsWith('/calendaritem') && !s['@id'].endsWith('/comment'),
  )

  const classOrder = ['temporal', 'document', 'actor', 'container']
  const byClass = new Map<string, SchemaDefinitionLike[]>()
  for (const cls of classOrder) byClass.set(cls, [])
  const uncategorized: SchemaDefinitionLike[] = []

  for (const s of filtered) {
    const cls = s.entityClass
    if (cls && byClass.has(cls)) {
      byClass.get(cls)!.push(s)
    } else {
      uncategorized.push(s)
    }
  }

  const nodes: OntologyNode[] = []
  let colX = 0

  for (const cls of classOrder) {
    const entries = byClass.get(cls) || []
    let rowY = 0
    for (const s of entries) {
      const slug = s['@id'].split('/').pop() || s['@id']
      nodes.push({
        id: s['@id'],
        type: 'ontologyTable',
        position: { x: colX, y: rowY },
        data: {
          label: s.label || slug,
          icon: s.icon,
          subtitle: cls,
          className: cls,
          tier: s.tier,
          fields: s.fields.slice(0, 12).map(schemaFieldToOntologyField),
        },
      })
      rowY += estimateNodeHeight(Math.min(s.fields.length, 12))
    }
    colX += 340
  }

  // Uncategorized at the end
  if (uncategorized.length) {
    let rowY = 0
    for (const s of uncategorized) {
      const slug = s['@id'].split('/').pop() || s['@id']
      nodes.push({
        id: s['@id'],
        type: 'ontologyTable',
        position: { x: colX, y: rowY },
        data: {
          label: s.label || slug,
          icon: s.icon,
          subtitle: 'other',
          tier: s.tier,
          fields: s.fields.slice(0, 12).map(schemaFieldToOntologyField),
        },
      })
      rowY += estimateNodeHeight(Math.min(s.fields.length, 12))
    }
  }

  return nodes
}

/**
 * Build Vue Flow edges from an array of ontology schemas.
 * Derives edges from `subClassOf` (inheritance) and `relation` fields (FK).
 */
export function buildEdgesFromSchemas(schemas: SchemaDefinitionLike[]): Edge[] {
  const schemaIds = new Set(schemas.map(s => s['@id']))
  const edges: Edge[] = []

  for (const s of schemas) {
    // Inheritance edge from subClassOf
    if (s.subClassOf && schemaIds.has(s.subClassOf)) {
      const sourceSlug = s['@id'].split(/[:/]/).pop() || s['@id']
      const targetSlug = s.subClassOf.split(/[:/]/).pop() || s.subClassOf
      edges.push({
        id: `${sourceSlug}-extends-${targetSlug}`,
        source: s['@id'],
        target: s.subClassOf,
        sourceHandle: s.fields.find(f => f.name === 'id' || f.valueType === 'title')?.name || 'id',
        targetHandle: 'id',
        type: 'default',
        animated: true,
        label: 'extends',
      })
    }

    // Relation edges
    for (const field of s.fields) {
      if (field.relation?.targetSchema && schemaIds.has(field.relation.targetSchema)) {
        edges.push({
          id: `${s['@id']}-${field.name}-${field.relation.targetSchema}`,
          source: s['@id'],
          target: field.relation.targetSchema,
          sourceHandle: field.name,
          targetHandle: 'id',
          type: 'default',
          animated: true,
          label: field.name,
        })
      }
    }
  }

  return edges
}
