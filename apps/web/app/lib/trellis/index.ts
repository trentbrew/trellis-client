// Schema definitions and types
export {
  // Version constants
  TRELLIS_SCHEMA_VERSION,
  SUPPORTED_VERSIONS,
  TRELLIS_MIME_TYPE,
  // Zod schemas
  ContextSchema,
  ImportSchema,
  UserRefSchema,
  MetadataSchema,
  BlockSchema,
  ContentDocumentSchema,
  OntologyFieldSchema,
  OntologySchema,
  NodeSchema,
  EdgeSchema,
  ProjectionSchema,
  WorkflowSchema,
  CollectionNodeSchema,
  GraphSchema,
  TrellisDocumentSchema,
  LegacyTrellisDocumentSchema,
  FlexibleTrellisDocumentSchema,
  // Field value types
  FieldValueTypes,
  ProjectionTypes,
  WorkflowTriggers,
  // Types
  type TrellisVersion,
  type FieldValueType,
  type ProjectionType,
  type WorkflowTrigger,
  type TrellisDocument,
  type LegacyTrellisDocument,
  type TrellisGraph,
  type TrellisNode,
  type TrellisEdge,
  type TrellisOntology,
  type TrellisProjection,
  type TrellisWorkflow,
  type TrellisMetadata,
  type TrellisImport,
  type TrellisContext,
  type TrellisOntologyField,
} from './schema'

// Validation utilities
export {
  validateTrellisDocument,
  validateTrellisDocumentSafe,
  validateFlexibleDocument,
  isTrellisDocument,
  looksLikeTrellisDocument,
  getTrellisDocumentVersion,
  needsMigration,
  TrellisValidationError,
  type ValidationIssue,
} from './validate'

// Scaffold generators
export {
  createDefaultContext,
  createBlankGraph,
  createExampleGraph,
  createCollectionGraph,
  serializeTrellisDocument,
  parseTrellisDocument,
  type ScaffoldOptions,
} from './scaffold'

// Migrations
export { migrateToLatest, canMigrate, getMigrationInfo, type Migration } from './migrations'

// JSON Schema generation (optional - requires zod-to-json-schema)
export { generateJsonSchema, getJsonSchemaString } from './json-schema'
