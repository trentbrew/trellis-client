# Spec: Deck Canvas Editor — pan/zoom stage + selection inspector

**Status:** Spec ready for Executor  
**Design:** [deck_canvas_editor_design.md](./deck_canvas_editor_design.md)  
**Mock:** [deck_canvas_editor_mockup.html](./deck_canvas_editor_mockup.html)  
**Baseline:** Current `/decks/[id]` editor in `DeckProjectionFrame.vue` + `SlideCanvas.vue`  
**Decision:** Pathway A — keep current graph-native `regions.*` model; add a spatial canvas shell and selection-bound inspector.

## Scope

**In:**

- Pannable/zoomable canvas viewport around the 16:9 slide artboard.
- Region selection for existing slide regions: `slide`, `eyebrow`, `title`, `body`, `queryView`.
- Selection-aware right pane replacing `DeckInspector` in the editor route.
- Inline TipTap remains for title/body. Inspector mirrors selected region state and routes mutations through the same `updateSlideRegions()` path.
- QueryView can be selected when present; slide inspector can add/configure queryView by switching to `live-data`.
- Viewport state persists per deck route in `sessionStorage`.
- E2E coverage for viewport controls, selection, and inspector sync.

**Out:**

- Freeform persisted slide elements.
- Drag/resize handles mutating geometry.
- Threlte/Three.js integration.
- Present mode inheriting editor zoom/pan.
- Real multiplayer cursors.

## Architecture

```
DeckProjectionFrame [editor route]
├─ useDeckProjection(deckId)
├─ useDeckSelection(activeSlide)
├─ SlideThumbList
├─ DeckStageViewport
│  ├─ viewport transform state (sessionStorage)
│  ├─ ViewportControls
│  └─ SlideCanvas
│     └─ SelectableSlideRegion wrappers
├─ SpeakerNotesStrip
└─ DeckObjectInspector
   ├─ Slide props
   ├─ Region props
   ├─ Query builder
   └─ Vantage / Present controls
```

### Component boundaries

| Component / composable | Responsibility |
| ---------------------- | -------------- |
| `useDeckSelection.ts` | Own selected slide object, keyboard reset, selection labels. No graph writes. |
| `useDeckViewport.ts` | Own viewport transform, fit/zoom methods, d3-zoom binding, session persistence. No slide knowledge except storage key. |
| `DeckStageViewport.vue` | Viewport chrome + transform shell. Emits no graph mutations. |
| `SlideCanvas.vue` | Render artboard and selectable regions; inline TipTap for title/body; emits `select-object` and `update-regions`. |
| `SelectableSlideRegion.vue` | Selection ring, handles, keyboard semantics for one region. Visual handles only. |
| `DeckObjectInspector.vue` | Right pane for selected object; emits `layout-select`, `query-save`, `update-regions`, `present`. |

## Types

Add to `apps/web/app/types/deck.ts`:

```ts
export type DeckObjectKind = 'slide' | 'eyebrow' | 'title' | 'body' | 'queryView'

export type DeckSelection = {
  slideEntityId: string
  objectId: DeckObjectKind
}

export type DeckViewportTransform = {
  x: number
  y: number
  k: number
}
```

`DeckObjectKind` is intentionally region-based. Do not introduce `slide_element` or `elements[]` yet.

## Data Flow

### Selection

1. `DeckProjectionFrame` creates `selection = useDeckSelection(activeSlide)`.
2. `SlideCanvas` receives `selected-object-id` and emits `select-object` for each region.
3. Clicking artboard background selects `slide`.
4. Changing active slide resets selection to `slide`.
5. `Esc`:
   - If TipTap is focused, let the editor blur/exit first.
   - Otherwise select `slide`.

### Mutations

All content/layout mutations continue through existing `useDeckProjection()` helpers:

- `title` inspector or inline editor → `updateSlideRegions(slideId, { title })`
- `body` inspector or inline editor → `updateSlideRegions(slideId, { body })`
- `eyebrow` inspector → `updateSlideRegions(slideId, { eyebrow })`
- `queryView` inspector → `updateSlideRegions(slideId, { queryView })`
- Slide layout → `updateSlideRegions(slideId, { layoutId })`

Do not create a second mutation path for inspector edits.

### Viewport

`DeckStageViewport` wraps `SlideCanvas`:

```vue
<DeckStageViewport :deck-id="deckId">
  <SlideCanvas ... />
</DeckStageViewport>
```

Viewport transform is UI state:

- Storage key: `deck-canvas:v1:<deckId>`
- Default: fit artboard to viewport with padding `32px`.
- Min zoom `0.25`, max zoom `3`.
- Plain wheel pans.
- `ctrlKey` / `metaKey` wheel and trackpad pinch zoom around pointer.
- Drag empty viewport pans.
- Space + drag pans even when over the artboard.
- Double-click empty viewport fits.
- `0` fits; `1` sets 100%.

Use the d3-zoom pattern already present in `GraphView.vue` rather than inventing a new gesture stack.

## Implementation Plan

### 1. Add selection + viewport composables

Create:

- `apps/web/app/composables/useDeckSelection.ts`
- `apps/web/app/composables/useDeckViewport.ts`

`useDeckSelection` API:

```ts
export function useDeckSelection(activeSlide: Ref<SlideDefinition | null>) {
  const selection = ref<DeckSelection | null>(null)
  const selectedObjectId = computed<DeckObjectKind>(() => selection.value?.objectId ?? 'slide')
  const selectObject = (objectId: DeckObjectKind) => void
  const selectSlide = () => void
  const selectedLabel = computed(() => ...)
  return { selection, selectedObjectId, selectedLabel, selectObject, selectSlide }
}
```

`useDeckViewport` API:

```ts
export function useDeckViewport(options: {
  deckId: Ref<string>
  viewportEl: Ref<HTMLElement | null>
  stageEl: Ref<HTMLElement | null>
}) {
  const transform = ref<DeckViewportTransform>({ x: 0, y: 0, k: 1 })
  const zoomPercent = computed(() => Math.round(transform.value.k * 100))
  const bind = () => void
  const fit = () => void
  const zoomIn = () => void
  const zoomOut = () => void
  const zoomTo100 = () => void
  return { transform, zoomPercent, bind, fit, zoomIn, zoomOut, zoomTo100 }
}
```

### 2. Introduce `DeckStageViewport.vue`

Create `apps/web/app/components/deck/DeckStageViewport.vue`.

Required props/events:

```ts
defineProps<{
  deckId: string
  selectedLabel: string
  slideIndex: number
  slideCount: number
}>()

defineEmits<{
  'select-slide': []
}>()
```

Slots:

- default slot contains the artboard.

DOM requirements:

- Root `role="region"` and `aria-label="Deck canvas"`.
- Background grid is viewport chrome, not inside artboard.
- Controls bottom-left: zoom out, percent, zoom in, fit.
- Top-left breadcrumb chip.
- `aria-live="polite"` selection status can live in frame or viewport.

### 3. Add `SelectableSlideRegion.vue`

Create `apps/web/app/components/deck/SelectableSlideRegion.vue`.

Required props/events:

```ts
defineProps<{
  objectId: DeckObjectKind
  selected: boolean
  readOnly?: boolean
  label: string
}>()

defineEmits<{
  select: [objectId: DeckObjectKind]
  activate: [objectId: DeckObjectKind]
}>()
```

Behavior:

- Use `button` semantics only for non-text wrapper controls where it does not nest interactive TipTap content.
- For text regions, wrapper can be `div role="button" tabindex="0"` to avoid nested button/editor issues.
- `click` selects.
- `Enter` selects and emits `activate`.
- `Esc` is handled at frame level.
- Render four corner handles only when selected. Handles are `aria-hidden="true"`.

### 4. Refactor `SlideCanvas.vue`

Add props:

```ts
selectedObjectId?: DeckObjectKind
```

Add emits:

```ts
'select-object': [objectId: DeckObjectKind]
```

Requirements:

- Wrap `eyebrow`, `title`, `body`, and `queryView` in `SelectableSlideRegion`.
- Title/body TipTap remain inline and continue debounced `update-regions`.
- Clicking inside the title/body editor selects that object before editing.
- Artboard background click selects `slide`.
- In `readOnly` mode, no selection chrome and no inspector-only events.
- QueryView region is selectable when rendered.
- If `layoutId === 'live-data'` and no queryView exists, inspector owns adding one; canvas does not render fake query UI.

### 5. Replace editor route inspector

Create `apps/web/app/components/deck/DeckObjectInspector.vue`.

Props:

```ts
defineProps<{
  slide: SlideDefinition | null
  deckId: string
  deckSlug: string
  activeIndex: number
  selectedObjectId: DeckObjectKind
}>()
```

Emits:

```ts
'layout-select': [layoutId: SlideLayoutId]
'query-save': [config: QueryViewRegionConfig]
'update-regions': [patch: Partial<SlideRegions>]
'present': []
```

Inspector panels:

| `selectedObjectId` | Required fields |
| ------------------ | --------------- |
| `slide` | `LayoutPicker`, `VantageChipNav`, Present button, slide id/order. |
| `eyebrow` | Text input bound to `regions.eyebrow`; visibility clear button. |
| `title` | Compact title field or metadata + clear button; must not fight active inline editor. |
| `body` | Compact body field or metadata + clear button. |
| `queryView` | Existing `QueryBuilderPanel`; if no config, initialize default config on save. |

Preserve `DeckInspector` for sorter/thumb routes or convert it to a thin wrapper around `DeckObjectInspector` with `selectedObjectId="slide"`. Do not break `DeckSorterShell.vue` and `DeckThumbShell.vue`.

### 6. Update `DeckProjectionFrame.vue`

Replace the direct stage wrapper with:

```vue
<DeckStageViewport
  :deck-id="deckId"
  :selected-label="selectedLabel"
  :slide-index="activeIndex"
  :slide-count="slides.length"
  @select-slide="selectSlide"
>
  <SlideCanvas
    ...
    :selected-object-id="selectedObjectId"
    @select-object="selectObject"
  />
</DeckStageViewport>
```

Replace `DeckInspector` with `DeckObjectInspector` in editor route only.

Keep:

- `SlideThumbList`
- `SpeakerNotesStrip`
- `PresenceAvatarStack`
- `createSlide`
- `updateSlideRegions`
- `updateSpeakerNotes`

## Acceptance Criteria

### Behavior

1. `/decks/yc-s26` renders a viewport with grid background, fixed 16:9 artboard, zoom controls, and selection breadcrumb.
2. Wheel without modifier pans the viewport; `Cmd/Ctrl` + wheel or pinch zooms.
3. Zoom controls work: `+`, `−`, `Fit`, and percent display.
4. Clicking title/body/query regions selects them and updates the right inspector header.
5. Clicking artboard background selects `slide`.
6. Inline title/body editing still works and persists through `updateSlideRegions()`.
7. Inspector edits for eyebrow/title/body/queryView use the same `updateSlideRegions()` path.
8. `Esc` returns selection to `slide` when not editing text.
9. Present route remains read-only and does not show viewport grid, selection handles, or inspector.
10. Sorter/thumb routes continue rendering without regressions.

### Accessibility

1. Viewport has `role="region"` + `aria-label="Deck canvas"`.
2. Selectable regions are keyboard reachable and labeled.
3. Selection changes announce through an `aria-live="polite"` element.
4. `prefers-reduced-motion` disables animated fit/zoom transitions.
5. No nested interactive elements cause invalid HTML around TipTap editors.

### Tests

Add/update `apps/web/tests/e2e/deck-projection.spec.ts`:

- `editor viewport controls render and maintain 16:9 artboard`
- `clicking title selects title and shows title inspector`
- `clicking queryView selects query inspector on traction slide`
- `viewport fit and zoom controls update percentage`
- `inline title edit still persists after reload`
- `present route has no canvas editor selection chrome`

Run:

```bash
bunx playwright test tests/e2e/deck-projection.spec.ts --reporter=line
```

Also run lints/type checks available in the repo scripts after implementation.

## Notes for Executor

- Do not mutate slide data for viewport transform. Persist it only in `sessionStorage`.
- Avoid adding freeform geometry fields. The selected-region handles are visual affordances only.
- Keep the existing graph model and route structure.
- Use current `QueryBuilderPanel`, `LayoutPicker`, and `VantageChipNav` rather than rebuilding them.
- If d3 packages are already installed through graph views, reuse them; otherwise implement pointer/wheel transform manually instead of adding a new dependency.

