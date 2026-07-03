# Rich DataTable Projection — Scope

Porting the virtualized `SpreadsheetTable` from `trellis/fractal-playground`
(React, ~1551 LOC) into `trellis-client/apps/web` as a browse-view projection.

Status: **implemented** (2026-07-02) as Option A. Decisions taken: claimed the
`spreadsheet` slot with `CollectionDataGridProjection.vue`; label "Spreadsheet";
filtering reuses `FilterBuilder`/`useAdvancedFilters`; jspreadsheet components and
deps removed. Presence and `color`/`icon` kinds deferred as planned.

---

## TL;DR

This is **not greenfield**. `apps/web` already has:

- A **projection system** (`app/lib/projections.ts` + `collections/[slug].vue`) that is
  the real "browse view variant" mechanism — each `ProjectionType` maps to a component.
- A **`table` projection** ([CollectionDataTableProjection.vue](../../apps/web/app/components/data/CollectionDataTableProjection.vue),
  ~1450 LOC) built on **TanStack Vue Table** — sorting, column filters, advanced
  FilterBuilder, sticky header, row select/delete, add-column, schema edit, inline cells.
  This already carries the *expensive* part: data binding, mutations, schema, filters.
- A dormant **`spreadsheet` projection type** — it exists in the `ProjectionType` union
  (`types/database.ts:317`) but is **not registered** in `projectionDefinitions` and **not
  rendered** in the collection page switch. There's also an orphaned
  [CollectionSpreadsheetProjection.vue](../../apps/web/app/components/data/CollectionSpreadsheetProjection.vue)
  (jspreadsheet-ce based) that nothing mounts.

So the port's **net-new value over what exists** is narrow and worth being honest about:

1. **Windowed virtualization** (fixed 42px rows + overscan) — the current `table` renders
   all rows. This is the headline win for large collections.
2. **Sticky multi-rail layout** (checkbox / # / ID pinned left, actions pinned right).
3. **Spreadsheet keyboard grid-nav** — Enter/Tab/Escape, `focusNext`, click-to-edit.
4. **Per-column drag-resize with localStorage persistence.**

Everything else in the React breakdown (cell renderers, sort, filter, selection,
optimistic writes, empty/loading states) **already exists here** in some form.

**Recommendation:** claim the dormant `spreadsheet` slot with the new virtualized
datatable, reusing `CollectionDataTableProjection`'s data layer; retire the jspreadsheet
component. Don't replace the TanStack `table` (it's a "required primary" projection used
across the app). This gives users a distinct "fast grid" projection without destabilizing
the default table. See [Central decision](#central-decision).

---

## Where it plugs in (integration surface)

The projection pipeline, end to end:

```
ProjectionType (types/database.ts:317)         ← add/claim a type
  └─ projectionDefinitions (lib/projections.ts:26)   ← label, icon, order, requirements
       └─ createDefaultProjections / normalizeProjections   ← per-collection persistence
            └─ collections/[slug].vue render switch (~line 1447)   ← type → <Component>
                 └─ <NewProjection> mounts, loads schema + entities, wires mutations
```

Two consumer surfaces use projections:

- **`collections/[slug].vue`** — the canonical one. Persists active/default projections to
  `settings` under `collection:{id}:projections`. Renders the active type via a
  `UiTabsContent v-if="proj.type === '…'"` switch. **This is the primary wiring point.**
- **`workspace/browse/index.vue`** + **`layout/Page.vue`** — a lighter `BrowseViewMode`
  slot system (`#table`, `#kanban`, …) keyed off `useBrowse().viewMode`. There's a
  `browseModeToProjectionType` bridge in `projections.ts:290`. Secondary; can follow later.

---

## Central decision

Which slot does the rich datatable occupy? This changes everything downstream.

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Claim `spreadsheet`** (recommended) | New component becomes the `spreadsheet` projection; register it in definitions + render switch; retire jspreadsheet component | Clean, additive, zero risk to default `table`; reuses an already-typed slot | Two table-like projections coexist (`table` TanStack + `spreadsheet` virtualized) — needs clear labels |
| **B. Replace `table`** | Swap `CollectionDataTableProjection` internals for the virtualized version | One table to maintain; everyone gets virtualization | `table` is a required-primary projection wired in many pages; high blast radius; must preserve FilterBuilder/schema-edit/add-column parity before cutover |
| **C. New `datatable` type** | Add a third type alongside both | Fully isolated | Adds a type to the union + every map in `projections.ts`; three table-ish views is confusing |

Recommendation: **A**, with the labels "Table" (existing TanStack) vs "Grid"/"Sheet"
(new virtualized). Revisit B as a later consolidation once the new component reaches
feature parity.

---

## Scope: in / out / reuse

### Build (net-new)

- `useVirtualScroller` composable (windowed range from scrollTop/clientHeight, 42px rows,
  overscan ~10). ~30 LOC.
- Sticky multi-rail grid layout (CSS `grid-template-columns`, `position: sticky` rails,
  absolute-positioned rows). The layout math is the trickiest part.
- `useColumnWidths(tableId)` composable — localStorage read/write, clamp 80–480,
  per-column min/max, double-click reset. ~40 LOC.
- `ColumnResizeHandle` — pointer drag on header edge. ~40 LOC.
- Keyboard grid-nav + click-to-edit inline editor with `focusNext(down/next/prev)` and
  Enter/Tab/Escape commit/cancel. ~120 LOC.
- The host projection component (`CollectionDataGridProjection.vue`) that loads schema →
  columns, entities → rows, and maps the column-kind enum.

### Reuse (do NOT re-port)

- **Data layer**: schema loading, entity loading, `onUpdateCell`/`onCreateRow`/
  `onDeleteRow` → adapter mutations. Lift directly from `CollectionDataTableProjection.vue`
  (it already does optimistic writes, add-column, schema edit, selection/delete).
- **Cell controls**: existing `EditableCell.vue`, `CellRenderer.vue`, plus field controls
  used by the current table (select dropdown, date picker, file/image). Map kinds to these
  rather than porting React `ColorFieldControl`/`IconFieldControl`/`ImageFieldControl`.
- **Filtering/sort**: the existing `FilterBuilder` + sort options, or the per-column filter
  menus — pick one; don't ship both filter UIs.

### Out of scope (v1)

- **Presence / co-editing** — the React version's Yjs cell-sync, remote carets, name badges
  (`useBoardPresence`/`useCellTextSync`). The app was just stripped to **local single-user**
  (commit `94d2790`). Presence composables still exist but there are no remote peers. Defer
  entirely; this removes ~120 LOC and the hardest integration.
- **Formula evaluation** beyond what `useCollectionFormulas` already provides.
- Replacing the default `table` projection (that's Option B, a separate decision).

---

## Cell-kind mapping

Source has 13 kinds; local `DatabaseField.type` has 11. Mapping:

| Source kind | Local field type | Notes |
|---|---|---|
| `text` | `text` | direct |
| `text` (valueType email/url/phone) | `email` / `url` | sub-typed; local has dedicated types |
| `longtext` | `text` + `config.multiline` | no native longtext; HTML↔plaintext handling needed |
| `number` | `number` | direct |
| `select` | `select` | direct; option colors already in `field.options[].color` |
| (multi) | `multiselect` | local extra — supported |
| `date` | `date` | direct |
| `boolean` | `checkbox` | direct |
| `file` | `file` | direct |
| `image` | `file` (image subtype) | via `config` |
| `reference` | `relation` | direct |
| `formula` | `formula` | direct, read-only |
| `readonly` | (any + `column.readOnly`) | derived/computed flag |
| `color` | — | no native type; `config`-driven or skip in v1 |
| `icon` | — | no native type; `config`-driven or skip in v1 |

`color`/`icon` are the only gaps; both are nice-to-have and can be skipped in v1.

---

## Component decomposition (adapted to this repo)

```
components/data/CollectionDataGridProjection.vue   ← host: schema→columns, entities→rows, mutations
  ├─ DataGrid/DataGridTable.vue            ← scroller + sticky grid + virtual range
  │   ├─ DataGridHeader.vue                ← sticky header: sort + filter + resize
  │   │   └─ ColumnResizeHandle.vue
  │   ├─ DataGridRow.vue (v-for visible)   ← absolutely positioned row
  │   │   ├─ rails: checkbox / index / id (reuse existing cell bits)
  │   │   ├─ DataGridCell.vue              ← dispatches on kind → existing EditableCell/controls
  │   │   └─ RowActions.vue (sticky right)
  │   └─ SelectionBar.vue                  ← "N selected" + delete/clear
  └─ composables/useVirtualScroller.ts, useColumnWidths.ts
views/DataGridView.vue (optional thin wrapper, mirrors TableView.vue)
```

Wiring changes:
- `lib/projections.ts:26` — add `{ projectionType: 'spreadsheet', label: 'Grid', icon: 'lucide:grid-2x2', order: 1.5 }`
  plus entries in `projectionIcons`/`projectionLabels` maps.
- `collections/[slug].vue` ~1447 — add a `UiTabsContent v-if="proj.type === 'spreadsheet'"`
  branch mounting `CollectionDataGridProjection`.

---

## Effort estimate

Smaller than the React breakdown's 1100–1300 LOC, because the data layer, cell controls,
filters, and mutations are reused rather than re-ported.

| Phase | Work | Est. |
|---|---|---|
| 1 — Skeleton | Register `spreadsheet` type; host component loads schema/rows; static (non-virtual) sticky grid renders read-only | 0.5–1 day |
| 2 — Virtualization | `useVirtualScroller`, absolute rows, scroll perf on large collections | 0.5–1 day |
| 3 — Editing | inline editor, keyboard grid-nav, commit/cancel, optimistic write via reused mutation layer | 1 day |
| 4 — Columns | resize handles, width persistence, sort, per-column filter (or reuse FilterBuilder) | 1 day |
| 5 — Polish | selection bar, empty/loading, add-column, parity pass with existing table | 0.5–1 day |

**~3.5–5 days** for a feature-complete v1 sans presence/color/icon.

---

## Open questions

1. **Slot decision** — confirm Option A (claim `spreadsheet`), or do you want B (replace
   `table`) / C (new `datatable`)?
2. **Label** — "Grid", "Sheet", or "Data Grid" to distinguish from the existing "Table"?
3. **Filter UX** — reuse the existing `FilterBuilder`, or port the per-column filter menus
   from the React component? (Recommend: reuse FilterBuilder for consistency.)
4. **Retire jspreadsheet?** — drop `CollectionSpreadsheetProjection.vue` +
   `@jspreadsheet-ce/vue` dep once the new grid lands? (Recommend: yes, it's orphaned.)
