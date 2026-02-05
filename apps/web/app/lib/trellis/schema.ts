import { z } from 'zod'

export const TRELLIS_SCHEMA_VERSION = '2.0' as const
export const SUPPORTED_VERSIONS = ['1.0', '2.0'] as const
export type TrellisVersion = (typeof SUPPORTED_VERSIONS)[number]

export const TRELLIS_MIME_TYPE = 'application/vnd.trellis+json'

/**
 * JSON-LD Context
 * Maps prefixes to full IRIs
 */
export const ContextSchema = z.record(z.string(), z.union([z.string(), z.record(z.string(), z.unknown())]))

/**
 * Import Reference
 * References external Trellis documents
 */
export const ImportSchema = z.object({
  '@id': z.string(),
  path: z.string(),
  version: z.string().optional(),
})

/**
 * User Reference (for metadata)
 */
export const UserRefSchema = z
  .object({
    '@id': z.string().min(1),
  })
  .passthrough()

/**
 * Metadata for nodes
 */
export const MetadataSchema = z
  .object({
    createdTime: z.string().min(1),
    createdBy: UserRefSchema,
    lastEditedTime: z.string().min(1),
    lastEditedBy: UserRefSchema,
    icon: z.string().optional(),
    cover: UserRefSchema.optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
    favorite: z.boolean().optional(),
    embedding: UserRefSchema.optional(),
  })
  .passthrough()

/**
 * Block (for document content)
 */
export const BlockSchema = z
  .object({
    '@type': z.string().min(1),
  })
  .passthrough()

/**
 * Content Document
 */
export const ContentDocumentSchema = z
  .object({
    '@type': z.literal('trellis:Document'),
    blocks: z.array(BlockSchema).default([]),
  })
  .passthrough()

/**
 * Field value types for ontology definitions
 */
export const FieldValueTypes = [
  'text',
  'number',
  'boolean',
  'date',
  'datetime',
  'relation',
  'email',
  'url',
  'select',
  'multiselect',
  'checkbox',
  'file',
  'formula',
] as const
export type FieldValueType = (typeof FieldValueTypes)[number]

/**
 * Ontology Field Definition
 */
export const OntologyFieldSchema = z
  .object({
    '@id': z.string().optional(),
    '@type': z.string().optional(),
    name: z.string().min(1),
    valueType: z.enum(FieldValueTypes),
    required: z.boolean().optional(),
    description: z.string().optional(),
    defaultValue: z.unknown().optional(),
    selectOptions: z
      .array(
        z
          .object({
            name: z.string().min(1),
            color: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    statusOptions: z.any().optional(),
    format: z.string().optional(),
    formula: z.string().optional(),
    formulaReturnType: z.enum(['text', 'number', 'boolean', 'date']).optional(),
  })
  .passthrough()

/**
 * Ontology Definition
 * Defines the shape/schema of nodes
 */
export const OntologySchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:Ontology'),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  fields: z.array(OntologyFieldSchema).default([]),
})

/**
 * Node (Entity)
 * Uses schema.org naming convention: name, description
 */
export const NodeSchema = z
  .object({
    '@id': z.string(),
    '@type': z.string(),
    // Schema.org aligned properties (preferred)
    name: z.string().max(280).optional(),
    description: z.string().max(10000).optional(),
    // Trellis-specific properties
    'trellis:content': ContentDocumentSchema.optional(),
    'trellis:metadata': MetadataSchema.optional(),
  })
  .passthrough()

/**
 * Edge (Relationship)
 */
export const EdgeSchema = z.object({
  '@id': z.string().optional(),
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Projection Type
 */
export const ProjectionTypes = [
  'trellis-blocks',
  'table',
  'spreadsheet',
  'blocks',
  'code',
  'card-grid',
  'sankey',
  'graph',
  'kanban',
  'timeline',
  'dashboard',
] as const
export type ProjectionType = (typeof ProjectionTypes)[number]

/**
 * Projection
 * Defines how to render nodes
 */
export const ProjectionSchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:Projection'),
  name: z.string(),
  component: z.string().optional(),
  query: z
    .object({
      nodeType: z.string().optional(),
      filters: z.array(z.unknown()).optional(),
      sort: z
        .array(
          z.object({
            field: z.string(),
            direction: z.enum(['asc', 'desc']),
          }),
        )
        .optional(),
    })
    .optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  order: z.number().optional(),
})

/**
 * Workflow Trigger Types
 */
export const WorkflowTriggers = ['onCreate', 'onUpdate', 'onDelete', 'manual', 'scheduled'] as const
export type WorkflowTrigger = (typeof WorkflowTriggers)[number]

/**
 * Workflow
 * Automation/action definition
 */
export const WorkflowSchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:Workflow'),
  name: z.string(),
  trigger: z.enum(WorkflowTriggers),
  conditions: z.array(z.unknown()).optional(),
  actions: z.array(z.unknown()),
  active: z.boolean().default(true),
})

/**
 * Collection Node
 */
export const CollectionNodeSchema = z
  .object({
    '@id': z.string(),
    '@type': z.literal('trellis:Collection'),
    name: z.string(),
    description: z.string().optional(),
    schema: UserRefSchema.optional(),
    views: z.array(z.any()).optional(),
    projections: z.array(z.any()).optional(),
    items: z.array(z.any()).default([]),
  })
  .passthrough()

/**
 * Graph Container
 * The main data structure
 */
export const GraphSchema = z.object({
  ontologies: z.record(z.string(), OntologySchema).optional().default({}),
  nodes: z.array(NodeSchema).optional().default([]),
  edges: z.array(EdgeSchema).optional().default([]),
  projections: z.record(z.string(), ProjectionSchema).optional().default({}),
  workflows: z.record(z.string(), WorkflowSchema).optional().default({}),
})

/**
 * Full Trellis Document Schema (v2.0)
 */
export const TrellisDocumentSchema = z.object({
  $schema: z.string().optional(),
  '@context': ContextSchema,

  version: z.enum(SUPPORTED_VERSIONS),
  created: z.string(),
  modified: z.string(),

  imports: z.array(ImportSchema).optional().default([]),

  graph: GraphSchema,
})

/**
 * Legacy Document Schema (v1.0)
 * For backwards compatibility
 */
export const LegacyTrellisDocumentSchema = z
  .object({
    '@context': ContextSchema,
    '@graph': z.array(z.any()).optional(),
    graph: z.any().optional(),
  })
  .refine(
    (v) => {
      const obj: any = v as any
      if (Array.isArray(obj['@graph'])) return true
      if (obj.graph && typeof obj.graph === 'object') return true
      return false
    },
    { message: 'Document must have @graph array or graph object' },
  )
  .passthrough()

/**
 * Flexible Document Schema
 * Accepts both v1.0 and v2.0 formats
 */
export const FlexibleTrellisDocumentSchema = z.union([TrellisDocumentSchema, LegacyTrellisDocumentSchema])

// TypeScript Types (inferred from Zod)
export type TrellisDocument = z.infer<typeof TrellisDocumentSchema>
export type LegacyTrellisDocument = z.infer<typeof LegacyTrellisDocumentSchema>
export type TrellisGraph = z.infer<typeof GraphSchema>
export type TrellisNode = z.infer<typeof NodeSchema>
export type TrellisEdge = z.infer<typeof EdgeSchema>
export type TrellisOntology = z.infer<typeof OntologySchema>
export type TrellisProjection = z.infer<typeof ProjectionSchema>
export type TrellisWorkflow = z.infer<typeof WorkflowSchema>
export type TrellisMetadata = z.infer<typeof MetadataSchema>
export type TrellisImport = z.infer<typeof ImportSchema>
export type TrellisContext = z.infer<typeof ContextSchema>
export type TrellisOntologyField = z.infer<typeof OntologyFieldSchema>
