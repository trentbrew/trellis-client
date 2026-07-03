# ADR-002 — Kernel fork file audit

**Date:** 2026-07-03  
**Author:** agent:executor (TRL-18)  
**Embedded:** `packages/trellis-kernel/` (`@turtle.tech/trellis-kernel@0.1.0`, private)  
**Published:** `trellis@3.2.3` (resolved from `apps/web/node_modules/trellis`, lockfile `^3.2.0`)  
**Parent:** TRL-12 (ADR-002 epic) · divergence audit §4  
**Verdict key:** `port` · `keep embedded` · `upstream` · `drop` · `defer`

---

## Executive summary

| Metric | Value |
|--------|-------|
| Embedded `.ts` files inventoried | **59** |
| Additional `.tsx` (not in table) | **1** (`graph/InkLogger.tsx` — CLI TUI only) |
| Total embedded LOC (`.ts`) | ~15,400 |
| Monorepo direct importers (`@turtle.tech/trellis-kernel*`) | **21** files |
| Hooks relative importers (`packages/trellis-kernel/`) | **18** files |
| Deprecated `@turtle.tech/tql` shim packages | **8** re-export files, **0** runtime importers |

### Verdict totals (59 `.ts` files)

| Verdict | Count | Share |
|---------|-------|-------|
| **port** | 16 | 27% |
| **keep embedded** | 16 | 27% |
| **upstream** | 13 | 22% |
| **drop** | 13 | 22% |
| **defer** | 1 | 2% |

### Top 5 findings

1. **npm `trellis/core` is a near-structural twin** of the embedded fork — `EAVStore`, `TrellisKernel`, `QueryEngine`, persistence backends, and `ExprEvaluator` all exist in npm 3.2.3 with matching export names. The fork is transitional, not a divergent engine.
2. **Nuxt server hot path is narrow** — runtime-critical imports are `TrellisKernel`, `BetterSqliteBackend`, and workspace/schema **types** from `kernel/workspace.ts`. Query optimizer and EQL-S stack are used only *through* `TrellisKernel.query()`, not imported directly by app code.
3. **`graph/` is fork-only and app-coupled** — `useWorkflowExecution.ts` imports `Graph` + `Engine` for agent workflow UI. No equivalent in npm `trellis/core`; closest npm surfaces are `trellis/ai` orchestration and plugin hooks (different shape).
4. **`workflows/` + `analytics/` are CLI-internal** — YAML workflow engine (`cli/tql.ts`) and insights engine (`cli/tql-insights.ts`) are not on the Nuxt request path. `hooks/tql-insights.ts` runs EQL queries via `TrellisKernel` only — it does not import `analytics/*`. Safe to **keep embedded** short-term or **upstream** as optional trellis CLI modules.
5. **`packages/tql` shims are dead weight** — eight deprecated re-export files exist; `scripts/check-kernel-imports.mjs` enforces `@turtle.tech/trellis-kernel` directly. Shims can be **dropped** after grep confirms zero `@turtle.tech/tql` imports (confirmed: none outside the check script).

---

## Module overview

| Embedded module | LOC | Closest npm surface | Structural class | Aggregate verdict |
|-----------------|-----|---------------------|------------------|-------------------|
| `store/` | 484 | `trellis/core` → `EAVStore` | npm-parity | **port** |
| `persist/` | 609 | `trellis/core`, `trellis/persist/*` | npm-parity | **port** |
| `kernel/` | 2,396 | `trellis/core` → `TrellisKernel`, middleware | fork-extends | **port** (engine) + **keep embedded** (workspace boot) |
| `query/` | 2,787 | `trellis/core` → `QueryEngine`, `parseQuery` | npm-parity | **upstream** (optimizer deltas) |
| `computation/` | 948 | `trellis/core` → `ExprEvaluator`, rollups | npm-parity | **port** |
| `graph/` | 1,918 | `trellis/ai`, `trellis/plugins/*` (partial) | fork-only | **keep embedded** |
| `workflows/` | 2,578 | — | fork-only | **keep embedded** / **upstream** |
| `analytics/` | 1,658 | — | fork-only | **upstream** or **drop** |
| `cli/` | 2,664 | `trellis` bin (different entry) | fork-only | **drop** (from web app dep graph) |
| `telemetry.ts` | 161 | — | fork-only | **drop** |
| `index.ts` | 39 | `trellis/core` barrel | npm-parity | **port** |

---

## Published `trellis` subpath map

Resolved **3.2.3** exports (from `apps/web/node_modules/trellis/package.json`):

| npm subpath | Responsibility | Maps to embedded |
|-------------|----------------|------------------|
| `trellis/core` | EAV, kernel, query, computation, ontology, agents | `store/`, `kernel/`, `query/`, `computation/` |
| `trellis/db` | TrellisDb client, sql.js/better-sqlite | Client-side (kernel-bridge uses HTTP, not embedded) |
| `trellis/schema` | `defineType`, schema registry | P1 `trellis_schema` entities (partial) |
| `trellis/server` | HTTP entity API, WS realtime | Sidecar + future server convergence |
| `trellis/realtime` | RealtimeRoom, presence, relay | P0 shipped; P2 join middleware **defer** |
| `trellis/vue`, `trellis/vue/typed` | Live queries | TRL-16/17 kernel-bridge |
| `trellis/vcs` | Graph-native VCS | Separate track from embedded kernel |
| `trellis/links`, `trellis/decisions` | Capability modules | Campus substrate (keep embedded Nuxt glue) |
| `trellis/persist/better-sqlite`, `trellis/persist/sqljs` | Kernel backends | `persist/better-sqlite-backend.ts`, `sqlite-backend.ts` |
| `trellis/ai` | Embeddings / agent hooks | Not equivalent to `graph/engine.ts` |
| `trellis/react`, `trellis/svelte` | UI bindings | **drop** for this client (Vue only) |

---

## File inventory

> Regenerate LOC/export column: `node scripts/audit-kernel-fork-inventory.mjs`  
> **Note:** `graph/InkLogger.tsx` (~707 LOC) is CLI TUI; omitted from table per spec (tsx optional).

| File | LOC | Purpose | Verdict |
|------|-----|---------|---------|
| `index.ts` | 39 | Package barrel re-exports | port |
| `telemetry.ts` | 161 | CLI telemetry stub (`TQL_TELEMETRY`) | drop |
| **store/** | | | |
| `store/eav-store.ts` | 484 | EAV fact store, catalog, query types | port |
| **persist/** | | | |
| `persist/backend.ts` | 66 | `KernelOp`, `KernelBackend` interface | port |
| `persist/jsonl-backend.ts` | 118 | JSONL op-log backend (hooks/tests) | port |
| `persist/sqlite-backend.ts` | 211 | SQLite backend | port |
| `persist/better-sqlite-backend.ts` | 214 | better-sqlite3 backend (Nuxt prod) | port |
| **kernel/** | | | |
| `kernel/trellis-kernel.ts` | 1113 | `TrellisKernel` — query, mutate, boot | port |
| `kernel/workspace.ts` | 241 | `WorkspaceConfig`, route/schema/projection defs | keep embedded |
| `kernel/core-ontology.ts` | 340 | `CORE_ONTOLOGY` seed schema | keep embedded |
| `kernel/middleware.ts` | 42 | Middleware chain types | port |
| `kernel/operations.ts` | 52 | Op factory helpers | port |
| `kernel/schema-middleware.ts` | 59 | Schema validation on mutate | port |
| `kernel/schema-validator.ts` | 104 | Zod-like entity validation | upstream |
| `kernel/security-middleware.ts` | 97 | Security hooks | defer |
| `kernel/logic-middleware.ts` | 262 | Logic / rollup middleware | port |
| `kernel/ai-interop.ts` | 34 | NL query options types | keep embedded |
| `kernel/sync.ts` | 56 | `SyncProvider` interface | upstream |
| **query/** | | | |
| `query/index.ts` | 5 | Query barrel | port |
| `query/eqls-parser.ts` | 1076 | EQL-S → Datalog translation | upstream |
| `query/datalog-evaluator.ts` | 704 | Datalog runtime | upstream |
| `query/query-optimizer.ts` | 194 | Goal reorder + filter pushdown | upstream |
| `query/attribute-resolver.ts` | 124 | Attribute name resolution | upstream |
| `query/query-generator.ts` | 329 | NL → EQL generator | keep embedded |
| `query/query-examples.ts` | 355 | Example query corpus | drop |
| **computation/** | | | |
| `computation/index.ts` | 9 | Computation barrel | port |
| `computation/expr-evaluator.ts` | 452 | Expression evaluator | port |
| `computation/formula-evaluator.ts` | 161 | Formula field evaluation | port |
| `computation/builtin-functions.ts` | 262 | Builtin formula functions | upstream |
| `computation/kernel-integration.ts` | 64 | `jsonEntityFactsWithExpr` | port |
| **graph/** | | | |
| `graph/index.ts` | 10 | Graph barrel | keep embedded |
| `graph/graph.ts` | 38 | `Graph` container | keep embedded |
| `graph/engine.ts` | 378 | Agent `Engine` execution | keep embedded |
| `graph/executors.ts` | 156 | Node executors | keep embedded |
| `graph/tools.ts` | 217 | Tool registry / `ToolFn` | keep embedded |
| `graph/types.ts` | 157 | Graph trace types | keep embedded |
| `graph/logger.ts` | 507 | Structured graph logger | drop |
| `graph/logger-index.ts` | 16 | Logger factory | drop |
| `graph/validators.ts` | 22 | Graph validators | keep embedded |
| `graph/util.ts` | 10 | Graph helpers | keep embedded |
| **workflows/** | | | |
| `workflows/index.ts` | 17 | Workflows barrel | keep embedded |
| `workflows/types.ts` | 140 | Workflow type defs | keep embedded |
| `workflows/schema.ts` | 157 | YAML workflow schema | upstream |
| `workflows/parser.ts` | 280 | YAML parser | upstream |
| `workflows/planner.ts` | 383 | Execution planner | upstream |
| `workflows/engine.ts` | 373 | `WorkflowEngine` | keep embedded |
| `workflows/runners.ts` | 510 | Step runners | keep embedded |
| `workflows/cache.ts` | 302 | Workflow cache | drop |
| `workflows/log-levels.ts` | 16 | Log level constants | drop |
| **analytics/** | | | |
| `analytics/index.ts` | 8 | Analytics barrel | upstream |
| `analytics/insights-engine.ts` | 846 | `InsightsEngine` | upstream |
| `analytics/dataset-relationship-analyzer.ts` | 804 | Dataset relationship analysis | upstream |
| **cli/** | | | |
| `cli/tql.ts` | 1248 | Fork-internal TQL REPL / workflow CLI | drop |
| `cli/tql-insights.ts` | 177 | Insights CLI entry | drop |
| `cli/repl.ts` | 199 | REPL shell | drop |
| `cli/tui-bridge.ts` | 295 | TUI bridge | drop |
| `cli/project-brain.ts` | 299 | Project brain CLI | drop |
| `cli/query-generator-cli.ts` | 241 | Query generator CLI | drop |
| `cli/query-gen-command.ts` | 205 | Query gen subcommand | drop |

**Coverage:** 59/59 `.ts` files · 100% verdict assignment.

---

## Import usage

### Direct `@turtle.tech/trellis-kernel` imports

| Import path | Importers | Count | Runtime critical? |
|-------------|-----------|-------|-------------------|
| `@turtle.tech/trellis-kernel` | `server/plugins/trellis-kernel.ts`, `server/api/graph/[...path].ts`, `server/lib/*`, `server/utils/campus-*.ts`, `server/utils/trellis-ontologies.ts`, `server/utils/trellis-shell-routes.ts`, `server/utils/zone-guard.ts`, tests | 15 | **yes** — Nuxt kernel plugin + graph API |
| `@turtle.tech/trellis-kernel/persist/better-sqlite` | `server/plugins/trellis-kernel.ts` | 1 | **yes** — production persistence |
| `@turtle.tech/trellis-kernel/persist/jsonl` | `server/lib/*-snapshot.test.ts`, `server/lib/seed-app-config.test.ts` | 2 | no — tests only |
| `@turtle.tech/trellis-kernel/graph` | `app/composables/useWorkflowExecution.ts`, `app/lib/workflow-tools/index.ts`, `app/lib/llm/index.ts` | 3 | **yes** — agent workflow UI |
| `packages/tql` → re-export shims | `packages/tql/{index,kernel,store,query,graph,persist*}.ts` | 8 | no — deprecated; zero external imports |

### Relative `packages/trellis-kernel/` imports (hooks)

| Pattern | Importers | Count | Runtime critical? |
|---------|-----------|-------|-------------------|
| `../packages/trellis-kernel/kernel/trellis-kernel.js` | `hooks/tql-*.ts`, `hooks/_kernel.ts` | 14 | **yes** — agent lifecycle / VCS hooks |
| `../packages/trellis-kernel/persist/jsonl-backend.js` | `hooks/_kernel.ts`, `hooks/__tests__/*` | 4 | partial — hook boot + tests |
| `../packages/trellis-kernel/kernel/core-ontology.js` | `hooks/__tests__/membership-contract.test.ts` | 1 | no — test |
| `../packages/trellis-kernel/kernel/schema-validator.js` | `hooks/__tests__/membership-contract.test.ts` | 1 | no — test |

**Not imported by monorepo:** `workflows/*` (except via `cli/tql.ts`), `analytics/*` (except `cli/tql-insights.ts`), `query/*` (internal to kernel), `computation/*` (internal to kernel), entire `cli/*` from app tree.

---

## Priority deep-dives

### Query (`query/`)

npm `trellis/core` exports `QueryEngine`, `parseQuery`, `DatalogRuntime` — same architectural layer as embedded `EQLSProcessor` + `DatalogEvaluator` + `QueryOptimizer`. Spot-check of `query-optimizer.ts` shows **filter pushdown** and **restrictiveness ordering** on Datalog goals; npm core includes an optimizer but line-level parity was not diffed (non-goal).

**Classification:** `eqls-parser.ts` + `datalog-evaluator.ts` → **npm-parity** with possible fork drift; `query-optimizer.ts` → **fork-extends** (catalog-aware ordering). `query-generator.ts` / `query-examples.ts` are NL/demo utilities with no npm equivalent.

**Rationale:** Retire embedded query stack when `TrellisKernel.query()` can delegate to `trellis/core` without EQL-S regression. Run paired query fixtures before port. Optimizer improvements should be **upstreamed** to trellis-node rather than maintained in two places.

### Workflows (`workflows/`)

Self-contained YAML workflow engine (`parser` → `planner` → `engine` → `runners`). Used by:

- `packages/trellis-kernel/cli/tql.ts` (`workflow run` subcommand)
- Nuxt `/api/workflows/*` routes (separate embedded util in `apps/web/server`, not direct import of this module)

No `trellis@3.2` export provides this YAML planner. npm has workflow-adjacent plugins (`trellis/plugins/plan-approval`, `proactive-watcher`) but different contract.

**Rationale:** **keep embedded** until product decides whether YAML workflows remain in Trellis Studio or migrate to npm plugin model. If kept, **upstream** generic parser/planner; keep Nuxt route glue embedded.

### Computation (`computation/`)

Embedded `expr-evaluator.ts` + `formula-evaluator.ts` integrate with `TrellisKernel` mutate path via `jsonEntityFactsWithExpr`. npm `trellis/core` exports `ExprEvaluator`, `evalExpr`, rollup helpers — same responsibility.

**Rationale:** **port** with kernel swap. `builtin-functions.ts` may contain Trellis-client-specific functions → classify **upstream** after diff. Low risk because computation is only invoked through kernel mutate, not direct app imports.

### Analytics (`analytics/`)

`InsightsEngine` + `DatasetRelationshipAnalyzer` (~1,650 LOC). Only reached from `cli/tql-insights.ts` — not on Nuxt hot path. (`hooks/tql-insights.ts` is a separate HQ insights script that queries via `TrellisKernel`, not this module.)

**Rationale:** **upstream** as optional `trellis/insights` module or **drop** if CLI insights command is retired. No port blocker for ADR-002 client convergence.

### Baseline engine (`kernel/trellis-kernel.ts` + `store/eav-store.ts`)

`TrellisKernel` constructor wires `EAVStore`, `DatalogEvaluator`, `EQLSProcessor`, middleware chain, and `WorkspaceConfig` boot. npm `TrellisKernel` in `trellis/core` matches this shape per `.d.ts` exports.

**Fork-extends:** `workspace.ts` + `core-ontology.ts` seed Trellis-client shell routes and campus types — **keep embedded** as Nuxt boot data until P1 graph-residency fully replaces `createWorkspaceConfig()` TS modules.

---

## Port queue

### Recommended next 3 wedges

1. **TRL-19 — Server kernel swap (`trellis/core`)**  
   Replace `server/plugins/trellis-kernel.ts` embedded `TrellisKernel` + `BetterSqliteBackend` with `import { TrellisKernel, createKernelBackend } from 'trellis/core'`. AC: existing graph API tests + `just trellis query` parity suite green. **Blocked-by:** none.

2. **TRL-20 — Ontology listing via schema registry**  
   Retire direct `kernel.listOntologies()` / `trellis-ontologies.ts` TS util for runtime listing; serve from P1 `trellis_schema` entity rows + `trellis/schema`. **Blocked-by:** TRL-19 (kernel import path stable).

3. ~~**TRL-21 — Agent graph engine decision**~~ **Shipped TRL-21** — see `adr-002-agent-graph-engine-audit.md`. Verdict: **keep embedded** `graph/`; `trellis/ai` is embeddings only; `AgentHarness` is complementary, not a DAG replacement.

### Blocked (not in queue)

**P2 — Zone-gated relay join** — move advisory `zone-guard.ts` into `trellis/realtime` middleware with capability grants. **Blocked-by:** SPEC-v1.1 (join protocol + enforcement semantics). Do not start until spec lands.

---

## Appendix — verification commands

```bash
# Section headers (expect ≥8 ## sections)
rg -n "^## " docs/architecture/adr-002-kernel-fork-file-audit.md

# Embedded file count (expect 59)
find packages/trellis-kernel -name '*.ts' | wc -l

# Direct kernel importers
rg -l '@turtle.tech/trellis-kernel' apps/web hooks packages --glob '*.{ts,vue,mjs}' | wc -l

# Regenerate inventory rows
node scripts/audit-kernel-fork-inventory.mjs

# npm resolved version
node -e "console.log(require('./apps/web/node_modules/trellis/package.json').version)"

# Docs-only diff check
git diff --stat -- docs/ scripts/audit-kernel-fork-inventory.mjs
```

**TRL-18 AC summary:** artifact ≥150 lines · 59/59 files · 5 import paths · npm 3.2.3 pinned · 3 port wedges + P2 blocked · divergence audit §4 updated.
