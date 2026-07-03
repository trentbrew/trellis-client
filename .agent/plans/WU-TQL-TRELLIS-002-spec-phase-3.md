# Spec: Phase 3 — Package rename (`@turtle.tech/tql` → `@turtle.tech/trellis-kernel`)

**VCS:** TRL-2 (epic) · **Parent spec:** TRL-3 / `WU-TQL-TRELLIS-001-spec.md`  
**ADR:** `docs/architecture/adr-001-tql-to-trellis-rename.md` (D1)  
**Prerequisite:** Phases 1, 2, 2b shipped on `local-trellis` (`75712d3`)  
**Status:** queue → executor

---

## Problem

Phase 1 created **`packages/trellis-kernel/`** as a 9-file re-export stub depending on **`packages/tql/`** (canonical implementation, `@turtle.tech/tql`). Phase 3 inverts this: **`packages/trellis-kernel/`** becomes canonical; **`packages/tql/`** becomes the deprecated shim.

---

## Scope

### In scope

| Area | Action |
|------|--------|
| Directory | Move implementation `packages/tql/` → `packages/trellis-kernel/` |
| npm name | `@turtle.tech/trellis-kernel` on moved package |
| Shim | New thin `packages/tql/` re-exporting `@turtle.tech/trellis-kernel` |
| Workspace deps | `apps/web/package.json` → depend on `@turtle.tech/trellis-kernel` |
| TS imports | All `@turtle.tech/tql` → `@turtle.tech/trellis-kernel` in runtime code |
| Relative paths | `hooks/**` and `hooks/__tests__/**` `../packages/tql/` → `../packages/trellis-kernel/` |
| Lockfile | `pnpm install` after workspace graph change |

### Out of scope (later phases)

| Phase | Deferred |
|-------|----------|
| 4 | `.tql/` → `.trellis/hq/` data dir |
| 5 | `hooks/tql-*.ts` → `hooks/trellis-*.ts` filename rename |
| 6 | AGENTS.md, CI grep gate, broad doc sweep |
| — | Server log prefix `[tql]` → `[trellis-kernel]` (cosmetic) |

---

## Migration procedure (executor order)

### Step 1 — Remove Phase 1 stub

Delete stub files only (do **not** delete `packages/tql/` yet):

```
packages/trellis-kernel/index.ts
packages/trellis-kernel/store.ts
packages/trellis-kernel/kernel.ts
packages/trellis-kernel/persist.ts
packages/trellis-kernel/query.ts
packages/trellis-kernel/graph.ts
packages/trellis-kernel/persist/jsonl.ts
packages/trellis-kernel/persist/better-sqlite.ts
packages/trellis-kernel/package.json
```

### Step 2 — Move canonical package

```bash
git mv packages/tql packages/trellis-kernel
```

Internal layout unchanged (`kernel/`, `persist/`, `query/`, `graph/`, `store/`).

### Step 3 — Rename package identity

Edit `packages/trellis-kernel/package.json`:

- `"name": "@turtle.tech/trellis-kernel"`
- `"description": "Trellis kernel — EAV store, EQL-S query engine, graph mutations"`
- Keep existing `exports` map paths (relative to package root — unchanged after mv)

### Step 4 — Create `@turtle.tech/tql` shim

New `packages/tql/package.json`:

```json
{
  "name": "@turtle.tech/tql",
  "version": "0.1.0",
  "private": true,
  "description": "@deprecated Use @turtle.tech/trellis-kernel — removed after ADR-001 Phase 6.",
  "type": "module",
  "exports": {
    ".": { "types": "./index.ts", "import": "./index.ts" },
    "./store": { "types": "./store.ts", "import": "./store.ts" },
    "./kernel": { "types": "./kernel.ts", "import": "./kernel.ts" },
    "./persist": { "types": "./persist.ts", "import": "./persist.ts" },
    "./persist/jsonl": { "types": "./persist/jsonl.ts", "import": "./persist/jsonl.ts" },
    "./persist/better-sqlite": { "types": "./persist/better-sqlite.ts", "import": "./persist/better-sqlite.ts" },
    "./query": { "types": "./query.ts", "import": "./query.ts" },
    "./graph": { "types": "./graph.ts", "import": "./graph.ts" }
  },
  "dependencies": {
    "@turtle.tech/trellis-kernel": "workspace:*"
  }
}
```

Shim entry files (one line each): `export * from '@turtle.tech/trellis-kernel'` (and subpath equivalents matching Phase 1 stub pattern).

### Step 5 — Update consumers

| Location | Change |
|----------|--------|
| `apps/web/package.json` | `"@turtle.tech/trellis-kernel": "workspace:*"` (remove `@turtle.tech/tql` dep) |
| `apps/web/**/*.ts` | `@turtle.tech/tql` → `@turtle.tech/trellis-kernel` |
| `hooks/_kernel.ts` + `hooks/tql-*.ts` | `packages/tql/` → `packages/trellis-kernel/` in relative imports |
| `hooks/__tests__/**` | same path update |
| `apps/web/scripts/checkpoint-db.mts` | update package import if present |

**Allowlist** after sweep (must be only these):

- `packages/tql/**` (shim)
- `packages/trellis-kernel/**` (may reference old name only in comments/changelog)
- `.agent/plans/**`, `docs/**`, `ADR` (Phase 6 doc pass — optional touch in this PR if trivial)

### Step 6 — Lockfile

```bash
pnpm install
```

---

## Acceptance criteria

- [ ] `packages/trellis-kernel/` contains full kernel source (not stub re-exports)
- [ ] `packages/trellis-kernel/package.json` name is `@turtle.tech/trellis-kernel`
- [ ] `packages/tql/` exists as deprecated shim only (≤10 small re-export files + package.json)
- [ ] `apps/web/package.json` depends on `@turtle.tech/trellis-kernel`
- [ ] `rg '@turtle.tech/tql' --glob '*.{ts,mts,mjs,vue}'` returns hits **only** in `packages/tql/` shim
- [ ] `rg 'packages/tql' hooks/` returns **zero** (paths updated to `packages/trellis-kernel`)
- [ ] `pnpm --filter @trellis/web exec vitest run` — 498 tests pass (pre-existing unhandled theme errors acceptable)
- [ ] `bun test hooks/__tests__/` — pass
- [ ] `pnpm install` clean; lockfile committed

---

## Test plan

```bash
pnpm install
rg '@turtle.tech/tql' --glob '*.{ts,mts,mjs,vue}' | rg -v '^packages/tql/'
cd apps/web && node --import tsx/esm ./node_modules/vitest/vitest.mjs run
bun test hooks/__tests__/
```

Manual: dev server boots; `GET /api/graph/health` returns OK.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Stub + mv collision | Delete stub **before** `git mv` (Step 1) |
| Hooks break on path | Mechanical `packages/tql` → `packages/trellis-kernel` in hooks only |
| External `@turtle.tech/tql` consumers | Shim package preserves imports for one cycle |
| trellis-cli bundled nitro | Out of scope unless import fails — fix if build breaks |

---

## Handoff

Executor implements on `local-trellis` (canonical branch). Single PR; no behavior change expected — rename only.
