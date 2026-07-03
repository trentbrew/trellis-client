# Sidecar dev (Option B Phase 0)

The Nuxt app (`:1414` by default) can proxy to a published **trellis** sidecar on `:8230` when `TRELLIS_SIDECAR=1`. Option A (embedded TQL kernel) remains the default when the flag is off.

## Kernel persistence (TRL-19a)

The embedded kernel (`just run-kernel`, `TRELLIS_SIDECAR=0`) persists to `.data/trellis.db`:

| Schema | Backend | When |
|--------|---------|------|
| Legacy (`ops.id` + `ops.ts`) | Embedded `BetterSqliteBackend` | Existing dev databases |
| npm layout (`ops.timestamp` + `agent_id`) | `NpmBetterSqliteKernelBackend` (trellis@3.2.3 schema) | Fresh databases |

The server plugin imports `trellis/core` types for the npm `KernelBackend` contract. Legacy DBs keep the embedded backend until a migration wedge lands.

## Ontology registry (TRL-20)

`GET /api/graph/ontologies` reads **graph-resident `trellis_schema` entities** (seeded on boot via `seedAppConfigFromModules`), not `kernel.listOntologies()`. Ontology CRUD dual-writes kernel registry + `ontology:*` document rows. Module `trellis-ontologies.ts` remains boot seed + empty-graph fallback only.

## Two CLIs

| Tool | Purpose |
|------|---------|
| Monorepo `just trellis` / `packages/trellis-cli` | Graph CLI against embedded kernel on `:1414` |
| npm `trellis@^3.2.0` (via Bun — see `just sidecar-init`) | Sidecar `db init` / `db serve` on `:8230` |

## Quick start

From repo root (`just run` / `just dev`) or `apps/web`:

```bash
cd apps/web

# One command — sidecar (:8230) + Nuxt (:1414) with TRELLIS_SIDECAR=1
just run

# Option A only (embedded kernel, no sidecar)
just run-kernel
# or: TRELLIS_SIDECAR=0 just run

# Manual split (same as `just run` internals)
just sidecar-serve          # terminal 1
TRELLIS_SIDECAR=1 pnpm dev  # terminal 2

# Smoke (both running via `just run`)
pnpm smoke:ws
TRELLIS_SIDECAR=1 pnpm smoke:sidecar
```

## Env

| Variable | Default | Notes |
|----------|---------|-------|
| `TRELLIS_SIDECAR` | off | Set `1` to enable `/api/trellis/*` proxy |
| `TRELLIS_URL` | `http://localhost:8230` | Sidecar origin |
| `TRELLIS_API_KEY` | optional | Bearer token if sidecar requires auth |
| `TRELLIS_PORT` | `1414` | Nuxt dev port |

`/locations` uses **MapLibre + CARTO/OSM** tiles and **Photon** geocoding — no API keys required.

Copy `.trellis-db.json.example` → `.trellis-db.json` or run `just sidecar-init`.

## Bun note

`db serve` may require Bun with `TRELLIS_BACKEND=sqljs` (see fractal-playground justfile). The `sidecar-serve` recipe sets this automatically.

## Phase 1 — page route (`/pages/[id]`)

When `TRELLIS_SIDECAR=1`, the page editor uses the **sidecar truth path** (`useEntity` + `useMutation` via `/api/trellis`) and **Trellis-native presence** (`joinPresence` + `RealtimeText`). Browse, kernel entities, and the rest of the app stay on the embedded kernel (Option A).

| Layer | Transport |
|-------|-----------|
| Graph truth | HTTP `/api/trellis/*` → sidecar `:8230`, WS `ws://localhost:8230/realtime` |
| Presence gossip | `trellis/realtime` — **zone-scoped** rooms (`zone:<zoneId>` per ADR-002 D3) |

### Presence rooms (ADR-002 P0)

Ephemeral presence uses **Campus zone** as the room key — not per-page rooms:

| Key | Example | Scope |
|-----|---------|-------|
| Zone room | `zone:entity:founder-facility-showroom` | All peers in the same zone (Showroom, Lab, …) |
| Page filter | `pageId` in presence state | UI filters avatars to the current page |

Transport ladder (no server required for rung 1):

| Rung | Mechanism | When |
|------|-----------|------|
| **1** | `BroadcastChannel` (`joinPresence` with no `relayUrl`) | Same browser, multiple tabs — **default** |
| **2** | WS relay (`VITE_PRESENCE_RELAY_URL`) | Cross-browser / cross-machine |

`joinPresence` picks BC automatically when `VITE_PRESENCE_RELAY_URL` is unset. Presence never writes to the op-log.

### Import kernel pages

Sidecar DB (`.trellis-db/`) is separate from `.trellis/kernel.db`. Existing kernel page UUIDs must be imported before opening them on the sidecar path:

```bash
# Kernel on :1414, sidecar on :8230
node scripts/import-pages-to-sidecar.mjs

# Or via Nuxt proxy (both servers running, TRELLIS_SIDECAR=1 on Nuxt)
TRELLIS_SIDECAR=1 node scripts/import-pages-to-sidecar.mjs

# Limit rows
LIMIT=20 node scripts/import-pages-to-sidecar.mjs
```

Maps `PageItem.content` → sidecar `body`, preserves entity `id`.

### Import app config (P3 live query)

App config (routes, ontologies, projections, collection views) is seeded in the **embedded kernel** on boot. For sidecar live queries (`useTrellisConfig` path A), mirror config into the sidecar DB:

```bash
# Kernel on :1414, sidecar on :8230
node scripts/import-app-config-to-sidecar.mjs

# Or via Nuxt proxy
TRELLIS_SIDECAR=1 node scripts/import-app-config-to-sidecar.mjs
```

When `TRELLIS_SIDECAR=1` and imported rows exist, `useTrellisConfig` uses `trellis/vue` `useEntities` (no SSE refetch). With `TRELLIS_SIDECAR=0`, the **kernel-bridge** client (`/api/graph/kernel-bridge` + kernel SSE) provides the same live path without sidecar or import. Otherwise it falls back to `GET /api/graph/config` + SSE (P1).

### Kernel-bridge (embedded live query, no import)

Default dev (`just run-kernel`, `TRELLIS_SIDECAR=0`) registers a `TrellisDb` shim that:

| Layer | Transport |
|-------|-----------|
| Entity list | `GET /api/graph/kernel-bridge/entities?type=AppRoute` (etc.) |
| Live updates | Kernel SSE `/api/graph/events` → refetch on app-config mutations |

No import script required — reads P1-seeded kernel facts directly. Sidecar path takes priority when `TRELLIS_SIDECAR=1`.

### Browse live (kernel-bridge only, TRL-17)

Entity browse (`useTrellisEntities`) uses the same kernel-bridge client when `TRELLIS_SIDECAR=0`:

| Layer | Transport |
|-------|-----------|
| Entity list | `GET /api/graph/kernel-bridge/entities?type=KernelBrowse` |
| Live updates | Kernel SSE → refetch browse rows on `entity:*` mutations |

`KernelBrowse` rows carry `payloadJson` (scalar entity fields; `references: []` in v1). Sidecar mode keeps the legacy TQL `FIND entity` path until entity import lands.

### Ontology registry live (kernel-bridge / sidecar, TRL-20b)

`useOntologyRegistry()` piggybacks **`useTrellisConfig` live ontologies** when `transportMode === 'live'` — same `AppSchema` kernel-bridge subscribe as the config rail (no duplicate `useEntities` subscription, no `/api/graph/ontologies` boot fetch). Fallback path: HTTP ontologies list + SSE refetch (P1).

### Presence relay (optional)

Cross-browser / cross-machine presence requires a relay. Same-browser multi-tab works without it.

| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_PRESENCE_RELAY_URL` | unset | e.g. `ws://localhost:8231/rt` when running a trellis realtime relay |

Set in `.env` or Vite env for the Nuxt app. P0 zone presence AC pass with BroadcastChannel only (two tabs, same browser context).

### E2E

```bash
# Durable page sync (sidecar WS)
TRELLIS_SIDECAR=1 SIDECAR_TEST_PAGE_ID=<imported-page-id> pnpm test:e2e tests/e2e/sidecar-page-sync.spec.ts

# Zone BroadcastChannel presence (two tabs, no relay)
TRELLIS_SIDECAR=1 SIDECAR_TEST_PAGE_ID=<imported-page-id> PW_REUSE=1 pnpm test:e2e tests/e2e/zone-presence-bc.spec.ts
```
