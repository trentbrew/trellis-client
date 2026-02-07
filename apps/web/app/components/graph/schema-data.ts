/**
 * Schema data for the Ontology Visualizer.
 *
 * Two datasets:
 * A) Core Ontology — system types from core.jsonld (read-only)
 * B) Entity Registry — app-level entity types from entityRegistry.ts
 */

import type { Edge, Node } from '@vue-flow/core'
import { getAllEntityTypes } from '~/config/entityRegistry'

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
  className?: string // entity class for color coding
}

export type OntologyNode = Node<OntologyNodeData>

// ── A) Core Ontology ─────────────────────────────────────────────────────────

export const coreOntologyNodes: OntologyNode[] = [
  {
    id: 'core:Thing',
    type: 'ontologyTable',
    position: { x: 500, y: 0 },
    data: {
      label: 'Thing',
      icon: 'lucide:box',
      subtitle: 'Root type',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'createdAt', type: 'datetime' },
        { name: 'updatedAt', type: 'datetime' },
        { name: 'createdBy', type: 'relation', isRelation: true },
        { name: 'tags', type: 'multiselect' },
      ],
    },
  },
  {
    id: 'core:Record',
    type: 'ontologyTable',
    position: { x: 500, y: 280 },
    data: {
      label: 'Record',
      icon: 'lucide:file',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'status', type: 'select' },
        { name: 'tags', type: 'multiselect' },
      ],
    },
  },
  {
    id: 'core:Collection',
    type: 'ontologyTable',
    position: { x: 100, y: 280 },
    data: {
      label: 'Collection',
      icon: 'lucide:database',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'icon', type: 'icon' },
        { name: 'schema', type: 'json' },
        { name: 'recordType', type: 'relation', isRelation: true },
      ],
    },
  },
  {
    id: 'core:Tag',
    type: 'ontologyTable',
    position: { x: 900, y: 280 },
    data: {
      label: 'Tag',
      icon: 'lucide:tag',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'name', type: 'text' },
        { name: 'slug', type: 'text' },
        { name: 'color', type: 'color' },
        { name: 'icon', type: 'icon' },
        { name: 'parentTag', type: 'relation', isRelation: true },
      ],
    },
  },
  {
    id: 'core:Document',
    type: 'ontologyTable',
    position: { x: 300, y: 580 },
    data: {
      label: 'Document',
      icon: 'lucide:file-text',
      subtitle: 'extends Record',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'content', type: 'richtext' },
        { name: 'mimeType', type: 'text' },
        { name: 'fileUrl', type: 'text' },
      ],
    },
  },
  {
    id: 'core:Event',
    type: 'ontologyTable',
    position: { x: 700, y: 580 },
    data: {
      label: 'Event',
      icon: 'lucide:calendar',
      subtitle: 'extends Record',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'startDate', type: 'datetime' },
        { name: 'endDate', type: 'datetime' },
        { name: 'location', type: 'text' },
        { name: 'allDay', type: 'boolean' },
      ],
    },
  },
  {
    id: 'core:Workspace',
    type: 'ontologyTable',
    position: { x: -300, y: 280 },
    data: {
      label: 'Workspace',
      icon: 'lucide:building-2',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'name', type: 'text' },
        { name: 'slug', type: 'text' },
        { name: 'avatar', type: 'image' },
        { name: 'plan', type: 'select' },
      ],
    },
  },
  {
    id: 'core:App',
    type: 'ontologyTable',
    position: { x: -300, y: 580 },
    data: {
      label: 'App',
      icon: 'lucide:layout-grid',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'name', type: 'text' },
        { name: 'slug', type: 'text' },
        { name: 'icon', type: 'icon' },
        { name: 'color', type: 'color' },
        { name: 'description', type: 'textarea' },
        { name: 'ontologies', type: 'array' },
      ],
    },
  },
  {
    id: 'core:Member',
    type: 'ontologyTable',
    position: { x: 1250, y: 280 },
    data: {
      label: 'Member',
      icon: 'lucide:user',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'avatar', type: 'image' },
        { name: 'role', type: 'select' },
        { name: 'status', type: 'select' },
      ],
    },
  },
  {
    id: 'core:Person',
    type: 'ontologyTable',
    position: { x: 1250, y: 0 },
    data: {
      label: 'Person',
      icon: 'lucide:user',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
      ],
    },
  },
  {
    id: 'core:Workflow',
    type: 'ontologyTable',
    position: { x: -300, y: 0 },
    data: {
      label: 'Workflow',
      icon: 'lucide:git-branch',
      subtitle: 'extends Thing',
      fields: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'name', type: 'text' },
        { name: 'trigger', type: 'text' },
        { name: 'steps', type: 'array' },
        { name: 'active', type: 'boolean' },
      ],
    },
  },
]

export const coreOntologyEdges: Edge[] = [
  // subClassOf → Thing
  { id: 'record-thing', source: 'core:Record', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'collection-thing', source: 'core:Collection', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'tag-thing', source: 'core:Tag', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'workspace-thing', source: 'core:Workspace', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'app-thing', source: 'core:App', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'member-thing', source: 'core:Member', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'person-thing', source: 'core:Person', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'workflow-thing', source: 'core:Workflow', target: 'core:Thing', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },

  // subClassOf → Record
  { id: 'document-record', source: 'core:Document', target: 'core:Record', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },
  { id: 'event-record', source: 'core:Event', target: 'core:Record', sourceHandle: 'id', targetHandle: 'id', type: 'default', animated: true, label: 'extends' },

  // Relation edges
  { id: 'tag-self', source: 'core:Tag', target: 'core:Tag', sourceHandle: 'parentTag', targetHandle: 'id', type: 'default', animated: true, label: 'parentTag' },
  { id: 'collection-record', source: 'core:Collection', target: 'core:Record', sourceHandle: 'recordType', targetHandle: 'id', type: 'default', animated: true, label: 'recordType' },
]

// ── B) Entity Registry (derived dynamically from entityRegistry.ts) ──────────

const FIELD_TYPE_MAP: Record<string, string> = {
  type: 'identity',
  status: 'select',
  startDate: 'datetime',
  endDate: 'datetime',
  allDay: 'boolean',
  timeRange: 'timerange',
  priority: 'computed',
  urgency: 'computed',
  category: 'select',
  owner: 'relation',
  involved: 'relation[]',
  folder: 'relation',
  pin: 'boolean',
  tags: 'multiselect',
}

const RELATION_FIELD_IDS = new Set(['owner', 'involved', 'folder'])

function buildRegistryNodes(): OntologyNode[] {
  const allTypes = getAllEntityTypes()
  const classOrder = ['temporal', 'document', 'actor', 'container']

  const byClass = new Map<string, typeof allTypes>()
  for (const cls of classOrder) byClass.set(cls, [])
  for (const cfg of allTypes) {
    byClass.get(cfg.class)?.push(cfg)
  }

  const nodes: OntologyNode[] = []
  let colX = 0

  for (const cls of classOrder) {
    const entries = byClass.get(cls) || []
    let rowY = 0
    for (const cfg of entries) {
      nodes.push({
        id: `entity:${cfg.type}`,
        type: 'ontologyTable',
        position: { x: colX, y: rowY },
        data: {
          label: cfg.label,
          icon: cfg.icon,
          subtitle: cfg.class,
          className: cfg.class,
          fields: cfg.propertyFields.map(f => ({
            name: f.id,
            type: FIELD_TYPE_MAP[f.id] || f.display || f.group,
            isPrimary: f.id === 'type',
            isRelation: RELATION_FIELD_IDS.has(f.id),
          })),
        },
      })
      // Estimate node height: header(52) + fields(28 each) + padding(16)
      rowY += 68 + cfg.propertyFields.length * 28 + 24
    }
    colX += 340
  }

  return nodes
}

function buildRegistryEdges(): Edge[] {
  const allTypes = getAllEntityTypes()
  const edges: Edge[] = []

  for (const cfg of allTypes) {
    if (cfg.propertyFields.some(f => f.id === 'folder')) {
      edges.push({
        id: `${cfg.type}-folder`,
        source: `entity:${cfg.type}`,
        target: 'entity:folder',
        sourceHandle: 'folder',
        targetHandle: 'type',
        type: 'default',
        animated: true,
        label: 'folder',
      })
    }
  }

  return edges
}

export const entityRegistryNodes: OntologyNode[] = buildRegistryNodes()
export const entityRegistryEdges: Edge[] = buildRegistryEdges()
