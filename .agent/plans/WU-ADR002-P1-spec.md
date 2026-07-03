# Spec: ADR-002 P1 — Graph-residency migration (routes, projections, ontologies)

**VCS:** TRL-14 (spec) · parent TRL-12 (epic)  
**ADR:** `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` § P1, D7  
**Builds on:** TRL-13 (P0 shipped)  
**Status:** queue-ready

---

## Problem

App definitions are **graph-shaped but not graph-resident**:

| Asset | Today | Read path |
|-------|-------|-----------|
| Shell routes | `trellis-shell-routes.ts` → `workspace.routes` in memory | `GET /api/graph/config` |
| Ontologies | `trellis-ontologies.ts` → `kernel.boot()` Map | same + `hydrateOntologiesFromFacts()` partial |
| Kernel projections | inline in `createWorkspaceConfig()` | `kernel.listProjections()` |
| Collection view registry | `trellis-projection-registry/collection-views.ts` (client) | not on server config at all |
| Client | `useTrellisConfig()` | `$fetch('/api/graph/config')` + SSE **refetch** on ontology/route mutations |

Agents cannot mutate nav/projections via graph ops and see the UI update without a redeploy.

## Goal

**The graph is source of truth for app config.** Renderer code stays code (projection string keys, Vue components). `useTrellisConfig()` reacts to graph changes without full-page reload.

## Non-goals (P1)

- `trellis/vue` SDK live-query adapter (P3)
- Sidecar / published `trellis` npm path (embedded kernel only)
- Zone-guard **enforcement** on config reads (advisory `zoneId` stamp optional)
- Collapsing bespoke tool pages (agent, query playground, graph viz)
- Merging HQ JSONL with web SQLite

---

## Architecture

```
Boot (trellis-kernel plugin)
  └─ seedAppConfigFromModules(kernel)   ← idempotent, once per boot
       ├─ routes: route:* document entities
       ├─ ontologies: existing ontology:* / trellis:Schema facts (extend seed)
       ├─ kernel projections: trellis:projection/* entities
       └─ collection views: trellis:projection-view/* entities

GET /api/graph/config
  └─ buildAppConfigSnapshot(kernel)
       ├─ primary: EQL-S / fact assembly from graph
       └─ fallback: createWorkspaceConfig() slices (cold start / empty DB)

Client useTrellisConfig()
  └─ initial fetch + useSSESubscribe → rebuild from /api/graph/config
       (P1: SSE-driven snapshot refresh; not full trellis subscribe yet)
```

**P1 live-query interpretation:** Reactive config via **SSE-invalidated snapshot** — same contract as today but config **must** be assembled from graph entities after seed. True `subscribe(query)` lands in P3.

---

## Entity model (seed targets)

| Kind | Entity ID pattern | `data.type` | Body |
|------|-------------------|-------------|------|
| Route | `route:home`, … (existing `@id`) | `app_route` | RouteDefinition JSON fields flattened to EAV (or `body` JSON blob) |
| Ontology | `ontology:<schema-slug>` | `trellis_schema` | Existing hydrate pattern; seed if missing |
| Kernel projection | `projection:<slug>` | `app_projection` | ProjectionDefinition |
| Collection view | `projection-view:<type>` | `app_projection_view` | `ProjectionRegistryNode` |

Stamp `data.zoneId = entity:founder-facility-lab` + `data.facilityId` on config entities (advisory, D7.4).

**Do not** store Vue component paths in EAV — only `projectionType` string keys.

---

## Implementation slices (executor order)

### Slice 1 — Server seed (`seed-app-config.ts`)

| File | Action |
|------|--------|
| `apps/web/server/lib/seed-app-config.ts` | **New** — `seedAppConfigFromModules(kernel)` |
| `apps/web/server/plugins/trellis-kernel.ts` | Call seed after `kernel.boot()` |
| `apps/web/server/lib/seed-app-config.test.ts` | **New** — idempotent: second call no duplicate facts |

Sources: `getRouteDefinitions()`, `createWorkspaceConfig().workspace.projections`, ontology export helper, `PROJECTION_REGISTRY_NODES` (import from shared module or duplicate minimal server copy).

Idempotency: `kernel.getNode(id)` or fact-exists check before `createNode` / `updateNode`.

### Slice 2 — Graph-backed config endpoint

| File | Action |
|------|--------|
| `apps/web/server/lib/app-config-snapshot.ts` | **New** — `buildAppConfigSnapshot(kernel)` |
| `apps/web/server/api/graph/[...path].ts` | `GET config` uses snapshot builder |

Query strategy (pick one in impl, document in code):

```text
FIND entity AS ?r WHERE ?r.type = "app_route"
FIND entity AS ?s WHERE ?s.type = "trellis_schema" OR ?s.type = "ontology"
...
```

Fallback: if zero route entities, use `getRouteDefinitions()` (bootstrap).

### Slice 3 — Client reactive path

| File | Action |
|------|--------|
| `apps/web/app/composables/useTrellisConfig.ts` | Broaden SSE invalidation: any mutation on `route:*`, `ontology:*`, `projection:*`, `projection-view:*` entity IDs → `fetchConfig()` |
| `apps/web/app/config/routes.ts` | Comment + wire: used **only** when `useTrellisConfig` fetch fails (existing baseline framing) |

### Slice 4 — Shared projection registry (minimal)

| File | Action |
|------|--------|
| `apps/web/app/lib/trellis-projection-registry/collection-views.ts` | Export serializable nodes for server seed import OR move nodes to `packages/types` |

Avoid duplicating 14 nodes in two files — single export consumed by server seed.

---

## Acceptance criteria

1. `test:pnpm --filter web vitest run server/lib/seed-app-config.test.ts` — seed idempotent; route count ≥ `getRouteDefinitions()` length
2. `test:pnpm --filter web vitest run server/lib/app-config-snapshot.test.ts` — snapshot routes keyed by `route:*`; values match seeded graph
3. After seed, `GET /api/graph/config` returns routes from graph (integration test or vitest with in-memory kernel)
4. `useTrellisConfig` SSE handler refetches on `route:home` mutation (unit test with mocked SSE event or documented manual AC)
5. `config/routes.ts` not imported by `useRoutes` primary path — only fallback when server config null/error
6. `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` phasing table note: P1 uses SSE snapshot, P3 upgrades to SDK live query
7. Scoped eslint on new server files: 0 errors

**E2e (optional, `needs-e2e` label):** mutate route label via API → rail label updates within 5s (stretch — not blocking P1 close).

---

## Verification commands

```bash
cd apps/web
pnpm vitest run server/lib/seed-app-config.test.ts server/lib/app-config-snapshot.test.ts
pnpm vitest run app/composables/useTrellisConfig.test.ts   # if added
pnpm exec eslint server/lib/seed-app-config.ts server/lib/app-config-snapshot.ts
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large ontology seed slow on boot | Idempotent skip; checkpoint already exists |
| Route tree children nesting | Seed flat + `children` JSON field on parent route entity |
| Client/server projection registry drift | Single export for `PROJECTION_REGISTRY_NODES` |
| SSE refetch ≠ true live query | Document as P1; P3 tracks SDK subscribe |

---

## Handoff

```bash
trellis issue start TRL-14
trellis issue create -t "Impl: P1 graph-residency migration" -l impl --parent TRL-14 -S queue
trellis issue start TRL-15
```
