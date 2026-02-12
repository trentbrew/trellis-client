import { z } from 'zod';

/**
 * Property types based on VISION.md (Notion-compatible)
 */
export const PropertyTypeSchema = z.enum([
  'title',
  'rich_text',
  'number',
  'select',
  'multi_select',
  'status',
  'date',
  'people',
  'files',
  'checkbox',
  'url',
  'email',
  'phone_number',
  'relation',
  'rollup',
  'formula',
  'ai_generated',
]);

export type PropertyType = z.infer<typeof PropertyTypeSchema>;

/**
 * Schema field definition
 */
export const PropertyValueSpecificationSchema = z.object({
  name: z.string(),
  valueType: PropertyTypeSchema,
  required: z.boolean().optional(),
  description: z.string().optional(),
  // Type-specific config
  selectOptions: z.array(z.any()).optional(),
  relation: z
    .object({
      targetSchema: z.string().optional(),
      cardinality: z.enum(['one', 'many']).optional(),
      syncedProperty: z.string().optional(),
    })
    .optional(),
  formula: z.string().optional(),
  rollup: z
    .object({
      relationProperty: z.string(),
      targetProperty: z.string(),
      aggregation: z.enum([
        'count',
        'sum',
        'avg',
        'min',
        'max',
        'median',
        'mode',
      ]),
    })
    .optional(),
  aiGenerated: z
    .object({
      prompt: z.string(),
      model: z.string().optional(),
    })
    .optional(),
  // UI metadata (optional — system ontologies populate these)
  icon: z.string().optional(),
  group: z.string().optional(),
  display: z.enum(['pill', 'toggle', 'inline-input', 'popover']).optional(),
  editable: z.boolean().optional(),
  computed: z.boolean().optional(),
  modes: z.array(z.enum(['view', 'create', 'edit'])).optional(),
  defaultValue: z.any().optional(),
});

export type PropertyValueSpecification = z.infer<
  typeof PropertyValueSpecificationSchema
>;

/**
 * Entity class — structural shape
 */
export const EntityClassSchema = z.enum(['temporal', 'document', 'actor', 'container']);
export type EntityClass = z.infer<typeof EntityClassSchema>;

/**
 * Ontology tier — determines mutability and ownership
 *
 * - core: Built into the kernel, immutable. Defines the structural type hierarchy.
 * - system: Shipped with the app, versioned with releases. Entity types like task, note, etc.
 * - user: Created at runtime via API. Custom schemas and marketplace imports.
 */
export const OntologyTierSchema = z.enum(['core', 'system', 'user']);
export type OntologyTier = z.infer<typeof OntologyTierSchema>;

/**
 * Panel config for dialog rendering
 */
export const PanelConfigSchema = z.object({
  properties: z.string(),
  content: z.string(),
  footerActions: z.array(z.string()),
});

export type PanelConfig = z.infer<typeof PanelConfigSchema>;

/**
 * Ontology/Schema definition
 *
 * Core schema fields plus optional UI metadata.
 * System ontologies populate the full set; user-created ontologies
 * may omit UI fields (the client infers defaults from entityClass).
 */
export const SchemaDefinitionSchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:Schema'),
  version: z.string(),
  fields: z.array(PropertyValueSpecificationSchema),
  // Tier & inheritance
  tier: OntologyTierSchema.optional(),
  subClassOf: z.string().optional(),
  // Entity classification
  entityClass: EntityClassSchema.optional(),
  // UI metadata
  label: z.string().optional(),
  labelPlural: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  // Projections
  projections: z.array(z.string()).optional(),
  defaultProjection: z.string().optional(),
  // Dialog / panels
  dialogShell: z.string().optional(),
  panels: PanelConfigSchema.optional(),
  // Property field IDs (ordered list referencing field names)
  propertyFieldIds: z.array(z.string()).optional(),
  // Sort & search
  defaultSortField: z.string().optional(),
  searchFields: z.array(z.string()).optional(),
});

export type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>;

/**
 * Projection definition
 */
export const ProjectionDefinitionSchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:Projection'),
  name: z.string(),
  type: z.string(), // Projection type ID (table, kanban, calendar, etc.)
  query: z.string().optional(), // EQL-S or Datalog
  icon: z.string().optional(),
  component: z.string().optional(),
  order: z.number().optional(),
  status: z.string().optional(),
  requirements: z.object({
    schema: z.object({
      fieldTypes: z.array(z.string()),
    }).optional(),
  }).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

/**
 * Route definition (server-side)
 */
export const RouteDefinitionSchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:Route'),
  routePath: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  tint: z.string().optional(),
  order: z.number().optional(),
  inRail: z.boolean().optional(),
  railPosition: z.enum(['primary', 'secondary']).optional(),
  collapseSidebar: z.boolean().optional(),
  requiresAuth: z.boolean().optional(),
  inCommandPalette: z.boolean().optional(),
  searchKeywords: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.any()).optional(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    subtitle: z.string().optional(),
    showBackButton: z.boolean().optional(),
    fullWidth: z.boolean().optional(),
  }).optional(),
  sidebarSections: z.array(z.any()).optional(),
  children: z.array(z.any()).optional(),
  editable: z.boolean().optional(),
  tabs: z.array(z.any()).optional(),
  entityType: z.string().optional(),
  pageVariant: z.string().optional(),
  projectionTypes: z.array(z.string()).optional(),
});

export type RouteDefinition = z.infer<typeof RouteDefinitionSchema>;

/**
 * App-level metadata
 */
export const AppDefinitionSchema = z.object({
  '@id': z.string(),
  '@type': z.literal('trellis:App'),
  title: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  devPort: z.number().optional(),
});

export type AppDefinition = z.infer<typeof AppDefinitionSchema>;

export type ProjectionDefinition = z.infer<typeof ProjectionDefinitionSchema>;

/**
 * Full .trellis Workspace Configuration
 */
export const WorkspaceConfigSchema = z.object({
  workspace: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    ontologies: z.record(z.string(), SchemaDefinitionSchema).optional(),
    graph: z
      .object({
        nodes: z.array(z.any()).optional(),
        edges: z.array(z.any()).optional(),
      })
      .optional(),
    projections: z.record(z.string(), ProjectionDefinitionSchema).optional(),
    routes: z.record(z.string(), RouteDefinitionSchema).optional(),
    app: AppDefinitionSchema.optional(),
  }),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
