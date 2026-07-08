# Backlog: Full sheet-range selection UX (TRL-285b)

**Parent:** TRL-285 (P0 sheet transclusion)  
**Status:** backlog — lightweight A1 text picker ships in P0

## Problem

P0 `/sheet-range` embed uses a dialog: search sheet entities + free-text A1 range (`parseA1Range` validation). This is enough for demos and agent-authored docs, but not discoverable for humans who think in grids.

## Scope (future wedge)

1. **Mini grid preview** in the picker — render read-only `SheetGrid` subset after sheet selection
2. **Drag-to-select range** — mousedown on cell → mousemove highlights rectangle → emits A1 range
3. **Column/row header click** — select full column or row (Excel-style)
4. **Range provenance in node attrs** — optional `displayRange` vs stored semantic range if columns reorder
5. **SheetRangeBlock in-doc** — click range label opens same picker to edit attrs (not read-only navigate only)

## Out of scope

- In-doc editing of transcluded values (always read-only; navigate to sheet)
- Multi-range blocks / sparklines

## Acceptance criteria

1. User can pick range without typing A1 notation
2. Selected range highlights match mockup transclusion bar (`q3-runway.sheet · A2:E8`)
3. Invalid partial selections show inline error before insert
4. E2e: insert via picker → block renders live cells

## Reuse

- `useSheetProjection.readRange`
- `SheetGrid` / `SheetCell` read-only mode prop
- `parseA1Range` / `toA1Ref` from `lib/sheet-a1.ts`

## Estimate

~1 executor slice after P0 design-language PASS
