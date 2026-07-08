#!/usr/bin/env bun
/**
 * One-time migration: InstantDB CustomType settings → user-tier TQL ontologies.
 *
 * Usage:
 *   bun apps/web/scripts/migrate-custom-types-to-ontologies.ts --input ./custom-types.json --dry-run
 *   bun apps/web/scripts/migrate-custom-types-to-ontologies.ts --input ./custom-types.json --agent-id cursor
 *
 * Input JSON: array of CustomType objects (from app settings key `app:{appId}:customTypes`).
 * Does NOT delete source settings — review manifest and remove manually after verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeOntologySlug, validateOntologySlug } from '../app/lib/ontology-reserved-keys'

type LegacyField = {
  id: string
  name: string
  type: string
  required?: boolean
  order?: number
  config?: Record<string, unknown>
}

type LegacyCustomType = {
  id: string
  appId?: string
  name: string
  description?: string
  icon?: string
  fields?: LegacyField[]
}

const ONTOLOGY_FIELD_MAP: Record<string, string> = {
  text: 'rich_text',
  number: 'number',
  select: 'select',
  multiselect: 'multi_select',
  date: 'date',
  checkbox: 'checkbox',
  url: 'url',
  email: 'email',
  file: 'files',
  relation: 'relation',
  formula: 'formula',
}

function parseArgs(argv: string[]) {
  const args = { input: '', dryRun: false, agentId: 'migration' }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--input') args.input = argv[++i] ?? ''
    else if (a === '--agent-id') args.agentId = argv[++i] ?? 'migration'
  }
  return args
}

function mapFields(fields: LegacyField[] | undefined) {
  const mapped = (fields ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f) => ({
      name: f.name,
      valueType: ONTOLOGY_FIELD_MAP[f.type] ?? 'rich_text',
      required: f.required ?? false,
    }))

  if (!mapped.some((f) => f.valueType === 'title')) {
    mapped.unshift({ name: 'title', valueType: 'title', required: true })
  }
  return mapped
}

async function main() {
  const { input, dryRun, agentId } = parseArgs(process.argv)
  if (!input) {
    console.error('Usage: --input <custom-types.json> [--dry-run] [--agent-id name]')
    process.exit(1)
  }

  const port = process.env.TRELLIS_PORT || '1414'
  const base = `http://localhost:${port}/api/graph`
  const raw = readFileSync(resolve(input), 'utf8')
  const items = JSON.parse(raw) as LegacyCustomType[]

  const manifest: Array<{ legacyId: string; slug: string; schemaId: string; status: string }> = []

  for (const item of items) {
    const slug = normalizeOntologySlug(item.name)
    const slugError = validateOntologySlug(item.name)
    const schemaId = `trellis:schema/${slug}`

    if (slugError) {
      manifest.push({ legacyId: item.id, slug, schemaId, status: `skipped: ${slugError}` })
      continue
    }

    const body = {
      '@id': schemaId,
      '@type': 'trellis:Schema',
      version: '1.0.0',
      label: item.name,
      tier: 'user',
      icon: item.icon || 'lucide:database',
      browse: { enabled: true },
      fields: mapFields(item.fields),
    }

    if (dryRun) {
      manifest.push({ legacyId: item.id, slug, schemaId, status: 'dry-run' })
      console.log('[dry-run]', schemaId, JSON.stringify(body.fields.map((f) => f.name)))
      continue
    }

    try {
      await fetch(`${base}/ontology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: body, agentId }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
      })
      manifest.push({ legacyId: item.id, slug, schemaId, status: 'created' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      manifest.push({ legacyId: item.id, slug, schemaId, status: `error: ${msg}` })
    }
  }

  console.log(JSON.stringify({ manifest }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
