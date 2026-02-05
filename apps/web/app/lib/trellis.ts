// Re-export everything from the new modular structure
export * from './trellis/index'

// Legacy alias for backwards compatibility
export { createDefaultContext as createDefaultTrellisContext } from './trellis/scaffold'

// Legacy schema aliases (for backwards compatibility with existing imports)
export {
  UserRefSchema as TrellisUserRefSchema,
  MetadataSchema as TrellisMetadataSchema,
  BlockSchema as TrellisBlockSchema,
  ContentDocumentSchema as TrellisContentDocumentSchema,
  OntologyFieldSchema as TrellisSchemaFieldSchema,
  OntologySchema as TrellisSchemaNodeSchema,
} from './trellis/schema'
