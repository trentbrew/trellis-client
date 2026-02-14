#!/usr/bin/env node

/**
 * trellis — CLI for agents and humans to CRUD the Trellis graph.
 *
 * Usage:
 *   trellis query <eqls>                         — Execute an EQL-S query
 *   trellis get <entityId>                        — Fetch a single node
 *   trellis create --type <type> --id <id> [--data '{}']  — Create a node
 *   trellis update <entityId> --type <type> --data '{}'   — Update a node
 *   trellis delete <entityId>                     — Delete a node
 *   trellis link <e1> <relation> <e2>             — Link two nodes
 *   trellis watch                                 — Stream mutation events (SSE)
 *   trellis health                                — Health check
 *   trellis schema                                — List ontologies
 *   trellis log                                   — Recent mutation log
 *
 * Environment:
 *   TRELLIS_API_URL   — Base URL (default: http://localhost:4141)
 *   TRELLIS_AGENT_ID  — Agent identifier (default: cli)
 *
 * Flags:
 *   --pretty          — Pretty-print JSON output
 *   --agent-id <name> — Override agent ID for this invocation
 *   --url <url>       — Override API base URL for this invocation
 */

// ── Argument parsing (zero-dep) ─────────────────────────────────────────

const args = process.argv.slice(2)

function flag(name) {
  const idx = args.indexOf(`--${name}`)
  if (idx === -1) return undefined
  const val = args[idx + 1]
  args.splice(idx, 2)
  return val
}

function hasFlag(name) {
  const idx = args.indexOf(`--${name}`)
  if (idx === -1) return false
  args.splice(idx, 1)
  return true
}

const pretty = hasFlag('pretty')
const agentId = flag('agent-id')
const baseUrl = flag('url')

const command = args[0]

// ── Output helpers ──────────────────────────────────────────────────────

function out(data) {
  if (pretty) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(JSON.stringify(data))
  }
}

function err(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

// ── Client setup ────────────────────────────────────────────────────────

const { TrellisClient } = await import('../src/client.mjs')
const client = new TrellisClient({ baseUrl, agentId })

// ── Commands ────────────────────────────────────────────────────────────

async function run() {
  switch (command) {
    // ── query ─────────────────────────────────────────────────────────
    case 'query':
    case 'q': {
      const eqls = args.slice(1).join(' ')
      if (!eqls) err('Usage: trellis query <eqls-string>')
      const result = await client.query(eqls)
      out(result)
      break
    }

    // ── get ───────────────────────────────────────────────────────────
    case 'get':
    case 'g': {
      const entityId = args[1]
      if (!entityId) err('Usage: trellis get <entityId>')
      const result = await client.getNode(entityId)
      out(result)
      break
    }

    // ── create ────────────────────────────────────────────────────────
    case 'create':
    case 'c': {
      const type = flag('type')
      const id = flag('id')
      const dataStr = flag('data')
      if (!type || !id) err('Usage: trellis create --type <type> --id <entityId> [--data \'{"key":"val"}\']')
      let data = {}
      if (dataStr) {
        try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
      }
      const result = await client.createNode(id, type, data)
      out(result)
      break
    }

    // ── update ────────────────────────────────────────────────────────
    case 'update':
    case 'u': {
      const entityId = args[1]
      const type = flag('type')
      const dataStr = flag('data')
      if (!entityId || !type) err('Usage: trellis update <entityId> --type <type> --data \'{"key":"val"}\'')
      let data = {}
      if (dataStr) {
        try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
      }
      const result = await client.updateNode(entityId, type, data)
      out(result)
      break
    }

    // ── delete ────────────────────────────────────────────────────────
    case 'delete':
    case 'd': {
      const entityId = args[1]
      if (!entityId) err('Usage: trellis delete <entityId>')
      const result = await client.deleteNode(entityId)
      out(result)
      break
    }

    // ── link ──────────────────────────────────────────────────────────
    case 'link':
    case 'l': {
      const [, e1, relation, e2] = args
      if (!e1 || !relation || !e2) err('Usage: trellis link <e1> <relation> <e2>')
      const result = await client.link(e1, relation, e2)
      out(result)
      break
    }

    // ── watch ─────────────────────────────────────────────────────────
    case 'watch':
    case 'w': {
      console.error(`Watching mutations on ${client.health ? baseUrl || process.env.TRELLIS_API_URL || 'http://localhost:4141' : ''}...`)
      console.error('Press Ctrl+C to stop.\n')
      const ac = client.watch(
        (event) => {
          const line = pretty ? JSON.stringify(event, null, 2) : JSON.stringify(event)
          console.log(line)
        },
        (error) => {
          console.error(`SSE error: ${error.message}`)
        },
      )
      // Keep alive until interrupted
      process.on('SIGINT', () => {
        ac.abort()
        process.exit(0)
      })
      // Prevent Node from exiting
      await new Promise(() => {})
      break
    }

    // ── health ────────────────────────────────────────────────────────
    case 'health':
    case 'h': {
      const result = await client.health()
      out(result)
      break
    }

    // ── schema ────────────────────────────────────────────────────────
    case 'schema':
    case 's': {
      const result = await client.ontologies()
      out(result)
      break
    }

    // ── log ───────────────────────────────────────────────────────────
    case 'log': {
      const result = await client.log()
      out(result)
      break
    }

    // ── ontology ────────────────────────────────────────────────────────
    case 'ontology':
    case 'ont': {
      const subcommand = args[1]

      switch (subcommand) {
        case 'list':
        case 'ls':
        case undefined: {
          const result = await client.ontologies()
          out(result)
          break
        }

        case 'get': {
          const id = args[2]
          if (!id) err('Usage: trellis ontology get <id>')
          const result = await client.getOntology(id)
          out(result)
          break
        }

        case 'create': {
          const id = flag('id')
          const version = flag('version') || '1.0.0'
          const tier = flag('tier')
          const fieldsStr = flag('fields')
          if (!id) err('Usage: trellis ontology create --id <id> [--version <v>] [--tier system|user] --fields \'[...]\'')
          if (tier && tier !== 'system' && tier !== 'user') err('--tier must be "system" or "user"')
          let fields = []
          if (fieldsStr) {
            try { fields = JSON.parse(fieldsStr) } catch { err(`Invalid JSON for --fields: ${fieldsStr}`) }
          }
          const schema = { '@id': id, '@type': 'trellis:Schema', version, fields }
          if (tier) schema.tier = tier
          const result = await client.createOntology(schema)
          out(result)
          break
        }

        case 'update': {
          const id = args[2]
          const version = flag('version')
          const fieldsStr = flag('fields')
          if (!id) err('Usage: trellis ontology update <id> [--version <v>] [--fields \'[...]\']')
          const existing = await client.getOntology(id)
          const schema = {
            ...existing,
            version: version || existing.version,
            fields: fieldsStr ? JSON.parse(fieldsStr) : existing.fields,
          }
          const result = await client.updateOntology(id, schema)
          out(result)
          break
        }

        case 'add-field': {
          const id = args[2]
          const fieldStr = flag('field')
          if (!id || !fieldStr) err('Usage: trellis ontology add-field <id> --field \'{"name":"...","valueType":"..."}\'')
          let field
          try { field = JSON.parse(fieldStr) } catch { err(`Invalid JSON for --field: ${fieldStr}`) }
          const result = await client.addOntologyField(id, field)
          out(result)
          break
        }

        case 'remove-field': {
          const id = args[2]
          const fieldName = flag('field')
          if (!id || !fieldName) err('Usage: trellis ontology remove-field <id> --field <name>')
          const result = await client.removeOntologyField(id, fieldName)
          out(result)
          break
        }

        case 'delete':
        case 'rm': {
          const id = args[2]
          if (!id) err('Usage: trellis ontology delete <id>')
          const result = await client.deleteOntology(id)
          out(result)
          break
        }

        default:
          err(`Unknown ontology subcommand: ${subcommand}. Run 'trellis ontology' to list.`)
      }
      break
    }

    // ── help / unknown ────────────────────────────────────────────────
    case 'help':
    case '--help':
    case '-h':
    case undefined: {
      console.log(`
trellis — CLI for the Trellis graph API

Commands:
  query <eqls>                              Execute an EQL-S query
  get <entityId>                            Fetch a single node by ID
  create --type <type> --id <id> [--data]   Create a new node
  update <entityId> --type <type> --data    Update an existing node
  delete <entityId>                         Delete a node
  link <e1> <relation> <e2>                 Link two nodes
  watch                                     Stream realtime mutation events
  health                                    Health check
  schema                                    List ontologies
  log                                       Recent mutation log

  ontology list                             List all ontologies
  ontology get <id>                         Get a single ontology
  ontology create --id <id> [--tier] --fields '[…]'  Create an ontology
  ontology update <id> [--version] [--fields]  Update an ontology
  ontology add-field <id> --field '{…}'     Add a field
  ontology remove-field <id> --field <name> Remove a field
  ontology delete <id>                      Delete an ontology

Flags:
  --pretty            Pretty-print JSON output
  --agent-id <name>   Set agent ID for mutations (default: cli)
  --url <url>         Override API base URL (default: $TRELLIS_API_URL or http://localhost:4141)

Aliases: q=query g=get c=create u=update d=delete l=link w=watch h=health s=schema ont=ontology
`)
      break
    }

    default:
      err(`Unknown command: ${command}. Run 'trellis help' for usage.`)
  }
}

run().catch((e) => {
  err(e.message || String(e))
})
