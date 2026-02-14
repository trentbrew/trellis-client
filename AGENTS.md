# Trellis Agent Instructions

You are working inside the **Trellis** monorepo — a personal knowledge graph platform. Everything in this system is an entity with typed properties and semantic links. The graph powers a Nuxt web app running on `localhost:4141` with realtime sync.

**You are a Trellis-aware agent.** You can read, write, query, and manage the graph directly — either through the REST API, the CLI, or MCP tools. Any mutations you make appear instantly in the browser UI via SSE.

> Read `packages/trellis-mcp/SKILL.md` for the full domain knowledge reference (entity types, fields, linking, querying, ontology CRUD).

---

## Monorepo Structure

```
apps/web/              Nuxt 3 app (localhost:4141)
packages/tql/          TQL kernel, EAV store, EQL-S query engine
packages/trellis-cli/  CLI + TypeScript SDK
packages/trellis-mcp/  MCP server (15 tools)
packages/types/        Shared TypeScript types
packages/utils/        Shared utilities
hooks/                 Git/agent lifecycle hooks
.tql/                  Local graph data (JSONL ops, snapshots)
```

## Entity Architecture

Every entity has an **entity class** (structural shape) and an **entity type** (specific kind):

| Class | Description | Example Types |
|-------|-------------|---------------|
| **temporal** | Has date/time, lives on calendar | task, event, trip, payment, appointment |
| **document** | Has rich content body | note, file, page, template, bookmark |
| **actor** | Represents a person/entity | person, contact, organization |
| **container** | Groups/organizes entities | project, folder, collection, goal |

Entity IDs use the format `calendaritem:<slug>`, e.g. `calendaritem:task-1`, `calendaritem:note-meeting`.

> **Namespace note:** All entities share the `calendaritem` TQL storage namespace for historical reasons. In application code, use the `entityId()` / `entityQuery()` helpers from `app/lib/tql-namespace.ts` instead of hardcoding the prefix.

## TQL Graph API

Base URL: `http://localhost:4141/api/graph`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/query` | EQL-S query (`{ "query": "FIND ..." }`) |
| GET | `/node/:id` | Fetch single node |
| POST | `/nodes` | Fetch multiple nodes (`{ "ids": [...] }`) |
| POST | `/mutate` | Create/update/delete nodes, link |
| GET | `/ontologies` | List all ontology schemas |
| GET | `/ontology/:id` | Get single ontology |
| POST | `/ontology` | Create ontology |
| PUT | `/ontology/:id` | Update ontology |
| DELETE | `/ontology/:id` | Delete ontology |
| GET | `/catalog` | EAV attribute catalog |
| GET | `/health` | Health check |
| GET | `/events` | SSE stream of mutations |
| GET | `/log` | Recent mutation log |

### Mutation Actions

```json
{ "action": "createNode", "entityId": "calendaritem:my-task", "type": "calendaritem", "data": { "type": "task", "title": "My Task" }, "agentId": "my-agent" }
{ "action": "updateNode", "entityId": "calendaritem:my-task", "type": "calendaritem", "data": { "title": "Updated" }, "agentId": "my-agent" }
{ "action": "deleteNode", "entityId": "calendaritem:my-task", "agentId": "my-agent" }
{ "action": "link", "e1": "calendaritem:task-1", "relation": "assignedTo", "e2": "calendaritem:person-1", "agentId": "my-agent" }
```

> In app code, use `toEntityId('my-task')` and `ENTITY_NAMESPACE` from `~/lib/tql-namespace` instead of hardcoding `calendaritem:`.

### EQL-S Query Examples

```
FIND calendaritem AS ?t WHERE ?t.type = "task" RETURN ?t.title, ?t.startDate, ?t.taskStatus
FIND calendaritem AS ?n WHERE ?n.type = "note" RETURN ?n.title ORDER BY ?n.updatedAt DESC LIMIT 10
```

## CLI

The CLI is available via `just trellis` or `node packages/trellis-cli/bin/trellis.mjs`:

```bash
just trellis health --pretty
just trellis query 'FIND calendaritem AS ?e WHERE ?e.type = "task"' --pretty
just trellis get calendaritem:task-1 --pretty
just trellis create --type calendaritem --id 'calendaritem:my-id' --data '{"type":"task","title":"My Task"}' --agent-id my-agent
just trellis update calendaritem:my-id --type calendaritem --data '{"title":"Updated"}' --agent-id my-agent
just trellis delete calendaritem:my-id --agent-id my-agent
just trellis link calendaritem:task-1 relatedTo calendaritem:note-1
just trellis watch                    # SSE stream
just trellis schema --pretty          # List ontologies
just trellis log --pretty             # Mutation log
```

### Ontology CRUD via CLI

```bash
just trellis ontology list --pretty
just trellis ontology get 'trellis:schema/calendaritem' --pretty
just trellis ontology create --id 'trellis:schema/invoice' --tier system --fields '[{"name":"title","valueType":"title","required":true},{"name":"amount","valueType":"number"}]'
just trellis ontology update 'trellis:schema/invoice' --version '1.1.0' --fields '[...]'
just trellis ontology add-field 'trellis:schema/invoice' --field '{"name":"notes","valueType":"rich_text"}'
just trellis ontology remove-field 'trellis:schema/invoice' --field notes
just trellis ontology delete 'trellis:schema/invoice'
```

Creating an ontology auto-scaffolds it in the UI — sidebar item, browse page, dialog support — with zero code changes.

**Tier classification** (`--tier`): Controls where the type appears in the database sidebar.
- `system` — Built-in entity type, appears under ENTITIES section (e.g. task, note, person)
- `user` (or omitted) — User-created custom type, appears under CUSTOM section
- `core` — Kernel structural types (immutable, code-only — never create these via CLI)

## SDK

```js
import { TrellisClient } from '@toolkit/trellis-cli'
const client = new TrellisClient({ agentId: 'my-agent' })

// The SDK uses the raw calendaritem namespace — app code should use tql-namespace helpers instead
await client.createNode('calendaritem:new', 'calendaritem', { type: 'task', title: 'Hello' })
await client.query('FIND calendaritem AS ?t WHERE ?t.type = "task"')
await client.ontologies()
await client.createOntology({ '@id': 'trellis:schema/invoice', '@type': 'trellis:Schema', version: '1.0.0', fields: [...] })
```

## MCP Server

The MCP server (`packages/trellis-mcp/`) exposes 15 tools:

`query_graph`, `get_node`, `get_nodes`, `create_node`, `update_node`, `delete_node`, `link_nodes`, `graph_health`, `get_schema`, `get_catalog`, `get_mutation_log`, `get_ontology`, `create_ontology`, `update_ontology`, `delete_ontology`

### Connect to the MCP Server

**Claude Code** (`.claude/settings.json`):
```json
{
  "mcpServers": {
    "trellis-graph": {
      "command": "node",
      "args": ["packages/trellis-mcp/bin/serve.mjs"],
      "env": { "TRELLIS_API_URL": "http://localhost:4141", "TRELLIS_AGENT_ID": "claude" }
    }
  }
}
```

**OpenCode** (`.opencode.json`):
```json
{
  "mcp": {
    "trellis-graph": {
      "command": "node",
      "args": ["packages/trellis-mcp/bin/serve.mjs"],
      "env": { "TRELLIS_API_URL": "http://localhost:4141", "TRELLIS_AGENT_ID": "opencode" }
    }
  }
}
```

## Ontology Field Types

When creating ontology fields, use these Notion-compatible value types:

`title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `people`, `files`, `checkbox`, `url`, `email`, `phone_number`, `relation`, `rollup`, `formula`

## Linking Conventions

| Relation | Meaning |
|----------|---------|
| `assignedTo` | Task/item → Person |
| `belongsTo` | Entity → Project/Folder |
| `references` | Bidirectional reference |
| `dependsOn` | Task dependency chain |
| `parentOf` / `childOf` | Container hierarchy |

## Key Conventions

- **Dev server**: Always running on `localhost:4141` — never start it yourself
- **Agent ID**: Pass `--agent-id <name>` (or set `TRELLIS_AGENT_ID`) to track who made a mutation
- **Entity IDs**: Use descriptive slugs — `"task-deploy-v2"` not `"abc123"`
- **Dates**: ISO 8601 — `"2026-02-10"` for dates, `"14:30"` for times
- **Mutations are realtime**: The browser UI updates instantly via SSE
- **Always set a title**: Every entity needs at minimum `{ title: "..." }`
- **Link after creating**: Create both entities first, then link them

## Further Reading

- `packages/trellis-mcp/SKILL.md` — Full domain knowledge (entity fields, examples, best practices)
- `.windsurf/workflows/trellis-cli.md` — Step-by-step CLI workflow
- `docs/architecture/` — App architecture documentation
- `docs/data/` — Data layer and seeding guides
