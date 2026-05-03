# Trellis — Architecture

> System-level overview. Read [`VISION.md`](./VISION.md) for the **why**, this for the **what**, and [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md) for the **how** in the frontend.

---

## The 30-second picture

```
                      ┌──────────────────────────────────────────┐
                      │           AGENT SURFACE                  │
                      │  MCP server (48 tools) │ CLI │ Hooks     │
                      └──────────────────┬───────────────────────┘
                                         │  HTTP / SSE
                                         ▼
┌───────────────┐   /api/graph/*  ┌──────────────┐   reads/writes  ┌──────────────┐
│  Nuxt UI      │ ───────────────▶│  TQL Kernel  │ ◀───────────────│ better-sqlite│
│  (apps/web)   │ ◀──── SSE ──────│  (packages   │                 │   (.tql/)    │
└───────┬───────┘   /api/graph/   │   /tql)      │                 └──────────────┘
        │           events                       
        │
        ▼  (cloud mode only)
┌───────────────┐
│  InstantDB    │  ← platform data (orgs, members, settings)
└───────────────┘
```

Three things to internalize:

1. **TQL is the source of truth.** Entities, ontologies, edges — all stored in the TQL kernel. The UI is a projection, not a record.
2. **Mutations stream live.** Every `createNode`/`updateNode`/`link` op is broadcast over SSE at `/api/graph/events`. Browser tabs and agents see the same mutation feed.
3. **Two modes share the same kernel API.** `local` mode runs TQL on better-sqlite3 in `.tql/`; `cloud` mode federates with InstantDB. Application code calls the same endpoints either way.

---

## Monorepo layout

```
trellis-client/
├── apps/
│   ├── web/                  ← The product. Nuxt 3 + TQL.
│   │   ├── app/              ← Frontend (Vue, composables, components)
│   │   ├── server/           ← Nitro server (api routes, plugins, utils)
│   │   ├── public/           ← Static assets
│   │   ├── scripts/          ← Local dev/maintenance scripts
│   │   ├── tests/e2e/        ← Playwright (vitest tests are colocated)
│   │   ├── nuxt.config.ts    ← Nuxt config (srcDir = app/)
│   │   ├── instant.schema.ts ← InstantDB schema (cloud mode only)
│   │   └── instant.perms.ts  ← InstantDB permissions
│   └── desktop/              ← Tauri shell wrapping the web app
├── packages/
│   ├── tql/                  ← Kernel + EAV store + EQL-S engine
│   │   ├── kernel/           ← Op log, snapshot, replay
│   │   ├── store/            ← EAV (entity-attribute-value)
│   │   ├── graph/            ← Graph traversal helpers
│   │   ├── query/            ← EQL-S parser/executor
│   │   ├── persist/          ← Backends: jsonl, sqlite
│   │   ├── workflows/        ← Workflow primitives
│   │   ├── analytics/        ← Op-log analytics
│   │   └── computation/      ← Computed-field resolvers
│   ├── trellis-cli/          ← CLI (`just trellis ...`) + TypeScript SDK
│   ├── trellis-mcp/          ← MCP server (48 tools — see SKILL.md)
│   ├── types/                ← Cross-package types
│   └── utils/                ← Cross-package utilities
├── hooks/                    ← Windsurf agent lifecycle hooks
│                                (write decision traces into TQL)
├── living-docs/              ← Auto-generated docs (see its README)
├── docs/                     ← Hand-written docs
│   ├── architecture/         ← Architecture deep-dives
│   ├── getting-started/      ← Setup, deployment, verification
│   ├── pitch/                ← Pitch deck, demo script
│   ├── planning/             ← Plans (active and historical)
│   └── research/             ← Source papers (Filegraph etc.)
└── .windsurf/                ← Workflows + rules for the IDE agent
```

---

## Data flow (request lifecycle)

A typical user action (`add a task`) goes:

```
1. UI                       Component calls useEntities().create({ type: 'task', title: ... })
                                ↓
2. Composable               useTrellisEntities() picks the adapter:
                                local → fetch /api/graph/mutate
                                cloud → InstantDB transact
                                ↓
3. Server route             apps/web/server/api/graph/[...path].ts (catch-all)
                                ↓ delegates to useWorkspaceConfig().kernel
4. TQL kernel               packages/tql/kernel/trellis-kernel
                                .applyOp({ action: 'createNode', ... })
                                ↓
5. Persistence              .tql/ops.jsonl + better-sqlite3
                                ↓
6. SSE broadcast            /api/graph/events stream → all listeners
                                ↓
7. UI rehydrates            Composables apply the op to their reactive store
```

The same path applies to agent mutations from MCP tools, the CLI, or hooks — every writer goes through the same kernel API and the same SSE feed sees them.

---

## The agent surface

There are **three** ways an AI agent (or another program) can talk to Trellis:

| Surface              | Protocol            | Use case                                                       |
|----------------------|---------------------|----------------------------------------------------------------|
| **MCP server** (48 tools) | Model Context Protocol | Coding assistants (Claude/Windsurf/Cursor) inside the IDE     |
| **CLI**              | shell               | Humans + scripts: `just trellis create/update/query/watch`     |
| **HTTP API**         | REST + SSE          | Anything else (other apps, integrations, public API)           |

All three terminate at the same TQL kernel. There is no special "agent path" — agents are first-class clients on the same API every other client uses. See [`AGENTS.md`](./AGENTS.md).

### Hooks (`hooks/*.ts`)

Hooks are a separate substrate: they run in **Windsurf's lifecycle** (pre-/post-cascade-response, post-commit, etc.) and write *decision traces* into TQL. Every agent action becomes a graph fact. See `hooks/__tests__/` for the contract and `living-docs/CHANGELOG.md` for live output.

---

## Two-axis entity system

Every entity has a **class** (structural shape) and a **type** (specific kind):

| Class         | Examples                                          | Storage shape                       |
|---------------|---------------------------------------------------|-------------------------------------|
| **temporal**  | task, event, trip, payment, milestone, sprint     | has `startDate`, lives on calendar  |
| **document**  | note, file, page, template, slide_deck, bookmark  | has rich `content` body             |
| **actor**     | person, contact, organization, vendor             | represents an entity-with-agency    |
| **container** | project, folder, collection, goal                 | groups other entities               |

ID format: `entity:<slug>` (e.g. `entity:task-onboarding`). All entities share the `entity` TQL namespace.

Per-type ontologies live in [`apps/web/server/utils/tql-ontologies.ts`](./apps/web/server/utils/tql-ontologies.ts). Adding a new entity type cascades into sidebar items, browse pages, and dialogs automatically. See [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md) → "Adding a New Entity Type".

---

## Two modes

| Aspect              | `local` mode                      | `cloud` mode                       |
|---------------------|-----------------------------------|------------------------------------|
| Entity storage      | TQL kernel + better-sqlite3       | InstantDB                          |
| Platform data       | instant-local (localStorage)      | InstantDB                          |
| Realtime sync       | SSE from local server             | InstantDB live queries             |
| Auth                | Local user ID                     | InstantDB auth                     |
| Default?            | Yes (`TRELLIS_DATA_MODE=local`)   | Opt-in (`=cloud`)                  |

Switching modes is a config flip; application code uses the adapter pattern (`useEntities()` etc.) and doesn't care which is active. See [`apps/web/app/lib/data-adapter/`](./apps/web/app/lib/data-adapter).

---

## Tech stack

| Layer            | Tool                                 |
|------------------|--------------------------------------|
| Web framework    | Nuxt 3 (Vue 3, Vite)                 |
| Desktop shell    | Tauri (Rust)                         |
| Storage (local)  | better-sqlite3 via TQL persist layer |
| Storage (cloud)  | InstantDB                            |
| UI primitives    | shadcn/ui (via `ui-thing`), reka-ui  |
| Styling          | Tailwind v4 + CSS variables          |
| Editor           | TipTap                               |
| Test runner      | Vitest (unit) + Playwright (e2e)     |
| Linter           | ESLint 9 (flat config)               |
| Package manager  | pnpm (workspace) + Turborepo         |
| Task runner      | `just` (justfile)                    |
| Schema           | Zod + JSON-LD ontologies             |

---

## Where to deepen

| Topic                          | Source                                                                   |
|--------------------------------|--------------------------------------------------------------------------|
| Kernel internals               | [`packages/tql/kernel/`](./packages/tql/kernel)                          |
| EQL-S query language           | [`packages/tql/query/`](./packages/tql/query)                            |
| MCP tool reference             | [`packages/trellis-mcp/SKILL.md`](./packages/trellis-mcp/SKILL.md)       |
| Frontend conventions           | [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md)           |
| Data layer / adapter pattern   | [`docs/architecture/DATA_LAYER.md`](./docs/architecture/DATA_LAYER.md)   |
| Route configuration design    | [`docs/architecture/ROUTE_CONFIG_ARCHITECTURE.md`](./docs/architecture/ROUTE_CONFIG_ARCHITECTURE.md) |
| Graph-driven page rendering    | [`docs/architecture/GRAPH_DRIVEN_PAGES_IMPLEMENTATION.md`](./docs/architecture/GRAPH_DRIVEN_PAGES_IMPLEMENTATION.md) |
| JSON-LD strategy               | [`docs/architecture/JSON_LD_ARCHITECTURE.md`](./docs/architecture/JSON_LD_ARCHITECTURE.md) |
| Undo/redo design               | [`docs/architecture/UNDO_REDO.md`](./docs/architecture/UNDO_REDO.md)     |
| The Filegraph paper (origin)   | [`docs/research/`](./docs/research)                                      |
