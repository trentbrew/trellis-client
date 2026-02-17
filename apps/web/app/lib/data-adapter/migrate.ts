/**
 * Data migration utilities for switching between local and cloud modes.
 *
 * - exportLocalData()  → JSON blob of all local adapter data
 * - importToAdapter()  → Push exported data into any DataAdapter
 *
 * Usage (export from local, import to cloud):
 *   const dump = await exportLocalData(localAdapter)
 *   await importToAdapter(cloudAdapter, dump)
 */

import type { DataAdapter } from './types'

export interface DataExport {
  version: 1
  exportedAt: string
  mode: string
  tables: Record<string, any[]>
}

const EXPORTABLE_TABLES = [
  'organizations',
  'applications',
  'collections',
  'settings',
  'members',
  'entities',
  'comments',
] as const

/**
 * Export all data from a DataAdapter as a portable JSON object.
 * Works with any adapter — queries each table and collects results.
 */
export async function exportAdapterData(adapter: DataAdapter): Promise<DataExport> {
  const tables: Record<string, any[]> = {}

  for (const table of EXPORTABLE_TABLES) {
    try {
      const result = await adapter.queryOnce({ [table]: {} })
      tables[table] = (result.data as any)?.[table] || []
    } catch {
      tables[table] = []
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    mode: adapter.mode,
    tables,
  }
}

/**
 * Import exported data into a DataAdapter.
 * Creates records that don't already exist (idempotent by ID).
 *
 * @param adapter  - Target adapter to import into
 * @param data     - Previously exported DataExport
 * @param options  - skipExisting: if true (default), skip records whose ID already exists
 */
export async function importToAdapter(
  adapter: DataAdapter,
  data: DataExport,
  options: { skipExisting?: boolean } = {},
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { skipExisting = true } = options
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const [table, records] of Object.entries(data.tables)) {
    if (!Array.isArray(records) || records.length === 0) continue

    // Query existing IDs to avoid duplicates
    let existingIds = new Set<string>()
    if (skipExisting) {
      try {
        const existing = await adapter.queryOnce({ [table]: {} })
        const existingRecords = (existing.data as any)?.[table] || []
        existingIds = new Set(existingRecords.map((r: any) => r.id))
      } catch {
        // If query fails, proceed without dedup
      }
    }

    for (const record of records) {
      const { id, ...fields } = record
      if (!id) continue

      if (existingIds.has(id)) {
        skipped++
        continue
      }

      try {
        await adapter.transact([
          adapter.tx[table][id].create(fields),
        ])
        imported++
      } catch (err: any) {
        errors.push(`${table}/${id}: ${err.message || String(err)}`)
      }
    }
  }

  return { imported, skipped, errors }
}

/**
 * Export a single ontology as a shareable JSON object.
 */
export async function exportOntology(
  adapter: DataAdapter,
  schemaId: string,
): Promise<Record<string, any> | null> {
  try {
    const result = await adapter.queryOnce({
      settings: {
        $: {
          where: {
            entityType: 'ontology',
            settingKey: `ontology:${schemaId}`,
          },
        },
      },
    })
    const settings = (result.data as any)?.settings || []
    return settings[0]?.value || null
  } catch {
    return null
  }
}

/**
 * Import an ontology JSON object into the adapter as a user ontology.
 */
export async function importOntology(
  adapter: DataAdapter,
  schema: Record<string, any>,
): Promise<string> {
  const schemaId = schema['@id']
  if (!schemaId) throw new Error('Schema must have an @id field')

  const settingKey = `ontology:${schemaId}`
  const user = await adapter.getAuth()
  const now = Date.now()
  const id = crypto.randomUUID()

  await adapter.transact([
    adapter.tx.settings[id].create({
      ownerId: user?.id || 'unknown',
      settingKey,
      entityType: 'ontology',
      entityId: schemaId,
      key: 'schema',
      value: { ...schema, tier: 'user' },
      updatedAt: now,
    }),
  ])

  return schemaId
}
