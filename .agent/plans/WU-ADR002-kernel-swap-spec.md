# Spec: ADR-002 server kernel swap — Phase 1 npm persistence (TRL-19a)

**VCS:** TRL-19a (spec revision) · parent TRL-12 · supersedes TRL-19 drop-in swap  
**Blocker:** `.agent/plans/WU-ADR002-kernel-swap-blocker.md`  
**Proposal:** `.agent/plans/WU-ADR002-kernel-swap-proposal.md` (intent unchanged)  
**Status:** queue-ready

---

## Architect decision (CLARIFY response)

TRL-19 **drop-in** `trellis/core` `TrellisKernel` swap is **rejected** — npm lacks EQL-S string queries, `listProjections()`, `executeProjection()`, and `countOpsAfter()` on the backend.

**Revised wedge — TRL-19a (Phase 1):** Keep embedded `TrellisKernel` (EQL-S + projections + workspace boot). **Swap only the SQLite persistence backend** to npm `BetterSqliteKernelBackend` via a thin adapter that implements embedded `KernelBackend` + `countOpsAfter`.

This moves op-log persistence onto published `trellis` without touching the query/graph API surface. **TRL-19b** (full npm kernel + EQL-S bridge) is a follow-up spec after Phase 1 proves stable.

---

## Problem

Embedded `BetterSqliteBackend` duplicates npm `BetterSqliteKernelBackend`. Persistence is the lowest-risk convergence point.

## Goal

`server/plugins/trellis-kernel.ts` boots embedded `TrellisKernel` with an **npm-backed `KernelBackend` adapter** at `.data/trellis.db`.

## Non-goals

- Replacing embedded `TrellisKernel` class (TRL-19b)
- Server type import migration to `trellis/core` (TRL-19b)
- Hooks / app `graph/` imports
- Changing op-log format (must read existing DB)

---

## Architecture

```
server/plugins/trellis-kernel.ts
  TrellisKernel from @turtle.tech/trellis-kernel   (unchanged class)
  backend = createNpmSqliteKernelBackend(dbPath)  (NEW adapter)
    └─ BetterSqliteKernelBackend from trellis/core
    └─ countOpsAfter shim (readAfter length — matches embedded semantics)
```

### Adapter contract

`server/lib/trellis-kernel-adapter/npm-sqlite-backend.ts`:

```typescript
export function createNpmSqliteKernelBackend(dbPath: string): KernelBackend
```

- Wrap `BetterSqliteKernelBackend` from `trellis/core`
- Implement embedded `KernelBackend` interface from `@turtle.tech/trellis-kernel/persist`
- Add `countOpsAfter(hash?)` — `readAfter(hash).length` or `readAll().length`
- Map method names if needed (`getOpByHash` ↔ `getByHash`)
- `init()` called before kernel boot

---

## Implementation slices

### Slice 1 — Adapter + unit test

| File | Action |
|------|--------|
| `server/lib/trellis-kernel-adapter/npm-sqlite-backend.ts` | **New** — npm backend → embedded `KernelBackend` |
| `server/lib/trellis-kernel-adapter/npm-sqlite-backend.test.ts` | **New** — temp db: append op, readAll, countOpsAfter |

### Slice 2 — Plugin wire-up

| File | Action |
|------|--------|
| `server/plugins/trellis-kernel.ts` | Replace `BetterSqliteBackend` import with `createNpmSqliteKernelBackend(dbPath)` |

Preserve all boot/seed/zone-guard logic unchanged.

### Slice 3 — Docs

| File | Action |
|------|--------|
| `docs/sidecar-dev.md` | Note server persistence uses `trellis/core` SQLite backend |
| `.agent/plans/WU-ADR002-kernel-swap-blocker.md` | Add resolution: Phase 1 TRL-19a |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run server/lib/trellis-kernel-adapter/npm-sqlite-backend.test.ts` — pass
2. `test:cd apps/web && pnpm vitest run server/lib/seed-app-config.test.ts server/lib/app-config-snapshot.test.ts` — pass
3. `test:cd apps/web && pnpm vitest run server/lib/kernel-bridge/` — pass
4. **Behavioral:** `just trellis health --pretty` — ok
5. **Behavioral:** `just trellis query 'FIND entity AS ?e LIMIT 3' --pretty` — returns rows
6. **Grep:** `server/plugins/trellis-kernel.ts` imports `trellis/core` (backend only); no `persist/better-sqlite` from embedded package
7. Scoped eslint on adapter + plugin — 0 errors

**Manual AC:** `just run-kernel` → browse loads; kernel-bridge TRL-17 path still works.

---

## TRL-19b preview (deferred — do not implement)

Full npm `TrellisKernel` + EQL-S compatibility facade covering:

- `query(string)`, `listProjections()`, `executeProjection()`
- `boot(workspaceConfig)` async orchestration
- Ontology CRUD signature parity

Blocked until TRL-19a ships and npm/embedded op compatibility is verified on production DB.

---

## Handoff

```bash
trellis issue start TRL-19a
trellis issue create -t "Impl: npm SQLite backend adapter (TRL-19a)" -l impl --parent TRL-19a -S queue
```
