import { TRELLIS_SCHEMA_VERSION } from './schema'

/**
 * Generate JSON Schema from Zod schema
 * Useful for:
 * - VSCode autocomplete in .trellis files
 * - Schema validation in editors
 * - Documentation generation
 *
 * Note: Requires `zod-to-json-schema` package to be installed
 * Run: pnpm add -D zod-to-json-schema
 */
export async function generateJsonSchema() {
  try {
    const { zodToJsonSchema } = await import('@alcyone-labs/zod-to-json-schema')
    const { TrellisDocumentSchema } = await import('./schema')

    const jsonSchema = zodToJsonSchema(TrellisDocumentSchema, {
      name: 'TrellisDocument',
      $refStrategy: 'none',
    })

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `https://trellis.app/schemas/graph/v${TRELLIS_SCHEMA_VERSION}.json`,
      title: 'Trellis Document',
      description: `Trellis graph document schema v${TRELLIS_SCHEMA_VERSION}`,
      ...jsonSchema,
    }
  } catch {
    throw new Error('@alcyone-labs/zod-to-json-schema is required to generate JSON Schema')
  }
}

/**
 * Get JSON Schema as formatted string
 */
export async function getJsonSchemaString(pretty = true): Promise<string> {
  const schema = await generateJsonSchema()
  return JSON.stringify(schema, null, pretty ? 2 : undefined)
}
