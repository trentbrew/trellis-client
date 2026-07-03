# TRL-19 blocker — npm `trellis/core` API gap

**Date:** 2026-07-03  
**Author:** agent:executor  
**Status:** resolved for TRL-19a (Phase 1 persistence)

---

## TRL-19a resolution (2026-07-03)

Phase 1 ships **embedded `TrellisKernel`** + npm-schema SQLite persistence adapter:

- Legacy `.data/trellis.db` (embedded `ops` schema) → embedded `BetterSqliteBackend` fallback
- Fresh DB → `NpmBetterSqliteKernelBackend` (schema-compatible with `trellis@3.2.3`)
- Published `trellis/core` `createKernelBackend('better-sqlite')` is **not used** — its esbuild `__require` shim fails under native ESM; adapter ports the npm schema with native `better-sqlite3`

TRL-19b (full npm kernel + EQL-S facade) remains deferred.

---

## Summary (original TRL-19 drop-in blocker)

TRL-18 audit classified `trellis/core@3.2.3` as a structural twin of `packages/trellis-kernel`. **Runtime API is not drop-in compatible** for the Nuxt server graph layer.

## Gaps (embedded → npm)

| Capability | Embedded (`@turtle.tech/trellis-kernel`) | npm (`trellis/core`) |
|------------|------------------------------------------|----------------------|
| EQL-S query | `kernel.query(eqlsString)` | `kernel.query(Query)` only — **no EQL-S parser in npm dist** |
| Workspace boot | `await kernel.boot(workspaceConfig)` | `kernel.boot()` + `kernel.bootWorkspace(config)` (sync) |
| Backend ctor | `new BetterSqliteBackend({ filename })` | `new BetterSqliteKernelBackend(dbPath)` or async `createKernelBackend(path)` |
| Auto-checkpoint | `backend.countOpsAfter(hash)` | **not on npm `BetterSqliteKernelBackend` d.ts** |
| `checkpoint()` | `await kernel.checkpoint()` | `kernel.checkpoint()` sync void |
| Constructor | `{ backend, autoReplay }` | `{ backend, agentId, ... }` **agentId required** |

## Server dependency on EQL-S

`apps/web/server/api/graph/[...path].ts` and ~15 other server files call `kernel.query('FIND ...')` with EQL-S strings. CLI `just trellis query` depends on the same path.

## Recommended revision paths

1. **TRL-19a — npm persistence backend (Phase 1)** — **chosen** — embedded `TrellisKernel` + npm `BetterSqliteKernelBackend` adapter. See revised `WU-ADR002-kernel-swap-spec.md`.
2. **TRL-19b — EQL-S + full kernel facade** — npm `TrellisKernel` + embedded EQL-S/projections bridge. After 19a ships.
3. **Upstream first** — port EQL-S stack to trellis-node; then 19b simplifies.
4. ~~**Defer TRL-19**~~ — superseded by phased 19a/19b.

## Verification

```bash
# npm kernel has no EQL-S symbols
rg -l EQLS apps/web/node_modules/trellis/dist/core  # empty

# embedded query is string-based
rg "query\(" packages/trellis-kernel/kernel/trellis-kernel.ts
```
