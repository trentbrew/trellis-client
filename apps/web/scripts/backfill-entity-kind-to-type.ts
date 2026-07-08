#!/usr/bin/env bun
/**
 * Chat entityKind → data.type normalization (Option B — one-time backfill).
 *
 * Usage:
 *   bun apps/web/scripts/backfill-entity-kind-to-type.ts --dry-run
 *   bun apps/web/scripts/backfill-entity-kind-to-type.ts --agent-id cursor
 *
 * Finds entities with entityKind but missing/wrong type, stamps data.type = entityKind.
 * Transition period: new channel/message writes should stamp both fields (see spec).
 */
function parseArgs(argv: string[]) {
  const args = { dryRun: false, agentId: 'migration', kinds: ['channel', 'message'] as string[] }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--agent-id') args.agentId = argv[++i] ?? 'migration'
    else if (a === '--kinds') args.kinds = (argv[++i] ?? '').split(',').filter(Boolean)
  }
  return args
}

type GraphRow = Record<string, unknown>

async function queryGraph(base: string, query: string): Promise<GraphRow[]> {
  const res = await fetch(`${base}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { results?: GraphRow[]; data?: GraphRow[] }
  return json.results ?? json.data ?? []
}

async function main() {
  const { dryRun, agentId, kinds } = parseArgs(process.argv)
  const port = process.env.TRELLIS_PORT || '1414'
  const base = `http://localhost:${port}/api/graph`

  const manifest: Array<{ entityId: string; entityKind: string; previousType?: unknown; status: string }> = []

  for (const kind of kinds) {
    const rows = await queryGraph(base, `FIND entity AS ?e WHERE ?e.entityKind = "${kind}"`)
    console.log(`[scan] entityKind=${kind} count=${rows.length}`)

    for (const row of rows) {
      const entityId = String(row['?e'] ?? row.id ?? row['@id'] ?? '')
      if (!entityId) continue

      const nodeRes = await fetch(`${base}/node/${encodeURIComponent(entityId)}`)
      if (!nodeRes.ok) {
        manifest.push({ entityId, entityKind: kind, status: `error: get ${nodeRes.status}` })
        continue
      }
      const node = (await nodeRes.json()) as { data?: Record<string, unknown> }
      const data = node.data ?? {}
      const currentType = data.type

      if (currentType === kind) {
        manifest.push({ entityId, entityKind: kind, previousType: currentType, status: 'skipped: already typed' })
        continue
      }

      if (dryRun) {
        manifest.push({ entityId, entityKind: kind, previousType: currentType, status: 'dry-run' })
        continue
      }

      try {
        const res = await fetch(`${base}/mutate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateNode',
            entityId,
            type: 'entity',
            data: { type: kind },
            agentId,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        manifest.push({ entityId, entityKind: kind, previousType: currentType, status: 'updated' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        manifest.push({ entityId, entityKind: kind, previousType: currentType, status: `error: ${msg}` })
      }
    }
  }

  console.log(JSON.stringify({ manifest, summary: manifest.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
