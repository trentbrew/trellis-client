# Spec: Graph-native canvas surface P0

**Issue:** TRL-33  
**Status:** Spec ready for Executor  
**Design:** [graph_canvas_surface_design.md](./graph_canvas_surface_design.md)  
**Mock:** [graph_canvas_surface_mockup.html](./graph_canvas_surface_mockup.html)  
**Proposal:** TRL-31  
**Dependency:** TRL-27/28 projection shell (soft — canvas route can ship standalone first)

## Scope

**In (P0):**

- `canvas` document entity type (system tier) with `data.layout` blob
- Route `/canvases/[id]` with Pattern A sidebar (`CanvasesSidebar.vue`)
- `CanvasProjectionFrame` — VueFlow infinite board
- Node kinds: `entity-ref`, `sticky`
- `useSpatialViewport` — extracted/generalized from `useDeckViewport` (d3-zoom gestures)
- Layout persist via graph `updateNode` (debounced 500ms)
- Sidebar DnD: entity → canvas drop creates `entity-ref` node at cursor
- Selection + `CanvasInspector` (right pane)
- Double-click entity node → open existing entity dialog
- Remove node from layout does **not** delete underlying entity
- Vitest: layout reducer + viewport composable smoke
- E2E: `tests/e2e/canvas-surface.spec.ts`

**Out (P0):**

- Edges, groups, freehand, agent nodes
- `ProjectionOutlet` `canvas` shape (defer to P0.5 after TRL-28)
- MCP canvas tools
- Lab home desk
- Viewport on `sessionStorage` only — **P0 uses entity layout persist** (viewport in `data.layout.viewport`)

## Architecture

```
/canvases/[id]
├─ CanvasProjectionFrame.vue
│  ├─ useCanvasBoard(canvasId)        — load/save layout, nodes/edges state
│  ├─ useSpatialViewport(canvasId)    — pan/zoom/fit (from useDeckViewport)
│  ├─ useCanvasSelection()            — selected node id
│  ├─ CanvasToolbar.vue
│  ├─ VueFlow
│  │  ├─ CanvasEntityNode.vue         — entity-ref
│  │  └─ CanvasStickyNode.vue         — sticky
│  ├─ ViewportControls.vue            — reuse deck styling
│  └─ CanvasInspector.vue
├─ CanvasesSidebar.vue                — Pattern A (like DecksSidebar)
└─ create via QuickCreate / sidebar
```

### Component boundaries

| Component / composable | Responsibility |
| ---------------------- | -------------- |
| `useCanvasBoard.ts` | Load canvas entity, map `data.layout` ↔ VueFlow nodes, debounced save. Graph writes only here. |
| `useSpatialViewport.ts` | Pan/zoom/fit via d3-zoom. Reads/writes viewport to board composable (not sessionStorage in P0). |
| `useCanvasSelection.ts` | Selected node id, keyboard delete, clear on canvas click. No graph writes. |
| `CanvasProjectionFrame.vue` | Orchestrates board + viewport + inspector. Wires DnD from shell. |
| `CanvasEntityNode.vue` | Renders compact entity card; emits open. Subscribes to entity via existing live query hook. |
| `CanvasStickyNode.vue` | Inline editable sticky body; emits update to board. |
| `CanvasInspector.vue` | Mirrors selection; Open entity / Remove from canvas / sticky textarea. |

## Types

Add `apps/web/app/types/canvas.ts`:

```ts
export type CanvasNodeKind = 'entity-ref' | 'sticky'

export type CanvasLayoutNode = {
  id: string
  kind: CanvasNodeKind
  x: number
  y: number
  w: number
  h: number
  entityId?: string      // entity-ref only
  body?: string          // sticky only
}

export type CanvasLayout = {
  viewport: { x: number; y: number; zoom: number }
  nodes: CanvasLayoutNode[]
  edges: []              // reserved P1
}

export const EMPTY_CANVAS_LAYOUT: CanvasLayout = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: [],
}
```

Add to `DocumentEntityType` in `entity.ts`: `'canvas'`

## Ontology & registry

1. **`apps/web/app/config/entityRegistry.ts`** — `canvas` entry:
   - class: `document`, icon: `lucide:layout-dashboard`, color: `cyan`
   - projections: `['canvas', 'list', 'table']`, defaultProjection: `'canvas'`
   - dialogShell: `document`, content panel: `CanvasContent` (link to route)

2. **`apps/web/server/utils/trellis-ontologies.ts`** — system ontology field `layout` (`rich_text` or JSON stored as string — follow `slide_deck` regions pattern)

3. **`apps/web/app/lib/projections.ts`** — add `canvas` projection label/icon

## Routes & sidebar

| File | Change |
| ---- | ------ |
| `apps/web/app/pages/canvases/index.vue` | List canvases (reuse deck index pattern) |
| `apps/web/app/pages/canvases/[id].vue` | Host `CanvasProjectionFrame` |
| `apps/web/app/lib/trellis-shell-routes.ts` | Register `/canvases` section |
| `apps/web/app/components/canvas/CanvasesSidebar.vue` | Pattern A sidebar |
| `apps/web/app/lib/sidebar-affordances.ts` | Register canvas affordance |

## VueFlow integration

- Reuse `@vue-flow/core` (already in `GraphView`, `FlowEditor`)
- Custom node types: `canvasEntity`, `canvasSticky`
- `nodesDraggable: true`, `panOnScroll: true`, `zoomOnScroll: false` (match deck — ctrl+wheel zoom)
- Map `CanvasLayoutNode` ↔ VueFlow `Node` in `useCanvasBoard`
- On drag end: update x/y in layout, trigger debounced save

## DnD from sidebar

- Emit `application/x-trellis-entity-id` on sidebar entity drag (if not present, add to `AppSidebar` entity row drag)
- `CanvasProjectionFrame` listens `dragover`/`drop` on viewport
- Drop handler: project cursor to flow coordinates, append `entity-ref` node

## Persistence

```ts
// useCanvasBoard — debounced save
async function saveLayout(layout: CanvasLayout) {
  await mutate.updateNode(canvasId, { layout: JSON.stringify(layout) })
}
```

Load on mount from `getNode(canvasId).data.layout` — parse JSON, fallback `EMPTY_CANVAS_LAYOUT`.

## Stale entity refs

When `entityId` node references deleted entity, render gray "Entity removed" chip — do not auto-remove from layout (user deletes explicitly).

## Files to create

```
apps/web/app/types/canvas.ts
apps/web/app/composables/useCanvasBoard.ts
apps/web/app/composables/useSpatialViewport.ts
apps/web/app/composables/useCanvasSelection.ts
apps/web/app/components/canvas/CanvasProjectionFrame.vue
apps/web/app/components/canvas/CanvasEntityNode.vue
apps/web/app/components/canvas/CanvasStickyNode.vue
apps/web/app/components/canvas/CanvasToolbar.vue
apps/web/app/components/canvas/CanvasInspector.vue
apps/web/app/components/canvas/CanvasesSidebar.vue
apps/web/app/pages/canvases/index.vue
apps/web/app/pages/canvases/[id].vue
apps/web/tests/e2e/canvas-surface.spec.ts
apps/web/app/composables/useCanvasBoard.test.ts
```

## Files to modify

```
apps/web/app/types/entity.ts                    — DocumentEntityType + guards
apps/web/app/config/entityRegistry.ts           — canvas config
apps/web/server/utils/trellis-ontologies.ts     — ontology
apps/web/app/lib/projections.ts                 — projection registry
apps/web/app/lib/trellis-shell-routes.ts        — route + sidebar section
apps/web/app/lib/sidebar-affordances.ts         — affordance registry
apps/web/app/components/app/AppSidebar.vue      — DnD payload (if missing)
```

## Acceptance criteria (TRL-33)

1. `docs/artifacts/graph_canvas_surface_spec.md` exists (this file)
2. User can create canvas entity, open `/canvases/[id]`, add sticky + entity-ref, reload — layout persists
3. `pnpm --filter @trellis/web exec vitest run app/composables/useCanvasBoard.test.ts` passes
4. `pnpm --filter @trellis/web test:e2e tests/e2e/canvas-surface.spec.ts` passes

## E2E outline (`canvas-surface.spec.ts`)

1. Seed or create canvas via API helper
2. Navigate `/canvases/[id]`
3. Click "+ Sticky" — sticky appears
4. Drag sticky — position changes
5. Reload page — sticky position preserved
6. (If DnD wired) Drop entity from sidebar — entity card appears

## Sequencing notes

- **Can ship before TRL-28** as standalone `/canvases` route
- **P0.5:** Register `canvas` shape in `ProjectionOutlet` when TRL-28 shell merges
- **Extract `useSpatialViewport`** by copying `useDeckViewport` and parameterizing storage — optionally refactor deck to use shared composable in follow-up (not blocking)

## Risk mitigations

| Risk | Mitigation |
| ---- | ---------- |
| VueFlow + d3-zoom conflict | Same pattern as deck — d3 on viewport wrapper, VueFlow `fitView` for fit |
| Layout JSON bloat | Cap 200 nodes soft warning in UI |
| SSE storm on many entity nodes | Compact card shows title only; subscribe via existing entity hook (same as kanban cards) |

---

*Architect · TRL-33 · 2026-07-06*
