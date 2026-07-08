# Spec: Deck P1.2 — live queryView, thumb reorder, vantage crossfade (TRL-304)

**Parent design:** TRL-303  
**Proposal:** TRL-302 · epic TRL-283  
**Prior impl:** TRL-300 (closed)  
**Design:** [deck_p1_2_design.md](./deck_p1_2_design.md) · [deck_p1_2_mockup.html](./deck_p1_2_mockup.html)  
**Baseline:** [deck_p1_1_spec.md](./deck_p1_1_spec.md)

## Scope

**In:** Live TQL in `QueryViewRegion`, thumb drag-reorder, `--vantage` 280ms editor↔present crossfade, body region lease, layout picker grid, e2e harden.

**Out (P1.3):** multiplayer cursors, sorter/thumb vantages as routes, query builder UI, second TipTap instance, keyboard Alt+↑/↓ reorder (stretch only).

**Demo:** `entity:deck-yc-s26` — traction queryView live-refreshes; problem slide body editable; thumbs reorderable; Present crossfades.

---

## Architecture

```
DeckProjectionFrame [data-vantage="editor"]
├─ useDeckProjection (+ updateSlideOrder, updateLayoutId)
├─ useDeckQueryView (per active slide with queryView)
├─ useDeckVantageTransition (280ms crossfade wrapper)
├─ SlideThumbList — HTML5 DnD reorder
├─ SlideCanvas — layoutId-driven region stack + body lease
├─ QueryViewRegion — live TQL + demo fallback
├─ SpeakerNotesStrip (P1.1)
└─ DeckInspector
    └─ LayoutPicker (NEW 2×2)

/decks/[slug]/present — crossfade enter/exit via useDeckVantageTransition
```

### Type delta

```ts
export type SlideLayoutId = 'title' | 'content' | 'two-col' | 'live-data'

export type SlideRegions = {
  eyebrow?: string
  title?: string
  body?: string
  layoutId?: SlideLayoutId
  queryView?: QueryViewRegionConfig
}
```

**Flattened EAV:** `regions.layoutId` string; existing `regions.*` pattern unchanged.

### Live queryView

**Composable:** `useDeckQueryView(slideEntityId, config)`

| Phase | Behavior |
| ----- | -------- |
| mount | Run EQL-S from `config.query` via `useTrellisGraph().query()` |
| SSE | Debounce refresh ~500ms on `graphVersion` bump when slide active |
| map | Map rows → tiles/chart using `lib/deck-query-view-map.ts` (demo-friendly schema) |
| empty/error | Fall back to `getQueryViewDemoData(slideEntityId)` + muted `demo fallback` chip |
| UI | LIVE dot pulse 400ms on refresh; `aria-live="polite"` "Query refreshed" |

**Do not** block Present route on query loading.

### Thumb drag-reorder

**Extend** `SlideThumbList.vue`:

- Grip `⋮⋮` on each thumb; `draggable="true"`
- Drop indicator line between thumbs
- On drop: call `updateSlideOrder(reorderedIds: string[])` in `useDeckProjection`
- Optimistic local reorder; SSE reconcile
- Mutate each affected slide's `order` field (1-based int)

### Vantage crossfade

**Composable:** `useDeckVantageTransition()`

```css
:root {
  --vantage-duration: 280ms;
  --editor-opacity: 1;
  --present-opacity: 0;
}
[data-vantage="present"] {
  --editor-opacity: 0;
  --present-opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  :root { --vantage-duration: 0ms; }
}
```

Wrap editor shell + present overlay in `DeckVantageShell.vue` OR apply transition on route change between `[id]/index.vue` and `[id]/present.vue` via shared composable + `Teleport`. **Requirement:** visible 280ms crossfade, not instant swap.

Present navigation from inspector still uses `/decks/${slug}/present?slide=N`; exit crossfades back to editor preserving index.

### Body lease (third region)

| Region | Key | Commit |
| ------ | --- | ------ |
| body | `makeSlideRegionKey(id, 'body')` | `regions.body` via `updateSlideRegions` |

Extend lease handler in `DeckProjectionFrame` — mutual exclusion with title/notes (existing `useEditorLease`).

`SlideCanvas`: body lease mount when `layoutId` is `content` or `two-col`; `aria-label="Slide body"`.

### Layout picker

**New:** `LayoutPicker.vue` in inspector

- `role="radiogroup"` `aria-label="Slide layout"`
- 2×2 grid: `title`, `content`, `two-col`, `live-data`
- On select: `updateSlideRegions(slideId, { layoutId })`
- `SlideCanvas` renders region stack per layout table in design doc

**two-col P1.2:** static two-column body split OK (no live column resize).

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/types/deck.ts` | **extend** — `SlideLayoutId`, `layoutId?` |
| `apps/web/app/lib/deck-query-view-map.ts` | **add** — row → tiles/chart mapper |
| `apps/web/app/composables/useDeckQueryView.ts` | **add** |
| `apps/web/app/composables/useDeckVantageTransition.ts` | **add** |
| `apps/web/app/composables/useDeckProjection.ts` | **extend** — `updateSlideOrder`, parse `layoutId` |
| `apps/web/app/components/deck/LayoutPicker.vue` | **add** |
| `apps/web/app/components/deck/DeckVantageShell.vue` | **add** (optional wrapper) |
| `apps/web/app/components/deck/QueryViewRegion.vue` | **extend** — live data + fallback chip |
| `apps/web/app/components/deck/SlideThumbList.vue` | **extend** — DnD reorder |
| `apps/web/app/components/deck/SlideCanvas.vue` | **extend** — body lease, layoutId stack |
| `apps/web/app/components/deck/DeckProjectionFrame.vue` | **extend** — body lease handler, queryView hook |
| `apps/web/app/components/deck/DeckInspector.vue` | **extend** — LayoutPicker |
| `apps/web/app/pages/decks/[id]/index.vue` | **extend** — vantage shell wrapper |
| `apps/web/app/pages/decks/[id]/present.vue` | **extend** — crossfade exit |
| `apps/web/scripts/seed-deck-demo.mjs` | **extend** — layoutId + problem body HTML |
| `apps/web/tests/e2e/deck-projection.spec.ts` | **extend** — layout picker, LIVE region |

**Do not add:** multiplayer, second TipTap, sorter vantage route.

---

## Seed delta

**Problem slide (`entity:slide-yc-problem`):**

```json
{
  "regions.layoutId": "content",
  "regions.body": "<p>Files are blobs; every app rebuilds the same graph.</p>"
}
```

**Traction slide:**

```json
{
  "regions.layoutId": "live-data"
}
```

Query string unchanged from P1.1 seed.

---

## Verification

```bash
bun apps/web/scripts/seed-deck-demo.mjs
pnpm --dir apps/web exec playwright test tests/e2e/deck-projection.spec.ts --project=chromium
# Manual: traction LIVE refreshes on graph mutate
# Manual: drag thumb 3 → 1, reload, order persists
# Manual: layout picker content → body lease visible
# Manual: Present crossfade 280ms
```

---

## Acceptance criteria (TRL-304)

1. Traction `QueryViewRegion` runs live TQL on mount; falls back to demo on empty/error with chip.
2. SSE graph mutation re-runs active slide queryView (debounced).
3. Thumb drag-reorder updates `order` on affected slides; persists after reload.
4. Body region editable via shared lease on `content` layout; commits `regions.body`.
5. Layout picker switches visible regions per `layoutId`.
6. Present enter/exit uses 280ms crossfade (`prefers-reduced-motion: reduce` → instant).
7. E2e: layout picker switches to `live-data`, queryView region visible.
8. E2e: P1.1 regression tests still pass.
9. No multiplayer or second TipTap in wedge.

---

## P1.3 stub

Multiplayer cursors, sorter/thumb vantages as routes, query builder UI, keyboard reorder.
