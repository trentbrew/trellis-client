# ADR-001: TQL → Trellis rename and shell/projection split

**Status:** Accepted  
**Date:** 2026-06-27  
**VCS:** TRL-2 (epic) · TRL-3 (spec)  
**Supersedes:** informal “TQL kernel” naming in docs and packages

---

## Context

The product surface is **Trellis** (`trellis-cli`, `TrellisKernel`, `.trellis` files, `.data/trellis.db`) but the kernel package, server plugin, hooks, and agent docs still use **TQL** branding. Route config (`tql-routes.ts`) entangles shell navigation with per-entity-type routes and projection metadata that duplicates `projections.ts` and `entityRegistry.ts`.

Fractal-playground validates a cleaner split: **shell routes** (nav chrome) vs **projection surfaces** (schema-driven view eligibility on collection hosts).

## Decision

### D1 — Kernel package name

**`@turtle.tech/trellis-kernel`** (directory `packages/trellis-kernel/`).

- `@turtle.tech/tql` remains a **deprecated re-export alias** for one release cycle after Phase 3.
- Rationale: avoids collision with unscoped npm `trellis`; matches `TrellisKernel` class name.

### D2 — Data directories (no unification in this epic)

| Subsystem | Path | Backend |
|-----------|------|---------|
| Web app kernel | `.data/trellis.db` | SQLite (`BetterSqliteBackend`) |
| HQ hooks / living-docs | `.trellis/hq/` | JSONL ops (`ops.jsonl`, `workspace.json`, …) |

- Migrate hooks from `.tql/` → `.trellis/hq/` with a one-time migration script and read-fallback for `.tql/` (one cycle).
- **Defer** merging hooks JSONL and web SQLite onto one backend (follow-up epic).

### D3 — Hook script prefix

Rename `hooks/tql-*.ts` → `hooks/trellis-*.ts`.

- Root `package.json` scripts stay `hq:*` (neutral, already established).
- Constant `TQL_DIR` → `TRELLIS_HQ_DIR`.

### D4 — Query language branding

- **Retire “TQL”** as product/query-language brand in user-facing docs.
- **Keep EQL-S** as the syntax name (`FIND … WHERE …`).
- Docs refer to **Trellis kernel** + **EQL-S**, not “TQL”.

### D5 — Entity storage namespace

**No change.** `entity:` prefix stays; app uses `entity-namespace.ts` (renamed from `tql-namespace.ts`).

### D6 — Shell vs projection boundary

| Layer | Module(s) | Responsibility |
|-------|-----------|----------------|
| **Shell routes** | `trellis-shell-routes.ts` | Rail, sidebar sections, collapse, auth, command palette — **no** `entityType` / `projectionTypes` |
| **Projection registry** | `trellis-projection-registry.ts` (server + client shared contract) | Field-signal gates, eligible views, defaults — ported from fractal-playground `collection-views.ts` |
| **Collection hosts** | `collections/[slug].vue`, `workspace/browse.vue` | Mount projection picker; URL carries `?view=` not per-type routes |
| **Corpus routes** | First-class pages only (e.g. `/locations`) | Product features that need dedicated chrome |

Remove per-entity-type workspace child routes (`/workspace/tasks`, …) in Phase 2b; sidebar type links come from ontology registry + projection defaults.

### D7 — Fractal vantage (explicitly out of scope)

Continuous vantage morph (`?vantage=N`, dual-shell crossfade, field disclosure) is a **separate epic** (TRL-9 proposal). This ADR only aligns **registry and route host** patterns with fractal-playground.

### D8 — Parallel track

Spreadsheet/datatable projection (`docs/planning/spreadsheet-datatable-projection.md`) proceeds independently; benefits from Phase 2b registry but is not gated on package rename (Phase 3).

---

## Implementation phases

| Phase | Deliverable |
|-------|-------------|
| 0 | This ADR (locked) |
| 1 | Aliases: `@turtle.tech/trellis-kernel`, `useTrellisKernel()`, `entity-namespace.ts` re-export |
| 2 | Rename server plugin + utils (`trellis-kernel.ts`, `trellis-shell-routes.ts`, …) |
| 2b | Unify projection registry; strip route children; wire `useRoutes` to registry |
| 3 | Package directory + npm name; deprecate `@turtle.tech/tql` |
| 4 | `.tql/` → `.trellis/hq/` migration |
| 5 | Hooks rename + `.windsurf/hooks.json` / husky updates |
| 6 | Docs, agent rules, CI grep gate |

Recommended execution order: **0 → 1 → 2 + 2b → 5 → 4 → 3 → 6** (package rename last).

---

## Consequences

### Positive

- Single projection contract; no triplication across routes / entityRegistry / projections.ts
- Product naming consistent end-to-end
- Clear path to fractal vantage without another nav rewrite

### Negative

- Large find-replace surface; requires alias period to avoid breaking external imports
- `.tql/` migration affects hooks git auto-commit paths
- Phase 3 is highest blast radius — do last

---

## References

- Proposal: `.agent/plans/WU-TQL-TRELLIS-000-proposal.md`
- Playground registry: `~/TURTLE/Projects/trellis/fractal-playground/lib/registry/collection-views.ts`
- Current routes: `apps/web/server/utils/tql-routes.ts`
