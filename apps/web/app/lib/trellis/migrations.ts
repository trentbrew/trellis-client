import { TRELLIS_SCHEMA_VERSION, type TrellisDocument } from './schema'
import { createDefaultContext } from './scaffold'

export interface Migration {
  from: string
  to: string
  migrate: (data: any) => TrellisDocument
}

/**
 * Migrate from v1.0 (legacy @graph format) to v2.0
 */
const v1_to_v2: Migration = {
  from: '1.0',
  to: '2.0',

  migrate(data: any): TrellisDocument {
    const now = new Date().toISOString()

    // Extract existing context or create default
    const existingContext = data['@context'] || {}
    const userNs = existingContext[''] || 'tag:user:default,2025:'

    // Extract nodes from @graph or graph.nodes
    let nodes: any[] = []
    if (Array.isArray(data['@graph'])) {
      nodes = data['@graph']
    } else if (data.graph?.nodes && Array.isArray(data.graph.nodes)) {
      nodes = data.graph.nodes
    }

    // Separate ontologies from regular nodes
    const ontologies: Record<string, any> = {}
    const regularNodes: any[] = []

    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue

      const nodeType = node['@type'] || node.type

      // PropertyValueSpecification nodes become ontologies
      if (nodeType === 'trellis:PropertyValueSpecification') {
        const id = node['@id'] || node.id || `ontology:${crypto.randomUUID()}`
        ontologies[id] = {
          '@id': id,
          '@type': 'trellis:Ontology',
          name: node.name || 'Untitled Schema',
          description: node.description,
          version: node.version,
          icon: node.icon,
          color: node.color,
          fields: (node.fields || []).map((f: any) => ({
            '@id': f['@id'],
            '@type': f['@type'],
            name: f.name,
            valueType: f.valueType || 'text',
            required: f.required,
            description: f.description,
            selectOptions: f.selectOptions,
            statusOptions: f.statusOptions,
            format: f.format,
            formula: f.formula,
            formulaReturnType: f.formulaReturnType,
          })),
        }
      } else {
        // Migrate node naming: trellis:title -> name, trellis:description -> description
        const migratedNode = { ...node }

        // Migrate title/description if not already present
        if (node['trellis:title'] && !node.name) {
          migratedNode.name = node['trellis:title']
        }
        if (node['trellis:description'] && !node.description) {
          migratedNode.description = node['trellis:description']
        }

        regularNodes.push(migratedNode)
      }
    }

    // Build the v2.0 document
    const migrated: TrellisDocument = {
      $schema: `https://trellis.app/schemas/graph/v${TRELLIS_SCHEMA_VERSION}.json`,
      '@context': createDefaultContext(userNs),

      version: '2.0',
      created: data.created || now,
      modified: now,

      imports: data.imports || [],

      graph: {
        ontologies,
        nodes: regularNodes,
        edges: data.graph?.edges || [],
        projections: data.graph?.projections || {},
        workflows: data.graph?.workflows || {},
      },
    }

    return migrated
  },
}

const MIGRATIONS: Migration[] = [v1_to_v2]

/**
 * Get the chain of migrations needed to reach the target version
 */
function getMigrationChain(fromVersion: string, toVersion: string): Migration[] {
  const chain: Migration[] = []
  let current = fromVersion

  while (current !== toVersion) {
    const migration = MIGRATIONS.find((m) => m.from === current)
    if (!migration) {
      throw new Error(`No migration path from ${current} to ${toVersion}`)
    }
    chain.push(migration)
    current = migration.to
  }

  return chain
}

/**
 * Migrate a document to the latest version
 */
export function migrateToLatest(data: any): TrellisDocument {
  // Detect current version
  const currentVersion = data.version || '1.0'

  // Already at latest
  if (currentVersion === TRELLIS_SCHEMA_VERSION) {
    return data as TrellisDocument
  }

  // Get migration chain
  const chain = getMigrationChain(currentVersion, TRELLIS_SCHEMA_VERSION)

  // Apply migrations sequentially
  let current = data
  for (const migration of chain) {
    console.log(`[Trellis] Migrating from v${migration.from} to v${migration.to}...`)
    current = migration.migrate(current)
  }

  console.log(`[Trellis] Migration complete: v${TRELLIS_SCHEMA_VERSION}`)
  return current
}

/**
 * Check if a document can be migrated
 */
export function canMigrate(data: any): boolean {
  const version = data.version || '1.0'
  if (version === TRELLIS_SCHEMA_VERSION) return true

  try {
    getMigrationChain(version, TRELLIS_SCHEMA_VERSION)
    return true
  } catch {
    return false
  }
}

/**
 * Get migration info for a document
 */
export function getMigrationInfo(data: any): {
  currentVersion: string
  targetVersion: string
  needsMigration: boolean
  canMigrate: boolean
  migrationSteps: string[]
} {
  const currentVersion = data.version || '1.0'
  const needsMigration = currentVersion !== TRELLIS_SCHEMA_VERSION

  let migrationSteps: string[] = []
  let canMigrateDoc = true

  if (needsMigration) {
    try {
      const chain = getMigrationChain(currentVersion, TRELLIS_SCHEMA_VERSION)
      migrationSteps = chain.map((m) => `${m.from} → ${m.to}`)
    } catch {
      canMigrateDoc = false
    }
  }

  return {
    currentVersion,
    targetVersion: TRELLIS_SCHEMA_VERSION,
    needsMigration,
    canMigrate: canMigrateDoc,
    migrationSteps,
  }
}
