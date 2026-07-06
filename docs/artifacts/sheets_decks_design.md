---
version: alpha
name: Sheets & Decks on the Graph
description: Design artifact — graph-native sheet projection, sheetRange transclusion, deck slide entities
source:
  tool: fable
  url: https://claude.ai/code/artifact/d1ef3a66-6b0a-4d38-9abb-a348d1979f14
  mock: docs/artifacts/sheets_decks_mockup.html
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
  destructive: "#ef4444"
  live: "#34d399"
  zone-lab: "#6366f1"
  zone-workshop: "#10b981"
  zone-showroom: "#8b5cf6"
  formula: "#f59e0b"
  series: "#818cf8"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: 400
  eyebrow:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  section: 72px
components:
  sheetProjectionFrame:
    backgroundColor: "{colors.surface}"
    borderRadius: "{rounded.lg}"
    borderColor: "{colors.border}"
  formulaBar:
    height: 36px
    backgroundColor: "{colors.surface-2}"
  editorLease:
    borderColor: "{colors.primary}"
    minHeight: 88px
  liveBadge:
    color: "{colors.live}"
  sheetRangeBlock:
    borderColor: "{colors.zone-workshop}"
  deckVantagePanel:
    width: 220px
---

# Design: Sheets & Decks on the Graph

**Status:** Design complete — adopted mock + spec bundle; P0 sheet impl shipped (TRL-286, TRL-291); deck P1–P1.3 shipped (TRL-295–310). Mock remains visual reference; deck section maps to `docs/artifacts/deck_p1_*` for shipped vantages.  
**Parent:** TRL-283 (epic)  
**Mock:** [sheets_decks_mockup.html](./sheets_decks_mockup.html)  
**Source:** [Fable artifact](https://claude.ai/code/artifact/d1ef3a66-6b0a-4d38-9abb-a348d1979f14)

---

## Overview

Three **projections** over one Trellis graph — not three siloed editors. The graph owns structure (sheet, column, row, deck, slide); **TipTap is the leaf-level text runtime**, leased to whichever cell or slide region has focus.

| Projection | Zone | Structure | Text runtime |
|------------|------|-----------|--------------|
| **Sheet** | Workshop | TQL query → virtualized grid | Editor lease per focused cell |
| **Doc transclusion** | Lab | ProseMirror doc + `sheetRange` atom | Full RichTextEditor |
| **Deck** | Showroom | Ordered slide entities + regions | TipTap fragments per region |

Brand posture: developer-grade productivity — dense grid, live badges, formula bar, zone-tinted chrome. Emotional tone: *the graph is the spreadsheet* — no import/export theater.

**Milestone status (Jul 2026):** Sheet P0 + harden **shipped** (`SheetProjectionFrame`, `useSheetProjection`, `useEditorLease`, `sheetRange` atom). Deck **shipped** through P1.3 — see `deck_p1_2_design.md`, `deck_p1_3_design.md` for vantage-specific interaction deltas. This artifact remains the **epic-level** design spine; next sheets wedge (P1) needs a new proposal + design pass if scope expands beyond P0.

## Colors

| Token | Role |
|-------|------|
| `{colors.zone-workshop}` | Sheet frame, `sheetRange` border, workshop badges |
| `{colors.zone-lab}` | Doc / transclusion section accent |
| `{colors.zone-showroom}` | Deck editor, Present CTA, chart highlight |
| `{colors.live}` | LIVE badge, live query regions |
| `{colors.formula}` | Formula bar `fx`, derived column tags |
| `{colors.series}` | Chart bars (default); current month uses `{colors.zone-showroom}` |
| `{colors.destructive}` | Over-budget cells, negative derived values |

Extends Trellis dark shell — same `#0a0a0c` / `#141418` base as Campus chrome. Zone accents apply to frame badges and section eyebrows only.

## Typography

- **Grid body:** 13px IBM Plex Sans — spreadsheet density
- **Column headers:** 11px mono letter + 12px label + muted type tag (`text`, `select`, `$ usd`, `= fx`, `→ person`)
- **Formula bar:** mono for cell ref + formula text; `fx` label in `{colors.formula}`
- **Doc prose:** 15px body in transclusion section
- **Slide title:** clamp(18px, 2.8vw, 26px) semibold in deck canvas
- **Design mock eyebrows:** 11px mono uppercase — not shipped in product UI

## Layout

### 01 · Sheet (Workshop)

```
┌─ Frame bar ─────────────────────────────────────────────────────────────┐
│ crumb · PROJECTION badge · TQL query pill · LIVE · avatars              │
├─ Formula bar ───────────────────────────────────────────────────────────┤
│ E8 · fx · =C8-D8 · [A1|attrs toggle]                                    │
├─ Virtualized grid ──────────────────────────────────────────────────────┤
│     A Vendor   B Category  C Budgeted  D Spent  E Remaining  F Status G │
│ 2   …          …          …            …       …             …        … │
│ 8   [EDITOR LEASE overlay — TipTap in cell A8]                          │
│ Σ   $sum footer row                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 02 · Doc transclusion (Lab)

```
┌─ Frame bar: … ▸ yc-s26-financial-narrative.doc ───────────── DOC ────────┐
│ H1 + meta                                                               │
│ Prose paragraphs                                                        │
│ ┌─ sheetRange block (LIVE) ───────────────────────────────────────────┐ │
│ │ q3-runway.sheet · A2:E6 · mini grid (read-only, live from graph)     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ More prose referencing live values                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 03 · Deck (Showroom) — shipped (P1–P1.3); mock = epic reference

```
┌─ Thumbs ─┬─ Slide canvas ────────────────────────┬─ Vantage + metadata ─┐
│ title    │ TRACTION headline                    │ Layout · Vantage      │
│ problem  │ LIVE queryView + tiles + chart       │ thumb/sorter/editor   │
│ traction*│                                      │ Slide entity meta   │
│ product  │ Speaker notes (TipTap fragment)      │ [Present]             │
│ ask      │                                      │                       │
└──────────┴──────────────────────────────────────┴───────────────────────┘
```

## Elevation & Depth

- **Frame:** `{colors.surface}` panel, 1px `{colors.border}`, `{rounded.lg}`
- **Formula bar:** inset `{colors.surface-2}` — one step below frame bar
- **Editor lease:** 2px primary ring + floating toolbar — highest elevation in grid
- **sheetRange block:** nested inset with workshop-tinted top border + LIVE badge
- **Deck canvas:** centered slide on `{colors.surface-3}`; thumbs are flat list items, selected gets showroom ring

## Shapes

- Badges: `{rounded.pill}`, 20–22px height
- Status chips: `{rounded.sm}`, semantic fill (ok / over / limit)
- Grid cells: no radius; row header column fixed width
- Chart bars: 4px top radius on fill

## Components

| Component | Anatomy | States | Maps to codebase |
|-----------|---------|--------|------------------|
| `SheetProjectionFrame` | frame-bar · formula-bar · grid-wrap | loading, live, error query | **Shipped** — `apps/web/app/components/sheet/SheetProjectionFrame.vue` |
| `SheetFormulaBar` | cell-ref · fx · formula-input · ref-mode toggle | A1 view / attr view; readonly when fx column | **Shipped**; uses `useCollectionFormulas` |
| `SheetGrid` | virtualized `<table>` or canvas grid | scroll, select, multi-select | **Shipped** in projection frame |
| `SheetCell` | static render · lease mount point | default, focused, editing, derived, error | **Shipped**; wraps `EditableCell` patterns |
| `EditorLease` | toolbar + TipTap mount | active / idle; single global lease | **Shipped** — `useEditorLease` + `RichTextEditor` |
| `SheetRangeBlock` | header (sheet id, range, LIVE) + mini grid | loading, stale, error | **Shipped** TipTap atom — sibling of `QueryView` |
| `DeckEditorShell` | thumbs · canvas · inspector | editor / sorter / present vantages | **Shipped** — `DeckProjectionFrame`, `DeckSorterShell`, `DeckThumbShell` |
| `SlideCanvas` | regions (title, body, queryView, notes) | per-slide entity | **Shipped** — slide regions in deck shells |
| `QueryViewBlock` | LIVE badge + TQL + tiles/chart | live subscription | Existing `query-view-extension.ts` |
| `ProjectionBadge` | zone dot + label (PROJECTION, DOC, LIVE) | — | Shared chrome atom |

### Extension vocabulary (shared spine)

Reuse without fork: `@mention`, `entity-embed`, `query-view`, `/slash`, `inline-comment`, `callout`, `tabs`, `cards`.

**New:** `sheetRange` atom — attrs: `sheetId`, `range` (A1 notation), `title?`, `readOnly: true`.

## Interaction matrix

| Input | States | Output |
|-------|--------|--------|
| Click cell | default → focused | Selection ring; formula bar shows cell ref + value/formula |
| Double-click / Enter on text cell | focused → lease | Mount shared TipTap into cell; `EDITOR LEASE` chrome |
| Escape / blur lease | editing → focused | Commit cell body to graph attribute; unmount TipTap |
| Type `/` in leased cell | slash menu open | `/mention`, `/embed`, `/query` — same as doc editor |
| Tab / arrow keys in grid | — | Move focus cell; lease transfers or commits |
| Formula bar edit | fx column or user formula | Parse → store attribute refs; display A1 or `this.attr` per toggle |
| A1 / attrs toggle | `aria-pressed` pair | Formula bar switches render mode; stored form unchanged |
| Column header click | — | Sort by attribute (stable row entity ids) |
| TQL query change (frame bar) | — | Re-run projection; rows appear/disappear from graph matches |
| SSE graph mutation | — | Live cells update; LIVE badge on sheet + sheetRange |
| Insert sheetRange in doc | atom selected | Pick sheet + range; block renders live mini grid |
| Click sheetRange header | — | Navigate to source sheet projection |
| Deck thumb click | — | Load slide entity canvas (P1) |
| Vantage toggle (deck) | thumb / sorter / editor / present | Same slide component, different `--vantage` (P1) |
| Present (deck) | — | Fullscreen projector vantage (P1) |

## Accessibility

- **Focus order (sheet):** frame controls → formula bar (ref toggle group) → grid (row-major) → lease toolbar → lease body
- **Grid:** `role="grid"`; focused cell `aria-selected="true"`; row headers `scope="row"`
- **Formula bar toggle:** `role="group"` `aria-label="Formula reference rendering"`; buttons use `aria-pressed`
- **Editor lease:** lease container `aria-label="Cell editor"`; Esc returns focus to cell
- **Live regions:** LIVE badge changes announce via `aria-live="polite"` on sheet frame when query reconnects
- **sheetRange block:** `aria-label="Live sheet range from {sheetId}"`; read-only — no grid editing inside doc
- **Deck chart bars:** `tabindex="0"` on bars; focus shows tooltip value (mock pattern)
- **Motion:** chart hover transitions off under `prefers-reduced-motion: reduce`; slide vantage crossfade disabled or ≤50ms

## Do's and Don'ts

**Do**

- Store formulas as attribute references (`this.budgeted - this.spent`); A1 is a view
- Keep one TipTap instance leased — never per-cell editors in DOM
- Treat rows as entity ids from TQL — sorting/filtering never copies data
- Reuse `useCollectionFormulas` for `$sum`, `$avg`, `$percent` footer row

**Don't**

- Don't embed ProseMirror inside every cell in the virtualized DOM
- Don't paste sheet values into docs — always `sheetRange` reference
- Don't fork deck vantages per route — use shared `--vantage` crossfade (see deck P1.2 spec)
- Don't break attribute refs when columns reorder — refs are semantic not positional

## Open for Architect

**P0 (addressed in `sheets_decks_spec.md` — TRL-285):** items 1–6 below are **implemented**; close TRL-285 AC when path hygiene allows.

1. ~~Sheet entity schema~~ — ontology `sheet` type in workshop zone.
2. ~~Projection runtime~~ — `useSheetProjection` + SSE.
3. ~~Editor lease protocol~~ — `useEditorLease`.
4. ~~Formula dual representation~~ — A1 toggle display-only.
5. ~~`sheetRange` TipTap node~~ — atom block live.
6. ~~Vertical slice AC~~ — `q3-runway` demo seed.

**Deck P1 (addressed in `deck_p1_*` specs — TRL-295–310):** slide entity + ordered relation + vantages **shipped**.

**Sheets P1 (future — needs Strategist proposal):** keyboard nav polish, multi-select + fill, column reorder DnD, sheetRange stale UX, relation column picker — **not in this artifact**; spawn new design child when proposal lands.

## Handoff checklist

- [x] `docs/artifacts/sheets_decks_design.md` (this file, DESIGN.md format)
- [x] `docs/artifacts/sheets_decks_mockup.html` (adopted Fable mock; adoption header present)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] Paths in design issue `describe` SUMMARY (TRL-284)
