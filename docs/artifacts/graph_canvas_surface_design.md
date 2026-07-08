---
version: alpha
name: Graph-native canvas surface
description: Design artifact for TRL-32 — graph-native spatial board with entity-ref nodes, sticky notes, and projection shell integration
source:
  tool: greenfield
  parent: TRL-31
  issue: TRL-32
  reference: filegraph-desktop Home Canvas
  mock: docs/artifacts/graph_canvas_surface_mockup.html
colors:
  background: "#0b0b0f"
  viewport: "#09090b"
  surface: "#141418"
  surface-raised: "#1a1a21"
  surface-overlay: "#202028"
  text: "#e8e8ec"
  text-muted: "#8b8b96"
  text-faint: "#585862"
  border: "#2a2a32"
  grid-dot: "#1e1e26"
  primary: "#8b5cf6"
  selection: "#a78bfa"
  sticky: "#fef08a"
  sticky-text: "#422006"
  live: "#34d399"
  destructive: "#ef4444"
typography:
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  nodeTitle:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
  utility:
    fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace"
    fontSize: 10px
    fontWeight: 500
    letterSpacing: 0.06em
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
  xl: 32px
components:
  canvasViewport:
    backgroundColor: "{colors.viewport}"
    dotColor: "{colors.grid-dot}"
    minZoom: 0.15
    maxZoom: 2.5
  entityNode:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.md}"
    selectedRing: "{colors.selection}"
    width: 220px
  stickyNode:
    backgroundColor: "{colors.sticky}"
    textColor: "{colors.sticky-text}"
    borderRadius: "{rounded.sm}"
    width: 180px
  canvasToolbar:
    backgroundColor: "{colors.surface-overlay}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.pill}"
  canvasInspector:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    width: 280px
  viewportControls:
    position: bottom-left
    backgroundColor: "{colors.surface-overlay}"
---

# Design: Graph-native canvas surface

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-31  
**Mock:** [graph_canvas_surface_mockup.html](./graph_canvas_surface_mockup.html)  
**Baseline:** TRL-27 projection shell · deck canvas (`DeckStageViewport`) · Filegraph Home Canvas

---

## Overview

The canvas surface is Trellis's **spatial desk** — an infinite pan/zoom board where nodes are **live graph entity references** or lightweight sticky notes. Unlike the relational `GraphView` (auto force layout) or `moodboard` (CSS columns), this is **authoritative x/y layout** persisted on a `canvas` document entity.

Visual posture matches existing dark Trellis UI: inset surfaces, violet selection, dot-grid viewport. The board mounts inside **`Page.vue`** with the TRL-27 projection spine when opened from workspace; standalone `/canvases/[id]` uses the same frame without a second app shell.

Density is **medium** — entity nodes show title + type chip + 1–2 visible fields (reuse `EntityCard` compact mode). Stickies are warm yellow for contrast against cool dark viewport.

## Colors

- **viewport** — infinite board background; dot grid at 24px pitch
- **surface** — entity node chrome; matches card surfaces elsewhere
- **primary / selection** — active node ring, toolbar accent, spine active projection
- **sticky** — only warm fill in the canvas layer; sticky text is dark brown for WCAG on yellow
- **live** — SSE pulse dot on entity nodes when remote mutation lands (subtle, 400ms fade)

## Typography

Body 13px for inspector and toolbar. Node titles 12px semibold. Utility mono for zoom %, node kind labels, canvas entity id in header breadcrumb.

## Layout

```
Page.vue (TRL-27 shell when from workspace)
├─ header: breadcrumb (Workspace › My Project Board), canvas title inline-editable
├─ projection spine (optional): back to collection / sibling projections
├─ CanvasProjectionFrame (flex-1 min-h-0)
│  ├─ CanvasToolbar (floating top-center): + sticky · fit · zoom · add entity
│  ├─ VueFlow viewport (flex-1)
│  │  ├─ EntityRefNode × n
│  │  └─ StickyNode × n
│  ├─ ViewportControls (bottom-left): − · 100% · + · fit
│  └─ CanvasInspector (right, 280px, collapsible)
│     ├─ empty: "Select a node"
│     ├─ entity-ref: title, type, pinned fields, Open entity
│     └─ sticky: textarea body, delete
└─ status strip: node count · last saved · live indicator
```

**Responsive:** Inspector collapses to bottom sheet below 1024px. Toolbar stays top-center; viewport controls stay bottom-left.

## Elevation & Depth

Viewport is deepest (inset). Nodes float one level up with `border border-border/60`. Selected node gets 2px `{colors.selection}` ring + subtle shadow. Toolbar and viewport controls use `surface-overlay` with backdrop blur — same language as deck viewport controls.

## Shapes

Entity nodes: `{rounded.md}`. Stickies: `{rounded.sm}` with slight rotation optional on create (−1° to 1°). Toolbar pills: `{rounded.pill}`.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `CanvasProjectionFrame` | toolbar + viewport + inspector | loading, empty, editing | new; pattern from `DeckProjectionFrame` |
| `useSpatialViewport` | pan, zoom, fit, persist | fit-to-nodes, user transform | extract from `useDeckViewport` |
| `CanvasEntityNode` | card chrome, handles, live dot | default, selected, hover, stale-ref | wraps `EntityCard` compact |
| `CanvasStickyNode` | yellow body, resize handle | default, selected, editing | new |
| `CanvasToolbar` | add actions | default, disabled-no-selection | new |
| `CanvasInspector` | right pane | empty, entity, sticky | pattern from `DeckObjectInspector` |
| `ViewportControls` | zoom cluster | — | reuse deck controls styling |

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Wheel (no modifier) | viewport | Pan |
| Ctrl/Cmd + wheel | viewport | Zoom toward cursor |
| Space + drag | viewport | Pan |
| Click node | any | Select; inspector updates |
| Double-click entity node | entity-ref | Open `EntityDialog` |
| Drag node | selected/unselected | Move; debounced layout save |
| Drag from sidebar entity | canvas hover | Drop creates entity-ref at cursor |
| Toolbar "+ Sticky" | viewport | Sticky at viewport center |
| Toolbar "Fit" | ≥1 node | `fitView` with padding |
| Delete / Backspace | node selected | Remove from layout (not delete entity) |
| Pinch | touch | Zoom (reuse deck gesture policy) |

## Accessibility

- **Focus order:** toolbar → first node (tab cycle) → inspector → viewport controls
- **Labels:** nodes `aria-label="{title}, {type} entity"`; stickies `aria-label="Sticky note"`
- **Live region:** `aria-live="polite"` on status strip for save confirmations
- **Motion:** respect `prefers-reduced-motion` — disable live pulse, shorten fit animation to 0ms

## Do's and Don'ts

**Do**

- Persist layout on the canvas entity via graph mutate
- Keep entity content on referenced entities — canvas only stores refs + geometry
- Reuse VueFlow already in `GraphView` / `FlowEditor`
- Show stale-ref state when entity deleted elsewhere

**Don't**

- Delete underlying entities when removing canvas nodes
- Replace `/home` chat with canvas in P0
- Duplicate Page.vue shell — mount inside TRL-27 spine
- Conflate with GraphView relational projection

## Open for Architect

1. **Entity schema:** `type: canvas`, `data.layout` JSON shape — confirm field names and max node count guard
2. **Route:** prefer `/canvases/[id]` with sidebar Pattern A (route-owned panel) vs workspace nested path
3. **Save strategy:** debounce 500ms mutate vs op batching; optimistic local + SSE reconcile
4. **Ontology registration:** `system` tier in `entityRegistry.ts` + `trellis-ontologies.ts`
5. **E2E scope:** create canvas, drop entity, pan, reload persist — Playwright selectors for VueFlow nodes
6. **MCP tools (P1 defer):** `get_canvas`, `add_canvas_node`, `layout_canvas`

## Handoff checklist

- [x] `docs/artifacts/graph_canvas_surface_design.md`
- [x] `docs/artifacts/graph_canvas_surface_mockup.html`
- [x] Interaction matrix + a11y + component anatomy
- [x] TRL-27 / deck baseline references
