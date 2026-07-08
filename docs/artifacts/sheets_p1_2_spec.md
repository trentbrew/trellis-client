# Spec: Sheets P1.2 — fill drag, copy/paste, stale e2e, row insert (TRL-318)

**Parent proposal:** TRL-317  
**Prior impl:** TRL-315 (closed) · spec TRL-314  
**Design baseline:** [sheets_p1_design.md](./sheets_p1_design.md) · [sheets_p1_mockup.html](./sheets_p1_mockup.html)  
**Prior spec:** [sheets_p1_spec.md](./sheets_p1_spec.md)

## Scope

**In:** Fill-handle drag-to-extend (spreadsheet semantics), copy/paste rectangular selection (TSV), fill for `select` columns, sheetRange **STALE** automated e2e, row insert that refreshes TQL projection.

**Out (P1.3+):** multiplayer locks, second TipTap, in-cell formula editing, fill across formula/relation columns, row DnD reorder, deck changes, AC graph path hygiene tooling.

**Demo:** `/sheets/q3-runway` — insert row, drag fill on spent column, copy/paste budget block; `/playground/sheet-range` + stale e2e hook.

---

## Architecture

```
SheetProjectionFrame
├─ useSheetProjection (+ insertRow)
├─ useSheetSelection (unchanged)
├─ useSheetClipboard (NEW — copy/paste TSV)
└─ SheetGrid
    ├─ useSheetFill (+ applyFillDragRange)
    ├─ SheetSelectionOverlay (pointer capture drag)
    └─ fill preview ghost row band

useTrellisSSE
└─ __setSSEConnectedForTests (dev-only — stale e2e)

/playground/sheet-range-stale.vue (optional dev page)
```

### Fill drag-to-extend

**Extend** `useSheetFill.ts`:

| Function | Behavior |
| -------- | -------- |
| `canFillColumn(col)` | `text` \| `number` \| **`select`** (P1.2 delta) |
| `applyFillDown(...)` | unchanged — fills existing `r0..r1` in column `c0` |
| `applyFillDragRange(anchorRow, targetRow, col, ...)` | copy anchor row value to each row `(anchorRow+1)..targetRow` in single column |

**Extend** `SheetSelectionOverlay.vue` + `SheetGrid.vue`:

| Phase | Behavior |
| ----- | -------- |
| `pointerdown` on fill handle | `setPointerCapture`; record `fillDragStartRow = selection.r1` |
| `pointermove` | map clientY → row index via `ROW_HEIGHT`; update **focus** row (extend selection down visually); show dashed preview band |
| `pointerup` | call `applyFillDragRange(selection.r0, focus.row, c0)`; reset drag state; toast count |
| invalid column | toast "Fill not supported for this column type"; skip `formula`, `relation` |

Fill handle visible when `r1 > r0` **or** single-cell selection in fillable column (allow drag from one cell).

**Do not** remove P1 pointerdown quick-fill on existing multi-row selection — keep as shortcut when user clicks without dragging (<4px movement).

### Copy / paste

**Composable:** `useSheetClipboard.ts`

```ts
export function selectionToTsv(
  selection: SheetSelectionState,
  rows, columns, getCellValue,
): string

export async function pasteTsvIntoSelection(
  tsv: string,
  selection: SheetSelectionState,
  rows, columns, updateCell,
): Promise<{ updated: number; skipped: number }>
```

| Key | Behavior |
| --- | -------- |
| `Cmd/Ctrl+C` | serialize normalized rect to TSV (tab-separated cols, newline rows); skip read-only cells in output but include display values for copy |
| `Cmd/Ctrl+V` | parse clipboard text; paste from `selection.r0,c0` outward; clip to grid bounds |
| paste target kinds | `text`, `number`, `select` only — skip `formula`, `relation` (increment `skipped`) |
| lease | `await lease.release()` before paste |

Wire `keydown` on grid scroller (same target as arrow nav). Prevent default when handled.

**Unit test:** `useSheetClipboard.test.ts` — 2×2 rect round-trip TSV; skip formula column on paste.

### Select column fill

Extend `canFillColumn` to include `kind: 'select'`. Copy string enum value from anchor row (e.g. category `Infra`). No inline select editor in P1.2 — paste/fill only.

### Row insert

**Extend** `useSheetProjection.ts`:

```ts
async function insertRow(defaults?: Record<string, unknown>): Promise<string | null>
```

| Step | Behavior |
| ---- | -------- |
| infer type | parse sheet `query` for `?e.type = "<type>"` (regex); fallback `entity` |
| id slug | `entity:<type>-<timestamp>` or `entity:expense-<random>` |
| defaults | merge `{ type, title: 'New row', quarter: 'Q3-2026' }` for demo sheet; caller may override |
| mutate | `createNode` with sheet `zoneId`/`facilityId` when present |
| refresh | rely on SSE `_graphVersion` bump — **no manual reload** |
| focus | after insert, `selectCell(newRowIndex, 0)` where new row appears in query result |

**UI:** `SheetProjectionFrame` frame bar — `UiButton` "Add row" (`aria-label="Insert row"`, `data-testid="sheet-insert-row"`). Disabled while loading.

**Helper:** `lib/sheet-query-infer.ts` — `inferEntityTypeFromEqls(query: string): string | null`

### sheetRange STALE e2e

**Dev hook** in `useTrellisSSE.ts`:

```ts
/** Dev/test only — force stale UI without killing server */
export function __setSSEConnectedForTests(connected: boolean) {
  if (!import.meta.dev) return
  _connected = connected
}
```

**E2e** (`sheet-range-block.spec.ts`):

1. Goto `/playground/sheet-range`
2. Wait LIVE + cell visible
3. `page.evaluate(() => window.__trellisSetSSE?.(false))` — expose hook on `window` via plugin or inline in playground page
4. Expect `STALE` badge + message; **no** data table rows
5. Restore `true` optional

Prefer exposing thin wrapper on playground page:

```ts
// sheet-range.vue — dev only
if (import.meta.dev) {
  (window as any).__trellisSetSSE = (v: boolean) => __setSSEConnectedForTests(v)
}
```

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/composables/useSheetFill.ts` | **extend** — select fill + `applyFillDragRange` |
| `apps/web/app/composables/useSheetClipboard.ts` | **add** |
| `apps/web/app/composables/useSheetClipboard.test.ts` | **add** |
| `apps/web/app/lib/sheet-query-infer.ts` | **add** |
| `apps/web/app/lib/sheet-query-infer.test.ts` | **add** |
| `apps/web/app/composables/useSheetProjection.ts` | **extend** — `insertRow` |
| `apps/web/app/composables/useTrellisSSE.ts` | **extend** — dev test hook |
| `apps/web/app/components/sheet/SheetGrid.vue` | **extend** — fill drag pointer capture |
| `apps/web/app/components/sheet/SheetSelectionOverlay.vue` | **extend** — drag active state class |
| `apps/web/app/components/sheet/SheetProjectionFrame.vue` | **extend** — Add row + clipboard keydown |
| `apps/web/app/pages/playground/sheet-range.vue` | **extend** — expose `__trellisSetSSE` in dev |
| `apps/web/tests/e2e/sheets-p1-2.spec.ts` | **add** |
| `apps/web/tests/e2e/sheet-range-block.spec.ts` | **extend** — stale state test |
| `apps/web/tests/e2e/sheets-p1.spec.ts` | unchanged — regression must pass |

**Do not add:** deck files, second TipTap, multiplayer.

---

## Verification

```bash
bun apps/web/scripts/seed-sheet-demo.mjs
pnpm --dir apps/web exec vitest run app/composables/useSheetClipboard.test.ts app/lib/sheet-query-infer.test.ts
pnpm --dir apps/web exec playwright test tests/e2e/sheets-p1-2.spec.ts tests/e2e/sheet-range-block.spec.ts tests/e2e/sheets-p1.spec.ts tests/e2e/sheets-projection.spec.ts --project=chromium
```

Manual:
1. Select one spent cell → drag fill handle down 3 rows → values copy.
2. Select A1:C3 → Cmd+C → select D1 → Cmd+V → rectangle pastes.
3. Click Add row → new expense appears at bottom; focus moves to it.
4. sheet-range playground → simulate SSE off → STALE badge, no empty grid table.

---

## Acceptance criteria (TRL-318)

1. Fill handle drag extends selection and fills `text`/`number`/`select` columns; formula/relation toast skip.
2. `Cmd/Ctrl+C` / `Cmd/Ctrl+V` copy/paste rectangular TSV; unit test passes.
3. `insertRow` creates graph entity; sheet query refreshes via SSE; Add row button e2e smoke.
4. `__setSSEConnectedForTests` + sheet-range e2e asserts STALE UI (no table body).
5. P1 e2e regression (`sheets-p1`, `sheets-projection`, `sheet-range-block` LIVE/error) still pass.
6. No second TipTap; no deck files in wedge.

---

## P1.3 stub

Inline select editor (dropdown in cell), fill/paste into relation columns (link mutate), row delete, bulk row ops, copy/paste includes headers option, multiplayer presence ghosts.
