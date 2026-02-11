# Trellis — GitHub Copilot Instructions

You are working inside the **Trellis** monorepo — a personal knowledge graph platform.

Read `AGENTS.md` in the repo root for the complete reference. Key points below.

## What This Is

Trellis is a personal knowledge graph where everything is an entity with typed properties and semantic links. The graph powers a Nuxt 3 web app on `localhost:4141` with realtime sync via SSE.

## What You Can Do

You can interact with the graph via CLI or REST API:

```bash
# Query
just trellis query 'FIND calendaritem AS ?t WHERE ?t.type = "task"' --pretty

# CRUD entities
just trellis create --type calendaritem --id 'calendaritem:my-task' --data '{"type":"task","title":"My Task"}' --agent-id copilot
just trellis update calendaritem:my-task --type calendaritem --data '{"title":"Updated"}' --agent-id copilot
just trellis delete calendaritem:my-task --agent-id copilot

# Link entities
just trellis link calendaritem:task-1 relatedTo calendaritem:note-1

# Ontology CRUD (auto-scaffolds UI)
just trellis ontology create --id 'trellis:schema/invoice' --fields '[{"name":"title","valueType":"title","required":true},{"name":"amount","valueType":"number"}]'
just trellis ontology list --pretty
```

## Architecture

```
apps/web/              Nuxt 3 app (localhost:4141)
packages/tql/          TQL kernel, EAV store, EQL-S query engine
packages/trellis-cli/  CLI + TypeScript SDK
packages/trellis-mcp/  MCP server (15 tools)
packages/types/        Shared TypeScript types
```

## Entity System

Two-axis: **class** (temporal, document, actor, container) × **type** (task, note, person, project, etc.)

Entity IDs: `calendaritem:task-1`, `calendaritem:note-meeting`

## Key Rules

- Dev server is always on `localhost:4141` — **never start it yourself**
- Pass `--agent-id copilot` to track your mutations
- Use descriptive entity ID slugs — `"task-deploy-v2"` not `"abc123"`
- Mutations appear instantly in the browser via SSE
- Every entity needs at minimum `{ title: "..." }`
- Create both entities first, then link them

## REST API Quick Reference

Base URL: `http://localhost:4141/api/graph`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/query` | EQL-S query (`{ "query": "FIND ..." }`) |
| GET | `/node/:id` | Fetch single node |
| POST | `/mutate` | Create/update/delete nodes, link |
| GET | `/ontologies` | List all ontology schemas |
| POST | `/ontology` | Create ontology |
| PUT | `/ontology/:id` | Update ontology |
| DELETE | `/ontology/:id` | Delete ontology |
| GET | `/health` | Health check |
| GET | `/events` | SSE stream of mutations |

## Full Reference

- `AGENTS.md` — API endpoints, entity architecture, CLI commands, SDK, MCP tools
- `packages/trellis-mcp/SKILL.md` — Entity fields, linking conventions, query syntax
