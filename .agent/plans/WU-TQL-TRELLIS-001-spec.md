# Spec: TQL→Trellis rename + projection registry

**VCS:** TRL-3 (spec child of TRL-2) · **Impl wedge:** TRL-4 · **Deferred:** TRL-5  
**ADR:** `docs/architecture/adr-001-tql-to-trellis-rename.md`  
**Status:** queue → executor (TRL-4)

---

## Scope

Implement ADR-001 in phased PRs. Each phase is independently mergeable with tests green.

---

## Phase 1 — Non-breaking aliases

### Files

| Add / change | Action |
|--------------|--------|
| `packages/tql/package.json` | Add `"name"` export alias doc; prepare for rename |
| `packages/trellis-kernel/` | **Not yet** — alias via package.json `exports` map pointing `@turtle.tech/trellis-kernel` → same files |
| `apps/web/server/plugins/tql.ts` | Export `useTrellisKernel()` alias of `useTqlKernel()` |
| `apps/web/app/lib/entity-namespace.ts` | New file re-exporting `tql-namespace.ts` |
| `apps/web/app/lib/tql-namespace.ts` | Add `@deprecated` JSDoc pointing to `entity-namespace.ts` |

### AC

- [ ] `pnpm --filter @trellis/web typecheck` passes
- [ ] `useTrellisKernel()` callable from any server route that already uses `useTqlKernel()`
- [ ] `import { entityId } from '~/lib/entity-namespace'` resolves
- [ ] Zero behavior change — grep shows both old and new names coexist

---

## Phase 2 — Server renames

### Files

| Old | New |
|-----|-----|
| `server/plugins/tql.ts` | `server/plugins/trellis-kernel.ts` |
| `server/utils/tql-routes.ts` | `server/utils/trellis-shell-routes.ts` |
| `server/utils/tql-ontologies.ts` | `server/utils/trellis-ontologies.ts` |
| `server/utils/tql-events.ts` | `server/utils/trellis-events.ts` |

### AC

- [ ] Nitro plugin auto-loads `trellis-kernel.ts`
- [ ] All imports updated; no remaining `from '../plugins/tql'` in `apps/web/server`
- [ ] `pnpm --filter @trellis/web check` passes (lint + vitest + validate-routes)
- [ ] `useTqlKernel` kept as deprecated alias for one cycle

---

## Phase 2b — Projection registry unification

### New modules

```
apps/web/app/lib/trellis-projection-registry/
  index.ts              # re-exports
  field-signals.ts      # infer select/date/lane from ontology fields
  collection-views.ts   # port from fractal-playground (Vue-adapted)
  types.ts              # CollectionViewMode aligned with ProjectionType
```

Server mirror (optional Phase 2b.1): `server/utils/trellis-projection-registry.ts` for `GET /api/graph/config` projections section.

### Strip from shell routes

Remove from `trellis-shell-routes.ts` workspace `children`:
- All routes with `entityType` + `projectionTypes` (`/workspace/tasks`, `/workspace/notes`, …)

Keep workspace sidebar type links via `useOntologyRegistry()` + `suggestCollectionViews(schema)`.

### Wire consumers

| Consumer | Change |
|----------|--------|
| `useRoutes.ts` | Stop hardcoding `/database/{type}`; use registry default view |
| `useTrellisConfig.ts` | Projections from registry, not duplicated route metadata |
| `collections/[slug].vue` | Eligible views from registry (already partial) |
| `entityRegistry.ts` | Delete after registry is canonical; update fallbacks |

### AC

- [ ] `entityRegistry.ts` deleted or reduced to empty deprecated stub
- [ ] `projectionTypes` removed from all `RouteDefinition` objects
- [ ] New ontology via CLI adds sidebar link + eligible views without editing route files
- [ ] `vitest` + `validate-routes.ts` pass
- [ ] `/workspace/tasks` redirects to `/workspace/browse?type=task` (or 301 in route rules)

---

## Phase 3 — Package rename

### AC

- [ ] `git mv packages/tql packages/trellis-kernel`
- [ ] `package.json` name `@turtle.tech/trellis-kernel`
- [ ] `apps/web/package.json` dependency updated
- [ ] `@turtle.tech/tql` re-export shim in `packages/trellis-kernel/package.json` exports
- [ ] All `@turtle.tech/tql` imports updated in repo
- [ ] `pnpm test` + hooks tests pass

---

## Phase 4 — Data dir migration

### AC

- [ ] `hooks/_kernel.ts`: `TRELLIS_HQ_DIR = resolve(PROJECT_ROOT, '.trellis/hq')`
- [ ] Migration script `scripts/migrate-tql-dir.mjs` moves `.tql/*` → `.trellis/hq/*`
- [ ] Read fallback: if `.trellis/hq/ops.jsonl` missing, try `.tql/ops.jsonl` with console warn
- [ ] `.gitignore` updated
- [ ] `hq:init` creates `.trellis/hq/` layout
- [ ] `bun test hooks/__tests__/` pass

---

## Phase 5 — Hooks rename

### AC

- [ ] All `hooks/tql-*.ts` → `hooks/trellis-*.ts`
- [ ] `.windsurf/hooks.json`, `.husky/post-commit`, root `package.json` hq scripts updated
- [ ] `living-docs/TQL_HOOKS.md` generator → `TRELLIS_HOOKS.md`
- [ ] `bun test hooks/__tests__/` pass

---

## Phase 6 — Docs + CI gate

### AC

- [ ] `AGENTS.md`, `ARCHITECTURE.md`, `.cursorrules` say Trellis kernel (not TQL)
- [ ] CI script or lint rule fails on new `@turtle.tech/tql` imports (allowlist `packages/trellis-kernel` shim)
- [ ] Deprecated aliases documented with removal target date

---

## Deferred — TRL-9

Fractal vantage presentation (`useVantageState`, `--vantage` CSS, dual-shell). Separate proposal; do not implement in TRL-3 impl.

---

## Test plan (executor)

```bash
pnpm --filter @trellis/web check
pnpm test
bun test hooks/__tests__/
tsx apps/web/scripts/validate-routes.ts
# Manual: sidebar shows dynamic ontology links; collection projection picker respects field signals
```

---

## First impl wedge (recommended)

Ship **Phase 0 + Phase 1** in first PR (this spec file + ADR already land Phase 0). Second PR: Phase 2 + 2b.
