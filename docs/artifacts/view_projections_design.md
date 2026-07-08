---
version: alpha
name: View Projections — route all surfaces through the existing projection registry
description: The projection registry (trellis-projection-registry + ProjectionType) already exists and gates collection views by schema capability. The browse page and VCS board bypass it with a drifted BrowseViewMode vocab + v-if ladder. Add a shared layout→renderer dispatch and route every surface through the one registry. Pattern from turtlecode/ide affordance-layout system.
source:
  parent: "TRL-26 (proposal)"
  baseline: "turtlecode/ide specs/affordance-layout-system.md + specs/projections-rail.md"
  decision: "Do NOT invent a new enum — ProjectionType is canonical. Reconcile BrowseViewMode → ProjectionType; add the missing shared layout→renderer dispatch; route browse + VCS through the existing trellis-projection-registry (with its schema-capability gating)."
---

# View Projections — route all surfaces through the existing projection registry

Design/proposal for making trellis-client's view surfaces render through the **one
projection registry that already exists**, instead of the per-surface vocabularies and
`v-if` ladders they use today. The organizing pattern is ported from turtlecode/ide's
affordance-layout system — but trellis-client turns out to already have the registry and
capability layers; the genuinely-missing piece is a shared **renderer dispatch**.

> **Prior art:** `turtlecode/ide` — `specs/affordance-layout-system.md` (AffordanceShell,
> layout recipes, layout-first router), `specs/projections-rail.md` (registry shape).

---

## Reality check (what already exists)

trellis-client is **further along than turtlecode was** — the registry and capability
layers exist; only the shared renderer dispatch is missing:

| turtlecode layer | trellis-client today | Status |
| --- | --- | --- |
| Canonical projection vocabulary | [`ProjectionType`](../../apps/web/app/types/database.ts#L317) — 17 members (table, spreadsheet, kanban, calendar, list, card-grid, timeline, graph, chart, moodboard, slide-deck, dashboard, sankey, trellis-blocks, blocks, code, entity-detail) | **Exists** |
| Declarative registry (label / icon / order / requirements) | [`trellis-projection-registry/nodes.ts`](../../apps/web/app/lib/trellis-projection-registry/nodes.ts) — `PROJECTION_REGISTRY_NODES` | **Exists** |
| **Capability gating** (which views a dataset supports) | [`suggestCollectionViews(schema)`](../../apps/web/app/lib/trellis-projection-registry/collection-views.ts) — gates by schema field types (`select`→kanban, `date`→calendar/timeline, `number`→chart) | **Exists** — *ahead of turtlecode* |
| Per-type allowed projections | `entityRegistry.projections: ProjectionType[]` + `defaultProjection` | **Exists** |
| Shell (slots + view switcher) | [`Page.vue`](../../apps/web/app/components/layout/Page.vue) — `showViewSwitcher`, `viewModeOptions`, slots | **Exists** |
| **Shared layout→renderer dispatch** | — | **Missing** — this is the work |

So this is **not** "build a projection system." It already exists and is used by
collections/grid. The work is to **stop three surfaces from bypassing it.**

## Problem — three vocabularies, and the browse/VCS surfaces bypass the registry

1. **`BrowseViewMode` is a drifted parallel vocabulary.**
   [`useBrowse.ts:3`](../../apps/web/app/composables/useBrowse.ts#L3) defines a flat
   13-member union (`grid | list | table | spreadsheet | calendar | kanban | timeline |
   gantt | month | week | agenda | moodboard | graph`) that does **not** line up with the
   canonical `ProjectionType`:
   - `grid` ⇒ should be `card-grid` (rename)
   - `month / week / agenda` ⇒ sub-modes of `calendar`, not top-level
   - `gantt` ⇒ a `timeline` sub-mode
   - `table` vs `spreadsheet` ⇒ the registry keeps **both** as distinct nodes
     ([nodes.ts:5-6](../../apps/web/app/lib/trellis-projection-registry/nodes.ts#L5)),
     but browse collapses `spreadsheet → table`
     ([browse/index.vue:239](../../apps/web/app/pages/workspace/browse/index.vue#L239)).

2. **The browse page ignores both the registry and `cfg.projections`.**
   [`browse/index.vue:221`](../../apps/web/app/pages/workspace/browse/index.vue#L221)
   hardcodes `viewModeOptions` to `grid` + `table` (list/graph commented out), rather than
   reading `entityRegistry.projections` or calling `suggestCollectionViews`. And
   [`browse/index.vue:416-538`](../../apps/web/app/pages/workspace/browse/index.vue#L416-L538)
   dispatches bodies through a ~120-line `v-if viewMode==='x'` ladder with the empty-state
   block hand-duplicated **4×**.

3. **The VCS/Lab board is a third bypass.**
   [`components/vcs/`](../../apps/web/app/components/vcs/) reimplements board chrome,
   filters, and swimlanes outside both the registry and the browse view system.

## Proposed architecture

Reuse `ProjectionType` and `trellis-projection-registry` as-is. Add exactly two things: a
**renderer map** and a **normalizer** that retires `BrowseViewMode`.

```
Page (existing shell — header, view switcher, toolbar, empty state, count)
  └─ ProjectionOutlet                              ← new: layout → renderer dispatch
       └─ <component :is="RENDERERS[type]" v-bind="rendererProps" :sub="sub" />

RENDERERS: Partial<Record<ProjectionType, Component>>   ← the missing map
  table → BrowseSpreadsheetView   spreadsheet → BrowseSpreadsheetView
  card-grid → EntityCardGrid      list → EntityList        calendar → CalendarView
  kanban → BoardView/VcsIssueBoard  timeline → TimelineView  graph → GraphView
  moodboard → MoodboardView       slide-deck → SlideDeckView  (map, chart, … later)

registry (exists):  ProjectionType · PROJECTION_REGISTRY_NODES · suggestCollectionViews
offered views    :  entityRegistry.projections ∩ suggestCollectionViews(schema)
```

### 1. Reconcile `BrowseViewMode` → `ProjectionType` (M0 — this milestone)

`BrowseViewMode` is retired in favor of the canonical `ProjectionType`. Because a few
browse modes carry a **sub-mode** (calendar month/week/agenda, timeline gantt), the
normalizer returns `{ type, sub? }`:

```ts
// lib/trellis-projection-registry/browse-view-mode.ts
export const BROWSE_VIEW_MODE_TO_PROJECTION: Record<BrowseViewMode,
  { type: ProjectionType; sub?: string }> = {
  grid:        { type: "card-grid" },
  list:        { type: "list" },
  table:       { type: "table" },
  spreadsheet: { type: "spreadsheet" },
  calendar:    { type: "calendar" },
  month:       { type: "calendar",  sub: "month"  },
  week:        { type: "calendar",  sub: "week"   },
  agenda:      { type: "calendar",  sub: "agenda" },
  kanban:      { type: "kanban" },
  timeline:    { type: "timeline" },
  gantt:       { type: "timeline",  sub: "gantt"  },
  moodboard:   { type: "moodboard" },
  graph:       { type: "graph" },
}
export function normalizeBrowseViewMode(mode: BrowseViewMode):
  { type: ProjectionType; sub?: string } { … }
```

A unit test asserts **every** `BrowseViewMode` maps to a valid `ProjectionType` — this is
the concrete proof of proposal AC #2 (vocabularies reconcile 1:1).

### 2. Renderer contract (M1)

Every renderer accepts one uniform prop/emit surface (extracted from today's `EntityCard`
+ `BrowseSpreadsheetView` call sites), so `ProjectionOutlet` binds them identically:

```ts
defineProps<{ items: Entity[]; entityType?: string; isSelected: (id: string) => boolean;
  sub?: string; storageKey?: string }>()
defineEmits<{ openDetail: [Entity]; toggleSelect: [string, MouseEvent?];
  fieldUpdate: [Entity, PropertyFieldId, unknown] }>()
```

Empty state, results count, infinite-scroll sentinel, and grid-column controls move into
`Page`/`ProjectionOutlet` — rendered once, deleting the 4× duplicated empty-state blocks.

### 3. Offered/default views from the registry (M2)

`viewModeOptions` is deleted. Offered views = `entityRegistry.projections` intersected
with `suggestCollectionViews(schema)` so unsupported layouts (e.g. kanban without a
`select` field) are hidden — the capability gating that already exists for collections,
now applied to browse.

### 4. Fold the VCS board in (M3)

Lab board becomes `type: "kanban"` through `ProjectionOutlet`; VcsIssueFilterBar /
VcsIssueSwimlane become the kanban recipe — filters/sort/swimlanes reusable on any kanban
surface. Retroactively turns the just-shipped M1 work (TRL-22..25) into a reusable recipe.

### 5. (Later) custom + agent-authored projections (M4, stretch)

`PROJECTION_REGISTRY_NODES` is already "shared by client UI and server graph seed" — so
custom/agent projections are a natural extension: a `projection.create` MCP tool appends a
registry node + query. No new Vue per view. Serves the AX thesis / sprite-client.

## Milestones

| M | Scope | Gate |
| --- | --- | --- |
| **M0** | `browse-view-mode.ts` normalizer + full map + test; type browse to `ProjectionType` | test: every `BrowseViewMode` → valid `ProjectionType`; typecheck |
| **M1** | `ProjectionOutlet` + `RENDERERS` map; replace `browse/index.vue` `v-if` ladder; shell owns empty/count/sentinel | browse renders offered layouts via dispatch; no `v-if viewMode` ladder |
| **M2** | Offered/default from `entityRegistry.projections` ∩ `suggestCollectionViews`; delete `viewModeOptions` + `BrowseViewMode` | switcher driven by registry + capability gating |
| **M3** | Fold VCS kanban into registry; FilterBar/Swimlane as kanban recipe | Lab board renders through `ProjectionOutlet`; M1 e2e green |
| **M4** *(stretch)* | Custom projections + `projection.create` MCP tool | agent adds a registry node without new TSX |

## Out of scope (v1)

- Core-vs-projection **rail IA** rework / per-workspace-type default pins (`IconRail.vue`
  stays route-based — separate WU).
- The `+` picker / composer wizard UI.
- Graph-persisted projection entities (config first; nodes already serializable for later).
- Any new renderer visuals — existing view components reused behind the contract.
- `chart` / `sankey` / `dashboard` / `code` renderers (registry knows them; browse defers).

## Open questions

1. **Sub-mode UI** — calendar/timeline sub-mode toggle in `Page` header or renderer-internal?
   (Lean: renderer-internal via `sub` prop.)
2. **`table` vs `spreadsheet`** — keep both distinct (registry does) or collapse for browse?
   (Lean: keep distinct; browse currently over-collapses.)
3. **`all` mode + class grouping** ([browse/index.vue:423](../../apps/web/app/pages/workspace/browse/index.vue#L423))
   is orthogonal to layout — keep as a `Page`-level wrapper around `ProjectionOutlet`?
4. **VCS query source** — share chrome first, unify query path later?

## Acceptance criteria (proposal → design gate)

1. **test:** `BrowseViewMode` → `ProjectionType` map complete; every mode a valid `ProjectionType`.
2. Renderer prop/emit contract defined and validated against `EntityCard` grid + `BrowseSpreadsheetView`.
3. Confirmed `Page.vue` can host `ProjectionOutlet` (no parallel tree) and the existing
   `trellis-projection-registry` supplies offered/default/capability data.
4. Milestone breakdown M0–M4 with per-milestone gate.
5. Filed as Trellis VCS proposal with children stubbed per milestone.

## References

- `turtlecode/ide/specs/affordance-layout-system.md` — layout recipes, layout-first router
- [`apps/web/app/types/database.ts`](../../apps/web/app/types/database.ts#L317) — `ProjectionType` (canonical vocab)
- [`apps/web/app/lib/trellis-projection-registry/`](../../apps/web/app/lib/trellis-projection-registry/) — nodes, capability gating, `suggestCollectionViews`
- [`apps/web/app/config/entityRegistry.ts`](../../apps/web/app/config/entityRegistry.ts) — `projections` / `defaultProjection`
- [`apps/web/app/composables/useBrowse.ts`](../../apps/web/app/composables/useBrowse.ts) — `BrowseViewMode` (to retire)
- [`apps/web/app/pages/workspace/browse/index.vue`](../../apps/web/app/pages/workspace/browse/index.vue) — the `v-if` ladder to collapse
- [`apps/web/app/components/layout/Page.vue`](../../apps/web/app/components/layout/Page.vue) — shell
- [`apps/web/app/components/views/`](../../apps/web/app/components/views/) · [`apps/web/app/components/vcs/`](../../apps/web/app/components/vcs/) — renderers to wire
