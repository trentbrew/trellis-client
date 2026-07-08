# Spec: Sheets P1 — keyboard nav, multi-select, column DnD (TRL-314)

**Parent design:** TRL-313  
**Proposal:** TRL-312 · epic TRL-283 (closed)  
**Prior impl:** TRL-286/291 (P0 projection + harden)  
**Design:** [sheets_p1_design.md](./sheets_p1_design.md) · [sheets_p1_mockup.html](./sheets_p1_mockup.html)  
**Baseline:** [sheets_decks_spec.md](./sheets_decks_spec.md)

## Scope

**In:** Keyboard navigation with lease transfer, rectangular multi-select + fill-down, column header DnD with stable column ids, relation cell combobox (person), sheetRange stale/error UX.

**Out (P1.2+):** multiplayer locks, second TipTap, fill across formula columns, row DnD, deck changes, in-cell formula editing.

**Demo:** `/sheets/q3-runway` — extended seed with `owner` relation column; doc playground `/playground/sheet-range` for stale states.

---

## Architecture

```
SheetProjectionFrame
├─ useSheetProjection (+ updateColumnsOrder, updateRelation)
├─ useSheetSelection (anchor, focus, normalized rect)
├─ useSheetKeyboardNav (arrow/tab/enter/esc → selection + scroll)
├─ useEditorLease (unchanged — commit before nav)
├─ SheetFormulaBar (+ range ref label A2:C5)
└─ SheetGrid
    ├─ useVirtualRows (+ scrollToIndex)
    ├─ SheetColumnHeader (grip + DnD via useColumnReorder)
    ├─ SheetCell (+ RelationCellEditor branch)
    └─ SheetSelectionOverlay (range highlight + fill handle)

SheetRangeBlock.vue
└─ blockState: loading | live | stale | error
```

### Selection model

```ts
export interface SheetSelection {
  anchor: { row: number; col: number }
  focus: { row: number; col: number }
  r0: number
  c0: number
  r1: number
  c1: number
}

export function normalizeSelection(anchor: CellPos, focus: CellPos): SheetSelection {
  return {
    anchor,
    focus,
    r0: Math.min(anchor.row, focus.row),
    c0: Math.min(anchor.col, focus.col),
    r1: Math.max(anchor.row, focus.row),
    c1: Math.max(anchor.col, focus.col),
  }
}
```

**Composable:** `useSheetSelection(rows, columns)`

| Method | Behavior |
| ------ | -------- |
| `selectCell(r, c)` | anchor = focus = cell; single selection |
| `extendFocus(r, c)` | move focus; keep anchor (shift+arrow) |
| `moveFocus(dr, dc)` | arrow nav; anchor follows if no shift held |
| `isSelected(r, c)` | point in normalized rect |
| `rangeLabel()` | A1 range e.g. `C3:E5` via `toA1Ref` |

Lift selection state to `SheetProjectionFrame` — **remove duplicate `focused` ref in `SheetGrid`**; grid receives `selection` + emits nav events only.

### Keyboard navigation

**Composable:** `useSheetKeyboardNav(options)`

| Key | Behavior |
| --- | -------- |
| `Arrow*` | `moveFocus(±1)`; skip non-editable only for Tab, not arrows |
| `Shift+Arrow` | `extendFocus` |
| `Tab` / `Shift+Tab` | next/prev cell where `kind ∈ {text, number, select, relation}`; skip `formula` |
| `Enter` | on `kind: text` → acquire lease (delegate to SheetCell) |
| `Esc` | release lease |

Before any focus change: `await lease.release()` if active.

**Virtual scroll:** extend `useVirtualRows`:

```ts
function scrollToIndex(index: number, rowHeight: number) {
  const el = scrollerRef.value
  if (!el) return
  const top = index * rowHeight
  const bottom = top + rowHeight
  if (top < el.scrollTop) el.scrollTop = top
  else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight
}
```

Call when `focus.row` changes outside `range`.

### Fill-down

**Composable:** `useSheetFill(selection, columns, updateCell)`

- Fill handle visible when `r1 > r0` OR multi-row selection in one column
- Drag down: for each target row in column `c0`, if column kind is `number` or `text`, copy source value from anchor row
- Skip `formula`, `relation`, `select` in P1 (toast: "Fill not supported for this column type")
- Batch: `Promise.all` updates with shared `agentId`

### Column reorder

**Composable:** `useColumnReorder(sheetId, columns, mutate)`

- Drag grip on `SheetColumnHeader` only (`≡` hit target 14px)
- HTML5 DnD or pointer-based reorder between headers
- On drop: permute `columns[]` array; **preserve each column's `id`**
- Persist: `updateNode` on sheet entity `{ columns: reordered }`
- Optimistic local reorder; reload on SSE

**Unit test:** `useColumnReorder.test.ts` — permute `[a,b,c]` → `[b,c,a]` ids unchanged.

### Relation column

**Component:** `RelationCellEditor.vue`

- Trigger: cell displays linked person title or `—`
- Click opens `Command` combobox (shadcn pattern)
- Query: `FIND entity AS ?p WHERE ?p.type = "person" RETURN ?p, ?p.title LIMIT 20`
- On select: `updateCell(entityId, column.attribute, personId)` **or** `linkNodes` with `relationType` from column (`assignedTo` default)
- Clear option sets attribute to `null`

**Seed delta:** add column `{ id: 'owner', attribute: 'ownerId', kind: 'relation', label: 'Owner', relationType: 'assignedTo' }` — optional demo link on one expense row.

### sheetRange stale/error

**Extend** `SheetRangeBlock.vue`:

| State | Condition | UI |
| ----- | --------- | -- |
| `loading` | `sheetLoading \|\| rowsLoading` | existing spinner |
| `error` | `sheetError` or fetch 404 | dashed destructive border, ERROR badge, Remove block |
| `stale` | `!sseConnected` after initial load OR sheet deleted | STALE badge, message, Open sheet + Remove |
| `live` | default | existing LIVE + mini grid |

Invalid range (`parseA1Range` null): `error` with "Invalid range".

Remove block: delete TipTap node via editor command (expose via `deleteNode` on NodeView props).

Do **not** render empty table on error/stale.

### Formula bar range label

When selection spans >1 cell, show `toA1Ref(r0,c0):toA1Ref(r1,c1)` (e.g. `C3:E5`). Single cell unchanged.

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/composables/useSheetSelection.ts` | **add** |
| `apps/web/app/composables/useSheetSelection.test.ts` | **add** |
| `apps/web/app/composables/useSheetKeyboardNav.ts` | **add** |
| `apps/web/app/composables/useSheetFill.ts` | **add** |
| `apps/web/app/composables/useColumnReorder.ts` | **add** |
| `apps/web/app/composables/useColumnReorder.test.ts` | **add** |
| `apps/web/app/composables/useVirtualRows.ts` | **extend** — `scrollToIndex` |
| `apps/web/app/composables/useSheetProjection.ts` | **extend** — `updateColumnsOrder`, relation helper |
| `apps/web/app/components/sheet/SheetColumnHeader.vue` | **add** |
| `apps/web/app/components/sheet/SheetSelectionOverlay.vue` | **add** |
| `apps/web/app/components/sheet/RelationCellEditor.vue` | **add** |
| `apps/web/app/components/sheet/SheetGrid.vue` | **extend** — selection, keyboard, column DnD, overlay |
| `apps/web/app/components/sheet/SheetProjectionFrame.vue` | **extend** — lift selection; formula bar range |
| `apps/web/app/components/sheet/SheetFormulaBar.vue` | **extend** — range ref display |
| `apps/web/app/components/sheet/SheetCell.vue` | **extend** — relation branch; roving tabindex |
| `apps/web/app/components/editor-blocks/SheetRangeBlock.vue` | **extend** — stale/error states |
| `apps/web/app/lib/sheet-demo.ts` | **extend** — optional owner column |
| `apps/web/scripts/seed-sheet-demo.mjs` | **extend** — owner column + person link |
| `apps/web/tests/e2e/sheets-projection.spec.ts` | **extend** — keyboard focus move |
| `apps/web/tests/e2e/sheet-range-block.spec.ts` | **extend** — stale fixture route |
| `apps/web/tests/e2e/sheets-p1.spec.ts` | **add** — shift-select, column reorder smoke |

**Do not add:** second TipTap, deck files, multiplayer.

---

## Seed delta

```ts
// sheet-demo.ts — append to Q3_RUNWAY_COLUMNS
{ id: 'owner', attribute: 'ownerId', kind: 'relation', label: 'Owner', relationType: 'assignedTo' }
```

Optional: link `entity:expense-e2b` → person entity if seed person exists.

---

## Verification

Run from **trellis-client** repo root:

```bash
bun apps/web/scripts/seed-sheet-demo.mjs
pnpm --dir apps/web exec vitest run app/composables/useSheetSelection.test.ts app/composables/useColumnReorder.test.ts
pnpm --dir apps/web exec playwright test tests/e2e/sheets-projection.spec.ts tests/e2e/sheet-range-block.spec.ts tests/e2e/sheets-p1.spec.ts --project=chromium
```

Manual:
1. Arrow keys move focus; Tab skips formula column; Enter leases text cell; Esc commits.
2. Shift+arrow selects range; fill handle copies spent values down.
3. Drag column header — order persists after reload; remaining formula still correct.
4. Click owner cell — person picker; selection saves.
5. Disconnect SSE or bad sheetId in playground — STALE/ERROR UI, no empty grid.

---

## Acceptance criteria (TRL-314)

1. `useSheetSelection` + `useSheetKeyboardNav` wired; parent/grid focus desync fixed.
2. Arrow/Tab nav moves focus; lease commits before cell change; virtual scroll follows focus row.
3. Shift+arrow multi-select; fill-down works for `number` + `text` columns only.
4. Column header DnD reorders `columns[]` on sheet entity; column `id` values unchanged; unit test passes.
5. Relation column opens person combobox; selection persists via graph mutate.
6. `SheetRangeBlock` renders `stale` and `error` states (no silent empty grid).
7. E2e: keyboard changes focused cell (`data-testid="sheet-focused-cell"`).
8. E2e: P0 regression (`sheets-projection`, `sheet-range-block`) still pass.
9. No second TipTap instance; no deck files in wedge.

---

## P1.2 stub

Fill for select columns, copy/paste rectangular selection, row insert via TQL refresh, AC graph path hygiene tooling.
