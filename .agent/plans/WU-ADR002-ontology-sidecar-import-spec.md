# Spec: ADR-002 sidecar ontology import verification (TRL-20c)

**VCS:** TRL-20c (spec) · parent TRL-12 · strategist handoff  
**Builds on:** TRL-20 (graph `trellis_schema` reads) · TRL-20b (client live ontologies) · TRL-16 P3 (`import-app-config-to-sidecar.mjs`)  
**Status:** queue-ready

---

## Problem

`TRELLIS_SIDECAR=1` requires a **manual import** of kernel app config into the sidecar DB before live queries work:

```bash
node scripts/import-app-config-to-sidecar.mjs
```

The script already upserts `AppSchema` rows (mapped from kernel `trellis_schema` / `config.ontologies`), but:

1. **No automated verification** that sidecar `AppSchema` count/keys match kernel `/api/graph/config` ontologies after import.
2. **`smoke:sidecar`** only exercises generic entity CRUD — does not assert config/ontology rows exist.
3. **Dev friction:** empty ontology sidebar on sidecar path when import was skipped; failure mode is silent (`transportMode` falls back to HTTP snapshot).
4. **No unit tests** for import task shaping (slug rule, `schemaId`, `configJson` payload).

Kernel-bridge path (`TRELLIS_SIDECAR=0`) does **not** need import — out of scope except as the parity source for verify.

## Goal

Harden the **sidecar ontology import path** so `AppSchema` rows are importable, verifiable, and documented — without kernel swap or client composable rewrites.

Success = after `import-app-config-to-sidecar.mjs`, a one-command verify proves ontology parity; CI/dev smoke catches missing import.

## Non-goals

- TRL-19b full kernel swap / EQL-S string API work
- Retire `GET /api/graph/ontologies` HTTP fallback (defer until sidecar is default dev path)
- New `defineType` per entity ontology in sidecar
- Changes to `useOntologyRegistry` / `useTrellisConfigLive` (TRL-20b complete)
- Entity browse import (`KernelBrowse` rows) — separate wedge
- Auto-run import on `just run` (document only; no boot hook)

---

## Architecture

```
Kernel (:1414)                          Sidecar (:8230 or /api/trellis proxy)
GET /api/graph/config                   PUT/POST AppSchema entities
  └─ ontologies: Record<schemaId, …>  →    ontology:{slug} + schemaId + configJson

Verify (TRL-20c):
  kernelOntologyKeys(config)  ==  sidecarSchemaIds(entities?type=AppSchema)
```

### Shared import task builder (testable)

Extract from `import-app-config-to-sidecar.mjs`:

| Module | Export |
|--------|--------|
| `scripts/lib/app-config-import-tasks.mjs` | `buildAppConfigImportTasks(config) → { type, id, attributes }[]` |
| same | `ontologyImportTask(schemaId, schema) → AppSchema task` (slug rule documented) |

Slug rule (unchanged): `schemaId.replace(/^trellis:schema\//, '').replace(/[:/]/g, '-')` → entity id `ontology:{slug}`.

### Verify mode

Extend import script **or** add sibling `scripts/verify-app-config-sidecar.mjs`:

| Step | Action |
|------|--------|
| 1 | `fetchKernelConfig()` — same as import |
| 2 | `fetchSidecarSchemas()` — `GET {target}/entities?type=AppSchema` (or list + filter if API lacks filter) |
| 3 | Compare **set of `schemaId`** on sidecar rows vs **keys of `config.ontologies`** |
| 4 | Exit `0` if equal cardinality and every kernel key present; else exit `1` with diff summary |

CLI flags on import script (preferred — one entry point):

```
node scripts/import-app-config-to-sidecar.mjs --verify-only
node scripts/import-app-config-to-sidecar.mjs --import-and-verify   # default import, then verify
```

### Smoke extension

Add `scripts/smoke-app-config-import.mjs` (or extend `smoke-sidecar.mjs` behind flag):

- Requires: kernel up, sidecar up, Nuxt `TRELLIS_SIDECAR=1`
- Assumes import already ran OR runs import inline (document chosen behavior in script header)
- Asserts: `sidecar AppSchema count >= N` where `N = min(5, kernel ontology count)` and `task` schema present

`package.json`: `"smoke:app-config": "node scripts/smoke-app-config-import.mjs"`  
`justfile`: `smoke-app-config` recipe.

---

## Implementation slices (executor order)

### Slice 1 — Extract task builder + unit tests

| File | Action |
|------|--------|
| `scripts/lib/app-config-import-tasks.mjs` | **New** — pure `buildAppConfigImportTasks` |
| `scripts/lib/app-config-import-tasks.test.mjs` | **New** — vitest or node:test: ontology slug, routes, projections |
| `scripts/import-app-config-to-sidecar.mjs` | Import from lib; no behavior change |

### Slice 2 — Verify mode

| File | Action |
|------|--------|
| `scripts/import-app-config-to-sidecar.mjs` | Add `--verify-only`, `--import-and-verify`; print missing/extra schemaIds |
| `scripts/lib/fetch-sidecar-schemas.mjs` | **New** (optional) — list AppSchema entities via proxy/direct |

### Slice 3 — Smoke + justfile

| File | Action |
|------|--------|
| `scripts/smoke-app-config-import.mjs` | **New** — parity smoke |
| `package.json` | `smoke:app-config` script |
| `justfile` | `smoke-app-config`, `verify-app-config-sidecar` recipes |

### Slice 4 — Docs

| File | Action |
|------|--------|
| `docs/sidecar-dev.md` | **TRL-20c** section: import → verify → ontology sidebar live; link commands |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run scripts/lib/app-config-import-tasks.test.mjs` — pass (≥3 cases: ontology slug, schemaId preserved, empty config)
2. **Behavioral:** with kernel + sidecar running:
   ```bash
   node scripts/import-app-config-to-sidecar.mjs
   node scripts/import-app-config-to-sidecar.mjs --verify-only
   ```
   verify exits `0`; re-run after deleting one AppSchema on sidecar → exits `1` with clear message
3. **Behavioral:** `TRELLIS_SIDECAR=1 node scripts/import-app-config-to-sidecar.mjs --verify-only` — passes via Nuxt proxy
4. `pnpm smoke:app-config` — pass when import completed (document prereqs in script)
5. **Grep:** `rg 'TRL-20c|verify-only' docs/sidecar-dev.md` — match
6. **Manual:** `TRELLIS_SIDECAR=1 just run` + import + verify → `/ontologies` sidebar shows system types; `useOntologyRegistry` `transportMode === 'live'` (no `/api/graph/ontologies` boot 404)
7. Scoped eslint on new `scripts/lib/*` + touched import script — 0 errors

**Regression:** `TRELLIS_SIDECAR=0 just run-kernel` — ontology registry unchanged (kernel-bridge path).

---

## Verification commands

```bash
cd apps/web
pnpm vitest run scripts/lib/app-config-import-tasks.test.mjs

# Dev stack (kernel :1414 + sidecar :8230 + TRELLIS_SIDECAR=1 Nuxt)
node scripts/import-app-config-to-sidecar.mjs --import-and-verify
pnpm smoke:app-config

# Kernel-only regression
TRELLIS_SIDECAR=0 pnpm vitest run app/lib/ontology-registry/
```

---

## Open questions (executor defaults)

1. **Entity list filter:** If sidecar `GET /entities?type=AppSchema` unsupported, list all and filter client-side — document in verify script.
2. **Smoke runs import:** Default **no** — smoke assumes prior import; fail fast with hint to run import script.
3. **Minimum ontology count:** Use `kernel config.ontologies` length as expected; warn if kernel returns 0 (seed failure).

---

## Handoff

```bash
trellis issue start TRL-20c
trellis issue create -t "Impl: sidecar ontology import verify (TRL-20c)" -l impl --parent TRL-20c -S queue
```

Spec artifact: `.agent/plans/WU-ADR002-ontology-sidecar-import-spec.md`
