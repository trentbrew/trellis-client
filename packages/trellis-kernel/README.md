# `@turtle.tech/tql`

The Trellis kernel: a schema-agnostic Entity-Attribute-Value (EAV) datalog engine with realtime sync, middleware, and a custom query language.

> **TQL is the source of truth for everything in Trellis.** All entities, links, and ontologies live here. The web app, MCP server, CLI, and hooks are all clients of this kernel.

---

## Module map

```
packages/tql/
├── kernel/        ← Lifecycle, ops, middleware pipeline
│   ├── trellis-kernel.ts        Top-level API: applyOp, query, subscribe
│   ├── operations.ts            Op types: createNode, updateNode, deleteNode, link
│   ├── middleware.ts            Pipeline runner
│   ├── security-middleware.ts   Optional auth/zone enforcement
│   ├── schema-middleware.ts     Ontology validation
│   ├── logic-middleware.ts      Computed-field hydration
│   ├── ai-interop.ts            Embedding + LLM hooks
│   ├── sync.ts                  SSE broadcast adapter
│   ├── workspace.ts             Multi-workspace scoping
│   └── core-ontology.ts         Bootstrap ontologies (entity, ontology, …)
├── store/         ← EAV in-memory store
│   └── eav-store.ts             Fact/Link/Atom primitives + flatten/jsonEntityFacts
├── query/         ← EQL-S query language
│   ├── eqls-parser.ts           "FIND … WHERE … RETURN …" → AST
│   ├── datalog-evaluator.ts     AST → query result via the EAV store
│   ├── query-optimizer.ts       Predicate ordering, index hints
│   ├── attribute-resolver.ts    Resolves dotted attribute paths
│   └── query-generator.ts       Programmatic query builder
├── persist/       ← Pluggable storage backends
│   ├── backend.ts               Backend interface
│   ├── jsonl-backend.ts         Append-only JSONL ops (.tql/ops.jsonl)
│   ├── better-sqlite-backend.ts Production: SQLite via better-sqlite3
│   └── sqlite-backend.ts        Legacy node-sqlite3 backend
├── computation/   ← Formula evaluator (computed fields)
├── workflows/     ← Workflow primitives
├── analytics/     ← Op-log analytics
├── cli/           ← Internal CLI helpers (the user-facing CLI is packages/trellis-cli)
└── telemetry.ts
```

---

## Quick usage

```ts
import { TrellisKernel } from '@turtle.tech/tql/kernel'
import { BetterSqliteBackend } from '@turtle.tech/tql/persist/better-sqlite'

const kernel = new TrellisKernel({
  backend: new BetterSqliteBackend({ path: '.tql/state.sqlite' }),
})

await kernel.bootstrap()

// Apply a mutation
await kernel.applyOp({
  action: 'createNode',
  entityId: 'entity:my-task',
  type: 'entity',
  data: { type: 'task', title: 'Write the README', startDate: '2026-05-03' },
  agentId: 'cli',
})

// Run a query
const results = await kernel.query(`
  FIND entity AS ?t
  WHERE ?t.type = "task"
  RETURN ?t.title, ?t.startDate
  ORDER BY ?t.startDate DESC
  LIMIT 10
`)

// Subscribe to mutations (used internally by SSE bridge)
const unsub = kernel.subscribe((op) => {
  console.log('mutation:', op.action, op.entityId)
})
```

In the Nuxt app, you almost never instantiate the kernel directly — the server plugin (`apps/web/server/plugins/tql.ts`) wires it up and exposes `useWorkspaceConfig().kernel`.

---

## EQL-S — Entity Query Language

A SPARQL-flavored query language designed to read like English-shaped predicates.

```
FIND <namespace> AS ?var
[WHERE  predicate (AND predicate)*]
[RETURN ?var.attr (, ?var.attr)*]
[ORDER BY ?var.attr (ASC|DESC)?]
[LIMIT n]
```

Common patterns:

```
FIND entity AS ?n WHERE ?n.type = "note" RETURN ?n.title ORDER BY ?n.updatedAt DESC LIMIT 20
FIND entity AS ?p WHERE ?p.type = "person" AND ?p.relatedTo = "entity:project-acme"
FIND entity AS ?t WHERE ?t.type = "task" AND ?t.taskStatus != "completed"
```

See `query/query-examples.ts` for more.

---

## Op model

Every mutation is a typed op:

```ts
type Op =
  | { action: 'createNode'; entityId: string; type: string; data: Record<string, unknown>; agentId?: string }
  | { action: 'updateNode'; entityId: string; type: string; data: Record<string, unknown>; agentId?: string }
  | { action: 'deleteNode'; entityId: string; agentId?: string }
  | { action: 'link';       e1: string; relation: string; e2: string;                         agentId?: string }
```

Ops are **append-only** in the JSONL log and rebuildable into the in-memory EAV store via replay or snapshot+ops. Snapshots cut replay cost; see `kernel/operations.ts` and the snapshot logic in the better-sqlite backend.

---

## Persistence backends

Choose a backend per workspace:

| Backend                   | Use case                              | Storage                  |
|---------------------------|---------------------------------------|--------------------------|
| `JsonlBackend`            | dev / debugging — human-inspectable   | `.tql/ops.jsonl`         |
| `BetterSqliteBackend`     | production / desktop                  | `.tql/state.sqlite`      |
| `SqliteBackend` (legacy)  | older deployments                     | sqlite via node-sqlite3  |

All backends implement `Backend` from `persist/backend.ts`.

---

## How clients use TQL

| Client            | Path                                               |
|-------------------|----------------------------------------------------|
| Web app           | `apps/web/server/plugins/tql.ts` (server plugin)   |
| MCP server        | `packages/trellis-mcp/src/`                        |
| CLI               | `packages/trellis-cli/src/`                        |
| Agent hooks       | `hooks/_kernel.ts` (shared factory)                |
| Tests             | direct in-process kernel instances                 |

See [`AGENTS.md`](../../AGENTS.md) for the full HTTP API + SDK reference, and [`ARCHITECTURE.md`](../../ARCHITECTURE.md) for the request lifecycle.

---

## Tests

Tests live alongside source files: `packages/tql/**/*.test.ts`. Run via:

```bash
pnpm --filter @turtle.tech/tql test
```
