# Spec: ADR-002 browse live — `useTrellisEntities` via kernel-bridge (Phase 2a)

**VCS:** TRL-17 (spec) · parent TRL-12 (epic)  
**Proposal:** `.agent/plans/WU-ADR002-browse-live-proposal.md`  
**ADR:** `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` · divergence audit §2  
**Builds on:** TRL-16 (kernel-bridge) · TRL-15 (P3 dual-path pattern) · TRL-14 (P1 graph-residency)  
**Status:** queue-ready

---

## Problem

TRL-16 made **app config** live on `just run-kernel`. **Entity browse** still uses:

```
useTrellisEntities → useTrellisGraph().query(FIND entity AS ?e)
  → fetchNodes batch hydrate → _graphVersion SSE full refetch
```

Browse surfaces (`useBrowsePage`, workspace grids, mail, graph viz) pay for a full-graph EQL scan on every boot and coarse invalidation on any mutation.

## Goal

When **`useTrellisDb()` is the kernel-bridge client** (`TRELLIS_SIDECAR=0`), `useTrellisEntities` hydrates its singleton `_items` from **`trellis/vue` live `KernelBrowse` rows** via extended kernel-bridge HTTP + existing SSE refetch shim.

**Public API frozen:** `useEntities()` / `useTrellisEntities()` — same `items`, `loading`, `byType`, `create`, `update`, `remove`. **Zero browse page edits in v1.**

## Non-goals

- Sidecar browse live (sidecar lacks imported entity rows — **TQL fallback** when sidecar client active; no regression)
- Cloud / `DataAdapter` backend changes
- CRUD via `useMutation` / bridge HTTP POST
- Entity `references` / link hydration in v1 (empty `references: []`; GraphView keeps `useTrellisGraph`)
- Per-type lazy subscriptions (v2); v1 uses **one aggregate `KernelBrowse` subscription**
- Campus / app-config entity types in browse aggregate
- E2e blocking (optional manual AC)

---

## Architecture decision: aggregate `KernelBrowse` type

| Option | Verdict | Why |
|--------|---------|-----|
| Per-ontology `defineType` × 20+ | **reject** | defineType explosion; sidecar import burden |
| EQL bridge `POST /query` | **defer** | new surface; v2 |
| **Synthetic `KernelBrowse` + `payloadJson`** | **chosen** | mirrors TRL-16 `AppRoute.configJson`; one subscribe fills singleton `_items` |

```
GET /api/graph/kernel-bridge/entities?type=KernelBrowse
  → { data: [{ id, type:'KernelBrowse', entityType:'task', title, payloadJson }], total, limit, offset }

useTrellisEntitiesLive(client)
  → useEntities(client, KernelBrowseType)   // trellis/vue
  → bridgeRowToEntity(row) → Entity[]
  → writes singleton _items

useTrellisEntities._initStore()
  ├─ adapter backend → unchanged
  ├─ kernel-bridge client + live rows > 0 → _initStoreFromLive (NEW)
  └─ else → _initStoreFromTql (unchanged fallback)
```

### Browse domain filter (server)

Include kernel entities where:

1. Entity id prefix `entity:` (see `ENTITY_NAMESPACE`)
2. `data.type` fact ∈ `BROWSE_DOMAIN_TYPES` (curated set — task, note, event, person, project, …)
3. **Exclude** `APP_CONFIG_ENTITY_TYPES` (`app_route`, `trellis_schema`, …)
4. **Exclude** campus substrate: `facility`, `zone`, `agent`, `wallet`, `decision`, `artifact`, `integration_definition`

Source list: export `BROWSE_DOMAIN_TYPES` from `server/lib/kernel-bridge/browse-domain-types.ts` — derive from `entityRegistry` temporal/document/actor/container types minus exclusions (no dynamic ontology fetch in v1).

### Row shape

```typescript
type KernelBrowseRow = {
  id: string           // full kernel id, e.g. entity:task-1
  type: 'KernelBrowse' // bridge list type param
  entityType: string   // app EntityType, e.g. task
  title: string
  payloadJson: string  // JSON Entity scalars (id stripped, references:[])
}
```

`payloadJson` built server-side with same scalar normalization rules as `useTrellisEntities` (`startDate` YMD extract, tags array, etc.) — extract shared helper `kernelNodeToEntityPayload()` in `server/lib/kernel-bridge/map-kernel-entity-rows.ts` (server-only v1; client `bridgeRowToEntity` parses JSON).

### SSE invalidation

New `shouldRefetchBrowseEntitiesFromSSE(data)` in `app/lib/entity-mutation-sse.ts`:

- `true` for `createNode` / `updateNode` / `deleteNode` / `link` when `entityId` starts with `entity:` AND payload `data.type` ∈ `BROWSE_DOMAIN_TYPES` (or absent on delete)
- `false` for app-config ids (`route:`, `ontology:`, …) — handled by existing app-config filter

Update `app/lib/trellis-kernel-bridge/sse-realtime.ts`:

- When refetching a sub with `opts.entityType === 'KernelBrowse'`, call `db.list('KernelBrowse')`
- Mutation handler: refetch browse subs on `shouldRefetchBrowseEntitiesFromSSE` **in addition to** app-config filter (OR combined helper `shouldRefetchKernelBridgeFromSSE`)

### Transport mode (mirror P3)

`app/lib/entities-live/mode.ts`:

```typescript
resolveEntityTransportMode(client, liveRowCount, liveLoading): 'live' | 'fallback'
// live when client != null && !loading && liveRowCount > 0
// kernel-bridge only in v1 — sidecar client with 0 KernelBrowse rows → fallback
```

When `transportMode === 'live'`: **do not** call `_initStoreFromTql()` (avoids duplicate EQL + SSE). CRUD still uses existing graph mutate paths.

---

## Implementation slices (executor order)

### Slice 1 — Server browse mapper + API extension

| File | Action |
|------|--------|
| `server/lib/kernel-bridge/browse-domain-types.ts` | **New** — `BROWSE_DOMAIN_TYPES`, `isBrowseDomainType()`, exclusions |
| `server/lib/kernel-bridge/map-kernel-entity-rows.ts` | **New** — `kernelNodeToBrowseRow`, `listKernelBrowseEntities`, `kernelNodeToEntityPayload` |
| `server/lib/kernel-bridge/map-kernel-entity-rows.test.ts` | **New** — `entity:task-1` facts → `KernelBrowse` row + payloadJson with title |
| `server/api/graph/kernel-bridge/entities.get.ts` | **Modify** — route `type=KernelBrowse` to browse list; keep existing AppRoute/etc. via `map-app-config-rows.ts` |

Refactor `entities.get.ts` dispatch:

```typescript
if (typeParam === 'KernelBrowse') return listKernelBrowseEntities(kernel, { limit, offset })
if (BRIDGE_APP_CONFIG_TYPES.includes(typeParam)) return listBridgeEntities(...)
return { data: [], total: 0, limit, offset }  // unknown type
```

`entities/[id].get.ts`: optional v1 — return browse row for `entity:*` ids (or 404); not blocking.

### Slice 2 — Client schema + row mapper

| File | Action |
|------|--------|
| `app/lib/trellis-sidecar/schema/browse-entity.ts` | **New** — `KernelBrowseType` defineType |
| `app/lib/entities-live/bridge-row-to-entity.ts` | **New** — `bridgeRowToEntity(row): Entity` |
| `app/lib/entities-live/mode.ts` | **New** — `resolveEntityTransportMode` |
| `app/lib/entity-mutation-sse.ts` | **New** — `shouldRefetchBrowseEntitiesFromSSE` |

### Slice 3 — Live composable

| File | Action |
|------|--------|
| `app/composables/useTrellisEntitiesLive.ts` | **New** — `useEntities(client, KernelBrowseType)` → `{ items, loading, transportMode }` |
| `app/lib/entities-live/mode.test.ts` | **New** — transport mode cases |

### Slice 4 — Dual-path wiring

| File | Action |
|------|--------|
| `app/composables/useTrellisEntities.ts` | **Modify** — `_initStoreFromLive(client)`; gate TQL init on transport mode |
| `app/lib/trellis-kernel-bridge/sse-realtime.ts` | **Modify** — browse SSE filter + `KernelBrowse` list refetch |

`_initStoreFromLive` pattern:

```typescript
function _initStoreFromLive(client: TrellisDb) {
  const scope = effectScope(true)
  scope.run(() => {
    const live = useTrellisEntitiesLive(client)
    watch(() => live.items.value, (rows) => { _items.value = rows }, { immediate: true })
    watch(() => live.loading.value, (v) => { _loading.value = v })
    // If live settles with 0 rows, fall back to TQL once (mirror useTrellisConfig)
    watch(() => live.transportMode.value, (mode) => {
      if (mode === 'fallback' && !_tqlFallbackStarted) _initStoreFromTql()
    })
  })
}
```

`_initStore()` logic:

```typescript
if (adapter.entityBackend === 'adapter') { _initStoreFromAdapter(adapter); return }
const client = useTrellisDb()  // only on client; SSR stays empty until hydrate
if (import.meta.client && client && !isSidecarClient(client)) {  // see note below
  _initStoreFromLive(client)
} else {
  _initStoreFromTql()
}
```

**Sidecar detection:** `useRuntimeConfig().public.trellisSidecar === true` → always TQL for entities v1 (document in AC). Kernel-bridge plugin registers when sidecar off.

### Slice 5 — Docs

| File | Action |
|------|--------|
| `docs/sidecar-dev.md` | Browse live path (kernel-bridge only v1) |
| `docs/architecture/adr-002-kernel-divergence-audit.md` | Mark #2 in progress → shipped when done |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run server/lib/kernel-bridge/map-kernel-entity-rows.test.ts` — task entity → `KernelBrowse` row with `payloadJson.title`
2. `test:cd apps/web && pnpm vitest run app/lib/entities-live/mode.test.ts` — transport mode live/fallback
3. `test:cd apps/web && pnpm vitest run app/lib/trellis-kernel-bridge/sse-realtime.test.ts` — extend or add case: `entity:task-1` mutation refetches `KernelBrowse` subscriber
4. `test:cd apps/web && pnpm vitest run app/lib/app-config-live/` — still pass (no regression)
5. **Behavioral:** `TRELLIS_SIDECAR=0` + dev server — network tab shows `GET .../kernel-bridge/entities?type=KernelBrowse` on browse load; **no** `POST /api/graph/query` with `FIND entity AS ?e` when live active
6. **Behavioral:** `just trellis create` task → appears in `/workspace/browse?type=task` ≤5s without reload
7. **Behavioral:** `TRELLIS_SIDECAR=1` — browse still works via TQL fallback (no KernelBrowse rows required)
8. Scoped eslint on new `kernel-bridge` + `entities-live` files: 0 errors

**Manual AC (describe SUMMARY):** `just run-kernel` → browse tasks → create task via CLI → row appears; DevTools confirms single KernelBrowse list + SSE refetch, not full-graph EQL loop.

---

## Verification commands

```bash
cd apps/web
pnpm vitest run server/lib/kernel-bridge/map-kernel-entity-rows.test.ts app/lib/entities-live/ app/lib/trellis-kernel-bridge/sse-realtime.test.ts
pnpm vitest run app/lib/app-config-live/
pnpm exec eslint server/lib/kernel-bridge/ app/lib/entities-live/ app/composables/useTrellisEntitiesLive.ts
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large browse lists (1000+ entities) | `limit=500` default; document; v2 pagination |
| payloadJson drift from TQL hydrate | Shared field list in mapper test fixture copied from `useTrellisEntities` normalize |
| Double SSE (graph + bridge) | Skip `_initStoreFromTql` when live active |
| Sidecar users expect live browse | Document v1 kernel-bridge only; sidecar entity import is follow-up |

---

## Handoff

```bash
trellis issue start TRL-17
trellis issue create -t "Impl: browse live useTrellisEntities" -l impl --parent TRL-17 -S queue
```
