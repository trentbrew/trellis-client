# Proposal: ADR-002 server kernel swap — `trellis/core` on Nuxt plugin

**VCS:** TRL-19 (proposal) · parent TRL-12 (epic)  
**Human decision:** proceed without pause after TRL-18 ship — 2026-07-03  
**Builds on:** TRL-18 fork audit (port queue #1) · TRL-16/17 client read convergence  
**Status:** queue-ready

---

## Problem

Nuxt server boots **`@turtle.tech/trellis-kernel`** (embedded fork) in `server/plugins/trellis-kernel.ts`. TRL-18 audit shows **npm `trellis/core@3.2.3` is a structural twin** — 16 files tagged `port`, hot path is `TrellisKernel` + SQLite backend only.

Continuing on the fork duplicates maintenance and blocks ADR-002 D1 (convergence toward published `trellis`).

## Goal

**Swap the Nuxt server kernel plugin** to instantiate `TrellisKernel` from `trellis/core` with npm persistence (`createKernelBackend` or `BetterSqliteKernelBackend`), preserving:

- `.data/trellis.db` path and boot semantics
- `useTrellisKernel()` / `useWorkspaceConfig()` public API
- Graph API routes, kernel-bridge, zone guard, campus seed
- Existing tests (`seed-app-config`, `app-config-snapshot`, graph query smoke)

## Non-goals

- Retiring `packages/trellis-kernel` entirely (hooks, `graph/`, `workflows/` stay embedded v1)
- Client-side `trellis/vue` changes (TRL-16/17 done)
- Hooks relative imports (`packages/trellis-kernel/`) — follow-up TRL-19b
- `useWorkflowExecution` graph engine (`graph/` module) — TRL-21
- P2 zone-gated relay

---

## Scope (v1 wedge)

| In scope | Out of scope (defer) |
|----------|----------------------|
| `server/plugins/trellis-kernel.ts` | `hooks/**` relative kernel imports |
| Server `type` imports from `trellis/core` | App `graph/` imports |
| `packages/tql` shim policy (unchanged) | Deleting embedded package |

## Success criteria

- `just run-kernel` boots without error
- `just trellis query 'FIND entity AS ?e LIMIT 1'` returns rows
- `pnpm vitest run` for existing kernel-dependent server tests green
- No new `@turtle.tech/trellis-kernel` imports in `apps/web/server/**` (type-only migration)

---

## Handoff

```bash
# → architect spec TRL-19
```
