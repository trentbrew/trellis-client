# Spec: ADR-002 kernel-bridge — TrellisDb over embedded kernel (app config)

**VCS:** TRL-16 (spec) · parent TRL-12 (epic)  
**Proposal:** `.agent/plans/WU-ADR002-kernel-bridge-proposal.md`  
**ADR:** `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` · divergence audit §1  
**Builds on:** TRL-15 (P3 sidecar live query) · TRL-14 (P1 graph-residency)  
**Status:** queue-ready

---

## Problem

P3 `useTrellisConfigLive` requires a `TrellisDb` client. Today that client exists **only** when `TRELLIS_SIDECAR=1` + sidecar running + `import-app-config-to-sidecar.mjs`.

Default dev (`just run-kernel`, `TRELLIS_SIDECAR=0`) → `useTrellisDb()` is null → P1 SSE fallback only.

## Goal

**Embedded-kernel dev gets live app config** — `transportMode === 'live'` without sidecar or import — by providing a **kernel-bridge `TrellisDb`** that:

1. Serves typed entity HTTP from P1-seeded kernel facts
2. Maps `trellis/vue` live subscriptions to **kernel SSE** + refetch (Option A)

Reuse unchanged: `useTrellisConfigLive`, `assembleAppConfigFromRows`, sidecar `defineType` schemas (`AppRoute`, etc.).

## Non-goals

- Nuxt WS relay speaking full trellis `/realtime` protocol (Option B — follow-up)
- Pages / browse / `useTrellisEntities` cutover
- P2 zone-guard enforcement
- Sidecar behavior change when `TRELLIS_SIDECAR=1`
- New seed data — read existing P1 `app_route` / `trellis_schema` / … facts only

---

## Architecture

```
plugins/trellis-kernel-bridge.client.ts
  └─ createKernelBridgeClient()
       TrellisDb({ url: window.location.origin })  // dummy origin
       ├─ installKernelBridgeHttp → GET/POST /api/graph/kernel-bridge/*
       └─ installKernelBridgeSseRealtime → subscribe() via /api/graph/events

useTrellisDb() priority:
  1. $trellisSidecar.client     (TRELLIS_SIDECAR=1)
  2. $trellisKernelBridge.client (always on client when sidecar off)
  3. null                        (SSR only)

useTrellisConfig → useTrellisConfigLive(client)  (unchanged)
```

### Option A — SSE-backed live (chosen)

On `db.subscribe(eql, callback, { entityType })`:

1. **Hydrate:** `GET /api/graph/kernel-bridge/entities?type=<AppRoute|…>` → `callback(rows, EMPTY_DIFF, { resolved: true })`
2. **Listen:** `useSSESubscribe('mutation')` — if mutation touches mapped kernel domain type → refetch list → `callback(rows, { added:[], updated:rows, removed:[] }, { resolved: true })`
3. **No WebSocket** — v1 delivers full list refresh on relevant mutations (acceptable for ~50 config entities)

Filter mutations with existing `isAppConfigEntityType()` + entity id prefix checks from `app-config-sse.ts`.

### Kernel ↔ sidecar type mapping

| Kernel `data.type` | Entity id examples | Bridge `type` param | Sidecar `defineType` |
|--------------------|--------------------|---------------------|----------------------|
| `app_route` | `route:home` | `AppRoute` | `AppRouteType` |
| `trellis_schema` | `ontology:task` | `AppSchema` | `AppSchemaType` |
| `app_projection` | `projection:…` | `AppProjection` | `AppProjectionType` |
| `app_projection_view` | `projection-view:table` | `AppProjectionView` | `AppProjectionViewType` |

Row shape (matches P3 sidecar import):

```typescript
{ id: string; type: 'AppRoute'; title: string; configJson: string; schemaId?: string; ... }
```

Mapper lives server-side: `factsToNode` → `kernel-node-to-bridge-row.ts`.

---

## Implementation slices (executor order)

### Slice 1 — Server bridge API

| File | Action |
|------|--------|
| `server/lib/kernel-bridge/map-app-config-rows.ts` | **New** — kernel facts → bridge entity rows |
| `server/lib/kernel-bridge/map-app-config-rows.test.ts` | **New** — fixture facts → AppRoute row |
| `server/api/graph/kernel-bridge/entities.get.ts` | **New** — `?type=AppRoute` list |
| `server/api/graph/kernel-bridge/entities/[id].get.ts` | **New** — single entity (optional v1) |

`entities.get.ts` logic:

```typescript
const domainType = BRIDGE_TYPE_TO_DOMAIN[type]  // AppRoute → app_route
// collect entity ids from store where type fact matches
// map each via factsToNode + row mapper
return { data: rows, total: rows.length, limit, offset }
```

Response shape must match what `TrellisDb._fetch('GET', '/entities?...')` expects (mirror sidecar list — read `entities-server` / trellis npm for field names; match `proxyListEntities` empty-list shape).

### Slice 2 — Client HTTP proxy

| File | Action |
|------|--------|
| `app/lib/trellis-kernel-bridge/create-client.ts` | **New** — `createKernelBridgeClient()` |
| `app/lib/trellis-kernel-bridge/http-proxy.ts` | **New** — `_fetch` → `/api/graph/kernel-bridge` |

Pattern: copy `trellis-sidecar/http-proxy.ts`, change prefix to `/api/graph/kernel-bridge`.

### Slice 3 — SSE realtime shim

| File | Action |
|------|--------|
| `app/lib/trellis-kernel-bridge/sse-realtime.ts` | **New** — `installKernelBridgeSseRealtime(db)` |
| `app/lib/trellis-kernel-bridge/sse-realtime.test.ts` | **New** — mutation event → refetch triggered |

Reuse subscription record shape from `offline-realtime.ts` (`_subCallbacks`, `_subQueries`). Replace `_ensureWs` with no-op or SSE-only init.

Map `entityType` in subscribe opts → domain type for SSE filter.

### Slice 4 — Plugin + `useTrellisDb` wiring

| File | Action |
|------|--------|
| `app/plugins/trellis-kernel-bridge.client.ts` | **New** — register client when `!trellisSidecar` |
| `app/composables/useTrellisSidecar.ts` | `useTrellisDb()` checks sidecar then `$trellisKernelBridge` |

Do **not** register kernel-bridge when sidecar enabled.

### Slice 5 — Docs

| File | Action |
|------|--------|
| `docs/sidecar-dev.md` | Note kernel-bridge: embedded live query without import |
| `docs/architecture/adr-002-kernel-divergence-audit.md` | Mark kernel-bridge in progress / shipped when done |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run server/lib/kernel-bridge/map-app-config-rows.test.ts` — `route:home` facts → AppRoute row with `configJson`
2. `test:cd apps/web && pnpm vitest run app/lib/trellis-kernel-bridge/sse-realtime.test.ts` — app_route mutation triggers subscriber refetch
3. `test:cd apps/web && pnpm vitest run app/lib/app-config-live/mode.test.ts` — still pass
4. **Behavioral:** With `TRELLIS_SIDECAR=0`, `useTrellisDb()` non-null on client; `resolveAppConfigTransportMode` → `live` when kernel has seeded routes (unit test with mocked client rows OR manual AC in describe)
5. **Behavioral:** With `TRELLIS_SIDECAR=1`, kernel-bridge plugin does not register; sidecar client unchanged
6. Scoped eslint on new `kernel-bridge` files: 0 errors
7. `docs/sidecar-dev.md` documents embedded live path

**Manual AC (describe SUMMARY):** `just run-kernel` → open app → `useTrellisConfig().transportMode` is `live` → `just trellis update route:home …` → rail label updates ≤5s.

**E2e (optional):** not blocking; no `needs-e2e` label.

---

## Verification commands

```bash
cd apps/web
pnpm vitest run server/lib/kernel-bridge/map-app-config-rows.test.ts app/lib/trellis-kernel-bridge/sse-realtime.test.ts
pnpm vitest run app/lib/app-config-live/
pnpm exec eslint server/lib/kernel-bridge/ app/lib/trellis-kernel-bridge/
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| TrellisDb `_fetch` path mismatch | Log requests in dev; align with sidecar proxy tests |
| Full-list refresh on SSE | OK for config entity count; document v2 WS path |
| SSR `useTrellisDb()` null | Existing fallback; bridge client client-only plugin |
| `defineType` name vs kernel type | Central `BRIDGE_TYPE_MAP` constant shared server/client tests |

---

## Handoff

```bash
trellis issue start TRL-16
trellis issue create -t "Impl: kernel-bridge TrellisDb" -l impl --parent TRL-16 -S queue
```
