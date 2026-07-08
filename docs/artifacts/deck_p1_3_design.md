---
version: alpha
name: Deck P1.3 — sorter/thumb vantages, query builder, presence
description: Design artifact for TRL-308 — fractal deck vantages as routes + query builder + lightweight presence
source:
  tool: derived
  url: docs/artifacts/sheets_decks_mockup.html#deck
  mock: docs/artifacts/deck_p1_3_mockup.html
  parentDesign: docs/artifacts/deck_p1_2_design.md
  parentMock: docs/artifacts/deck_p1_2_mockup.html
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-2: "#1a1a21"
  surface-3: "#202028"
  text: "#e8e8ec"
  text-muted: "#888894"
  text-faint: "#55555f"
  border: "#2a2a32"
  zone-showroom: "#8b5cf6"
  live: "#34d399"
  live-pulse: "#6ee7b7"
  series: "#6366f1"
  primary: "#6366f1"
  presence-self: "#8b5cf6"
  presence-remote: "#f59e0b"
  cursor-remote: "#fbbf24"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  slideTitle:
    fontFamily: IBM Plex Sans
    fontSize: clamp(20px, 3.6vw, 32px)
    fontWeight: 650
  mono:
    fontFamily: IBM Plex Mono
    fontSize: 10.5px
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
  vantageCrossfade: 280ms
  vantageRoute: 220ms
  queryBuilderExpand: 180ms
  cursorSmooth: 120ms
components:
  SorterVantageRoute:
    path: "/decks/[slug]/sorter"
    gridTemplate: "filmstrip 1fr inspector"
    filmstripHeight: 168px
  ThumbVantageRoute:
    path: "/decks/[slug]/thumb"
    railWidth: 96px
    previewScale: 0.72
  QueryBuilderPanel:
    trigger: layoutId live-data
    minHeight: 220px
  PresenceLayer:
    avatarsMax: 4
    cursorLabelFont: "{typography.mono}"
  KeyboardReorder:
    modifier: Alt
    keys: ArrowUp ArrowDown
---

# Design: Deck P1.3 — sorter/thumb vantages, query builder, presence

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-307 · epic TRL-283  
**Prior shipped:** TRL-305 (Deck P1.2 — live queryView, DnD reorder, body lease, layout picker, crossfade)  
**Mock:** [deck_p1_3_mockup.html](./deck_p1_3_mockup.html) · epic reference: [sheets_decks_mockup.html#deck](./sheets_decks_mockup.html#deck)  
**Baseline:** [deck_p1_2_design.md](./deck_p1_2_design.md) · P1.3 stub in [deck_p1_2_spec.md](./deck_p1_2_spec.md)

---

## Overview

P1.3 completes the **fractal responsiveness** story for deck projection: thumb and sorter vantages become real navigable routes (not inspector stubs), queryView regions gain an inline **query builder** for demo-friendly EQL-S editing, keyboard reorder lands for a11y/power users, and a **lightweight presence layer** shows who else is viewing the deck (avatars + remote cursors on canvas).

**In scope (P1.3):**

1. **Sorter vantage route** — `/decks/[slug]/sorter` — horizontal filmstrip-primary layout; drag-reorder at scale; canvas shows selected slide mini-preview
2. **Thumb vantage route** — `/decks/[slug]/thumb` — narrow vertical rail + enlarged active thumb; fast slide hopping
3. **Query builder UI** — inspector panel when `layoutId === 'live-data'`; edit `regions.queryView.query`, viz mode, title; run + save commits to graph
4. **Keyboard reorder** — `Alt+↑` / `Alt+↓` moves active slide in tablist; same `updateSlideOrder` as DnD
5. **Presence (read-only)** — frame bar avatars; optional remote cursor ghosts on canvas (SSE/session scoped — no Yjs co-edit)

**Out of scope (P1.4+):**

- Full multiplayer / Yjs co-editing of slide regions
- Second TipTap instance (still one Teleport editor)
- Real-time cursor sync over WebRTC (presence uses stub/SSE heartbeat in P1.3)
- Query builder autocomplete / schema browser (stretch — document only)

**Demo target:** `entity:deck-yc-s26` — navigate thumb/sorter routes; edit traction query in builder; Alt+↓ reorders slides; avatar stack shows simulated collaborator.

---

## Colors

| Token | Usage |
| ----- | ----- |
| `{colors.zone-showroom}` | Active vantage chip, sorter drop indicator, query builder Run button |
| `{colors.presence-self}` | Local user avatar ring |
| `{colors.presence-remote}` | Remote viewer avatar fill |
| `{colors.cursor-remote}` | Remote cursor arrow + name label on canvas |
| `{colors.live}` | Query builder LIVE preview badge |

Inherit P1/P1.2 palette — no fork.

---

## Typography

- **Vantage route labels:** `{typography.mono}` 10px uppercase in inspector chips (all four vantages navigable)
- **Query builder:** monospace 11px for query textarea; 9px uppercase section headers
- **Remote cursor label:** `{typography.mono}` 8px on `{colors.cursor-remote}` pill

---

## Layout

### Route map (four vantages)

| Vantage | Route | Shell layout |
| ------- | ----- | ------------ |
| **editor** | `/decks/[slug]` | P1.2 grid: thumb rail · canvas · inspector |
| **sorter** | `/decks/[slug]/sorter` | Filmstrip row (full width) · mini canvas · inspector |
| **thumb** | `/decks/[slug]/thumb` | Narrow rail · large thumb preview · inspector |
| **present** | `/decks/[slug]/present` | P1.2 fullscreen (unchanged) |

All routes share `DeckProjectionFrame` data layer; only layout grid + `--vantage` CSS vars change. Crossfade between editor ↔ present preserved; thumb/sorter use `{motion.vantageRoute}` opacity transition (220ms).

### Sorter vantage

```
DeckSorterShell [data-vantage="sorter"]
├─ FilmstripRow — horizontal scroll, larger thumbs (128×72), DnD reorder
├─ MiniCanvas — aspect-video preview of active slide (read-only or lease on dbl-click)
├─ SpeakerNotesStrip (collapsed one-line in P1.3 — expand on focus)
└─ DeckInspector — layout picker + query builder + vantage chips (sorter active)
```

### Thumb vantage

```
DeckThumbShell [data-vantage="thumb"]
├─ NarrowRail — 96px vertical thumbs, no grip (click to select)
├─ ThumbPreview — single enlarged slide at {previewScale}
└─ DeckInspector — compact; vantage chips (thumb active)
```

### Query builder (inspector extension)

Shown when active slide has `layoutId: 'live-data'` OR `regions.queryView`:

```
QueryBuilderPanel
├─ Query textarea (EQL-S or demo pseudo-SQL — same toEqlQuery normalization as P1.2)
├─ Viz select: chart | tiles | both
├─ Title input (optional chart label)
├─ [Run preview] — local only, does not mutate
└─ [Save to slide] — commits regions.queryView JSON via updateSlideRegions
```

Preview uses existing `useDeckQueryView`; Save triggers graph mutate + SSE refresh.

### Presence layer

```
Frame bar (all vantages except present)
├─ existing PROJECTION + LIVE badges
└─ AvatarStack (max 4 visible + "+N")
    └─ remote cursor overlay on SlideCanvas (position from session stub)
```

P1.3 presence is **advisory** — cursors animate to last-known viewport coords; no conflict resolution.

---

## Elevation & Depth

- **Sorter filmstrip thumb:** elevated on drag (same ghost pattern as P1.2)
- **Active vantage chip:** inset ring `{colors.zone-showroom}` at 40% opacity
- **Remote cursor:** 12px arrow + 4px shadow; label pill floats 4px offset
- **Query builder panel:** `{colors.surface-2}` inset border; Run button primary outline

---

## Shapes

- Filmstrip thumbs: `{rounded.sm}` 16:9 mini canvases
- Thumb vantage preview: `{rounded.md}` with 1px `{colors.border}`
- Avatar stack: `{rounded.pill}` 24px circles, -8px overlap

---

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `DeckSorterShell` | filmstrip · mini canvas · inspector | default, dragging | **New** page `sorter.vue` + shell component |
| `DeckThumbShell` | narrow rail · preview · inspector | default | **New** page `thumb.vue` + shell component |
| `VantageChipNav` | 4 chips as links | active per route | **Extend** `DeckInspector` — chips navigate routes |
| `QueryBuilderPanel` | query · viz · title · actions | idle, running, saved, error | **New** in inspector |
| `PresenceLayer` | avatars · cursors | solo, multi | **New** composable `useDeckPresence` (stub) |
| `SlideThumbList` | + keyboard reorder | Alt+arrow | **Extend** P1.2 |
| `QueryViewRegion` | unchanged live path | + builder-sourced query | **Extend** — config from builder save |

### Graph model delta

| Field | Change |
| ----- | ------ |
| `regions.queryView` | Editable via QueryBuilderPanel Save |
| `slide.order` | Keyboard reorder uses same mutate path as DnD |
| (none) | Presence is session/ephemeral — not persisted P1.3 |

---

## Interaction matrix

| Input | Vantage | Output |
| ----- | ------- | ------ |
| Click vantage chip "sorter" | editor | Navigate `/decks/[slug]/sorter`; 220ms route transition |
| Click vantage chip "thumb" | any | Navigate `/decks/[slug]/thumb?slide=N` |
| Click vantage chip "editor" | sorter/thumb | Navigate `/decks/[slug]?slide=N` |
| Drag filmstrip thumb | sorter | Reorder via `updateSlideOrder` (same as P1.2 rail) |
| Alt+↑ / Alt+↓ | editor, sorter, thumb | Move active slide ±1; mutate order; focus follows |
| Edit query + Save | editor (live-data slide) | `updateSlideRegions` queryView; queryView refreshes |
| Run preview | query builder | Local preview only — no graph write |
| Hover avatar | any | Tooltip: agent name + vantage |
| Remote cursor move (stub) | editor | SSE/session updates cursor position on canvas |
| Present | any | Still `/present?slide=N` with P1.2 crossfade from editor |

---

## Accessibility

- **Focus order (sorter):** filmstrip tablist → mini canvas → notes → layout picker → query builder → vantage chips
- **Focus order (thumb):** narrow rail tablist → preview panel → inspector
- **Keyboard reorder:** `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"` on tablist; live region announces "Slide N moved to position M"
- **Query builder:** textarea `aria-label="EQL-S query"`; Run/Save buttons labeled; error text `role="alert"`
- **Vantage chips:** `role="tablist"` with each chip `role="tab"` + `aria-current="page"` for active route
- **Presence avatars:** `aria-label="Collaborators viewing deck"`; cursor ghosts `aria-hidden="true"` (decorative P1.3)
- **Route transitions:** `{motion.vantageRoute}` → 0ms under `prefers-reduced-motion: reduce`

---

## Do's and Don'ts

**Do**

- Reuse `SlideCanvas`, `SlideThumbList`, `DeckInspector`, `useDeckProjection` across all vantages
- Preserve P1.2 DnD, body lease, layout picker, crossfade — P1.3 adds routes, not replacements
- Query builder Save must commit the same `regions.queryView` shape P1.2 already parses
- Simulate presence in demo with 1–2 stub remote cursors (toggle in mock)

**Don't**

- Don't add second TipTap or Yjs CRDT sync
- Don't block Present route on query builder or presence loading
- Don't persist cursor positions to the graph
- Don't build full EQL-S autocomplete in P1.3

---

## Wedge boundaries vs P1.4

| P1.3 (this wedge) | P1.4 (future) |
| ----------------- | ------------- |
| Presence avatars + cursor ghosts (stub) | Real-time Yjs co-editing |
| Query builder (textarea + viz select) | Schema-aware query builder / saved views |
| Sorter + thumb routes | Vantage-level responsive breakpoints in `--vantage` system |
| Keyboard reorder | Bulk multi-select reorder in sorter |

---

## Open for Architect

1. **Routes** — `pages/decks/[id]/sorter.vue`, `pages/decks/[id]/thumb.vue`; shared `?slide=` query param; `pageTransition: deck-vantage`
2. **`DeckSorterShell.vue` / `DeckThumbShell.vue`** — layout wrappers; pass same props as `DeckProjectionFrame` core
3. **`VantageChipNav`** — replace static chips in `DeckInspector` with `NuxtLink` quad; highlight from `$route.path`
4. **`QueryBuilderPanel.vue`** — bind to active slide `regions.queryView`; Run = local `queryOnce`; Save = `updateSlideRegions`
5. **`useDeckPresence(deckId)`** — stub: 1 local + 1 demo remote cursor; SSE hook optional; no graph writes
6. **Keyboard reorder** — `useDeckKeyboardReorder` on tablist focus; Alt+↑/↓ → `updateSlideOrder`
7. **Types** — optional `QueryViewRegionConfig` unchanged; no new ontology fields
8. **E2e** — sorter route renders filmstrip; thumb route renders preview; query builder save updates LIVE region; Alt+↓ reorders (keyboard API)
9. **Seed** — unchanged from P1.2; optional second agent session simulation in dev only

---

## Handoff checklist

- [x] `docs/artifacts/deck_p1_3_design.md` (this file)
- [x] `docs/artifacts/deck_p1_3_mockup.html` (P1.3 interactive mock — four vantages)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] P1.4 boundary table complete
- [x] Open for Architect enumerated
