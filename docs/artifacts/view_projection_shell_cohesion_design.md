---
version: alpha
name: View Projection Shell Cohesion
description: Design artifact for TRL-27, a TRL-26 child design pass that aligns browse, VCS kanban, and canvas-style projections behind one projection shell grammar.
source:
  parent: TRL-26
  issue: TRL-27
  tool: greenfield
  mock: docs/artifacts/view_projection_shell_cohesion_mockup.html
colors:
  background: "#0b0b0f"
  surface: "#141419"
  surface-raised: "#1b1b22"
  text: "#e9e7ef"
  text-muted: "#8f8a9d"
  primary: "#8b5cf6"
  secondary: "#22d3ee"
  accent: "#f8c471"
  border: "#2b2934"
  success: "#34d399"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: 11px
    fontWeight: 600
    letterSpacing: "0.08em"
  utility:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular"
    fontSize: 10px
    fontWeight: 500
    letterSpacing: "0.04em"
rounded:
  sm: 5px
  md: 10px
  lg: 16px
spacing:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 22px
  xl: 32px
components:
  projectionShell:
    backgroundColor: "{colors.background}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.lg}"
  projectionSpine:
    backgroundColor: "{colors.surface}"
    accentColor: "{colors.primary}"
    width: 52px
  projectionSurface:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.border}"
  inspector:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
---

# Design: View Projection Shell Cohesion

**Status:** Design complete, handoff to Architect  
**Parent:** `TRL-26`  
**Design child:** `TRL-27`  
**Mock:** [view_projection_shell_cohesion_mockup.html](./view_projection_shell_cohesion_mockup.html)

## Overview

`TRL-26` already proved the projection registry and `ProjectionOutlet` dispatch path. The next design move is cohesion: every projection surface should feel like the same instrument, even when the renderer changes from card grid to table, kanban, graph, or deck canvas.

The signature pattern is the **projection spine**: a narrow left-side orientation strip inside the existing `Page.vue` shell. It shows the active projection, available layouts, count/loading state, and a stable escape hatch back to entity context. The renderer body stays visually distinct, but it inherits shell language for switching, empty states, unsupported projections, and inspector handoff.

This should not introduce a second app shell. `Page.vue` remains the host. `ProjectionOutlet` is the renderer switch. Deck canvas and VCS kanban become strong examples of "projection recipes" rather than one-off pages.

## Colors

The palette stays in Trellis dark UI territory, but the projection layer gets a faint optical quality: violet for active layout, cyan for live/capability signals, and warm amber only for "derived view" hints. These colors should be accents, not large fills.

- `background` and `surface` map to current card/page dark surfaces.
- `primary` marks the active projection and selected object.
- `secondary` marks live data and capability-gated availability.
- `accent` marks derived/sub-mode projections, such as calendar month or timeline gantt.

## Typography

Keep body text small and functional. Use utility monospace only for projection IDs, counts, and sub-mode labels. Labels are uppercase because projection names are navigational instruments, not prose.

## Layout

```
Page.vue
  header: title, context, global actions
  projection shell
    projection spine: available layouts + active state
    toolbar: filters, fields, sub-mode controls
    ProjectionOutlet: renderer body
    optional inspector: selected object or renderer-specific properties
```

Desktop default:

- Spine is 52px wide, fixed inside the projection shell.
- Toolbar sits above the renderer body and belongs to `Page.vue` or the recipe, not individual cards.
- Inspector is optional and right-aligned. It appears for object-aware projections like deck canvas and future graph/detail projections.

Narrow screens:

- Spine collapses to a horizontal projection rail above the renderer.
- Inspector becomes a sheet or below-content panel.
- Renderer bodies keep their own scroll region; page header remains stable.

## Elevation & Depth

Use inset hierarchy rather than heavy shadows. The projection shell is a contained workspace. Renderer bodies sit one level deeper than the shell. Inspector panels sit at the same elevation as the spine so they read as controls, not content.

## Shapes

Rounded corners stay modest. The shell uses `lg`, internal cards use `md`, and dense controls use `sm`. Canvas projections may use stronger outlines around selected objects, but those outlines should remain renderer-local.

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| Projection shell | Spine, toolbar, outlet body, optional inspector slot | loading, empty, unsupported, live, read-only | `Page.vue`, `ProjectionOutlet.vue` |
| Projection spine | Icon buttons, active rail, capability status, count chip | active, unavailable, unsupported, hover, focus | new shell layer around existing `viewModeOptions` / registry data |
| Renderer recipe | Renderer component plus optional toolbar/inspector adapters | mounted, empty, filtered, unsupported | `EntityCardCollection`, `BrowseSpreadsheetView`, `BrowseKanbanView`, `GraphView` |
| Canvas recipe | Stage viewport, object selection, inspector | fit, zoom, selected object, editing, read-only | `DeckStageViewport`, `SlideCanvas`, `DeckObjectInspector` |
| Kanban recipe | Filter bar, swimlane/body, count/empty state | filtered, grouped, drag-ready later | `components/vcs/*`, `BrowseKanbanView` |
| Unsupported projection | Icon, plain explanation, next action | unavailable by capability, not implemented | `ProjectionOutlet` fallback |

## Interaction Matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Select projection in spine | supported renderer exists | `ProjectionOutlet` switches `type`, toolbar/inspector adapters update |
| Select projection in spine | known but unsupported for schema | disabled item with reason from capability gating |
| Select projection in spine | known but renderer unavailable | fallback body explains that the view is not wired here yet |
| Toggle table/card/grid | browse data loaded or empty | body swaps without changing selection/filter context |
| Select kanban card or slide object | renderer supports object selection | inspector slot opens with selected object properties |
| Press Escape | inspector open, editor not focused | selection returns to renderer/root object |
| Change sub-mode | calendar/timeline renderer | `sub` changes while `type` remains canonical |
| Empty filter result | any non-graph renderer | one shared empty state from shell/outlet, not duplicated per renderer |

## Accessibility

- Focus order: page header, projection spine, toolbar controls, renderer body, inspector. Shift-tab should reverse cleanly.
- Projection spine buttons need `aria-pressed` for active projection and disabled reason text for unavailable projections.
- `ProjectionOutlet` should expose a live region for "Switched to Table view" and "Showing N items" updates.
- Inspector opening should not steal focus unless opened by keyboard activation.
- Canvas zoom/pan shortcuts must continue to ignore text inputs and rich-text editors.
- Reduced motion: projection transitions use opacity only or no transition under `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Keep `ProjectionType` canonical; use adapters for old route vocabulary.
- Let `Page.vue` own orientation and empty-state rhythm.
- Make object inspectors optional slots, not a hard dependency of all projections.
- Preserve renderer-specific strengths: graph can keep graph stats, deck canvas can keep viewport controls.

**Don't**

- Add another shell beside `Page.vue`.
- Rebuild VCS kanban visuals before proving it can run as a kanban recipe.
- Put sub-modes such as month/week/agenda back into the top-level projection vocabulary.
- Hide unsupported projections without explaining why.

## Open For Architect

- Define the projection shell slot contract: `toolbar`, `inspector`, `empty`, and `unsupported`.
- Decide whether projection spine data comes directly from `PROJECTION_REGISTRY_NODES` or a composed `useProjectionOptions()` helper.
- Specify the renderer recipe interface for optional inspector support.
- Add AC that VCS kanban can be wrapped as a `kanban` recipe without duplicating the browse shell.
- Add AC that deck canvas remains a projection recipe candidate but is not forced into browse until `slide-deck` routing is ready.

## Handoff Checklist

- [x] `docs/artifacts/view_projection_shell_cohesion_design.md`
- [x] `docs/artifacts/view_projection_shell_cohesion_mockup.html`
- [x] Interaction matrix covers view switching, renderer handoff, object inspector, and unsupported projections
- [x] A11y covers focus order, labels, live regions, and reduced motion
- [x] Component anatomy maps to existing shells/components
