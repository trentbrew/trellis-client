---
version: alpha
name: Sheets P1 — keyboard nav, multi-select, column DnD
description: Design artifact for TRL-313 — spreadsheet-feel interactions on graph-native sheet projection
source:
  tool: derived
  url: docs/artifacts/sheets_decks_mockup.html#sheet
  mock: docs/artifacts/sheets_p1_mockup.html
  parentDesign: docs/artifacts/sheets_decks_design.md
  parentMock: docs/artifacts/sheets_decks_mockup.html
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-2: "#1a1a21"
  surface-3: "#202028"
  text: "#e8e8ec"
  text-muted: "#888894"
  text-faint: "#55555f"
  border: "#2a2a32"
  primary: "#6366f1"
  zone-workshop: "#10b981"
  live: "#34d399"
  formula: "#f59e0b"
  destructive: "#ef4444"
  selection: "#6366f1"
  fill-handle: "#818cf8"
  stale: "#f59e0b"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 11px
  header:
    fontFamily: IBM Plex Mono
    fontSize: 10.5px
    letterSpacing: 0.06em
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
motion:
  focusRing: 120ms
  columnDrag: 180ms
  fillPreview: 100ms
  stalePulse: 2s
components:
  SheetGridKeyboard:
    extends: SheetGrid
    rovingTabindex: true
  SelectionRange:
    borderColor: "{colors.selection}"
    fillHandleSize: 8px
  ColumnHeaderDrag:
    gripWidth: 14px
    dropIndicator: 2px
  SheetRangeStaleBlock:
    borderColor: "{colors.stale}"
  RelationCellPicker:
    trigger: combobox
    maxHeight: 240px
---

# Design: Sheets P1 — keyboard nav, multi-select, column DnD

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-312 · epic TRL-283 (closed)  
**Prior shipped:** TRL-286/291 (P0 projection + harden — `SheetProjectionFrame`, `useEditorLease`, `sheetRange`, virtualization)  
**Mock:** [sheets_p1_mockup.html](./sheets_p1_mockup.html) · baseline: [sheets_decks_mockup.html#sheet](./sheets_decks_mockup.html#sheet)  
**Baseline code:** `SheetProjectionFrame.vue`, `SheetGrid.vue`, `SheetCell.vue`, `useSheetProjection.ts`

---

## Overview

P1 makes the sheet projection **feel like a spreadsheet** without breaking the P0 invariant: **one TipTap instance, leased to the focused text cell**. Navigation, selection, fill, and column reorder are grid-level behaviors; only `kind: text` cells acquire the editor lease.

**In scope (P1):**

1. **Keyboard nav** — Arrow keys, Tab/Shift+Tab, Enter/Esc move focus; lease commits on exit; virtual scroll keeps focused row in view
2. **Multi-select + fill** — Shift+arrow extends rectangular selection; fill handle drag copies source pattern down (numbers + plain text first)
3. **Column header DnD** — reorder display columns; **stable column `id`** in sheet entity schema unchanged (semantic formulas unaffected)
4. **sheetRange stale/error UX** — deleted sheet, invalid range, or SSE disconnect surfaces in doc blocks (not silent empty grid)
5. **Relation column picker** — `kind: relation` cells open entity combobox (person) instead of inline TipTap

**Out of scope (P1.2+):**

- Multiplayer / concurrent cell locks
- Second TipTap instance or in-cell formula bar editing
- Full Excel formula language / cross-sheet refs
- Row DnD reorder (rows are TQL order — separate wedge)
- Deck projection changes

Brand posture: same workshop-green chrome as P0. Selection uses `{colors.selection}` indigo ring; fill handle is a small square anchor at selection bottom-right.

---

## Colors

| Token | Role |
|-------|------|
| `{colors.zone-workshop}` | Frame PROJECTION badge, sheet chrome (unchanged from P0) |
| `{colors.selection}` | Focus ring + multi-select overlay border |
| `{colors.fill-handle}` | 8×8 fill drag anchor |
| `{colors.formula}` | Derived cells, formula bar (unchanged) |
| `{colors.stale}` | sheetRange warning border + STALE badge |
| `{colors.destructive}` | sheetRange error (missing sheet) |
| `{colors.live}` | LIVE badge when SSE connected |

Extends P0 palette — no new zone accents.

---

## Typography

Unchanged from P0: 12.5px grid body, 10.5px mono column headers with type tags (`text`, `$ usd`, `= fx`, `→ person`).

**New micro-labels:** fill preview ghost values at 11px mono muted; stale block message at 12px sans.

---

## Layout

### 01 · Sheet grid (keyboard + selection)

```
┌─ Frame bar (unchanged P0) ──────────────────────────────────────────────┐
├─ Formula bar — shows active cell ref; readonly for multi-select anchor ───┤
├─ Virtualized grid ──────────────────────────────────────────────────────┤
│  [≡] A Vendor  [≡] B Category  [≡] C Budgeted  …  ← drag grips on headers │
│  2   …          …               [████ selected range ████]  ← shift+arrow │
│  8   [lease overlay on focused text cell only]                            │
│      └─ fill handle ▪ (bottom-right of selection)                         │
└───────────────────────────────────────────────────────────────────────────┘
```

### 02 · Relation cell (picker open)

```
┌─ Cell G8 (→ person) ─────────────────────────────────────┐
│  Rebecca Smith ▾                                          │
├─ Combobox popover ────────────────────────────────────────┤
│  🔍 Search people…                                        │
│  ○ Rebecca Smith                                          │
│  ○ Jay Higginbotham                                       │
│  ○ (clear)                                                │
└───────────────────────────────────────────────────────────┘
```

### 03 · sheetRange stale (doc transclusion)

```
┌─ sheetRange block ────────────────────────────────────────┐
│  q3-runway.sheet · A2:E6 · STALE                         │
│  Sheet unavailable or range invalid. [Open sheet] [Remove]│
└───────────────────────────────────────────────────────────┘
```

---

## Elevation & Depth

- **Selection overlay:** 1px `{colors.selection}` inset ring on each cell in range; anchor cell gets 2px ring
- **Fill handle:** sits above grid cells (`z-index: 2`), 8px square, `{colors.fill-handle}` fill
- **Column drag ghost:** semi-opaque header clone at `{motion.columnDrag}` follow cursor; 2px drop indicator between headers
- **Relation popover:** shadcn `Popover` / `Command` — same elevation as slash menu
- **Stale block:** dashed `{colors.stale}` top border; no nested grid rendered

---

## Shapes

- Fill handle: 2px radius square
- Column drag grip: `≡` icon hit target 14px wide in header left padding
- Selection: no cell radius (spreadsheet fidelity)
- Stale badge: `{rounded.pill}`, 20px height

---

## Components

| Component | Anatomy | States | Maps to codebase |
|-----------|---------|--------|------------------|
| `SheetGrid` | + roving tabindex, keydown handler | default, selecting, filling | **Extend** `SheetGrid.vue` |
| `useSheetSelection` | anchor, focus, range `{r0,c0,r1,c1}` | single, range, filling | **New** composable |
| `useSheetKeyboardNav` | arrow/tab/enter/esc routing | nav, lease-transfer | **New** composable |
| `SheetSelectionOverlay` | range borders + fill handle | hidden, active, dragging-fill | **New** child of grid |
| `SheetColumnHeader` | grip + label + type tag | default, dragging, drop-target | **Extract** from grid thead |
| `useColumnReorder` | display order ↔ persist `columns[]` | idle, dragging | **New**; mutates sheet entity |
| `RelationCellEditor` | combobox trigger in cell | closed, open, loading | **New** or extend `SheetCell.vue` |
| `SheetRangeBlock` | + stale/error branches | live, stale, error, loading | **Extend** `SheetRangeBlock.vue` |
| `SheetFormulaBar` | shows anchor cell ref in range | single / range summary | **Extend** (range → `A2:C5`) |

### Selection model

```ts
interface SheetSelection {
  anchor: { row: number; col: number }
  focus: { row: number; col: number }
  // normalized rect:
  r0: number; c0: number; r1: number; c1: number
}
```

- **Single click:** sets anchor = focus
- **Shift+arrow:** extends focus; redraws range
- **Fill handle drag:** copies anchor column values down across selected rows (numbers: copy value; text: copy string; formula/derived: no-op with toast)

### Column reorder persistence

Display order = `columns[]` array order on sheet entity. Reorder issues `updateNode` on sheet with permuted array. **Column `id` fields never change** — A1 labels recompute from index; semantic `this.budgeted` refs unchanged.

---

## Interaction matrix

| Input | States | Output |
|-------|--------|--------|
| Arrow keys | focused cell | Move focus; commit+release lease if leaving text cell; scroll virtual window |
| Tab / Shift+Tab | focused | Next/prev editable cell (skip formula derived display-only) |
| Enter | focused text cell | Acquire lease (same as double-click) |
| Esc | lease active | Commit lease, return focus to cell |
| Shift+arrow | anchor set | Extend selection rectangle |
| Click cell | — | Set anchor; clear range to single cell |
| Drag fill handle | range ≥1 row | Preview ghost values; on drop batch `updateCell` |
| Drag column header | header grip | Reorder columns; persist to graph; animate 180ms |
| Click relation cell | kind=relation | Open combobox; pick person → link mutate |
| sheet entity deleted | sheetRange in doc | STALE block + actions |
| Invalid A1 range | sheetRange | Error state + message |
| SSE disconnect | sheetRange + frame | STALE badge (existing LIVE off) |

---

## Accessibility

- **Focus order:** frame → formula bar → grid (roving `tabindex=0` on active cell only)
- **Grid:** retain `role="grid"`; selected cells `aria-selected="true"`
- **Multi-select:** `aria-label="Selected range A2:C5"` on grid when range &gt; 1 cell
- **Fill handle:** `role="button"` `aria-label="Fill selection down"`
- **Column drag:** grip `aria-label="Reorder column {label}"`; live region announces new order on drop
- **Relation picker:** combobox pattern — `aria-expanded`, listbox options
- **Stale sheetRange:** `role="alert"` for error; `aria-live="polite"` for stale recovery
- **Motion:** fill preview + column drag transitions off under `prefers-reduced-motion: reduce`

---

## Do's and Don'ts

**Do**

- Commit editor lease before any focus/selection change
- Persist column reorder as sheet entity mutation (not local-only)
- Batch fill mutations with single agent-id for SSE efficiency
- Keep formula/derived cells read-only in fill + relation pickers

**Don't**

- Don't mount TipTap for relation or number cells
- Don't rewrite semantic formulas when columns reorder
- Don't allow fill across formula columns in P1
- Don't silently render empty grid on stale sheetRange

---

## Open for Architect

1. **`useSheetSelection` + `useSheetKeyboardNav`** — spec composables; wire into `SheetProjectionFrame` focus sync (P0 gap: parent `focusRow/Col` vs grid internal `focused`)
2. **Virtual scroll + keyboard** — when focus moves outside visible range, call `useVirtualRows.scrollToIndex(row)`
3. **Fill operation** — AC: number + text columns; skip formula/relation; optimistic UI optional
4. **`useColumnReorder`** — DnD on thead only; persist `columns[]` order via graph mutate; unit test permute preserves ids
5. **`RelationCellEditor`** — query `FIND entity WHERE type=person`; link via `assignedTo` or column `relationType`; no TipTap
6. **`SheetRangeBlock` states** — enum: `loading | live | stale | error`; actions: navigate to sheet, remove block
7. **E2e AC** — keyboard nav moves focus; shift-select highlights ≥2 cells; column drag changes header order (data-testid); sheetRange stale fixture
8. **Test paths** — use `pnpm --dir apps/web exec vitest` from trellis-client root (not ide VCS cwd)

---

## Handoff checklist

- [x] `docs/artifacts/sheets_p1_design.md` (this file, DESIGN.md format)
- [x] `docs/artifacts/sheets_p1_mockup.html` (self-contained; CSS vars mirror YAML tokens)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] Component anatomy mapped to P0 sheet codebase extensions
