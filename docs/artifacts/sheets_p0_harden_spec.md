# Spec: Sheets P0 harden (TRL-290)

**Parent proposal:** TRL-288  
**Prior impl:** TRL-286 (closed, review TRL-287 PASS)  
**Design/spec baseline:** [sheets_decks_spec.md](./sheets_decks_spec.md) · [sheets_decks_design.md](./sheets_decks_design.md)

## Scope

**In:** Close P0 deferrals from TRL-287 review — row virtualization, editor-lease commit ordering, sheetRange e2e, graph AC hygiene for TRL-283–285.

**Out:** Deck P1 (TRL-289), full Present mode, sheet ontology tier promotion (optional stretch).

---

## 1. Row virtualization (`SheetGrid.vue`)

Replace scroll-all-rows P0 container (`data-sheet-virtual="scroll-p0"`) with the **existing** `useVirtualRows` composable — same pattern as `CollectionDataGridProjection.vue` and `BrowseSpreadsheetView.vue` (do **not** introduce a parallel `@tanstack/vue-virtual` integration).

| Constant | Value | Notes |
| -------- | ----- | ----- |
| `ROW_HEIGHT` | `36` | Match design formula-bar adjacency; cells ~32–36px |
| `OVERSCAN` | `10` | Match collection grid |
| Scroller | `ref` on body wrapper | `@scroll="measure"` |

### Structure

```
SheetGrid
├─ sticky <thead> (column letters + labels) — not virtualized
├─ div[ref=scrollerRef] @scroll=measure max-h-[480px] overflow-auto
│   └─ div height = rows.length * ROW_HEIGHT
│       └─ absolute-positioned <tr> rows for visible range only
└─ sticky <tfoot> (Σ footer) — not virtualized
```

- Map virtual index → `rows[pos]`; pass **display row index** `pos` to `SheetCell` / `getCellValue` / focus handlers (not slice-local `i`).
- Remove `data-sheet-virtual="scroll-p0"`; set `data-sheet-virtual="useVirtualRows"`.

### Editor lease + virtualization

- Leased cell must remain in DOM while active. If focused row scrolls out of `range`, **commit + release** on scroll (watch `range` vs `lease.cellKey` row index) — prevents orphan Teleport target.
- Only one row hosts `mountRef` at a time (unchanged).

### Stress fixture

Extend `apps/web/scripts/seed-sheet-demo.mjs`:

```bash
bun apps/web/scripts/seed-sheet-demo.mjs --bulk 60   # adds 60 synthetic expense rows (Q3-2026)
```

Bulk rows: `entity:expense-bulk-{n}` with deterministic budgeted/spent. Default seed (6 rows) unchanged when flag omitted.

### Verification

- Manual: 60+ rows — scroll smooth; DOM row count ≪ total (DevTools: tbody direct children ≤ ~30).
- Existing e2e still passes on 6-row demo.

---

## 2. Editor lease — await commit on cell switch

**File:** `apps/web/app/composables/useEditorLease.ts`

Current bug: `acquire()` calls `void commit()` when switching cells — async commit may race with next acquire.

```ts
// Before
function acquire(...) {
  if (cellKey.value && cellKey.value !== key) {
    void commit()
  }
  ...
}

// After
async function acquire(...) {
  if (cellKey.value && cellKey.value !== key) {
    await commit()
  }
  ...
}
```

- Update `EditorLease` interface: `acquire` returns `Promise<void>`.
- Call sites: `SheetCell.vue` `onDblClick` — `await lease.acquire(...)` inside async handler.
- **Unit test:** add case that delays `onCommit` (microtask) and asserts second acquire waits for first commit.

---

## 3. sheetRange e2e

### Playground route (isolated, mirrors `playground/formulas.vue`)

**Add:** `apps/web/app/pages/playground/sheet-range.vue`

- Renders `UiRichTextEditor` with `embeds: true`, `editable: false`.
- Initial content: TipTap doc with one `sheetRange` node:

  ```json
  { "type": "sheetRange", "attrs": {
      "sheetId": "entity:sheet-q3-runway",
      "range": "A2:E3",
      "title": "Q3 runway excerpt"
  }}
  ```

- Requires sheet demo seeded (`seed-sheet-demo.mjs`).

### E2e

**Add:** `apps/web/tests/e2e/sheet-range-block.spec.ts`

```ts
test('sheetRange playground shows LIVE block with grid data', async ({ page }) => {
  await page.goto('/playground/sheet-range')
  await expect(page.locator('[data-type="sheet-range"]').or(page.getByText('LIVE'))).toBeVisible()
  await expect(page.getByText('e2b.dev sandboxes').or(page.getByText('Vendor'))).toBeVisible({ timeout: 20_000 })
})
```

Keep existing `sheets-projection.spec.ts` unchanged.

---

## 4. Graph AC hygiene (turtlecode/ide VCS)

Repair parent-chain AC so `trellis issue close` works cross-repo. Issues live in **turtlecode/ide**; artifacts/tests live in **trellis-client** (`../trellis-client` from ide root).

**Executor runs from `turtlecode/ide`:**

| Issue | Replace AC with |
| ----- | --------------- |
| TRL-285 | `test:pnpm --dir ../trellis-client/apps/web exec vitest run app/composables/useEditorLease.test.ts app/lib/sheet-a1.test.ts app/lib/sheet-cell-key.test.ts` + behavioral: no deck files |
| TRL-284 | File-exists checks via `test:test -f ../trellis-client/docs/artifacts/sheets_decks_design.md` etc. |
| TRL-283 | `test:test -f ../trellis-client/docs/artifacts/sheets_decks_mockup.html` + milestone note |

Use `trellis issue ac` to add corrected criteria; remove/retract corrupted duplicates if CLI supports (otherwise describe + close with human `--confirm` override documented on issue).

**Not blocking impl merge** if graph tooling blocks retract — document on TRL-290 describe.

---

## 5. Optional stretch (do not block close)

- `trellis:schema/sheet` system ontology field registration
- Relation column (`kind: relation`, `→ person`) in `Q3_RUNWAY_COLUMNS` + seed link
- Seed `entity:note-yc-s26-financial-narrative` for manual narrative demo (playground covers e2e)

---

## Files touched

| File | Action |
| ---- | ------ |
| `apps/web/app/components/sheet/SheetGrid.vue` | virtualize tbody via `useVirtualRows` |
| `apps/web/app/components/sheet/SheetCell.vue` | await acquire; scroll-away release hook via parent |
| `apps/web/app/composables/useEditorLease.ts` | async acquire |
| `apps/web/app/composables/useEditorLease.test.ts` | async commit ordering test |
| `apps/web/scripts/seed-sheet-demo.mjs` | `--bulk N` flag |
| `apps/web/app/pages/playground/sheet-range.vue` | **add** |
| `apps/web/tests/e2e/sheet-range-block.spec.ts` | **add** |
| `docs/artifacts/sheets_p0_harden_spec.md` | this file |

---

## Verification commands

From **trellis-client**:

```bash
pnpm --dir apps/web exec vitest run app/composables/useEditorLease.test.ts app/lib/sheet-a1.test.ts app/lib/sheet-cell-key.test.ts
pnpm --dir apps/web exec playwright test tests/e2e/sheets-projection.spec.ts tests/e2e/sheet-range-block.spec.ts --project=chromium
bun apps/web/scripts/seed-sheet-demo.mjs
bun apps/web/scripts/seed-sheet-demo.mjs --bulk 60
```

From **turtlecode/ide** (graph AC):

```bash
trellis issue check TRL-290
```

---

## Acceptance criteria (TRL-290)

1. `SheetGrid` virtualizes body rows via `useVirtualRows`; 60-row seed scrolls without rendering all `<tr>` nodes.
2. `acquire()` awaits prior `commit()` before switching cells; unit test covers delayed commit.
3. `/playground/sheet-range` renders LIVE sheetRange block with q3-runway data.
4. E2e: `sheet-range-block.spec.ts` passes on chromium.
5. Existing `sheets-projection.spec.ts` still passes.
6. TRL-285 graph AC repaired or documented with correct `../trellis-client` test paths.
