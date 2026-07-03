/**
 * Idempotent entity importer for the TQL graph.
 *
 * Reads a JSON seed file shaped like:
 *   {
 *     "version": 1,
 *     "agentId": "agent:founder",
 *     "facilityId": "...",
 *     "zoneId": "...",
 *     "nodes": [{ "id": "entity:...", "data": { "type": "...", ... } }, ...],
 *     "links": [{ "e1": "entity:...", "relation": "...", "e2": "entity:..." }, ...]
 *   }
 *
 * Behavior:
 *   - For each node: getNode → if missing, createNode; if present, skip (or update with --update).
 *   - For each link: best-effort create; failures are reported but don't abort the run.
 *
 * Usage:
 *   node packages/trellis-cli/scripts/import-entities.mjs <file.json> [--update] [--dry-run]
 *
 * Requires: dev server reachable at $TRELLIS_API_URL or http://localhost:$TRELLIS_PORT.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { TrellisClient } from '../src/client.mjs'

const args = process.argv.slice(2)
const filePathArg = args.find((a) => !a.startsWith('--'))
const update = args.includes('--update')
const dryRun = args.includes('--dry-run')

if (!filePathArg) {
  console.error('Usage: node scripts/import-entities.mjs <file.json> [--update] [--dry-run]')
  process.exit(1)
}

const filePath = resolve(process.cwd(), filePathArg)

let payload
try {
  const raw = await readFile(filePath, 'utf8')
  payload = JSON.parse(raw)
} catch (err) {
  console.error(`Error reading ${filePath}:`, err.message)
  process.exit(1)
}

const { agentId, nodes = [], links = [] } = payload

const client = new TrellisClient({ agentId: agentId || 'cli' })
const baseUrl = `http://localhost:${process.env.TRELLIS_PORT || '1414'}`

console.log(`Importing from ${filePath}`)
console.log(`  agent: ${agentId || '(default)'}`)
console.log(`  nodes: ${nodes.length}  links: ${links.length}`)
if (dryRun) console.log('  [dry-run] no mutations will be sent')
console.log()

if (!dryRun) {
  try {
    const h = await client.health()
    console.log(`Server healthy — ${h.factCount} facts, ${h.linkCount} links`)
    console.log()
  } catch (err) {
    console.error(`Error: server not reachable at ${baseUrl} (${err.message})`)
    process.exit(1)
  }
}

let created = 0
let updated = 0
let skipped = 0
let nodeFailed = 0

console.log('── Nodes ──')
for (const node of nodes) {
  if (!node?.id || !node?.data) {
    console.warn(`  ✗  malformed node entry, skipping: ${JSON.stringify(node).slice(0, 80)}`)
    nodeFailed++
    continue
  }

  const label = node.data.title || node.id

  if (dryRun) {
    console.log(`  …  ${label}  (${node.id})`)
    continue
  }

  let exists = false
  try {
    await client.getNode(node.id)
    exists = true
  } catch {
    exists = false
  }

  try {
    if (!exists) {
      const result = await client.createNode(node.id, 'entity', node.data)
      if (result?.ok) {
        console.log(`  ✓  ${label}`)
        created++
      } else {
        console.error(`  ✗  ${label}  (createNode returned not-ok)`)
        nodeFailed++
      }
    } else if (update) {
      const result = await client.updateNode(node.id, 'entity', node.data)
      if (result?.ok) {
        console.log(`  ↻  ${label}`)
        updated++
      } else {
        console.error(`  ✗  ${label}  (updateNode returned not-ok)`)
        nodeFailed++
      }
    } else {
      console.log(`  ⏭  ${label}  (already exists; pass --update to overwrite)`)
      skipped++
    }
  } catch (err) {
    console.error(`  ✗  ${label}  (${err.message})`)
    nodeFailed++
  }
}

console.log(`  → ${created} created, ${updated} updated, ${skipped} skipped, ${nodeFailed} failed`)
console.log()

let linked = 0
let linkFailed = 0

console.log('── Links ──')
for (const link of links) {
  if (!link?.e1 || !link?.relation || !link?.e2) {
    console.warn(`  ✗  malformed link entry, skipping: ${JSON.stringify(link).slice(0, 80)}`)
    linkFailed++
    continue
  }

  const label = `${link.e1} —[${link.relation}]→ ${link.e2}`

  if (dryRun) {
    console.log(`  …  ${label}`)
    continue
  }

  try {
    const result = await client.link(link.e1, link.relation, link.e2)
    if (result?.ok) {
      console.log(`  ✓  ${label}`)
      linked++
    } else {
      console.error(`  ✗  ${label}  (link returned not-ok)`)
      linkFailed++
    }
  } catch (err) {
    console.error(`  ✗  ${label}  (${err.message})`)
    linkFailed++
  }
}

console.log(`  → ${linked} linked, ${linkFailed} failed`)
console.log()

const exitCode = nodeFailed + linkFailed > 0 ? 1 : 0
console.log(exitCode === 0 ? '✓ Import complete.' : '⚠ Import finished with errors.')
process.exit(exitCode)
