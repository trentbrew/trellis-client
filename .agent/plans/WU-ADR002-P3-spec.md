# Spec: ADR-002 P3 — trellis/vue live-query adapter for app config

**VCS:** TRL-15 (spec) · parent TRL-12 (epic)  
**ADR:** `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` § P3, D1, D7 step 2  
**Builds on:** TRL-14 (P1 shipped) · TRL-13 (P0 shipped)  
**Status:** queue-ready

---

## Problem

P1 made app config **graph-resident** but the client still uses **SSE-invalidated full snapshot refetch**:

```
useTrellisConfig()
  └─ $fetch GET /api/graph/config          ← boot
  └─ SSE mutation → fetchConfig() again    ← O(n) snapshot rebuild per change
```

ADR D7 step 2: *"Swap the read path: `useTrellisConfig()` subscribes via live query instead of fetching a code-built object."*

The repo already proves the target pattern on pages (`useSidecarPage` → `useEntity` / `useMutation` from `trellis/vue/typed` against `TrellisDb`). App config has not been migrated.

| Asset | P1 state | P3 target |
|-------|----------|-----------|
| Routes | `app_route` entities in embedded kernel | Live subscribe → reactive `routeConfigTree` |
| Ontologies | `trellis_schema` entities | Live subscribe → reactive `ontologies` |
| Projections | `app_projection` entities | Live subscribe → reactive `projections` |
| Collection views | `app_projection_view` entities | Live subscribe → `projectionViews` on composable |
| Transport | SSE + HTTP snapshot | `trellis/vue` WS diff when TrellisDb available |

## Goal

**`useTrellisConfig()` reactive via SDK live query** where a `TrellisDb` client exists; **no regression** on embedded-kernel-only dev (`TRELLIS_SIDECAR=0`).

Deliver the first **SDK adapter wedge** on the path to D1 (published `trellis` as canonical engine). Full embedded-kernel retirement is **out of scope** for this slice.

## Non-goals (P3 wedge)

- Retiring `@turtle.tech/trellis-kernel` from Nuxt server (follow-up epic slice)
- P2 capability-gated relay join / zone-guard enforcement
- P4 WS relay for cross-machine presence
- Browse/collections/`useTrellisEntities` cutover to trellis/vue (Phase 2 of Option B)
- Boot-seed skip-if-mutated (reviewer harden note — separate issue)
- Cloud `DataAdapter` / InstantDB path changes

---

## Architecture

```
useTrellisConfig()
  ├─ [A] LIVE (TrellisDb client present)
  │     trellis/vue subscribe per app-config domain type
  │     assemble ServerConfig from entity rows (configJson parse)
  │     mutations on graph → WS diff → composable updates (no fetchConfig)
  │
  └─ [B] FALLBACK (embedded kernel only — P1 path)
        $fetch GET /api/graph/config + SSE → shouldRefetchAppConfigFromSSE
        unchanged behavior

Mode gate:
  useTrellisDb() != null  → path A (requires sidecar running + config entities present)
  else                    → path B
```

**Sidecar data gap:** P1 seeds app config into **embedded kernel** (`.trellis/kernel.db`), not sidecar (`.trellis-db/`). Path A requires **mirroring** config entities into the sidecar DB (import script or boot hook).

```
Boot / dev workflow
  embedded kernel: seedAppConfigFromModules (existing)
  sidecar (when TRELLIS_SIDECAR=1):
    import-app-config-to-sidecar.mjs  ← new, idempotent
    OR extend scripts/import-pages-to-sidecar.mjs pattern
```

### Sidecar schema (defineType)

Mirror P1 entity shapes as typed sidecar records (string `configJson` blob — same as kernel):

| Type name | Maps from | Key fields |
|-----------|-----------|------------|
| `AppRoute` | `app_route` | `title`, `configJson` |
| `AppSchema` | `trellis_schema` | `title`, `schemaId`, `configJson` |
| `AppProjection` | `app_projection` | `title`, `projectionId`, `configJson` |
| `AppProjectionView` | `app_projection_view` | `title`, `projectionType`, `configJson` |

Files: `apps/web/app/lib/trellis-sidecar/schema/app-config.ts` (new).

Use `trellis/browser` `defineType` + zod — same pattern as `schema/page.ts`.

### Live query assembly

New module: `apps/web/app/lib/app-config-live/assemble-config.ts`

- Input: arrays of sidecar rows per type
- Output: `ServerConfig` shape (same as P1 `/api/graph/config` response)
- Reuse parsers: `parseRouteDefinitionFromNode`, `parseJsonField` logic (extract shared parse helpers to `app/lib/app-config/` or import from server lib via shared package — **prefer** duplicating minimal parse fns client-side to avoid server→client import antipattern from P1)

New composable internals: `apps/web/app/composables/useTrellisConfigLive.ts` (new)

- `useLiveAppConfig(client: TrellisDb)` — four `useQuery` / collection subscriptions from `trellis/vue` (pick API matching `useSidecarPage` precedent)
- Returns reactive `ServerConfig` refs
- `useTrellisConfig` merges: if live path active, use live refs; else existing P1 singleton state

**Public API frozen:** existing `useTrellisConfig()` exports (`routeConfigTree`, `getOntology`, `refresh`, etc.) must not break callers.

### Kernel bridge (deferred — document only)

Path B remains SSE until a future slice adds `KernelTrellisDb` shim (HTTP+SSE → trellis subscribe API) for embedded-only dev. Note in ADR phasing table footnote; do not block P3 wedge on this.

### Divergence audit (deliverable)

`docs/architecture/adr-002-kernel-divergence-audit.md` — table comparing embedded `@turtle.tech/trellis-kernel` vs published `trellis@^3.2` for:

- CRUD / mutate API
- EQL-S query
- Realtime subscribe
- Ontology / projection listing
- Identity / signing

Verdict per row: **port** | **keep embedded** | **drop** | **upstream**. No code changes required in audit — informs post-P3 work.

---

## Implementation slices (executor order)

### Slice 1 — Sidecar schema + import

| File | Action |
|------|--------|
| `app/lib/trellis-sidecar/schema/app-config.ts` | **New** — four `defineType` exports |
| `scripts/import-app-config-to-sidecar.mjs` | **New** — read from embedded `GET /api/graph/config` or kernel export; upsert to sidecar |
| `justfile` / `docs/sidecar-dev.md` | Document import step in sidecar quick start |

Idempotent upsert by entity id (`route:home`, etc.).

### Slice 2 — Live config composable

| File | Action |
|------|--------|
| `app/lib/app-config-live/assemble-config.ts` | **New** — row → ServerConfig |
| `app/lib/app-config-live/assemble-config.test.ts` | **New** — fixture rows → routes keyed `route:*` |
| `app/composables/useTrellisConfigLive.ts` | **New** — trellis/vue subscriptions |
| `app/composables/useTrellisConfig.ts` | Dual-path: delegate to live when `useTrellisDb()` set |

Remove or gate SSE `fetchConfig` subscription when live path active (avoid double network).

### Slice 3 — projectionViews exposure

| File | Action |
|------|--------|
| `app/composables/useTrellisConfig.ts` | Expose `projectionViews` computed (P1 API gap) on both paths |

### Slice 4 — Divergence audit doc

| File | Action |
|------|--------|
| `docs/architecture/adr-002-kernel-divergence-audit.md` | **New** — audit table per above |

### Slice 5 — Docs

| File | Action |
|------|--------|
| `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` | P3 wedge note: sidecar-first live query; kernel SSE interim |
| `docs/sidecar-dev.md` | App config import + live query behavior |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run app/lib/app-config-live/assemble-config.test.ts` — assembled routes match P1 snapshot shape for fixture data
2. `test:cd apps/web && pnpm vitest run app/lib/app-config-sse.test.ts` — still pass (fallback path unchanged)
3. **Behavioral:** With `TRELLIS_SIDECAR=1` + sidecar + imported config, `useTrellisConfig` does **not** call `fetchConfig` on app_route SSE events (live path handles updates) — unit test with mocked TrellisDb subscription callback OR dev manual AC in describe
4. **Behavioral:** With `TRELLIS_SIDECAR=0`, boot still uses `$fetch('/api/graph/config')` + SSE refetch (regression — existing tests or new `useTrellisConfig.fallback.test.ts`)
5. `docs/architecture/adr-002-kernel-divergence-audit.md` exists with ≥10 compared surfaces
6. `projectionViews` exposed on `useTrellisConfig()` return value
7. Scoped eslint on new files: 0 errors

**E2e (optional, `needs-e2e`):** sidecar mode — mutate `route:home` label via API → rail label updates within 2s without full page reload.

---

## Verification commands

```bash
cd apps/web
pnpm vitest run app/lib/app-config-live/assemble-config.test.ts app/lib/app-config-sse.test.ts
pnpm exec eslint app/lib/app-config-live/ app/composables/useTrellisConfigLive.ts app/lib/trellis-sidecar/schema/app-config.ts
# Manual (sidecar path):
# just run → node scripts/import-app-config-to-sidecar.mjs → edit route entity → observe rail
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Sidecar DB empty → live path has no config | Fall back to path B when zero rows; document import script |
| Duplicate SSE + WS updates | Disable SSE refetch when live path active |
| trellis/vue API drift vs `trellis@3.2` | Pin version; follow `useSidecarPage` imports |
| Server lib import from client | Keep parsers in `app/lib/app-config-live/` |

---

## Handoff

```bash
trellis issue start TRL-15
trellis issue create -t "Impl: P3 trellis/vue app config live query" -l impl --parent TRL-15 -S queue
```
