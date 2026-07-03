# Spec: ADR-002 ontology registry live subscribe (TRL-20b)

**VCS:** TRL-20b (spec) · parent TRL-12 · proposal `WU-ADR002-ontology-live-proposal.md`  
**Builds on:** TRL-20 (server graph reads) · TRL-16 (kernel-bridge AppSchema) · TRL-15/16 (`useTrellisConfigLive`)  
**Status:** queue-ready

---

## Problem

TRL-20 fixed **server** ontology listing (`listSchemasFromGraph`). Client `useOntologyRegistry()` still boots via:

```
fetchOntologiesFromTql() → $fetch GET /api/graph/ontologies
subscribeToSSE() → full refetch on ontology mutation
```

Meanwhile `useTrellisConfig()` on `just run-kernel` already has a **live path**:

```
useTrellisDb() → kernel-bridge
useTrellisConfigLive() → useEntities(AppSchemaType)
assembleAppConfigFromRows() → config.ontologies
```

`AppSchema` rows are the same `trellis_schema` entities TRL-20 serves server-side. **Duplicate HTTP + duplicate SSE** — ontology sidebar lags config rail by one refetch cycle.

## Goal

When `useTrellisConfig().transportMode === 'live'`, **`useOntologyRegistry()` reads ontologies from the live config map** (no `/api/graph/ontologies` boot fetch, no ontology SSE refetch). Public API frozen.

## Non-goals

- New server bridge routes or mappers (`AppSchema` bridge shipped TRL-16)
- Changes to `listSchemasFromGraph` / graph API (TRL-20 done)
- Separate `useEntities(AppSchema)` subscription in ontology composable (DRY via `useTrellisConfig`)
- Sidecar import script changes (defer TRL-20c)
- Adapter user-ontology path (`ontologyBackend === 'adapter'`) — unchanged merge
- CRUD methods (`addFieldToType`, etc.) — still HTTP to `/api/graph/ontology/*`

---

## Architecture decision: piggyback `useTrellisConfig` live ontologies

| Option | Verdict | Why |
|--------|---------|-----|
| New `useOntologyRegistryLive` + own `useEntities(AppSchema)` | **reject** | Duplicate subscription; two SSE refetch paths |
| **Read `useTrellisConfig().ontologies` when `transportMode === 'live'`** | **chosen** | Single AppSchema live pipe; mirrors config rail freshness |
| EQL bridge for ontologies | **defer** | No new server surface |

```
useOntologyRegistry()
  ├─ [A] LIVE (useTrellisConfig().transportMode === 'live')
  │     watch ontologies Record → schemasToServerTypesMap()
  │     merge adapter user ontologies (if ontologyBackend === 'adapter')
  │     NO fetchOntologiesFromTql, NO ontology SSE
  │
  └─ [B] FALLBACK (embedded snapshot / no TrellisDb rows)
        fetchOntologiesFromTql() + subscribeToSSE()  (unchanged)
```

### Shared conversion helper

Extract from `useOntologyRegistry.ts`:

| File | Export |
|------|--------|
| `app/lib/ontology-registry/schemas-to-server-types.ts` | `schemasRecordToServerTypes(ontologies: Record<string, SchemaDefinition>): Map<string, DynamicEntityTypeConfig>` |
| `app/lib/ontology-registry/schemas-to-server-types.test.ts` | Fixture schema → `DynamicEntityTypeConfig` slug, tier, fields |

Logic: iterate `Object.values(ontologies)`, skip `SYSTEM_SCHEMA_IDS`, call existing `schemaToEntityTypeConfig` (move or import from composable).

`ServerSchemaDefinition` from `~/lib/app-config/types` is structurally compatible with composable `SchemaDefinition` — cast at boundary with comment.

---

## Implementation slices (executor order)

### Slice 1 — Extract conversion helper + tests

| File | Action |
|------|--------|
| `app/lib/ontology-registry/schemas-to-server-types.ts` | **New** — `schemasRecordToServerTypes`, export `SYSTEM_SCHEMA_IDS` or import from composable |
| `app/lib/ontology-registry/schemas-to-server-types.test.ts` | **New** — task schema → type slug `task`, tier `system` |
| `app/composables/useOntologyRegistry.ts` | Move `schemaToEntityTypeConfig` + helpers to lib OR import from schemas module |

### Slice 2 — Live path wiring

| File | Action |
|------|--------|
| `app/composables/useOntologyRegistry.ts` | Import `useTrellisConfig`; `watchEffect` when `transportMode === 'live'`: set `_serverTypes` from live ontologies + adapter merge; set `_initialized` |
| same | When live active: **skip** `fetchOntologies()` on init and **skip** `subscribeToSSE()` (add `unsubscribeFromOntologySSE()` mirror TRL-15 harden) |
| same | When live inactive: existing init path unchanged |

**Live watch sketch:**

```typescript
const { ontologies, transportMode, loading: configLoading } = useTrellisConfig()

watchEffect(async () => {
  if (transportMode.value !== 'live') return
  const tqlMap = schemasRecordToServerTypes(ontologies.value)
  let adapterMap = new Map<string, DynamicEntityTypeConfig>()
  if (_adapterRef?.ontologyBackend === 'adapter') {
    adapterMap = await fetchUserOntologiesFromAdapter(_adapterRef)
  }
  _serverTypes.value = new Map([...tqlMap, ...adapterMap])
  _loading.value = configLoading.value
  _initialized.value = !configLoading.value
  unsubscribeFromOntologySSE()
})
```

Fallback init guard:

```typescript
if (import.meta.client && transportMode.value !== 'live' && !_initialized.value && !_loading.value) {
  fetchOntologies()
  subscribeToSSE()
  // adapter sub unchanged
}
```

Use `watch` + `watchEffect` carefully to avoid double-init — pattern copy from `useTrellisConfig.ts` L148–161.

### Slice 3 — Docs

| File | Action |
|------|--------|
| `docs/sidecar-dev.md` | Note `useOntologyRegistry` live path piggybacks `useTrellisConfig` AppSchema subscribe on kernel-bridge |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run app/lib/ontology-registry/schemas-to-server-types.test.ts` — pass
2. **Grep:** `rg 'fetchOntologiesFromTql' apps/web/app/composables/useOntologyRegistry.ts` — still defined (fallback path) but init guarded when live
3. **Grep:** `rg 'useTrellisConfig' apps/web/app/composables/useOntologyRegistry.ts` — at least one import
4. **Grep:** `rg 'schemasRecordToServerTypes' apps/web/app` — used in composable
5. `test:cd apps/web && pnpm vitest run server/lib/ontology-registry/` — TRL-20 server tests still pass (no server edits)
6. `test:cd apps/web && pnpm vitest run app/lib/app-config-live/` — mode tests still pass
7. Scoped eslint on `app/lib/ontology-registry/` + touched `useOntologyRegistry.ts` — 0 errors

**Behavioral (manual AC in describe SUMMARY):**

8. `just run-kernel` → `useTrellisConfig().transportMode === 'live'` → open `/ontologies` → sidebar populated
9. `just trellis ontology create …` (custom type) → appears in `/ontologies` without manual refresh ≤5s (kernel-bridge SSE → AppSchema refetch → config ontologies → registry)

**Regression:**

10. `TRELLIS_SIDECAR=0` fallback: if TrellisDb null (SSR) or zero AppSchema rows → registry still loads via HTTP (unchanged)
11. `ontologyBackend === 'adapter'` cloud path: user ontologies still merge on top

---

## Verification commands

```bash
cd apps/web && pnpm vitest run app/lib/ontology-registry/ app/lib/app-config-live/
rg 'useTrellisConfig|schemasRecordToServerTypes|transportMode' app/composables/useOntologyRegistry.ts
pnpm check   # from apps/web or monorepo root per project convention
```

---

## TRL-20c preview (defer)

- Dedicated sidecar import verification for `trellis_schema` rows when `TRELLIS_SIDECAR=1` without kernel-bridge
- Retire HTTP `/api/graph/ontologies` from fallback once graph always seeded + live universal

---

## Handoff

```bash
trellis issue start TRL-20b
trellis issue create -t "Impl: ontology registry live subscribe (TRL-20b)" -l impl --parent TRL-20b -S queue
```
