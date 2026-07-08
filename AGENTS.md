# Trellis Agent Instructions

You are working inside the **Trellis** monorepo — a personal knowledge graph platform. Everything in this system is an entity with typed properties and semantic links. The graph powers a Nuxt web app running on `localhost:$TRELLIS_PORT` with realtime sync.

**You are a Trellis-aware agent.** You can read, write, query, and manage the graph directly — either through the REST API, the CLI, or MCP tools. Any mutations you make appear instantly in the browser UI via SSE.

> **MCP-first rule:** If you have MCP tools available (48 total), **always use them** instead of `curl`, `fetch`, or raw HTTP requests. The MCP tools handle errors, serialization, and agent ID tracking automatically. See `packages/trellis-mcp/SKILL.md` for the full tool reference and mapping table.

> Read `packages/trellis-mcp/SKILL.md` for the full domain knowledge reference (entity types, fields, linking, querying, ontology CRUD).

---

## Monorepo Structure

```
apps/web/              Nuxt 3 app (localhost:$TRELLIS_PORT)
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

| Class         | Description                      | Example Types                           |
| ------------- | -------------------------------- | --------------------------------------- |
| **temporal**  | Has date/time, lives on calendar | task, event, trip, payment, appointment |
| **document**  | Has rich content body            | note, file, page, template, bookmark    |
| **actor**     | Represents a person/entity       | person, contact, organization           |
| **container** | Groups/organizes entities        | project, folder, collection, goal       |

Entity IDs use the format `entity:<slug>`, e.g. `entity:task-1`, `entity:note-meeting`.

> **Namespace note:** All entities share the `entity` TQL storage namespace for historical reasons. In application code, use the `entityId()` / `entityQuery()` helpers from `app/lib/tql-namespace.ts` instead of hardcoding the prefix.

## Campus Substrate (Phase 0)

Every entity now lives in a **Zone** inside a **Facility** — the spatial ontology inherited from turtleOS. The substrate is **advisory** in Phase 0: the zone guard logs allow/deny decisions but does **not** reject mutations.

### Primitive types

| Type       | Class     | Purpose                                                                                                 |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `facility` | container | Unit of scope; contains zones (e.g. `entity:founder-facility`)                                          |
| `zone`     | container | Capability-granting location (`lab`, `lobby`, `workshop`, `showroom`, `vault`, `classroom`, `giftshop`) |
| `agent`    | actor     | Autonomous actor bound to a home facility                                                               |
| `wallet`   | actor     | Identity + reputation projection for an agent                                                           |
| `decision` | document  | Rationale + context + outcome for every agent act                                                       |
| `artifact` | document  | Produced work, published in a zone                                                                      |

### Default zones (founder Facility)

| Zone                               | Grants                                  | Typical use                                      |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------ |
| `entity:founder-facility-lab`      | `ALL, ownerOnly`                        | Private workspace — tasks, notes, personal graph |
| `entity:founder-facility-lobby`    | `READ public` + `REQUEST_ACCESS`        | Notifications, access requests, front door       |
| `entity:founder-facility-workshop` | `ALL, membersOnly`                      | Multi-agent collaboration                        |
| `entity:founder-facility-showroom` | `READ public` + `WRITE membersOnly`     | Published artifacts, public pages                |
| `entity:founder-facility-vault`    | `ALL, ownerOnly + requiresSecondFactor` | Credentials, integrations, irreversible ops      |

### Tagging mutations with a zone

Every SSE mutation event carries `zoneId` and `facilityId`. The server derives them from (in priority order):

1. `X-Trellis-Zone` + `X-Trellis-Facility` headers (explicit override)
2. The `Referer` path (mapped via `zone-router.ts`)
3. Fallback: the founder's Lab

New entities are also auto-stamped with `data.zoneId` + `data.facilityId` at creation so zone-aware queries work without op-log replay.

```bash
# Header-based override (CLI / external agents)
curl -X POST http://localhost:$TRELLIS_PORT/api/graph/mutate \
  -H 'Content-Type: application/json' \
  -H 'X-Trellis-Zone: entity:founder-facility-showroom' \
  -H 'X-Trellis-Facility: entity:founder-facility' \
  -d '{"action":"createNode","entityId":"entity:artifact-roadmap-v1","type":"entity","data":{"type":"artifact","title":"Roadmap v1","artifactType":"document"},"agentId":"cli"}'

# Or set zoneId inline (preferred for MCP)
{ "entityId": "entity:artifact-roadmap-v1", "type": "entity",
  "data": { "type": "artifact", "title": "Roadmap v1",
            "zoneId": "entity:founder-facility-showroom",
            "facilityId": "entity:founder-facility" },
  "agentId": "claude" }
```

### Zone guard logs

On every mutation you'll see one of:

```
[zone-guard] ALLOW agent=entity:founder action=createNode zone=lab event=#42
[zone-guard] DENY (advisory) agent=my-agent action=createNode zone=vault reason="..."
```

Both are advisory — the mutation still commits. Treat `DENY` lines as warnings to audit before Phase 1 flips strict enforcement on.

### Querying by zone

```
FIND entity AS ?e WHERE ?e.zoneId = "entity:founder-facility-lab"
FIND entity AS ?a WHERE ?a.type = "artifact" AND ?a.publishedInZone = "entity:founder-facility-showroom"
```

### Lab projection UI

Navigate to `/agent` in the web app to see a live op-log filtered by zone with tabs for all five zones.

## TQL Graph API

Base URL: `http://localhost:$TRELLIS_PORT/api/graph`

| Method | Endpoint        | Purpose                                   |
| ------ | --------------- | ----------------------------------------- |
| POST   | `/query`        | EQL-S query (`{ "query": "FIND ..." }`)   |
| GET    | `/node/:id`     | Fetch single node                         |
| POST   | `/nodes`        | Fetch multiple nodes (`{ "ids": [...] }`) |
| POST   | `/mutate`       | Create/update/delete nodes, link          |
| GET    | `/ontologies`   | List all ontology schemas                 |
| GET    | `/ontology/:id` | Get single ontology                       |
| POST   | `/ontology`     | Create ontology                           |
| PUT    | `/ontology/:id` | Update ontology                           |
| DELETE | `/ontology/:id` | Delete ontology                           |
| GET    | `/catalog`      | EAV attribute catalog                     |
| GET    | `/health`       | Health check                              |
| GET    | `/events`       | SSE stream of mutations                   |
| GET    | `/log`          | Recent mutation log                       |

### Mutation Actions

```json
{ "action": "createNode", "entityId": "entity:my-task", "type": "entity", "data": { "type": "task", "title": "My Task" }, "agentId": "my-agent" }
{ "action": "updateNode", "entityId": "entity:my-task", "type": "entity", "data": { "title": "Updated" }, "agentId": "my-agent" }
{ "action": "deleteNode", "entityId": "entity:my-task", "agentId": "my-agent" }
{ "action": "link", "e1": "entity:task-1", "relation": "assignedTo", "e2": "entity:person-1", "agentId": "my-agent" }
```

> In app code, use `toEntityId('my-task')` and `ENTITY_NAMESPACE` from `~/lib/tql-namespace` instead of hardcoding `entity:`.

### EQL-S Query Examples

```
FIND entity AS ?t WHERE ?t.type = "task" RETURN ?t.title, ?t.startDate, ?t.taskStatus
FIND entity AS ?n WHERE ?n.type = "note" RETURN ?n.title ORDER BY ?n.updatedAt DESC LIMIT 10
```

## CLI

The CLI is available via `just trellis` or `node packages/trellis-cli/bin/trellis.mjs`:

```bash
just trellis health --pretty
just trellis query 'FIND entity AS ?e WHERE ?e.type = "task"' --pretty
just trellis get entity:task-1 --pretty
just trellis create --type entity --id 'entity:my-id' --data '{"type":"task","title":"My Task"}' --agent-id my-agent
just trellis update entity:my-id --type entity --data '{"title":"Updated"}' --agent-id my-agent
just trellis delete entity:my-id --agent-id my-agent
just trellis link entity:task-1 relatedTo entity:note-1
just trellis watch                    # SSE stream
just trellis schema --pretty          # List ontologies
just trellis log --pretty             # Mutation log
```

### Ontology CRUD via CLI

```bash
just trellis ontology list --pretty
just trellis ontology get 'trellis:schema/entity' --pretty
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

### Platform CRUD via CLI

Platform resources (orgs, apps, collections, pages, tags, workflows, settings) are managed via `/api/platform/*` routes backed by the TQL kernel.

```bash
# Workspace context
just trellis org list --pretty
just trellis org create --name "Media CMS" --slug media-cms
just trellis app create --name "Production" --icon "lucide:video" --org-id platform:org/media-cms
just trellis app list --pretty
just trellis context --pretty
just trellis context set --org-id platform:org/media-cms --app-id platform:app/production

# Collections & Pages
just trellis collection create --name "Episodes" --slug episodes
just trellis page create --title "Dashboard" --data-source show --layout grid

# Comments & Tags
just trellis comment add entity:task-1 --content "Reviewed and approved"
just trellis comment list entity:task-1 --pretty
just trellis tag create --name "Priority" --color "bg-red-500"
just trellis tag assign entity:task-1 --tags "priority,reviewed"

# Bulk operations
just trellis bulk update --query 'FIND entity AS ?t WHERE ?t.type = "task" AND ?t.taskStatus = "pending"' --data '{"taskStatus":"in-progress"}'
just trellis bulk delete --query 'FIND entity AS ?t WHERE ?t.type = "task" AND ?t.taskStatus = "completed"'

# Workflows
just trellis workflow create --name "Auto-triage" --trigger '{"type":"onCreate","entityType":"task"}'
just trellis workflow list --pretty

# Settings
just trellis setting set theme dark
just trellis setting get theme --pretty
just trellis setting list --pretty

# Rich text body (for notes, pages, documents)
just trellis create --type entity --id entity:meeting-notes --data '{"type":"note","title":"Notes"}' --body '# Agenda\n- Review goals'
```

Context persistence: `~/.trellis/context.json` stores the current org + app. Use `--org` / `--app` flags to override per-command.

## SDK

```js
import { TrellisClient } from '@turtle.tech/trellis-cli'
const client = new TrellisClient({ agentId: 'my-agent' })

// The SDK uses the raw entity namespace — app code should use tql-namespace helpers instead
await client.createNode('entity:new', 'entity', { type: 'task', title: 'Hello' })
await client.query('FIND entity AS ?t WHERE ?t.type = "task"')
await client.ontologies()
await client.createOntology({ '@id': 'trellis:schema/invoice', '@type': 'trellis:Schema', version: '1.0.0', fields: [...] })
```

## MCP Server

The MCP server (`packages/trellis-mcp/`) exposes 49 tools (16 graph + 33 platform):

`get_graph_summary`, `query_graph`, `get_node`, `get_nodes`, `create_node`, `update_node`, `delete_node`, `link_nodes`, `graph_health`, `get_schema`, `get_catalog`, `get_mutation_log`, `get_ontology`, `create_ontology`, `update_ontology`, `delete_ontology`

> **Start with `get_graph_summary`** — returns health, entity type counts, ontology names, top attributes, link relations, and recent mutations in a single call. Replaces `graph_health` + `get_schema` + `get_catalog` for agent orientation.

### Connect to the MCP Server

**Claude Code** (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "trellis-graph": {
      "command": "node",
      "args": ["packages/trellis-mcp/bin/serve.mjs"],
      "env": { "TRELLIS_PORT": "1414", "TRELLIS_AGENT_ID": "claude" }
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
      "env": { "TRELLIS_PORT": "1414", "TRELLIS_AGENT_ID": "opencode" }
    }
  }
}
```

## Ontology Field Types

When creating ontology fields, use these Notion-compatible value types:

`title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `people`, `files`, `checkbox`, `url`, `email`, `phone_number`, `relation`, `rollup`, `formula`

## Linking Conventions

| Relation               | Meaning                 |
| ---------------------- | ----------------------- |
| `assignedTo`           | Task/item → Person      |
| `belongsTo`            | Entity → Project/Folder |
| `references`           | Bidirectional reference |
| `dependsOn`            | Task dependency chain   |
| `parentOf` / `childOf` | Container hierarchy     |

## CLI Purity Rules

**NEVER pipe CLI output through `node -e`, `python -c`, `jq`, `awk`, or any inline script.**

The CLI has built-in flags for every common need. If you need programmatic access to query results, use MCP tools instead of piping CLI output.

```bash
# Orientation — call this FIRST
just trellis summary --pretty

# Queries with built-in formatting
just trellis query 'FIND entity AS ?e WHERE ?e.type = "task"' --pretty
just trellis query '...' --count                    # just the row count
just trellis query '...' --fields title,startDate --pretty  # specific columns

# Single entity
just trellis get entity:task-1 --pretty
```

**Forbidden patterns:**

- ❌ `just trellis query '...' | node -e "..."`
- ❌ `just trellis query '...' | python3 -c "..."`
- ❌ `just trellis query '...' 2>&1 | node -e "..."`
- ❌ Any command that pipes `just trellis` output into another program

**Instead:** Use MCP tools (`query_graph`, `get_node`, `get_graph_summary`) for programmatic access. They return structured JSON directly — no shell piping needed.

## Key Conventions

- **Dev server**: Always running on `localhost:$TRELLIS_PORT` — never start it yourself
- **Agent ID**: Pass `--agent-id <name>` (or set `TRELLIS_AGENT_ID`) to track who made a mutation
- **Entity IDs**: Use descriptive slugs — `"task-deploy-v2"` not `"abc123"`
- **Dates**: ISO 8601 — `"2026-02-10"` for dates, `"14:30"` for times
- **Mutations are realtime**: The browser UI updates instantly via SSE
- **Always set a title**: Every entity needs at minimum `{ title: "..." }`
- **Link after creating**: Create both entities first, then link them

## Data Adapter (Unified Data Layer)

Trellis supports two data modes, toggled via the `TRELLIS_DATA_MODE` env var:

| Mode                | Env Value | Auth                     | Entity Storage       | Platform Data                |
| ------------------- | --------- | ------------------------ | -------------------- | ---------------------------- |
| **Local** (default) | `local`   | No login (Obsidian-like) | TQL kernel (SQLite)  | instant-local (localStorage) |
| **Cloud**           | `cloud`   | Real InstantDB auth      | InstantDB `entities` | InstantDB cloud              |

**Key files:**

- `app/lib/data-adapter/types.ts` — `DataAdapter` interface
- `app/lib/data-adapter/local-adapter.ts` — wraps instant-local
- `app/lib/data-adapter/cloud-adapter.ts` — wraps `@instantdb/core`
- `app/lib/data-adapter/migrate.ts` — export/import between modes
- `plugins/instant.client.ts` — selects adapter based on env var
- `composables/useDataAdapter.ts` — typed access to active adapter
- `composables/useAdapterStatus.ts` — reactive mode/health info

**Env vars** (set in `.env`):

```
TRELLIS_DATA_MODE=local          # or 'cloud'
INSTANT_APP_ID=<your-app-id>     # required for cloud mode
```

**Ontology tiering:**

- `core` — immutable, hardcoded in TQL kernel
- `system` — code-defined, loaded at boot
- `user` — stored in database (TQL or InstantDB depending on mode), shareable

The TQL kernel **always runs** in both modes — it serves core/system ontologies, graph queries, CLI, and MCP tools.

## Entity types vs collections vs browse (UI vocabulary)

Three overlapping concepts — keep them distinct when wiring UI or docs:

| Layer | What it is | Where |
| ----- | ---------- | ----- |
| **TQL ontologies** | Graph entity types (`task`, `note`, user-tier `invoice`, …) | `/ontologies`, `/workspace/browse/:type` |
| **InstantDB collections** | Notion-style spreadsheet databases (separate from graph type slugs) | `/collections/[slug]` |
| **CustomType settings** (deprecated) | Legacy app settings stored in InstantDB | `/types/*` redirects to `/ontologies` |

**Three capability axes on each ontology** (orthogonal):

| Axis | Meaning | Example |
| ---- | ------- | ------- |
| **Tier** | Who owns the schema | `core` / `system` / `user` |
| **Browse** | Appears in unified workspace browse | `browse.enabled: true` on user types |
| **Presentation** | How records open | `DynamicEntityDialog`, custom shell, or `routed: '/messages'` |

**Canonical URLs:**

- All types aggregate: `/workspace/browse`
- Single type records: `/workspace/browse/:type` (preferred over `?type=` on index)
- Schema editor: `/ontologies/:type`
- Spreadsheet DB: `/collections/:slug` (InstantDB wins if slug collides with an ontology type)

**Host resolver:** `apps/web/app/lib/collection-host-resolver.ts` + `useCollectionHost()` — single policy for `/collections/:slug` vs `/workspace/browse/:type`. When both InstantDB and a browsable ontology share a slug, InstantDB wins; sidebar hides the duplicate ontology link (`collision: true` in dev logs).

Capability helpers: `apps/web/app/lib/ontology-capabilities.ts`, `ontology-reserved-keys.ts`.

**Migrate legacy CustomTypes:** `bun apps/web/scripts/migrate-custom-types-to-ontologies.ts --app-id <id> --dry-run`

**Collection create dual-write (Phase 3c):** `database` collections auto-provision a user-tier ontology via `provisionCollectionOntology()` in `collection-schema-to-ontology.ts` (called from `useInstantData.createCollection`). Reserved slugs skip silently; duplicates are no-ops.

## Sidebar affordances (UI agents)

When adding a new projection or tool surface, wire AppSidebar using one of three patterns:

| Pattern | When | Key files |
| ------- | ---- | --------- |
| **Route-owned panel** | Full custom nav while on `/decks`, `/pages`, etc. | `trellis-shell-routes.ts`, `components/*/*Sidebar.vue`, `AppSidebar.vue` |
| **Workspace `specialItems`** | Dynamic entity list under `/workspace` (WORKSHOP) | `sidebarSeeds.ts`, `useRoutes.ts`, `lib/sidebar-affordances.ts` |
| **Static `sidebarSections`** | Mail labels, settings tabs | `trellis-shell-routes.ts` only |

**Start here:** `docs/getting-started/AFFORDANCE_SIDEBAR_GUIDE.md` (checklist + decks reference impl). Registry: `apps/web/app/lib/sidebar-affordances.ts`. Runtime matrix: `docs/architecture/SIDEBAR_BEHAVIOR.md`.

**Decks** use Pattern A — do not set `meta.sidebarSectionPath: '/workspace'` on deck routes; `/decks` owns its sidebar section.

## Shell chrome (UI agents)

**`AccountRailCluster`** (Local badge optional, bell, avatar, quick create, capture) mounts in **`AppHeader.vue` top-right** after `AppMenubar` with `placement="header"`. **Never** mount on `IconRail` — the bottom dock is navigation only.

Guard: `apps/web/app/components/layout/shell-chrome-placement.test.ts` · E2E: `tests/e2e/campus-dock-resident.spec.ts`

## Further Reading

- `packages/trellis-mcp/SKILL.md` — Full domain knowledge (entity fields, examples, best practices)
- `.windsurf/workflows/trellis-cli.md` — Step-by-step CLI workflow
- `docs/architecture/` — App architecture documentation
- `docs/data/` — Data layer and seeding guides
- `.windsurf/plans/unified-data-layer-fd57dd.md` — Full data adapter implementation plan
