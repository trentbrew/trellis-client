# Proposal: ADR-002 browse live — `useTrellisEntities` via TrellisDb (Phase 2)

**VCS:** TRL-17 (proposal) · parent TRL-12 (ADR-002 epic)  
**Human decision:** pathway B — browse wedge — 2026-07-02  
**Builds on:** TRL-16 (kernel-bridge) · TRL-15 (P3 live query pattern) · TRL-14 (P1 graph-residency)  
**Prior art:** WU-OPTION-B-001-spec.md § "Browse grid / useTrellisEntities sidecar cutover (WU-OPTION-B-002)"  
**Status:** queue-ready

---

## Problem

App config is live on the default dev path (`just run-kernel`) after TRL-16, but **entity browse still uses the legacy TQL path**:

```
useEntities() → useTrellisEntities()
  → useTrellisGraph().query(FIND entity AS ?e)
  → batch fetchNodes + SSE full-store refetch
```

Every browse page (`useBrowsePage`, workspace grids, graph viz, mail, etc.) pays for:

1. Full-graph EQL scan on boot
2. Batch hydration + link resolution in the composable
3. Coarse SSE invalidation (re-query all entity IDs)

Agents editing entities via CLI see updates, but the convergence story is split: **config is `trellis/vue`; entities are REST+EQL.**

## Goal

**Unify the read path** — when `useTrellisDb()` is non-null (kernel-bridge or sidecar), `useTrellisEntities` uses **`trellis/vue` live reads** (or equivalent `TrellisDb.subscribe`) for the singleton store, with kernel SSE / sidecar WS driving diffs.

**Keep the public API frozen:** `useEntities()` / `useTrellisEntities()` surface (`items`, `loading`, `byType`, `create`, `update`, `remove`) unchanged so zero browse page edits in v1.

## Non-goals

- CRUD cutover to `useMutation` / sidecar HTTP (follow-up wedge)
- Cloud / `DataAdapter` entity backend changes
- Retiring `useTrellisGraph` globally (graph viz may still use it)
- Full kernel-bridge CRUD for arbitrary types (read wedge first)
- Cross-browser WS relay (P4)
- P2 zone-gated join middleware

---

## Proposed architecture

```
useTrellisEntities()
  ├─ cloud mode → DataAdapter (unchanged)
  └─ local mode
       ├─ useTrellisDb() null → legacy TQL path (unchanged fallback)
       └─ useTrellisDb() present → NEW live path
            ├─ Extend kernel-bridge list API for polymorphic entity types
            │     (map kernel facts → app Entity shape, not just AppRoute)
            └─ trellis/vue liveEntities OR multi-type subscribe + mapper
```

### Kernel-bridge extension (sketch)

| Today (TRL-16) | Phase 2 |
|----------------|---------|
| `?type=AppRoute` only | `?type=task` / `note` / … OR `?domainType=entity` + filter |
| App config row shape | Map `factsToNode` → `Entity` (strip namespace, links TBD v1) |

Architect picks: per-ontology `defineType` rows vs generic fact mapper vs EQL bridge endpoint.

### Dual-path pattern (copy from TRL-15/16)

Mirror `useTrellisConfig`:

- `useTrellisEntitiesLive(client)` — hydrates `_items` from live query
- Legacy path stays when `useTrellisDb()` null or live row count 0 after load
- SSE teardown: don't double-subscribe kernel SSE when live active

---

## Success criteria

1. `just run-kernel` → open `/workspace/browse?type=task` → tasks render without full-graph EQL on network tab (live list via kernel-bridge)
2. `just trellis create --type entity --data '{"type":"task","title":"Bridge test"}'` → task appears in browse ≤5s without reload
3. `TRELLIS_SIDECAR=1` → sidecar client used; browse live path unchanged or improved (no regression)
4. Cloud mode → no behavior change
5. Unit tests: entity row mapper fixture + live-path transport mode (mirror `app-config-live/mode.test.ts`)

---

## Slices (executor order — architect refines)

1. **Server** — `map-kernel-entity-rows.ts` + extend `kernel-bridge/entities.get.ts` for polymorphic types
2. **Client mapper** — kernel/TrellisDb row → app `Entity` type
3. **`useTrellisEntitiesLive`** — live hydration into singleton store
4. **`useTrellisEntities` dual-path** — wire + SSE dedup
5. **Docs** — `sidecar-dev.md`, divergence audit #2 shipped

---

## Risks

| Risk | Mitigation |
|------|------------|
| Entity shape mismatch (links, references) | v1: scalar fields only; links in v2 or keep graph fetch for GraphView |
| Performance (many entities) | Type-scoped live queries per `byType`; don't subscribe all types at once |
| defineType explosion | Generic mapper + optional schema registry later |
| Singleton store + live dispose | Reuse detached `effectScope` pattern from current composable |

---

## Handoff

```bash
trellis issue create -t "Proposal: browse live useTrellisEntities" -l proposal --parent TRL-12 -S queue
# → architect spec TRL-17
```
