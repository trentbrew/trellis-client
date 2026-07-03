# Spec: Phase 4 — Data dir migration (`.tql/` → `.trellis/hq/`)

**VCS:** TRL-6 (spec) · **Impl:** TRL-7 · **Parent proposal:** TRL-4  
**ADR:** `docs/architecture/adr-001-tql-to-trellis-rename.md` (D2)  
**Epic ref:** `WU-TQL-TRELLIS-001-spec.md` Phase 4  
**Prerequisite:** Phase 3 shipped (`8041d0b` on `local-trellis`)  
**Status:** queue → executor

---

## Problem

HQ hooks read/write kernel state under **`.tql/`** (`ops.jsonl`, `workspace.json`, generated docs, devlog, etc.). ADR D2 relocates HQ data to **`.trellis/hq/`**, sibling to existing TrellisVCS files (`.trellis/kernel.db`, `.trellis/ops.json`, lanes). Package rename (Phase 3) is done; paths are the next rename surface.

---

## Scope

### In scope

| Area | Action |
|------|--------|
| `hooks/_kernel.ts` | Canonical `TRELLIS_HQ_DIR`; resolve `OPS_PATH` / `WORKSPACE_PATH`; legacy `.tql/` read fallback with `console.warn` |
| `hooks/tql-init.ts` | `hq:init` creates `.trellis/hq/` layout (via `_kernel` exports) |
| `hooks/*.ts` | Replace **functional** hardcoded `.tql/` path strings with `_kernel` exports (11 files — see list below) |
| `scripts/migrate-tql-dir.mjs` | One-time idempotent copy `.tql/*` → `.trellis/hq/*` |
| `.gitignore` | HQ ephemeral rules under `.trellis/hq/`; keep `.tql/` rules during fallback cycle |
| Git-tracked HQ config | Migrate tracked `.tql/{workspace.json,docs.trellis.jsonld,policies.eqls,.gitignore}` → `.trellis/hq/` |
| Tests | `bun test hooks/__tests__/` + unit test for path resolution / fallback |

### Out of scope (later phases)

| Phase | Deferred |
|-------|----------|
| 5 | `hooks/tql-*.ts` → `hooks/trellis-*.ts` filename rename; `TQL_DIR` export removal |
| 6 | AGENTS.md / living-docs path string sweep; CI grep gate (TRL-5) |
| — | Web app SQLite path (`.data/trellis.db`) — unchanged |
| — | TrellisVCS `.trellis/kernel.db` / `ops.json` — untouched |

---

## Target layout

```
.trellis/
  kernel.db          # TrellisVCS (unchanged)
  ops.json           # TrellisVCS (unchanged)
  lanes/             # TrellisVCS (unchanged)
  hq/                # HQ hooks JSONL brain (NEW canonical)
    .gitignore       # ephemeral rules (migrated from .tql/.gitignore)
    workspace.json   # tracked
    docs.trellis.jsonld
    policies.eqls
    ops.jsonl        # ephemeral
    devlog/ generated/ snapshots/ client/ …  # ephemeral
```

---

## `_kernel.ts` contract

```ts
export const TRELLIS_HQ_DIR = resolve(PROJECT_ROOT, '.trellis/hq');

/** @deprecated Phase 5 — use TRELLIS_HQ_DIR */
export const TQL_DIR = TRELLIS_HQ_DIR;

// Resolved at module load:
// 1. If .trellis/hq/ops.jsonl exists → use .trellis/hq/
// 2. Else if .tql/ops.jsonl exists → use .tql/ + console.warn deprecation
// 3. Else → .trellis/hq/ (init will create)

export const OPS_PATH = resolve(<resolvedDir>, 'ops.jsonl');
export const WORKSPACE_PATH = resolve(<resolvedDir>, 'workspace.json');
```

`requireInit()` error message should reference `.trellis/hq/ops.jsonl` and `bun run hq:init`.

---

## Migration script

**Path:** `scripts/migrate-tql-dir.mjs`

**Behavior:**

1. No-op if `.tql/` missing (exit 0, message)
2. Copy files/dirs from `.tql/` → `.trellis/hq/` (create parent dirs)
3. **Idempotent:** skip existing destination files unless `--force`
4. **Never** touch `.trellis/kernel.db`, `.trellis/ops.json`, or other VCS paths
5. Print summary: copied / skipped / conflicts
6. Exit 0 on success

**Usage:**

```bash
node scripts/migrate-tql-dir.mjs
node scripts/migrate-tql-dir.mjs --dry-run
node scripts/migrate-tql-dir.mjs --force
```

**Root `package.json`:** add `"hq:migrate": "node scripts/migrate-tql-dir.mjs"` (optional but recommended).

---

## `.gitignore` changes

1. Add `.trellis/hq/` ephemeral patterns mirroring current `.tql/` block (lines 52–59)
2. Add negation so tracked HQ config remains addable:
   ```
   .trellis/*
   !.trellis/hq/
   .trellis/hq/ops.jsonl
   .trellis/hq/snapshot.json
   … (mirror .tql ephemeral list)
   ```
3. Keep legacy `.tql/*` ignore entries for fallback cycle
4. Do **not** remove TrellisVCS ignore behavior for `kernel.db` etc.

---

## Hooks with hardcoded `.tql/` paths (update to `_kernel` exports)

| File | Notes |
|------|-------|
| `hooks/_kernel.ts` | Source of truth |
| `hooks/tql-init.ts` | `IGNORE_DIRS` add `.trellis`; init messages |
| `hooks/tql-git.ts` | `git status` / `git add` target `.trellis/hq/` |
| `hooks/tql-status.ts` | workspace + devlog paths |
| `hooks/tql-docs-sync.ts` | `docs.trellis.jsonld` path |
| `hooks/tql-docs.ts` | generated output dir |
| `hooks/tql-devlog.ts` | devlog path |
| `hooks/tql-compact.ts` | log messages only if paths already from `_kernel` |
| `hooks/tql-export.ts` | client dirs under HQ |
| `hooks/tql-heal.ts` | heal missing HQ dir |
| `hooks/tql-seed.ts` | seed data references (if any hardcoded) |
| `hooks/archive-response.ts` | cascade archive path if under `.tql/` |

**Comment-only** `.tql/` references in hooks may remain until Phase 5/6.

---

## Git-tracked file migration (executor)

`git mv` tracked HQ config:

```
.tql/.gitignore        → .trellis/hq/.gitignore
.tql/workspace.json    → .trellis/hq/workspace.json
.tql/docs.trellis.jsonld → .trellis/hq/docs.trellis.jsonld
.tql/policies.eqls     → .trellis/hq/policies.eqls
```

Run `node scripts/migrate-tql-dir.mjs` for ephemeral/local state before deleting empty `.tql/` (optional — fallback covers transition).

---

## Acceptance criteria

- [ ] `hooks/_kernel.ts` exports `TRELLIS_HQ_DIR`; `OPS_PATH` resolves to `.trellis/hq/ops.jsonl` when present
- [ ] Legacy fallback: with only `.tql/ops.jsonl`, kernel reads from `.tql/` and emits one `console.warn`
- [ ] `bun run hq:init` creates `.trellis/hq/{workflows,devlog,generated,snapshots,client}/` when workspace exists
- [ ] `scripts/migrate-tql-dir.mjs` exists; `--dry-run` reports planned copies
- [ ] Tracked config lives under `.trellis/hq/` (git mv)
- [ ] `.gitignore` has `.trellis/hq/` ephemeral rules + tracked-file negation
- [ ] `hooks/tql-git.ts` stages `.trellis/hq/` not `.tql/`
- [ ] `rg "'\\.tql" hooks/ --glob '*.ts'` — zero **functional** path literals outside `_kernel.ts` fallback block
- [ ] `test:bun test hooks/__tests__/hq-paths.test.ts` — new unit tests for resolution + fallback
- [ ] `test:bun test hooks/__tests__/` — pass (integration API timeouts without dev server acceptable)

---

## Test plan

```bash
node scripts/migrate-tql-dir.mjs --dry-run
bun test hooks/__tests__/hq-paths.test.ts
bun test hooks/__tests__/
# Manual: rm -rf .trellis/hq/ops.jsonl && touch .tql/ops.jsonl → createKernel warns once
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| `.trellis` blanket gitignore blocks `hq/` tracking | Negation patterns in spec; verify `git add .trellis/hq/workspace.json` |
| VCS vs HQ collision under `.trellis/` | Script only writes `hq/` subtree |
| `tql-git` still commits `.tql/` | Explicit AC + file in hook list |
| Phase 5 double-rename | Keep `TQL_DIR` deprecated alias until Phase 5 |

---

## Handoff

Executor implements on `local-trellis`. Single focused commit; run migration script locally after merge. TRL-5 (CI gate) follows Phase 4 ship.
