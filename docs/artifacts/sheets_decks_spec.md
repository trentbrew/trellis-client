# Spec: Sheets & decks on the graph — P0 vertical slice (TRL-285)

**Parent:** TRL-284 (design) → TRL-283 (proposal)  
**Design:** [sheets_decks_design.md](./sheets_decks_design.md) · [sheets_decks_mockup.html](./sheets_decks_mockup.html)  
**Status:** **Shipped** — impl TRL-286 closed (review TRL-287 PASS). Harden follow-up TRL-291 closed. Deck P1–P1.3 shipped separately (`deck_p1_*` specs).

## Scope

**In:** Graph-native **sheet projection** (TQL-backed rows, formula columns, editor lease), **`sheetRange` TipTap atom** (live transclusion in docs), reuse of `useCollectionFormulas` + existing TipTap extensions.

**Out (P1 — design only, no impl this wedge):** Deck editor, slide entities, fractal vantages, Present mode.

**Vertical slice demo:** `q3-runway` sheet + `yc-s26-financial-narrative` doc with embedded `A2:E6` range — matches design mock narrative.

---

## Architecture

```
entity type `sheet` (workshop zone)
  data.query          — TQL string (row source)
  data.columns[]      — { id, attribute, kind, label? }
  data.formulas[]     — { id, expression (semantic), display? }

SheetProjectionPage / affordance route
  └─ useSheetProjection(sheetId)
       ├─ TQL query + SSE subscribe → row entity ids
       ├─ column schema → cell triple reads/writes
       └─ useCollectionFormulas (derived + footer aggregates)
  └─ SheetProjectionFrame
       ├─ SheetFormulaBar (A1 ↔ attrs toggle, display-only)
       ├─ SheetGrid (virtualized — extend CollectionDataGridProjection patterns)
       └─ useEditorLease → single RichTextEditor mount in focused text cell

RichTextEditor (doc)
  └─ SheetRange extension (atom, sibling of queryView)
       └─ SheetRangeBlock.vue → useSheetProjection.readRange(sheetId, range)
```

### Sheet entity schema (ontology)

Add system-tier ontology `trellis:schema/sheet` (or extend `entity` with `type: sheet`):

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `title` | title | yes | Sheet name |
| `query` | rich_text or text | yes | TQL returning row entities |
| `columns` | json | yes | Array of column defs |
| `formulas` | json | no | Derived columns |
| `zoneId` | text | yes | Default workshop |
| `facilityId` | text | yes | |

Column def shape:

```ts
type SheetColumn = {
  id: string           // stable column id (not A1 letter)
  attribute: string    // EAV attribute or relation key
  kind: 'text' | 'number' | 'select' | 'formula' | 'relation'
  label?: string
  formula?: string     // semantic expression when kind=formula
  relationType?: string // when kind=relation, e.g. person
}
```

**Row identity:** each grid row = one entity id from TQL result set. Sort/filter reorder display only — never re-key rows.

### Formula dual representation

| Layer | Storage | Display |
| ----- | ------- | ------- |
| Semantic | `this.budgeted - this.spent` or `$sum(budgeted)` | attrs toggle in formula bar |
| A1 view | — (derived at render) | `=C8-D8` |

- Persist **semantic** form in `data.formulas[]` and per-cell overrides.
- A1/attrs toggle in `SheetFormulaBar` is **display-only** (`aria-pressed` pair per design).
- Column insert/delete recomputes A1 labels; semantic refs unchanged.

### Editor lease protocol (`useEditorLease`)

Single shared TipTap instance — **never** N editors in virtualized DOM.

```ts
interface EditorLease {
  cellKey: string | null       // `${entityId}:${columnId}`
  mount(el: HTMLElement): void
  commit(): Promise<void>       // flush PM doc → entity attribute
  release(): void               // blur / Esc / cell navigation
}
```

- **Acquire:** double-click or Enter on `kind: text` cell.
- **Extensions:** same embed set as `RichTextEditor` with `embeds: true` (mention, slash, entity-embed, query-view).
- **Commit:** on blur, Tab, arrow navigation, Escape — write attribute via graph mutate.
- **Transfer:** navigating to another text cell commits current, acquires next.

### `sheetRange` TipTap node

Mirror `query-view-extension.ts` pattern:

| Attr | Default | Purpose |
| ---- | ------- | ------- |
| `sheetId` | `''` | Entity id of sheet |
| `range` | `''` | A1 notation e.g. `A2:E6` |
| `title` | `''` | Optional block title |

- `group: 'block'`, `atom: true`
- NodeView: `SheetRangeBlock.vue` — read-only mini grid, LIVE badge, header link navigates to sheet route
- Slash command: `/sheet-range` or extend slash menu
- Subscribe to same `useSheetProjection` range API + SSE

### Live updates

- Sheet frame + sheetRange blocks show LIVE badge when SSE connected.
- Graph mutations to row entities or referenced attributes re-render affected cells without full page reload.
- `aria-live="polite"` on frame status region (design a11y).

---

## UI contract

Tokens from `sheets_decks_design.md` YAML — workshop green `#10b981` for sheet chrome, live `#34d399`.

| Region | Component | Notes |
| ------ | --------- | ----- |
| Frame bar | query pill, PROJECTION badge, LIVE, presence avatars | reuse collection header patterns where possible |
| Formula bar | 36px height, mono cell ref + formula | readonly for derived cells |
| Grid | `role="grid"`, sticky header, row numbers, Σ footer | virtualize body rows |
| Editor lease | 2px primary ring, compact toolbar | `aria-label="Cell editor"` |
| sheetRange | workshop top border, read-only | no in-doc cell editing |

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/composables/useSheetProjection.ts` | **add** — TQL rows, column map, range reads |
| `apps/web/app/composables/useEditorLease.ts` | **add** — lease lifecycle |
| `apps/web/app/composables/useEditorLease.test.ts` | **add** — commit/release unit tests |
| `apps/web/app/lib/sheet-range-extension.ts` | **add** — TipTap atom |
| `apps/web/app/components/sheet/SheetProjectionFrame.vue` | **add** |
| `apps/web/app/components/sheet/SheetFormulaBar.vue` | **add** |
| `apps/web/app/components/sheet/SheetGrid.vue` | **add** — extend grid patterns from `CollectionDataGridProjection.vue` |
| `apps/web/app/components/sheet/SheetCell.vue` | **add** |
| `apps/web/app/components/editor-blocks/SheetRangeBlock.vue` | **add** |
| `apps/web/app/components/Ui/RichTextEditor.vue` | register SheetRange when embeds on |
| `apps/web/app/lib/slash-command-extension.ts` | add `/sheet-range` item |
| `packages/tql/` or seed script | sheet ontology + demo entities (q3-runway) |
| `apps/web/app/pages/...` or affordance route | sheet projection page |

**Reuse (do not fork):** `useCollectionFormulas.ts`, `EditableCell.vue` patterns, `query-view-extension.ts`, `mention-extension.ts`, `slash-command-extension.ts`.

---

## P1 stub (document only — no impl AC)

Deck: slide entities as ordered relation (`deck → slide` position edges), TipTap fragments per region, `--vantage` thumb/sorter/editor/present. Separate proposal after P0 review PASS.

---

## Verification

```bash
cd apps/web && bun test app/composables/useEditorLease.test.ts app/composables/useCollectionFormulas.test.ts
cd apps/web && bun run typecheck   # or pnpm check from repo root if configured
```

Manual:
1. Open `q3-runway` sheet — rows match TQL; edit spent cell → remaining recalculates.
2. Toggle formula bar A1/attrs — display swaps; stored formula unchanged.
3. Double-click text cell — editor lease mounts; `/mention` works; Esc commits.
4. Open financial narrative doc — sheetRange block live; edit sheet → doc block updates.
5. SSE: mutate entity in another tab → sheet + range reflect change.

---

## Acceptance criteria (issue TRL-285)

1. `sheet` entity type exists with query + columns + formulas fields.
2. Sheet projection page renders virtualized grid from TQL with LIVE badge.
3. Formula column evaluates via semantic refs; footer `$sum` works.
4. Editor lease: one TipTap instance, commit on navigation, slash/mention in cell.
5. `sheetRange` atom inserts in doc; read-only live mini grid; navigate to source.
6. A11y: grid roles, formula toggle `aria-pressed`, lease `aria-label`, live region.
7. **No deck implementation files** in this wedge.
