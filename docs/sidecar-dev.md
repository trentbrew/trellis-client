# Sidecar dev (Option B Phase 0)

The Nuxt app (`:1414` by default) can proxy to a published **trellis** sidecar on `:8230` when `TRELLIS_SIDECAR=1`. Option A (embedded TQL kernel) remains the default when the flag is off.

## Two CLIs

| Tool | Purpose |
|------|---------|
| Monorepo `just trellis` / `packages/trellis-cli` | Graph CLI against embedded kernel on `:1414` |
| npm `trellis@^3.2.0` (via Bun — see `just sidecar-init`) | Sidecar `db init` / `db serve` on `:8230` |

## Quick start

```bash
cd apps/web

# Once — writes .trellis-db.json (Bun + trellis db init)
just sidecar-init

# Terminal 1 — sidecar (TRELLIS_BACKEND=sqljs bun … db serve)
just sidecar-serve

# Terminal 2 — Nuxt with proxy enabled
TRELLIS_SIDECAR=1 pnpm dev

# Smoke (sidecar + Nuxt both running)
pnpm smoke:ws          # WS directly to sidecar
TRELLIS_SIDECAR=1 pnpm smoke:sidecar   # HTTP via Nuxt proxy
```

## Env

| Variable | Default | Notes |
|----------|---------|-------|
| `TRELLIS_SIDECAR` | off | Set `1` to enable `/api/trellis/*` proxy |
| `TRELLIS_URL` | `http://localhost:8230` | Sidecar origin |
| `TRELLIS_API_KEY` | optional | Bearer token if sidecar requires auth |
| `TRELLIS_PORT` | `1414` | Nuxt dev port |
| `NUXT_PUBLIC_MAPBOX_TOKEN` | unset | Client Mapbox GL token for `/locations` map tiles |
| `MAPBOX_ACCESS_TOKEN` | unset | Server token for `GET /api/geocode` (can match public token in dev) |

Copy `.trellis-db.json.example` → `.trellis-db.json` or run `just sidecar-init`.

## Bun note

`db serve` may require Bun with `TRELLIS_BACKEND=sqljs` (see fractal-playground justfile). The `sidecar-serve` recipe sets this automatically.

## Phase 1 — page route (`/pages/[id]`)

When `TRELLIS_SIDECAR=1`, the page editor uses the **sidecar truth path** (`useEntity` + `useMutation` via `/api/trellis`) and **Trellis-native presence** (`joinPresence` + `RealtimeText`). Browse, kernel entities, and the rest of the app stay on the embedded kernel (Option A).

| Layer | Transport |
|-------|-----------|
| Graph truth | HTTP `/api/trellis/*` → sidecar `:8230`, WS `ws://localhost:8230/realtime` |
| Presence gossip | `trellis/realtime` — same-browser `BroadcastChannel`; optional relay below |

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

### Presence relay (optional)

Cross-browser / cross-machine presence requires a relay. Same-browser multi-tab works without it.

| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_PRESENCE_RELAY_URL` | unset | e.g. `ws://localhost:8231/rt` when running a trellis realtime relay |

Set in `.env` or Vite env for the Nuxt app. AC-3–5 pass with BroadcastChannel only (two tabs, same origin).

### E2E

```bash
TRELLIS_SIDECAR=1 SIDECAR_TEST_PAGE_ID=<imported-page-id> pnpm test:e2e tests/e2e/sidecar-page-sync.spec.ts
```
