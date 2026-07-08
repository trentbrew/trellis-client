#!/usr/bin/env bun
/**
 * Phase 3d-1: Migrate InstantDB collection JSON-LD records → TQL graph entities.
 *
 * Usage:
 *   bun apps/web/scripts/migrate-collection-records-to-graph.ts --input ./collection.json --dry-run
 *   bun apps/web/scripts/migrate-collection-records-to-graph.ts --input ./collection.json --agent-id cursor
 *
 * Input JSON:
 *   { "id": "<collectionId>", "slug": "recipes", "content": "<json-ld string>", "schema": { ... } }
 *
 * Writes manifest to `.agent/migrations/collection-{id}.json`.
 * Does NOT set migratedToGraph — human sets cutover flag after verification.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { planCollectionRecordMigration } from '../app/lib/collection-graph-migration'

type CollectionExport = {
  id: string
  slug: string
  content?: string
  schema?: unknown
}

function parseArgs(argv: string[]) {
  const args = { input: '', dryRun: false, agentId: 'migration', collectionId: '' }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--input') args.input = argv[++i] ?? ''
    else if (a === '--agent-id') args.agentId = argv[++i] ?? 'migration'
    else if (a === '--collection-id') args.collectionId = argv[++i] ?? ''
  }
  return args
}

async function main() {
  const { input, dryRun, agentId, collectionId: filterId } = parseArgs(process.argv)
  if (!input) {
    console.error(
      'Usage: --input <collection.json> [--collection-id id] [--dry-run] [--agent-id name]',
    )
    process.exit(1)
  }

  const port = process.env.TRELLIS_PORT || '1414'
  const base = `http://localhost:${port}/api/graph`
  const raw = readFileSync(resolve(input), 'utf8')
  const payload = JSON.parse(raw) as CollectionExport | CollectionExport[]

  const items = Array.isArray(payload) ? payload : [payload]
  const selected = filterId ? items.filter((item) => item.id === filterId) : items

  if (!selected.length) {
    console.error('No collection matched input/filter.')
    process.exit(1)
  }

  for (const item of selected) {
    if (!item.id || !item.slug) {
      console.error('Each collection export requires id and slug.')
      process.exit(1)
    }

    const plan = planCollectionRecordMigration({
      collectionId: item.id,
      slug: item.slug,
      content: String(item.content ?? ''),
      schema: (item.schema as any) ?? null,
    })

    const manifest = {
      collectionId: plan.collectionId,
      slug: plan.slug,
      migratedAt: null as string | null,
      records: plan.records.map((r) => ({
        jsonLdId: r.jsonLdId,
        entityId: r.entityId,
        status: dryRun ? 'dry-run' : 'pending',
      })),
    }

    console.log(`[${dryRun ? 'dry-run' : 'live'}] collection=${plan.collectionId} slug=${plan.slug} records=${plan.records.length}`)
    if (plan.records[0]) {
      console.log(' sample entity:', plan.records[0].entityId, JSON.stringify(plan.records[0].data))
    }

    if (!dryRun) {
      for (const record of plan.records) {
        try {
          const res = await fetch(`${base}/mutate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createNode',
              entityId: record.entityId,
              type: 'entity',
              data: record.data,
              agentId,
            }),
          })
          if (!res.ok) throw new Error(await res.text())
          const entry = manifest.records.find((m) => m.entityId === record.entityId)
          if (entry) entry.status = 'created'
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          const entry = manifest.records.find((m) => m.entityId === record.entityId)
          if (entry) entry.status = `error: ${msg}`
        }
      }
      manifest.migratedAt = new Date().toISOString()
    }

    const outPath = resolve(`.agent/migrations/collection-${plan.collectionId}.json`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(manifest, null, 2))
    console.log('manifest:', outPath)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
