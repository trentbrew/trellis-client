---
version: alpha
name: Deck P1.2 — live queryView, thumb reorder, vantage crossfade
description: Design artifact for TRL-303 — deck projection polish after P1.1 shipped
source:
  tool: derived
  url: docs/artifacts/sheets_decks_mockup.html#deck
  mock: docs/artifacts/deck_p1_2_mockup.html
  parentDesign: docs/artifacts/deck_p1_1_design.md
  parentMock: docs/artifacts/deck_p1_1_mockup.html
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
  drag-ghost: "#8b5cf680"
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
  queryRefresh: 400ms
  thumbDrop: 180ms
components:
  VantageShell:
    crossfadeDuration: "{motion.vantageCrossfade}"
    editorAttr: data-vantage="editor"
    presentAttr: data-vantage="present"
  QueryViewRegion:
    liveBadgeColor: "{colors.live}"
    refreshPulseColor: "{colors.live-pulse}"
  SlideThumbList:
    dragHandleOpacity: 0.6
    dropIndicatorColor: "{colors.zone-showroom}"
  LayoutPicker:
    gridColumns: 2
    selectedBorder: "{colors.zone-showroom}"
  BodyRegionLease:
    outline: "2px solid {colors.zone-showroom}"
---

# Design: Deck P1.2 — live queryView, thumb reorder, vantage crossfade

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-302 · epic TRL-283  
**Prior shipped:** TRL-300 (Deck P1.1 — queryView static, notes lease, Present route)  
**Mock:** [deck_p1_2_mockup.html](./deck_p1_2_mockup.html) · epic reference: [sheets_decks_mockup.html#deck](./sheets_decks_mockup.html#deck)  
**Baseline:** [deck_p1_1_design.md](./deck_p1_1_design.md) · P1.2 stub in [deck_p1_1_spec.md](./deck_p1_1_spec.md)

---

## Overview

P1.2 completes the **fractal deck projection** loop deferred from P1.1: same slide entity rendered across vantages with smooth transitions, live graph data in queryView, structural editing (thumb reorder), content editing (body lease), and layout selection.

**In scope (P1.2):**

1. **Live queryView** — TQL query from `regions.queryView.query` runs on mount + SSE refresh; tiles/chart update from graph rows (fallback to static demo on empty/error)
2. **Thumb drag-reorder** — sorter rail reorders slides; commits `order` field + deck link metadata
3. **`--vantage` crossfade** — editor ↔ present uses CSS opacity/transform transition (280ms); respects `prefers-reduced-motion`
4. **Body region lease** — third lease target via shared `useEditorLease` (`makeSlideRegionKey(id, 'body')`)
5. **Layout picker grid** — inspector 2×2 grid selects slide layout template; commits `regions.layoutId`

**Out of scope (P1.3+):**

- Multiplayer cursors / Yjs collab
- Second TipTap instance (still one Teleport editor)
- Full sorter vantage (filmstrip-only mode) — chips remain navigation hints only
- Thumb vantage fullscreen (mini preview rail only)

**Demo target:** `entity:deck-yc-s26` — traction slide queryView live-refreshes; problem slide body editable; thumb reorder persists order; Present crossfades from editor.

---

## Colors

| Token | Usage |
| ----- | ----- |
| `{colors.zone-showroom}` | Lease rings (title, body, notes), layout picker selection, drop indicator |
| `{colors.live}` | queryView LIVE badge (steady state) |
| `{colors.live-pulse}` | queryView refresh pulse animation (400ms) |
| `{colors.drag-ghost}` | Semi-transparent thumb ghost during drag |

Inherit P1/P1.1 palette — no fork.

---

## Typography

- **queryView refresh timestamp:** `{typography.mono}` 8px, `{colors.text-faint}`, appended to LIVE badge on refresh
- **Body lease content:** 13px prose, centered in canvas (matches problem slide in mock)
- **Layout picker labels:** 9px mono uppercase

---

## Layout

### Editor vantage (unchanged grid)

```
DeckProjectionFrame [data-vantage="editor"]
├─ SlideThumbList — DRAG enabled (grip ⋮⋮, drop line between thumbs)
├─ SlideCanvas
│   ├─ eyebrow (static)
│   ├─ title lease (P1)
│   ├─ body lease (NEW — problem slide demo)
│   ├─ QueryViewRegion (LIVE TQL — traction slide)
│   └─ layout template drives region stack visibility
├─ SpeakerNotesStrip (P1.1)
└─ DeckInspector
    ├─ LayoutPicker grid (NEW — 2×2)
    ├─ vantage chips (editor active; present triggers crossfade nav)
    └─ Present button
```

### Present vantage (crossfade entry)

```
Dual-shell crossfade wrapper
├─ Editor shell (opacity 1 → 0 during enter present)
└─ Present shell (opacity 0 → 1) — DeckPresentShell
    └─ SlideCanvas readOnly — same slide index preserved
```

**Implementation hint:** Single route with overlay crossfade OR dual-route with shared `useDeckVantageTransition` composable setting `--vantage-transition` on `document.documentElement`. Architect chooses; design requires **visible 280ms crossfade**, not instant swap.

### Layout templates (picker)

| `layoutId` | Regions shown |
| ---------- | ------------- |
| `title` | eyebrow + title only |
| `content` | eyebrow + title + body |
| `two-col` | eyebrow + title + two body columns (stretch — static columns OK P1.2) |
| `live-data` | eyebrow + title + queryView (hides body) |

Default per slide from seed; picker updates `regions.layoutId`.

---

## Elevation & Depth

- **Drag ghost:** elevated thumb clone at 85% opacity, slight scale(1.02)
- **Drop indicator:** 2px `{colors.zone-showroom}` line between thumbs
- **Crossfade:** editor shell fades out while present shell fades in — no flash of white

---

## Shapes

- Layout picker cells: `{rounded.sm}` with mini wireframe icons (from epic mock)
- queryView refresh pulse: subtle scale on LIVE dot only

---

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `QueryViewRegion` | head · tiles · chart | loading, live, refreshing, error, fallback-demo | **Extend** — wire `useTrellisGraph().query()` |
| `SlideThumbList` | thumb + grip + drop slot | default, dragging, drop-target | **Extend** — HTML5 DnD or `@vueuse/core` useDraggable |
| `VantageTransition` | dual shell wrapper | editor, entering-present, present, exiting | **New** composable + CSS vars |
| `LayoutPicker` | 2×2 grid of layout-opt | selected, hover | **New** in `DeckInspector` |
| `SlideCanvas` | + body lease mount | body editing | **Extend** — `makeSlideRegionKey(id, 'body')` |
| `DeckProjectionFrame` | lease handler + layout | 3 lease targets | **Extend** — body commit to `regions.body` |

### Graph model delta

| Field | Change |
| ----- | ------ |
| `regions.layoutId` | `"title" \| "content" \| "two-col" \| "live-data"` |
| `regions.body` | HTML from body lease |
| `slide.order` | Updated on thumb drop |
| `regions.queryView.query` | Executed live via EQL-S |

**Lease keys (three regions, one instance):**

| Region | Key | Commit |
| ------ | --- | ------ |
| title | `\|title` | `regions.title` |
| body | `\|body` | `regions.body` |
| notes | `\|notes` | `speakerNotes` |

---

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Mount traction slide | — | queryView runs TQL; shows loading → live tiles/chart |
| SSE graph mutation | live | queryView re-runs query; LIVE dot pulses 400ms |
| TQL error / empty | live → fallback | Show static demo payload + muted "demo fallback" chip |
| Drag thumb grip | grab → drag → hover drop | Ghost thumb; drop line between targets |
| Drop thumb | dragging → default | Reorder local list; mutate `order` on affected slides |
| Click layout picker cell | — | Update `regions.layoutId`; canvas re-layouts region stack |
| Double-click body region | default → lease | Shared TipTap; commit `regions.body` on blur |
| Click Present / present chip | editor | Crossfade 280ms to present shell; URL → `/present?slide=N` |
| Esc / Exit from present | present | Crossfade back to editor; preserve slide index |
| Title / notes lease (P1.1) | unchanged | Same mutual exclusion with body |

---

## Accessibility

- **Focus order (editor):** tablist (thumbs) → canvas title → body → queryView region → notes → layout picker → inspector
- **Drag-reorder:** each thumb `aria-grabbed` during drag; `aria-dropeffect="move"` on list; keyboard reorder via Alt+↑/↓ (stretch AC — document for Architect)
- **queryView refresh:** `aria-live="polite"` announces "Query refreshed" on SSE (not every poll)
- **Layout picker:** `role="radiogroup"` `aria-label="Slide layout"`; each cell `role="radio"` `aria-checked`
- **Crossfade:** under `prefers-reduced-motion: reduce`, duration 0ms — instant swap OK
- **Body lease:** `aria-label="Slide body"`; same ring pattern as title

---

## Do's and Don'ts

**Do**

- Reuse single `useEditorLease` + one `UiRichTextEditor` Teleport for title, body, and notes
- Mirror layout picker + sorter drag from `sheets_decks_mockup.html` marks 10–11
- Fall back to static demo data when live TQL returns zero rows (dev-friendly)
- Preserve P1.1 Present route; add crossfade as enhancement layer

**Don't**

- Don't add second TipTap instance
- Don't implement multiplayer / collab cursors (P1.3)
- Don't build full sorter or thumb vantages as separate routes in P1.2
- Don't block Present on queryView loading

---

## Wedge boundaries vs P1.3

| P1.2 (this wedge) | P1.3 (future) |
| ----------------- | ------------- |
| Live TQL in queryView | Query builder UI / saved views |
| Thumb drag-reorder | Sorter vantage filmstrip mode |
| Editor ↔ present crossfade | Thumb/sorter vantages as routes |
| Body + layout picker | Multiplayer presence, remote cursors |
| 3 lease regions | Real-time co-editing |

---

## Open for Architect

1. **`useDeckQueryView(slide)`** — composable wrapping EQL-S from `regions.queryView.query`; map rows → tiles/chart schema; SSE debounce ~500ms
2. **Thumb reorder** — `updateSlideOrder(slideId, newOrder)` batch mutate; optimistic UI + SSE reconcile
3. **`useDeckVantageTransition`** — CSS custom properties `--vantage-opacity`, `--vantage-scale`; 280ms ease; reduced-motion guard
4. **Body lease** — extend `parseSlideRegionKey` / lease handler for `body`; commit `regions.body`
5. **`LayoutPicker.vue`** — reads/writes `regions.layoutId`; `SlideCanvas` conditional region stack
6. **Types** — `SlideLayoutId` union; extend `SlideRegions`
7. **Seed** — problem slide `layoutId: "content"`, body HTML; traction `layoutId: "live-data"`
8. **E2e** — drag thumb order assert; layout picker changes visible regions; queryView shows LIVE after load (mock API or seed)
9. **Fallback path** — when TQL fails, keep P1.1 static demo — no user-visible error toast in P1.2

---

## Handoff checklist

- [x] `docs/artifacts/deck_p1_2_design.md` (this file)
- [x] `docs/artifacts/deck_p1_2_mockup.html` (P1.2-scoped interactive mock)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] P1.3 boundary table complete
- [x] Open for Architect enumerated
