#!/usr/bin/env node

/**
 * Publish the curated public slice of the local campus graph to the
 * campus-commons room (WU-REMOTE-MCP-000 M2).
 *
 *   node scripts/publish-to-room.mjs           # dry run — prints manifest
 *   node scripts/publish-to-room.mjs --apply   # seed + publish for real
 *
 * Policy (D3/D4):
 *   - Only entities in ALLOWED_ZONES (Lobby, Showroom) ever leave the laptop.
 *   - Backstage/derived fields are redacted (DROP_FIELDS).
 *   - Every published entity carries provenance (sourceGraph/sourceId) and
 *     every room write carries lane attribution (X-Trellis-Lane).
 *   - Idempotent: get_node → update_node | create_node; safe to re-run.
 *
 * Reads room URL + API key from .trellis-db.json (repo root, gitignored).
 * Local graph must be running (just dev → localhost:$TRELLIS_PORT).
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')

const LANE = 'agent:claude'
const LOCAL = `http://localhost:${process.env.TRELLIS_PORT || '1414'}/api/graph`

const ALLOWED_ZONES = new Set([
  'entity:founder-facility-lobby',
  'entity:founder-facility-showroom',
])

// Substrate entities copied verbatim during seed (schema vocabulary in the room)
const SEED_IDS = [
  'entity:founder-facility',
  'entity:founder-facility-lobby',
  'entity:founder-facility-showroom',
]

// Backstage / derived / sensitive fields that never leave the laptop
const DROP_FIELDS = new Set([
  'speakerNotes',
  'embedding',
  'embeddingModel',
  'embeddingHash',
  'aiScannedAt',
  'aiLabels',
  'aiSuggestions',
  'aiSuggestedTags',
  'aiTypeProposals',
  'credentialsRef',
  'token',
  'actions',
])

const GREETER = {
  entityId: 'entity:commons-lobby-readme',
  type: 'note',
  data: {
    title: 'START HERE — About Campus Commons',
    pinned: true,
    tags: ['readme', 'lobby'],
    zoneId: 'entity:founder-facility-lobby',
    facilityId: 'entity:founder-facility',
    sourceGraph: 'seed',
    publishedBy: LANE,
    content: [
      '<h2>Welcome to Campus Commons</h2>',
      '<p>This room is the <strong>curated public slice</strong> of a Trellis',
      'Facility — the Lobby and Showroom zones only. It is <em>not</em> the',
      "owner's personal graph; that graph is local-first and never leaves",
      'their device. Content appears here when the owner publishes it.</p>',
      '<h3>Orientation for agents</h3>',
      '<ul>',
      '<li><code>get_graph_summary</code> — room overview (you likely already ran it)</li>',
      '<li><code>query_graph</code> — room EQL-S: <code>find ?e where type = "note"</code> or full <code>SELECT ?e WHERE { [?e "type" "zone"] }</code> (not the local <code>FIND entity AS … RETURN</code> form)</li>',
      '<li>Published entities carry <code>sourceGraph: campus-local</code> and <code>sourceId</code> provenance.</li>',
      '</ul>',
      '<h3>Zones</h3>',
      '<p><strong>Lobby</strong> — notices like this one. <strong>Showroom</strong> —',
      'published artifacts (decks, pages, demos, roadmap board). Both are public-read.</p>',
      '<h3>Roadmap board (Showroom)</h3>',
      '<p>A curated <strong>Issue</strong> board lives in Showroom — titles and statuses',
      'only, not the owner\'s private backlog. Query it after <code>get_graph_summary</code>:</p>',
      '<pre>find ?i where type = "Issue"</pre>',
      '<p>Group by <code>status</code>: backlog → queue → in_progress → closed.</p>',
      '<p>YC demo: <em>What\'s shipping for launch?</em> — pair with the Showroom deck query.</p>',
      '<h3>Write policy</h3>',
      '<p>Treat this room as world-readable. Writes must carry lane attribution',
      '(<code>X-Trellis-Lane</code> header or <code>lane</code> argument, e.g.',
      '<code>agent:claude-web</code>) and an explicit <code>zoneId</code> within',
      'Lobby/Showroom. All ops are append-only and auditable.</p>',
    ].join('\n'),
  },
}

// ── Local graph (read-only) ──────────────────────────────────────────────

async function local(path, options) {
  const res = await fetch(`${LOCAL}/${path}`, {
    method: options?.method || 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) throw new Error(`local ${path}: [${res.status}] ${await res.text()}`)
  return res.json()
}

async function localZoneIds(zoneId) {
  const { data } = await local('query', {
    method: 'POST',
    body: { query: `FIND entity AS ?e WHERE ?e.zoneId = "${zoneId}" RETURN ?e` },
  })
  return (data || []).map((row) => row['?e'])
}

async function localNodes(ids) {
  const { nodes } = await local('nodes', { method: 'POST', body: { ids } })
  return nodes || []
}

// ── Room MCP client (Streamable HTTP, zero deps) ─────────────────────────

class RoomMcp {
  constructor({ url, apiKey }) {
    this.endpoint = `${url.replace(/\/$/, '')}/trellis/mcp`
    this.apiKey = apiKey
    this.sessionId = null
    this.nextId = 1
  }

  async #post(payload) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${this.apiKey}`,
      'X-Trellis-Lane': LANE,
    }
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId
    const res = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(payload) })
    const sid = res.headers.get('mcp-session-id')
    if (sid) this.sessionId = sid
    const text = await res.text()
    if (!res.ok) throw new Error(`room mcp: [${res.status}] ${text.slice(0, 300)}`)
    return text
  }

  #parse(text) {
    // Streamable HTTP responses arrive as SSE frames or bare JSON
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) return JSON.parse(line.slice(6))
    }
    return text.trim() ? JSON.parse(text) : null
  }

  async connect() {
    const initText = await this.#post({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'publish-to-room', version: '1.0' },
      },
    })
    const init = this.#parse(initText)
    if (init?.error) throw new Error(`initialize failed: ${JSON.stringify(init.error)}`)
    await this.#post({ jsonrpc: '2.0', method: 'notifications/initialized' })
  }

  /** Returns the parsed tool result content, or throws with the tool error. */
  async call(name, args) {
    const text = await this.#post({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    })
    const msg = this.#parse(text)
    if (msg?.error) throw new Error(`${name}: ${JSON.stringify(msg.error)}`)
    const content = msg?.result?.content?.[0]?.text
    if (msg?.result?.isError) throw new Error(`${name}: ${content?.slice(0, 300)}`)
    if (typeof content === 'string' && /statement closed|authentication required/i.test(content)) {
      throw new Error(`${name}: ${content.slice(0, 300)}`)
    }
    try {
      return content ? JSON.parse(content) : null
    } catch {
      return content
    }
  }
}

// ── Publish pipeline ─────────────────────────────────────────────────────

function redact(node) {
  const data = {}
  const dropped = []
  for (const [key, value] of Object.entries(node)) {
    if (key === '@id' || key === '@type' || key === '_links') continue
    if (DROP_FIELDS.has(key)) {
      dropped.push(key)
      continue
    }
    data[key] = value
  }
  return { data, dropped }
}

function loadVcsBoardManifest() {
  const path = resolve(repoRoot, 'scripts/vcs-board-manifest.json')
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function publishVcsBoard(room, manifest) {
  const board = loadVcsBoardManifest()
  const zoneId = board.zoneId || 'entity:founder-facility-showroom'
  const facilityId = board.facilityId || 'entity:founder-facility'
  if (!ALLOWED_ZONES.has(zoneId)) {
    throw new Error(`vcs-board zoneId ${zoneId} not in ALLOWED_ZONES`)
  }

  for (const issue of board.issues) {
    const entityId = issue.id
    const data = {
      title: issue.title,
      status: issue.status,
      labels: issue.labels,
      zoneId,
      facilityId,
      sourceGraph: 'vcs-board-manifest',
      sourceId: entityId,
      publishedBy: LANE,
      publishedAt: new Date().toISOString(),
    }
    if (issue.assignee) data.assignee = issue.assignee
    if (issue.priority) data.priority = issue.priority
    await upsert(room, entityId, 'Issue', data, manifest, 'vcs-board')
  }
}

async function upsert(room, entityId, type, data, manifest, kind) {
  let action = 'create'
  try {
    const existing = await room.call('get_node', { id: entityId })
    if (existing && typeof existing === 'object' && existing.id) action = 'update'
  } catch {
    action = 'create'
  }
  manifest.push({ kind, entityId, type, title: data.title, action })
  if (!APPLY) return
  const writeArgs = { id: entityId, type, attributes: data, lane: LANE }
  if (action === 'update') {
    await room.call('update_node', { id: entityId, attributes: data, lane: LANE })
  } else {
    await room.call('create_node', writeArgs)
  }
}

async function main() {
  const config = JSON.parse(readFileSync(resolve(repoRoot, '.trellis-db.json'), 'utf8'))
  const room = new RoomMcp(config)
  await room.connect()
  console.log(`room:  ${config.url} (${APPLY ? 'APPLY' : 'dry run'})`)
  console.log(`local: ${LOCAL}\n`)

  const manifest = []

  // 1. Seed — substrate entities (facility + public zones), verbatim copy
  const seedNodes = await localNodes(SEED_IDS)
  for (const node of seedNodes) {
    const entityId = node['@id']
    const { data } = redact(node)
    data.sourceGraph = 'campus-local'
    data.sourceId = entityId
    data.publishedBy = LANE
    data.publishedAt = new Date().toISOString()
    await upsert(room, entityId, node['@type'], data, manifest, 'seed')
  }

  // 2. Greeter — Lobby readme for arriving agents
  await upsert(room, GREETER.entityId, GREETER.type, GREETER.data, manifest, 'seed')

  // 3. Content — every entity in an allowed zone, redacted, with provenance
  const publishedIds = new Set()
  const localById = new Map()
  for (const zoneId of ALLOWED_ZONES) {
    const ids = await localZoneIds(zoneId)
    if (ids.length === 0) continue
    const nodes = await localNodes(ids)
    for (const node of nodes) {
      const entityId = node['@id']
      // Belt and suspenders: never publish outside the allowlist even if the
      // query over-returns.
      if (!ALLOWED_ZONES.has(node.zoneId)) {
        console.warn(`  SKIP ${entityId} — zoneId ${node.zoneId} not in allowlist`)
        continue
      }
      const { data, dropped } = redact(node)
      data.sourceGraph = 'campus-local'
      data.sourceId = entityId
      data.publishedBy = LANE
      data.publishedAt = new Date().toISOString()
      await upsert(room, entityId, node['@type'], data, manifest, 'content')
      if (dropped.length) manifest[manifest.length - 1].redacted = dropped
      publishedIds.add(entityId)
      localById.set(entityId, node)
    }
  }

  // 4. VCS board — curated Issue entities for remote MCP roadmap demo (M2.5)
  await publishVcsBoard(room, manifest)

  // 5. Links — only between entities that are both in the room
  let linkCount = 0
  for (const [entityId, node] of localById) {
    for (const link of node._links?.outgoing || []) {
      if (!publishedIds.has(link.target)) continue
      linkCount++
      if (!APPLY) continue
      try {
        await room.call('link_nodes', { e1: entityId, relation: link.relation, e2: link.target, lane: LANE })
      } catch (err) {
        console.warn(`  link ${entityId} -[${link.relation}]-> ${link.target}: ${err.message}`)
      }
    }
  }

  // ── Manifest ──
  for (const entry of manifest) {
    const redactedNote = entry.redacted ? `  (redacted: ${entry.redacted.join(', ')})` : ''
    console.log(
      `${entry.action.padEnd(6)} [${entry.kind}] ${entry.entityId}  ${entry.type} — ${entry.title ?? ''}${redactedNote}`,
    )
  }
  const vcsCount = manifest.filter((e) => e.kind === 'vcs-board').length
  console.log(
    `\n${manifest.length} entities (${vcsCount} vcs-board), ${linkCount} internal links${APPLY ? '' : ' (dry run — nothing written; use --apply)'}`,
  )
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
