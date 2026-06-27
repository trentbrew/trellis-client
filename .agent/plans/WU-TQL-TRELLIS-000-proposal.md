# Proposal: TQL→Trellis rename + fractal-aligned projection registry

**VCS:** TRL-2 (`trellis issue show TRL-2`)  
**Milestone:** `milestone:5ad08e8efd9c` — Initiative kickoff  
**Status:** queue → architect  
**Labels:** proposal, epic, architecture  
**Priority:** high

---

## Problem

The product is branded **Trellis** but the kernel layer still uses **TQL** throughout:

- Package `@turtle.tech/tql`, directory `packages/tql/`
- Server plugin `tql.ts`, `useTqlKernel()`, utils `tql-routes.ts`, `tql-ontologies.ts`, `tql-events.ts`
- Client helper `tql-namespace.ts` (22 import sites)
- Hooks ecosystem: 21× `hooks/tql-*.ts`, data dir `.tql/`
- Docs/agent rules still diagram "TQL Kernel"

Meanwhile **routes are entangled**: `tql-routes.ts` mixes rail/sidebar nav with per-entity-type children and `projectionTypes` that duplicate `app/lib/projections.ts` and `entityRegistry.ts`. Route metadata (`entityType`, `pageVariant`) is largely unused.

**Dual persistence:** web app uses `.data/trellis.db`; HQ hooks use `.tql/ops.jsonl`.

## Goals

1. **Rename** TQL → Trellis across package, server, hooks, docs (phased, with aliases).
2. **Restructure** routes into **shell nav** vs **schema-driven projection surfaces** (fractal-playground pattern).
3. **Do not bundle** fractal vantage presentation (`?vantage=N`, dual-shell crossfade) — separate epic.

## Non-goals

- Graph-generated URL trees (playground doesn't do this either)
- Changing `entity:` storage namespace (data migration, separate concern)
- Retiring EQL-S query language name
- Full `/fractals/*` demo routes in production

## Fractal alignment (from fractal-playground)

| Playground pattern | trellis-client target |
|--------------------|----------------------|
| `FRACTAL_ROUTES` (shell nav) | `trellis-shell-routes.ts` — rail, sidebar, collapse only |
| `corpus-registry` + `collection-views` | `trellis-projection-registry.ts` — ontology signals → eligible views |
| `/collections/[slug]` host | Consolidate `/workspace/{type}` → browse/collection hosts |
| Vantage on same URL | Phase 5+ (later epic) |

## Proposed phases (Architect to spec)

| Phase | Scope | Risk |
|-------|-------|------|
| 0 | ADR: package name, data dir, hook prefix, shell vs projection boundary | Low |
| 1 | Non-breaking aliases (`@turtle.tech/trellis-kernel`, `useTrellisKernel()`) | Low |
| 2 | Server + app renames (`trellis-routes`, `entity-namespace.ts`) | Medium |
| 3 | Package rename `packages/tql` → `packages/trellis-kernel` | High |
| 4 | Data dir `.tql/` → `.trellis/` migration | Medium |
| 5 | Hooks rename `tql-*` → `trellis-*` | Medium |
| 6 | Docs + cleanup, CI grep gate | Low |
| **2b** | Projection registry unification (with Phase 2 rename) | Medium |

## Parallel track

`docs/planning/spreadsheet-datatable-projection.md` — port virtualized datatable from fractal-playground. **Not blocked** by rename; benefits from projection registry unification (Phase 2b).

## Open decisions (ADR Phase 0)

1. Package: `@turtle.tech/trellis-kernel` vs `@turtle.tech/trellis`?
2. Data dir: `.trellis/` vs keep `.data/` for SQLite + rename hooks JSONL only?
3. Unify hooks JSONL + web SQLite onto one kernel?
4. Hook prefix: `trellis-*` vs neutral `hq-*`?
5. Retire "TQL" as query language brand → document EQL-S + Trellis kernel only?

## Acceptance criteria (epic)

- [x] Phase 0 ADR committed with locked decisions → `docs/architecture/adr-001-tql-to-trellis-rename.md`
- [x] Child spec issues for phases 1–6 + 2b → **TRL-3** (phased AC)
- [x] Vantage/fractal presentation explicitly deferred → **TRL-5**
- [x] Spreadsheet projection track documented as parallel, not blocked

## References

- Prior audit: chat session 2026-06-27 (TQL inventory ~100+ doc mentions, 15 package imports, 21 hooks)
- Playground: `/Users/trentbrew/TURTLE/Projects/trellis/fractal-playground/lib/registry/corpus-registry.ts`
- Current routes: `apps/web/server/utils/tql-routes.ts`
- Current projections: `apps/web/app/lib/projections.ts`
