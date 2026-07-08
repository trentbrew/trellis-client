---
version: alpha
name: Deck Canvas Editor — pan/zoom stage + selection inspector
description: Design artifact for deck editor canvas pivot — spatial 16:9 artboard, selectable slide regions, and right-pane properties
source:
  tool: derived
  url: /Users/trentbrew/turtle/projects/sandbox/threlte-skeleton
  mock: docs/artifacts/deck_canvas_editor_mockup.html
  parentDesign: docs/artifacts/deck_p1_3_design.md
colors:
  background: "#09090b"
  viewport: "#0b0b0f"
  surface: "#141418"
  surface-2: "#1a1a21"
  surface-3: "#202028"
  text: "#e8e8ec"
  text-muted: "#8b8b96"
  text-faint: "#585862"
  border: "#2a2a32"
  artboard: "#0d0d11"
  grid-major: "#24242b"
  grid-minor: "#17171c"
  primary: "#8b5cf6"
  selection: "#a78bfa"
  query: "#34d399"
  warning: "#f59e0b"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  slideTitle:
    fontFamily: IBM Plex Sans
    fontSize: clamp(22px, 4.4cqw, 40px)
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
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
motion:
  selectionPulse: 140ms
  viewportFit: 220ms
  inspectorSwap: 120ms
components:
  DeckStageViewport:
    minZoom: 0.25
    maxZoom: 3
    defaultZoom: fit
    gestures: "wheel-pan ctrl-wheel-zoom pinch-zoom space-drag-pan"
  DeckObjectSelection:
    objects: "slide title body eyebrow queryView"
    selectedRing: "{colors.selection}"
    handles: 8
  DeckObjectInspector:
    tabs: "Props Slide Query Graph"
    emptyState: "Select an object"
  DeckViewportControls:
    position: "bottom-left"
    actions: "zoom-out zoom-percent zoom-in fit"
---

# Design: Deck Canvas Editor — pan/zoom stage + selection inspector

**Status:** Design complete (handoff to Architect)  
**Strategist decision:** Pathway A — canvas shell + selection inspector  
**Editing model:** Both — click selects; inline TipTap remains for text; inspector mirrors region fields  
**Mock:** [deck_canvas_editor_mockup.html](./deck_canvas_editor_mockup.html)  
**Baseline:** [deck_p1_3_design.md](./deck_p1_3_design.md)

---

## Overview

The deck editor should stop feeling like a document projection and start feeling like a spatial authoring surface: a 16:9 artboard sits inside a pannable, zoomable viewport; slide regions behave like selectable objects; the right pane edits the selected object’s properties.

This design intentionally borrows the threlte-skeleton shell model:

- **Viewport owns spatial navigation** — pan, zoom, fit, and persistent transform.
- **Selection owns the inspector** — selecting an object changes the right pane.
- **Object properties are explicit** — the right pane explains what can be changed without requiring direct canvas manipulation for every edit.

This pass does **not** introduce freeform elements yet. Existing slide regions become first-class selectable objects with stable ids: `slide`, `title`, `body`, `eyebrow`, `queryView`.

---

## Colors

| Token | Usage |
| ----- | ----- |
| `{colors.viewport}` | Infinite canvas well behind the artboard |
| `{colors.grid-minor}` / `{colors.grid-major}` | Subtle alignment grid in the viewport, not on the slide |
| `{colors.artboard}` | 16:9 slide surface |
| `{colors.selection}` | Selected region ring, handles, inspector active state |
| `{colors.query}` | QueryView object accent and Query tab |

Palette remains Trellis dark/showroom but adds a clear distinction between **world** (viewport) and **artifact** (artboard).

---

## Typography

- **Viewport chrome:** `{typography.mono}` for zoom %, selection breadcrumbs, and fit controls.
- **Slide title/body:** existing `SlideCanvas` TipTap typography, scaled with container units.
- **Inspector labels:** `{typography.mono}` 10px uppercase for field groups, plain sentence-case controls for user actions.

---

## Layout

### Editor shell

```
DeckProjectionFrame
├─ SlideThumbList          fixed left rail
├─ DeckStageViewport       flex canvas well
│  ├─ ViewportControls     bottom-left
│  ├─ SelectionBreadcrumb  top-left
│  └─ SlideArtboard        transformed by pan/zoom
│     └─ SelectableRegion  title/body/eyebrow/queryView
├─ SpeakerNotesStrip       compact bottom strip below viewport
└─ DeckObjectInspector     right pane
```

The artboard itself remains `aspect-ratio: 16 / 9`. The viewport may be any shape and never stretches the artboard.

### Stage proportions

| Zone | Behavior |
| ---- | -------- |
| Thumbnail rail | Same as current; `New slide` remains pinned bottom |
| Viewport | Takes available middle space; pan/zoom state local to deck route |
| Right inspector | 240–280px, selection-bound, scrolls internally |
| Notes | Compact strip under viewport; not affected by zoom |

### Viewport controls

Bottom-left cluster:

- `−` zoom out
- `72%` zoom percentage button resets to 100%
- `+` zoom in
- `Fit` fits the full 16:9 slide into available viewport

Top-left chip:

- Empty selection: `Slide · 3 / 7`
- Region selected: `Slide · 3 / 7 / Title`

---

## Components

### `DeckStageViewport`

Responsible for pan/zoom and coordinate space only. It should not know how to mutate slide content.

**Gestures:**

| Input | Behavior |
| ----- | -------- |
| Wheel | Pan x/y |
| Trackpad pinch / `Ctrl` or `Cmd` + wheel | Zoom around pointer |
| Space + drag | Pan |
| Drag empty viewport | Pan |
| Double-click empty viewport | Fit artboard |
| `0` | Fit artboard |
| `1` | Zoom 100% |

Implementation can reuse `GraphView.vue`’s d3-zoom pattern: plain wheel pans; modified wheel zooms; double-click zoom is disabled.

### `useDeckSelection`

Small route-local composable:

```ts
type DeckObjectKind = 'slide' | 'title' | 'body' | 'eyebrow' | 'queryView'

type DeckSelection = {
  slideEntityId: string
  objectId: DeckObjectKind
}
```

Defaults to `{ objectId: 'slide' }`. `Esc` returns to slide selection. Selecting a new slide resets to slide selection unless the same object exists on the next slide and keyboard navigation preserves it.

### `SelectableSlideRegion`

Wrapper around each editable/rendered region:

- `button` semantics when not actively editing text
- selection ring and eight small handles when selected
- `Enter` starts inline edit for text regions
- Double-click starts inline edit for text regions
- QueryView selection opens Query tab in inspector

Handles are visual in this wedge; drag-resize is reserved for freeform object canvas.

### `DeckObjectInspector`

Right pane swaps based on selection:

| Selection | Inspector contents |
| --------- | ------------------ |
| `slide` | Layout picker, background/theme placeholder, vantage, present |
| `title` | Text HTML preview, alignment, size token, clear title |
| `body` | Text HTML preview, alignment, content layout |
| `eyebrow` | Text input, visibility toggle |
| `queryView` | Existing QueryBuilderPanel fields plus viz mode |

Inspector fields and inline TipTap write to the same `updateSlideRegions()` path.

---

## Interaction Matrix

| State | User input | Output |
| ----- | ---------- | ------ |
| Nothing selected | Click artboard background | Select slide |
| Slide selected | Click title region | Select title; inspector shows title props |
| Title selected | Type in inline editor | Debounced `regions.title` update |
| Title selected | Edit title in inspector | Same `regions.title` update; canvas mirrors |
| QueryView selected | Save query in inspector | `regions.queryView` update |
| Any object selected | `Esc` | Select slide |
| Empty viewport | Wheel | Pan |
| Empty viewport | `Cmd/Ctrl` + wheel or pinch | Zoom |
| Empty viewport | Double-click | Fit artboard |

---

## Accessibility

- `DeckStageViewport` is `role="region"` with `aria-label="Deck canvas"`.
- Selectable regions expose `aria-label` like `Title object`, `Body object`, `Query view object`.
- Selection changes announce via an `aria-live="polite"` status: `Selected title on slide 3`.
- Inspector tab order follows visual order: viewport controls → artboard regions → inspector fields → notes.
- Keyboard fallback:
  - `Tab` moves through selectable regions.
  - `Enter` selects / begins text edit.
  - `Esc` exits text edit or returns to slide selection.
  - `0` fits viewport; `1` zooms to 100%.
- Respect `prefers-reduced-motion`: fit and zoom controls jump instead of animating.

---

## Open for Architect

1. Should viewport transform persist in `sessionStorage` per deck route, similar to threlte-skeleton’s `editorSession`, or use Vue state only for P1?
2. Should selection live in a new `useDeckSelection()` composable or inside `DeckProjectionFrame` until freeform elements arrive?
3. Should inspector text fields store raw HTML, plain text with HTML wrapping, or reuse compact `UiRichTextEditor` inside inspector?
4. Should `queryView` be selectable only when present, or should the inspector allow adding a query object to any slide?

Recommended defaults:

- Persist viewport transform in `sessionStorage` with versioned key: `deck-canvas:<deckId>`.
- Create `useDeckSelection()` now; it will be reused by freeform objects later.
- Use `UiRichTextEditor` for title/body inspector fields only if inline editing is not active; otherwise show region metadata and controls.
- Allow adding QueryView from slide selection by changing layout to `live-data`.

---

## Do's and Don'ts

**Do**

- Treat zoom/pan as viewport state, not slide data.
- Keep the slide a real 16:9 artboard at all zoom levels.
- Let click select first; text editing starts on double-click, Enter, or direct editor focus.
- Keep inspector state explainable and selection-bound.

**Don’t**

- Add freeform object persistence in this wedge.
- Reintroduce mock agent cursors.
- Make Present mode inherit editor pan/zoom.
- Stretch or scroll the artboard itself to fit the available panel.

