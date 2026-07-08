# Proposal: Graph-native canvas surface (entity board)

**Issue:** TRL-31  
**Status:** Proposal — handoff to Designer  
**Reference:** Filegraph Home Canvas (`~/turtle/projects/oss/filegraph-desktop/src/features/home/`)  
**Related:** TRL-26/27 (projection shell cohesion), deck canvas (`useDeckViewport`, `DeckStageViewport`)

---

## Problem

Trellis has strong **relational** and **tabular** projections (graph force layout, kanban, spreadsheet, moodboard masonry) but no **user-authored spatial workspace** where entities live at arbitrary x/y positions with persisted layout.

Filegraph solved this with a ReactFlow home dashboard where nodes are file-backed vault refs. Trellis needs the same *spatial desk* affordance, but **graph-native**: nodes reference `entity:*` IDs, layout lives on a canvas entity, and SSE keeps previews live.

Without this, users cannot:

- Arrange project context spatially (tasks + notes + people on one board)
- Drop entities from browse/sidebar onto a persistent desk
- Let agents lay out explain-dont-tell sketches on a board

## Goals (P0)

1. **`canvas` document entity type** — first-class alongside `page`, `slide_deck`, `sheet`
2. **VueFlow board route** — `/canvases/[id]` or `/workspace/canvases/[id]`
3. **Entity-ref nodes** — positioned cards pointing at graph entities; double-click opens dialog
4. **Sticky nodes** — inline text, no entity backing (stored in layout blob)
5. **Viewport persist** — pan/zoom saved on canvas entity (or sessionStorage fallback for M0)
6. **Sidebar DnD** — drag entity → drop on canvas creates ref node at cursor
7. **Projection recipe** — `canvas` shape in `ProjectionOutlet` when viewing canvas collections (post TRL-28 shell)

## Non-goals (P0)

- Freehand drawing, terminals, agent chat nodes
- Edges between nodes (P1)
- Group/frame nodes (P1)
- Lab home desk replacing `/home` chat (P2)
- Agent `.sketch` ephemeral tier (P2)
- Mutating entity position on referenced entities (layout stays on canvas only)

## Architecture sketch

```
canvas entity (document class, type: canvas)
  data.layout: {
    viewport: { x, y, zoom },
    nodes: [{ id, kind: 'entity-ref'|'sticky', entityId?, x, y, w, h, body? }],
    edges: []   // P1
  }

CanvasProjectionFrame (new)
  useSpatialViewport (extract from useDeckViewport)
  VueFlow + Background + MiniMap + Controls
  CanvasEntityNode | CanvasStickyNode
  CanvasObjectInspector (selection → entity props or sticky body)
  CanvasToolbar (add sticky, fit, zoom)

Page.vue shell (TRL-27 spine) — host when opened from workspace
```

## Dependency: TRL-27 projection shell

Canvas should **not** invent a second app shell. It mounts inside `Page.vue` with the projection spine from TRL-27 where applicable. Deck canvas and VCS kanban are reference recipes — canvas is another projection with spatial viewport chrome.

**Sequencing:** Design now; spec/impl can start in parallel with TRL-28 close if shell contracts are stable (`ProjectionOutlet`, `Page.vue` toolbar slots).

## Phasing

| Phase | Deliverable |
|-------|-------------|
| **P0** | Entity type + route + VueFlow + entity-ref + sticky + DnD + viewport persist |
| **P1** | Edges, groups, align/distribute, dagre layout, selection inspector parity with deck |
| **P2** | Lab desk surface, agent sketch artifact, MCP canvas tools |

## Success criteria

- User creates a canvas, drops 3 entities from sidebar, arranges them, reloads — layout persists
- Entity card on canvas updates when underlying entity mutates (SSE)
- Canvas appears in sidebar under WORKSHOP (Pattern A or workspace specialItems)
- E2E: create canvas, add node, pan, persist reload

## Open decisions (Designer → Architect)

1. Route: `/canvases/[id]` vs nested under `/workspace/canvas/[id]`
2. Node chrome: `EntityCard` thumb vs compact chip at default zoom
3. Inspector: right pane vs bottom sheet on narrow viewports
4. Ontology tier: `system` vs `user` for canvas type

## Pathway

**Recommend B — next wedge:** Queue design (TRL-32) now; stack spec after TRL-28 shell lands or in parallel if contracts frozen.

---

*Strategist · TRL-31 · 2026-07-06*
