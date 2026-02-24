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
 *   TRELLIS_API_URL   — Base URL (default: http://localhost:$TRELLIS_PORT)
 *   TRELLIS_PORT      — Dev server port fallback when TRELLIS_API_URL is not set (default: 1414)
 *   TRELLIS_AGENT_ID  — Agent identifier (default: cli)
 *
 * Flags:
 *   --pretty          — Pretty-print JSON output
 *   --agent-id <name> — Override agent ID for this invocation
 *   --url <url>       — Override API base URL for this invocation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

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
const bodyContent = flag('body')
const defaultApiUrl = `http://localhost:${process.env.TRELLIS_PORT || '1414'}`

const command = args[0]

// ── Context persistence (~/.trellis/context.json) ───────────────────────

const CONTEXT_DIR = join(homedir(), '.trellis')
const CONTEXT_FILE = join(CONTEXT_DIR, 'context.json')

function loadContext() {
  try {
    if (existsSync(CONTEXT_FILE)) {
      return JSON.parse(readFileSync(CONTEXT_FILE, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function saveContext(ctx) {
  try {
    if (!existsSync(CONTEXT_DIR)) {
      mkdirSync(CONTEXT_DIR, { recursive: true })
    }
    writeFileSync(CONTEXT_FILE, JSON.stringify(ctx, null, 2))
  } catch (e) {
    console.error(`Warning: Could not save context: ${e.message}`)
  }
}

// CLI flags override persisted context
const ctxOrgId = flag('org')
const ctxAppId = flag('app')

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
      const countOnly = hasFlag('count')
      const fieldsStr = flag('fields')
      const eqls = args.slice(1).join(' ')
      if (!eqls) err('Usage: trellis query <eqls-string> [--pretty] [--count] [--fields f1,f2]')
      const t0 = Date.now()
      const result = await client.query(eqls)
      const elapsed = Date.now() - t0
      const rows = result?.data || []

      if (countOnly) {
        console.log(rows.length)
        break
      }

      if (pretty && Array.isArray(rows) && rows.length > 0) {
        // Filter to requested fields if specified
        let displayRows = rows
        if (fieldsStr) {
          const fields = fieldsStr.split(',').map(f => f.trim())
          displayRows = rows.map(r => {
            const o = {}
            for (const f of fields) {
              // Try exact match, then ?f, then any key ending in .f
              if (f in r) { o[f] = r[f]; continue }
              const qf = f.startsWith('?') ? f : `?${f}`
              if (qf in r) { o[qf] = r[qf]; continue }
              const suffix = `.${f.replace(/^\?/, '')}`
              const match = Object.keys(r).find(k => k.endsWith(suffix))
              if (match) o[match] = r[match]
            }
            return o
          })
        }

        // Render as table
        console.table(displayRows)
        console.log(`\n${rows.length} row(s) in ${elapsed}ms`)
      } else {
        out(result)
      }
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
      if (!type || !id) err('Usage: trellis create --type <type> --id <entityId> [--data \'{"key":"val"}\'] [--body "markdown"]')
      let data = {}
      if (dataStr) {
        try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
      }
      if (bodyContent) {
        data.content = bodyContent
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
      if (!entityId || !type) err('Usage: trellis update <entityId> --type <type> --data \'{"key":"val"}\' [--body "markdown"]')
      let data = {}
      if (dataStr) {
        try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
      }
      if (bodyContent) {
        data.content = bodyContent
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
      console.error(`Watching mutations on ${client.health ? baseUrl || process.env.TRELLIS_API_URL || defaultApiUrl : ''}...`)
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

    // ── summary ───────────────────────────────────────────────────────
    case 'summary': {
      const focus = flag('focus')
      const limitStr = flag('limit')
      const limit = limitStr ? parseInt(limitStr) : undefined
      const result = await client.summary(limit)

      if (pretty) {
        const hr = '─'.repeat(48)
        const pad = (s, n) => String(s).padEnd(n)

        if (!focus || focus === 'health') {
          const h = result.health
          console.log(`\n${hr}`)
          console.log(`  Health       ${h.factCount.toLocaleString()} facts · ${h.linkCount} links · ${h.entityCount} entities · ${h.status}`)
        }

        if (!focus || focus === 'types') {
          console.log(`${hr}`)
          console.log(`  Entity Types`)
          for (const { type, count } of result.entityTypes) {
            console.log(`    ${pad(type, 30)} ${count}`)
          }
        }

        if (!focus || focus === 'schema') {
          const o = result.ontologies
          console.log(`${hr}`)
          console.log(`  Ontologies   ${o.total} total (${o.system.length} system, ${o.user.length} user)`)
          if (o.system.length) console.log(`    system: ${o.system.slice(0, 12).join(', ')}${o.system.length > 12 ? '...' : ''}`)
          if (o.user.length)   console.log(`    user:   ${o.user.join(', ')}`)
        }

        if (!focus || focus === 'attrs') {
          console.log(`${hr}`)
          console.log(`  Top Attributes`)
          for (const { attribute, distinctCount } of result.topAttributes) {
            console.log(`    ${pad(attribute, 30)} ${distinctCount} distinct`)
          }
        }

        if (!focus || focus === 'links') {
          const l = result.links
          console.log(`${hr}`)
          console.log(`  Links        ${l.total} total`)
          if (l.relations.length) console.log(`    relations: ${l.relations.join(', ')}`)
        }

        if (!focus || focus === 'recent') {
          console.log(`${hr}`)
          console.log(`  Recent Mutations`)
          for (const m of result.recentMutations) {
            const ts = new Date(m.timestamp).toLocaleTimeString()
            console.log(`    ${pad(m.action, 14)} ${m.entityId || ''}  (${ts})`)
          }
        }

        console.log(`${hr}\n`)
      } else {
        out(result)
      }
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
          const entityClass = flag('entity-class')
          const label = flag('label')
          const labelPlural = flag('label-plural')
          const icon = flag('icon')
          const color = flag('color')
          const defaultSortField = flag('default-sort-field')
          const fieldsStr = flag('fields')
          if (!id) err('Usage: trellis ontology create --id <id> [--version <v>] [--tier system|user] --fields \'[...]\'')
          if (tier && tier !== 'system' && tier !== 'user') err('--tier must be "system" or "user"')
          let fields = []
          if (fieldsStr) {
            try { fields = JSON.parse(fieldsStr) } catch { err(`Invalid JSON for --fields: ${fieldsStr}`) }
          }
          const schema = { '@id': id, '@type': 'trellis:Schema', version, fields }
          if (tier) schema.tier = tier
          if (entityClass) schema.entityClass = entityClass
          if (label) schema.label = label
          if (labelPlural) schema.labelPlural = labelPlural
          if (icon) schema.icon = icon
          if (color) schema.color = color
          if (defaultSortField) schema.defaultSortField = defaultSortField

          const result = await client.createOntology(schema)
          out(result)
          break
        }

        case 'update': {
          const id = args[2]
          const version = flag('version')
          const entityClass = flag('entity-class')
          const label = flag('label')
          const labelPlural = flag('label-plural')
          const icon = flag('icon')
          const color = flag('color')
          const defaultSortField = flag('default-sort-field')
          const fieldsStr = flag('fields')
          if (!id) err('Usage: trellis ontology update <id> [--version <v>] [--fields \'[...]\']')
          const existing = await client.getOntology(id)
          const schema = {
            ...existing,
            version: version || existing.version,
            fields: fieldsStr ? JSON.parse(fieldsStr) : existing.fields,
          }
          if (entityClass !== undefined) schema.entityClass = entityClass
          if (label !== undefined) schema.label = label
          if (labelPlural !== undefined) schema.labelPlural = labelPlural
          if (icon !== undefined) schema.icon = icon
          if (color !== undefined) schema.color = color
          if (defaultSortField !== undefined) schema.defaultSortField = defaultSortField
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

    // ═══════════════════════════════════════════════════════════════════
    // Phase 1: Workspace Context (org, app, context)
    // ═══════════════════════════════════════════════════════════════════

    case 'org': {
      const sub = args[1]
      switch (sub) {
        case 'list':
        case 'ls':
        case undefined: {
          const result = await client.listOrgs()
          out(result)
          break
        }
        case 'create': {
          const name = flag('name')
          const slug = flag('slug')
          const description = flag('description')
          if (!name) err('Usage: trellis org create --name "My Org" [--slug my-org]')
          const result = await client.createOrg(name, slug, description)
          out(result)
          break
        }
        case 'get': {
          const id = args[2]
          if (!id) err('Usage: trellis org get <slug>')
          const result = await client.getOrg(id)
          out(result)
          break
        }
        default:
          err(`Unknown org subcommand: ${sub}. Try: list, create, get`)
      }
      break
    }

    case 'app': {
      const sub = args[1]
      switch (sub) {
        case 'list':
        case 'ls':
        case undefined: {
          const ctx = loadContext()
          const orgId = ctxOrgId || ctx.orgId
          const result = await client.listApps(orgId)
          out(result)
          break
        }
        case 'create': {
          const name = flag('name')
          const slug = flag('slug')
          const icon = flag('icon')
          const color = flag('color')
          const description = flag('description')
          const ontologiesStr = flag('ontologies')
          const ctx = loadContext()
          const orgId = ctxOrgId || flag('org-id') || ctx.orgId
          if (!name) err('Usage: trellis app create --name "My App" [--slug my-app] [--org-id <orgId>]')
          let ontologies
          if (ontologiesStr) {
            try { ontologies = JSON.parse(ontologiesStr) } catch { err(`Invalid JSON for --ontologies: ${ontologiesStr}`) }
          }
          const result = await client.createApp({ name, slug, orgId, icon, color, description, ontologies })
          out(result)
          break
        }
        case 'get': {
          const id = args[2]
          if (!id) err('Usage: trellis app get <slug>')
          const result = await client.getApp(id)
          out(result)
          break
        }
        case 'update': {
          const id = args[2]
          const dataStr = flag('data')
          if (!id) err('Usage: trellis app update <slug> --data \'{"name":"New Name"}\'')
          let data = {}
          if (dataStr) {
            try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
          }
          const result = await client.updateApp(id, data)
          out(result)
          break
        }
        case 'delete':
        case 'rm': {
          const id = args[2]
          if (!id) err('Usage: trellis app delete <slug>')
          const result = await client.deleteApp(id)
          out(result)
          break
        }
        default:
          err(`Unknown app subcommand: ${sub}. Try: list, create, get, update, delete`)
      }
      break
    }

    case 'context':
    case 'ctx': {
      const sub = args[1]
      if (sub === 'set') {
        const ctx = loadContext()
        if (ctxOrgId) ctx.orgId = ctxOrgId
        if (ctxAppId) ctx.appId = ctxAppId
        const orgFlag = flag('org-id')
        const appFlag = flag('app-id')
        if (orgFlag) ctx.orgId = orgFlag
        if (appFlag) ctx.appId = appFlag
        saveContext(ctx)
        out({ ok: true, context: ctx })
      } else {
        const ctx = loadContext()
        const result = await client.getContext(ctxOrgId || ctx.orgId, ctxAppId || ctx.appId)
        out(result)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 2: Collections & Pages
    // ═══════════════════════════════════════════════════════════════════

    case 'collection':
    case 'coll': {
      const sub = args[1]
      const ctx = loadContext()
      const appId = ctxAppId || ctx.appId

      switch (sub) {
        case 'list':
        case 'ls':
        case undefined: {
          const result = await client.listCollections(appId)
          out(result)
          break
        }
        case 'create': {
          const name = flag('name')
          const slug = flag('slug')
          const type = flag('type')
          const description = flag('description')
          const schemaStr = flag('schema')
          if (!name) err('Usage: trellis collection create --name "Episodes" [--slug episodes] [--type database]')
          let schema
          if (schemaStr) {
            try { schema = JSON.parse(schemaStr) } catch { err(`Invalid JSON for --schema: ${schemaStr}`) }
          }
          const result = await client.createCollection({ name, slug, appId, type, description, schema })
          out(result)
          break
        }
        case 'update': {
          const id = args[2]
          const dataStr = flag('data')
          if (!id) err('Usage: trellis collection update <slug> --data \'{"name":"New Name"}\'')
          let data = {}
          if (dataStr) {
            try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
          }
          const result = await client.updateCollection(id, data)
          out(result)
          break
        }
        case 'delete':
        case 'rm': {
          const id = args[2]
          if (!id) err('Usage: trellis collection delete <slug>')
          const result = await client.deleteCollection(id)
          out(result)
          break
        }
        default:
          err(`Unknown collection subcommand: ${sub}. Try: list, create, update, delete`)
      }
      break
    }

    case 'page': {
      const sub = args[1]
      const ctx = loadContext()
      const appId = ctxAppId || ctx.appId

      switch (sub) {
        case 'list':
        case 'ls':
        case undefined: {
          const result = await client.listPages(appId)
          out(result)
          break
        }
        case 'create': {
          const title = flag('title')
          const dataSource = flag('data-source')
          const layout = flag('layout')
          const defaultProjection = flag('default-projection')
          const description = flag('description')
          const icon = flag('icon')
          if (!title) err('Usage: trellis page create --title "Dashboard" [--data-source task] [--layout grid]')
          const result = await client.createPage({ title, appId, dataSource, layout, defaultProjection, description, icon })
          out(result)
          break
        }
        case 'update': {
          const id = args[2]
          const dataStr = flag('data')
          if (!id) err('Usage: trellis page update <id> --data \'{"title":"New Title"}\'')
          let data = {}
          if (dataStr) {
            try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
          }
          const result = await client.updatePage(id, data)
          out(result)
          break
        }
        case 'delete':
        case 'rm': {
          const id = args[2]
          if (!id) err('Usage: trellis page delete <id>')
          const result = await client.deletePage(id)
          out(result)
          break
        }
        default:
          err(`Unknown page subcommand: ${sub}. Try: list, create, update, delete`)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 3: Entity Enrichment (comment, tag)
    // ═══════════════════════════════════════════════════════════════════

    case 'comment': {
      const sub = args[1]
      switch (sub) {
        case 'list':
        case 'ls': {
          const entityId = args[2]
          if (!entityId) err('Usage: trellis comment list <entityId>')
          const result = await client.listComments(entityId)
          out(result)
          break
        }
        case 'add': {
          const entityId = args[2]
          const content = flag('content')
          const commentType = flag('type')
          if (!entityId || !content) err('Usage: trellis comment add <entityId> --content "My comment"')
          const result = await client.addComment(entityId, content, { commentType })
          out(result)
          break
        }
        default:
          err(`Unknown comment subcommand: ${sub || '(none)'}. Try: list, add`)
      }
      break
    }

    case 'tag': {
      const sub = args[1]
      switch (sub) {
        case 'list':
        case 'ls':
        case undefined: {
          const result = await client.listTags()
          out(result)
          break
        }
        case 'create': {
          const name = flag('name')
          const color = flag('color')
          const description = flag('description')
          if (!name) err('Usage: trellis tag create --name "Priority" [--color "bg-red-500"]')
          const result = await client.createTag(name, color, description)
          out(result)
          break
        }
        case 'assign': {
          const entityId = args[2]
          const tagsStr = flag('tags')
          if (!entityId || !tagsStr) err('Usage: trellis tag assign <entityId> --tags "priority,reviewed"')
          const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean)
          const result = await client.assignTags(entityId, tags)
          out(result)
          break
        }
        default:
          err(`Unknown tag subcommand: ${sub}. Try: list, create, assign`)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 4: Bulk Operations & Workflows
    // ═══════════════════════════════════════════════════════════════════

    case 'bulk': {
      const sub = args[1]
      switch (sub) {
        case 'update': {
          const eqls = flag('query')
          const dataStr = flag('data')
          if (!eqls || !dataStr) err('Usage: trellis bulk update --query \'FIND ...\' --data \'{"key":"val"}\'')
          let data
          try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
          const result = await client.bulkUpdate(eqls, data)
          out(result)
          break
        }
        case 'delete': {
          const eqls = flag('query')
          if (!eqls) err('Usage: trellis bulk delete --query \'FIND ...\'')
          const result = await client.bulkDelete(eqls)
          out(result)
          break
        }
        default:
          err(`Unknown bulk subcommand: ${sub || '(none)'}. Try: update, delete`)
      }
      break
    }

    case 'workflow':
    case 'wf': {
      const sub = args[1]
      const ctx = loadContext()
      const appId = ctxAppId || ctx.appId

      switch (sub) {
        case 'list':
        case 'ls':
        case undefined: {
          const result = await client.listWorkflows(appId)
          out(result)
          break
        }
        case 'create': {
          const name = flag('name')
          const triggerStr = flag('trigger')
          const graphStr = flag('graph')
          const description = flag('description')
          if (!name) err('Usage: trellis workflow create --name "Auto-triage" [--trigger \'{"type":"onCreate"}\']')
          let trigger, graph
          if (triggerStr) {
            try { trigger = JSON.parse(triggerStr) } catch { err(`Invalid JSON for --trigger: ${triggerStr}`) }
          }
          if (graphStr) {
            try { graph = JSON.parse(graphStr) } catch { err(`Invalid JSON for --graph: ${graphStr}`) }
          }
          const result = await client.createWorkflow({ name, appId, trigger, graph, description })
          out(result)
          break
        }
        case 'update': {
          const id = args[2]
          const dataStr = flag('data')
          if (!id) err('Usage: trellis workflow update <id> --data \'{"status":"active"}\'')
          let data = {}
          if (dataStr) {
            try { data = JSON.parse(dataStr) } catch { err(`Invalid JSON for --data: ${dataStr}`) }
          }
          const result = await client.updateWorkflow(id, data)
          out(result)
          break
        }
        case 'delete':
        case 'rm': {
          const id = args[2]
          if (!id) err('Usage: trellis workflow delete <id>')
          const result = await client.deleteWorkflow(id)
          out(result)
          break
        }
        default:
          err(`Unknown workflow subcommand: ${sub}. Try: list, create, update, delete`)
      }
      break
    }

    // ═══════════════════════════════════════════════════════════════════
    // Phase 5: Settings, Files & Invites
    // ═══════════════════════════════════════════════════════════════════

    case 'setting': {
      const sub = args[1]
      switch (sub) {
        case 'get': {
          const key = args[2]
          const scope = flag('scope')
          if (!key) err('Usage: trellis setting get <key> [--scope app|user]')
          const result = await client.getSetting(key, scope)
          out(result)
          break
        }
        case 'set': {
          const key = args[2]
          const valueStr = args[3]
          const scope = flag('scope')
          if (!key) err('Usage: trellis setting set <key> <value> [--scope app|user]')
          let value = valueStr
          // Try to parse as JSON for complex values
          try { value = JSON.parse(valueStr) } catch { /* keep as string */ }
          const result = await client.setSetting(key, value, scope)
          out(result)
          break
        }
        case 'list':
        case 'ls':
        case undefined: {
          const scope = flag('scope')
          const result = await client.listSettings(scope)
          out(result)
          break
        }
        default:
          err(`Unknown setting subcommand: ${sub}. Try: get, set, list`)
      }
      break
    }

    case 'file': {
      const sub = args[1]
      switch (sub) {
        case 'upload': {
          const filePath = args[2]
          const attachTo = flag('attach-to')
          const field = flag('field')
          if (!filePath) err('Usage: trellis file upload <path> [--attach-to <entityId>] [--field thumbnail]')
          // Read file and base64 encode
          const { readFileSync: readFs } = await import('node:fs')
          const { basename } = await import('node:path')
          const fileData = readFs(filePath)
          const fileBase64 = fileData.toString('base64')
          const filename = basename(filePath)
          const result = await client.uploadFile(fileBase64, filename, { entityId: attachTo, field })
          out(result)
          break
        }
        default:
          err(`Unknown file subcommand: ${sub || '(none)'}. Try: upload`)
      }
      break
    }

    case 'invite': {
      const sub = args[1]
      switch (sub) {
        case 'send': {
          const email = flag('email')
          const role = flag('role')
          const ctx = loadContext()
          const orgId = ctxOrgId || flag('org-id') || ctx.orgId
          if (!email) err('Usage: trellis invite send --email "user@example.com" [--role member]')
          const result = await client.sendInvite(email, { role, orgId })
          out(result)
          break
        }
        default:
          err(`Unknown invite subcommand: ${sub || '(none)'}. Try: send`)
      }
      break
    }

    // ── help / unknown ────────────────────────────────────────────────
    case 'help':
    case '--help':
    case '-h':
    case undefined: {
      console.log(`
trellis — CLI for the Trellis graph + platform API

Graph Commands:
  query <eqls>                              Execute an EQL-S query
  get <entityId>                            Fetch a single node by ID
  create --type <type> --id <id> [--data] [--body]  Create a new node
  update <entityId> --type <type> --data [--body]   Update an existing node
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

Platform Commands:
  org list                                  List organizations
  org create --name "..." [--slug ...]      Create an organization
  org get <slug>                            Get an organization

  app list                                  List apps (scoped by --org)
  app create --name "..." [--slug ...]      Create an app/world
  app get <slug>                            Get an app
  app update <slug> --data '{...}'          Update an app
  app delete <slug>                         Delete an app

  context                                   Show current org + app context
  context set --org <id> --app <id>         Set persistent context

  collection list                           List collections (scoped by --app)
  collection create --name "..." [--slug]   Create a collection
  collection update <slug> --data '{...}'   Update a collection
  collection delete <slug>                  Delete a collection

  page list                                 List pages (scoped by --app)
  page create --title "..." [--layout grid] Create a page
  page update <id> --data '{...}'           Update a page
  page delete <id>                          Delete a page

  comment list <entityId>                   List comments on an entity
  comment add <entityId> --content "..."    Add a comment

  tag list                                  List all tags
  tag create --name "..." [--color "..."]   Create a tag
  tag assign <entityId> --tags "a,b,c"      Assign tags to an entity

  bulk update --query '...' --data '{...}'  Batch update matching entities
  bulk delete --query '...'                 Batch delete matching entities

  workflow list                             List workflows (scoped by --app)
  workflow create --name "..." [--trigger]  Create a workflow
  workflow update <id> --data '{...}'       Update a workflow
  workflow delete <id>                      Delete a workflow

  setting get <key> [--scope app|user]      Get a setting
  setting set <key> <value> [--scope]       Set a setting
  setting list [--scope app|user]           List settings

  file upload <path> [--attach-to <id>]     Upload a file
  invite send --email "..." [--role member] Send an invitation

Flags:
  --pretty            Pretty-print JSON output
  --agent-id <name>   Set agent ID for mutations (default: cli)
  --url <url>         Override API base URL
  --org <id>          Override org context for this command
  --app <id>          Override app context for this command
  --body <text>       Set rich text content on create/update

Aliases: q=query g=get c=create u=update d=delete l=link w=watch h=health s=schema
         ont=ontology ctx=context coll=collection wf=workflow
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
