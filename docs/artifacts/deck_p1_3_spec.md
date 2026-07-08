# Spec: Deck P1.3 — sorter/thumb vantages, query builder, presence (TRL-309)

**Parent design:** TRL-308  
**Proposal:** TRL-307 · epic TRL-283  
**Prior impl:** TRL-305 (closed)  
**Design:** [deck_p1_3_design.md](./deck_p1_3_design.md) · [deck_p1_3_mockup.html](./deck_p1_3_mockup.html)  
**Baseline:** [deck_p1_2_spec.md](./deck_p1_2_spec.md)

## Scope

**In:** Sorter + thumb vantage routes, navigable vantage chips, query builder panel, keyboard Alt+↑/↓ reorder, lightweight presence (avatars + cursor stub), e2e harden.

**Out (P1.4):** Yjs co-editing, WebRTC cursor sync, EQL-S autocomplete/schema browser, bulk multi-select reorder in sorter, second TipTap instance.

**Demo:** `entity:deck-yc-s26` — `/decks/yc-s26/sorter` filmstrip; `/decks/yc-s26/thumb` preview; query builder saves traction queryView; Alt+↓ reorders; avatar stack + demo remote cursor on editor canvas.

---

## Architecture

```
/decks/[slug]              → DeckProjectionFrame [data-vantage="editor"]     (P1.2)
/decks/[slug]/sorter       → DeckSorterShell    [data-vantage="sorter"]     (NEW)
/decks/[slug]/thumb        → DeckThumbShell     [data-vantage="thumb"]      (NEW)
/decks/[slug]/present      → DeckPresentShell   [data-vantage="present"]    (P1.2)

Shared data layer (all vantages):
├─ useDeckProjection
├─ useEditorLease (single Teleport — unchanged)
├─ useDeckQueryView
├─ useDeckVantageTransition (editor↔present crossfade — unchanged)
├─ useDeckKeyboardReorder (NEW)
└─ useDeckPresence (NEW — stub)

DeckInspector (extended)
├─ LayoutPicker (P1.2)
├─ VantageChipNav (NEW — NuxtLink quad)
├─ QueryBuilderPanel (NEW — when queryView or live-data layout)
└─ Present button

DeckSorterShell
├─ SlideFilmstrip (NEW — horizontal DnD, 128×72 thumbs)
├─ SlideCanvas mini preview (read-only default)
├─ SpeakerNotesStrip (one-line collapsed OK)
└─ DeckInspector

DeckThumbShell
├─ SlideThumbList variant="narrow" (96px rail, no grip)
├─ SlideCanvas enlarged preview (read-only default)
└─ DeckInspector

Frame bar (editor, sorter, thumb)
└─ PresenceAvatarStack (NEW)
    └─ RemoteCursorOverlay on SlideCanvas (editor only, stub)
```

### Route helpers

**Extend** `apps/web/app/lib/deck-routes.ts`:

```ts
export function deckSorterPathFromEntityId(entityId: string, slideIndex = 0): string
export function deckThumbPathFromEntityId(entityId: string, slideIndex = 0): string
export function deckEditorPathFromEntityId(entityId: string, slideIndex = 0): string
export type DeckVantageRoute = 'editor' | 'sorter' | 'thumb' | 'present'
export function activeDeckVantageFromPath(path: string): DeckVantageRoute
```

All vantage routes preserve `?slide=N` query param (same as P1.2 present).

### Vantage route transition

**Extend** `deck-vantage.css`:

```css
:root { --vantage-route-duration: 220ms; }
@media (prefers-reduced-motion: reduce) {
  :root { --vantage-route-duration: 0ms; }
}
.deck-vantage-enter-active,
.deck-vantage-leave-active {
  transition: opacity var(--vantage-route-duration) ease;
}
```

Apply `pageTransition: { name: 'deck-vantage', mode: 'out-in' }` on new sorter/thumb pages (match P1.2 index/present).

### VantageChipNav

**New:** `VantageChipNav.vue` (or inline in `DeckInspector`)

| Chip | Target |
| ---- | ------ |
| thumb | `deckThumbPathFromEntityId(deckId, activeIndex)` |
| sorter | `deckSorterPathFromEntityId(deckId, activeIndex)` |
| editor | `deckEditorPathFromEntityId(deckId, activeIndex)` |
| present | `goPresent()` + `deckPresentPathFromEntityId` (P1.2) |

- `role="tablist"` `aria-label="Deck vantage"`
- Each chip: `NuxtLink` or button (present only) with `aria-current="page"` when `$route.path` matches
- Replace static non-navigating chips in `DeckInspector`

### Sorter vantage

**New:** `DeckSorterShell.vue` + `SlideFilmstrip.vue`

- Horizontal scroll filmstrip; thumbs 128×72 mini aspect-video
- Reuse DnD reorder logic from `SlideThumbList` (extract shared composable `useSlideThumbReorder` OR duplicate minimal DnD in filmstrip — prefer extract if <40 lines saved)
- On drop: `updateSlideOrder(reorderedIds)`
- Mini canvas: `SlideCanvas` with `read-only` for active slide
- `data-vantage="sorter"` on root

**Page:** `apps/web/app/pages/decks/[id]/sorter.vue` — mirror `[id]/index.vue` deckId resolution; render `DeckSorterShell`.

### Thumb vantage

**New:** `DeckThumbShell.vue`

- Extend `SlideThumbList` with prop `variant: 'default' | 'narrow'` — narrow hides grip, 96px width
- Center panel: single `SlideCanvas` at enlarged scale (CSS transform scale ~0.92 OK)
- `data-vantage="thumb"` on root

**Page:** `apps/web/app/pages/decks/[id]/thumb.vue`

### Query builder

**New:** `QueryBuilderPanel.vue` in inspector

Shown when `effectiveLayoutId(regions) === 'live-data'` OR `regions.queryView` exists.

| Control | Behavior |
| ------- | -------- |
| Query textarea | Binds `config.query`; `aria-label="EQL-S query"` |
| Viz select | `chart` \| `tiles` \| `both` |
| Title input | Optional chart label |
| Run preview | `useTrellisGraph().queryOnce(toEqlQuery(localConfig))` — **no mutate**; show result in panel or toast |
| Save to slide | `updateSlideRegions(id, { queryView: { query, viz, title } })` — triggers SSE refresh via existing `useDeckQueryView` |

Reuse `toEqlQuery` from `useDeckQueryView.ts` — **export** to `lib/deck-query-view-map.ts` or `lib/deck-query-eql.ts` to avoid duplication.

Errors: inline `role="alert"` text; no blocking toast.

### Keyboard reorder

**New:** `useDeckKeyboardReorder(options)`

```ts
type Options = {
  slides: Ref<SlideDefinition[]>
  activeIndex: Ref<number>
  onReorder: (orderedIds: string[]) => Promise<void>
  enabled?: Ref<boolean>
}
```

- Listen on `window` when tablist focused OR delegate from `SlideThumbList` / `SlideFilmstrip` `@keydown`
- `Alt+ArrowUp` / `Alt+ArrowDown` → swap active slide ±1; call `updateSlideOrder`
- `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"` on tablist
- Live region: announce "Slide N moved to position M" (`aria-live="polite"`)

### Presence (stub)

**New:** `useDeckPresence(deckId: Ref<string>)`

| Phase | Behavior |
| ----- | -------- |
| mount | Local user avatar (initials from agent id or "TB") |
| stub | One demo remote viewer `{ id: 'agent:demo', label: 'agent', color: cursor-remote }` |
| cursor | Remote position `{ xPct, yPct }` — animate every 2s with bounded random walk (dev/demo only) |
| SSE | Optional hook on `graphVersion` — **no graph writes** |

**Components:**

- `PresenceAvatarStack.vue` — max 4 avatars + "+N"; `aria-label="Collaborators viewing deck"`
- `RemoteCursorOverlay.vue` — absolute positioned on canvas; `aria-hidden="true"`

Do **not** persist presence to graph. Do **not** block route load on presence.

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/lib/deck-routes.ts` | **extend** — sorter/thumb/editor paths, `activeDeckVantageFromPath` |
| `apps/web/app/lib/deck-query-eql.ts` | **add** — shared `toEqlQuery(config)` |
| `apps/web/app/composables/useDeckKeyboardReorder.ts` | **add** |
| `apps/web/app/composables/useDeckPresence.ts` | **add** |
| `apps/web/app/composables/useSlideThumbReorder.ts` | **add** (optional — shared DnD) |
| `apps/web/app/components/deck/VantageChipNav.vue` | **add** |
| `apps/web/app/components/deck/QueryBuilderPanel.vue` | **add** |
| `apps/web/app/components/deck/SlideFilmstrip.vue` | **add** |
| `apps/web/app/components/deck/PresenceAvatarStack.vue` | **add** |
| `apps/web/app/components/deck/RemoteCursorOverlay.vue` | **add** |
| `apps/web/app/components/deck/DeckSorterShell.vue` | **add** |
| `apps/web/app/components/deck/DeckThumbShell.vue` | **add** |
| `apps/web/app/components/deck/DeckInspector.vue` | **extend** — VantageChipNav, QueryBuilderPanel |
| `apps/web/app/components/deck/DeckProjectionFrame.vue` | **extend** — presence bar, keyboard reorder, remote cursor |
| `apps/web/app/components/deck/SlideThumbList.vue` | **extend** — narrow variant, keyboard hook |
| `apps/web/app/composables/useDeckQueryView.ts` | **extend** — import shared `toEqlQuery` |
| `apps/web/app/pages/decks/[id]/sorter.vue` | **add** |
| `apps/web/app/pages/decks/[id]/thumb.vue` | **add** |
| `apps/web/app/assets/css/deck-vantage.css` | **extend** — route duration token |
| `apps/web/tests/e2e/deck-projection.spec.ts` | **extend** — sorter/thumb routes, query builder, keyboard |

**Do not add:** Yjs, second TipTap, WebRTC, graph-persisted cursors.

---

## Seed delta

**No seed changes required** — P1.2 seed sufficient. Demo remote cursor is composable stub only.

---

## Verification

```bash
bun apps/web/scripts/seed-deck-demo.mjs
pnpm --dir apps/web exec playwright test tests/e2e/deck-projection.spec.ts --project=chromium
# Manual: /decks/yc-s26/sorter — filmstrip DnD
# Manual: /decks/yc-s26/thumb — narrow rail + preview
# Manual: query builder Save → LIVE region updates
# Manual: Alt+↓ on focused tablist reorders
# Manual: avatar stack + cursor ghost on editor
```

---

## Acceptance criteria (TRL-309)

1. `/decks/yc-s26/sorter` renders filmstrip + mini canvas; DnD reorder persists after reload.
2. `/decks/yc-s26/thumb` renders narrow rail + enlarged slide preview.
3. Vantage chips navigate to editor/sorter/thumb routes; active chip reflects current path.
4. Query builder visible on traction slide; Save commits `regions.queryView` and LIVE region refreshes.
5. Run preview executes query without graph mutate.
6. Alt+↑/↓ on slide tablist reorders slides (same `updateSlideOrder` as DnD).
7. Editor frame bar shows avatar stack; demo remote cursor visible on canvas (stub).
8. E2e: sorter route smoke + thumb route smoke + P1.2 regression (4 prior tests pass).
9. No Yjs, no second TipTap, no graph writes for presence.

---

## P1.4 stub

Real-time Yjs co-editing, schema-aware query builder, WebRTC cursors, bulk sorter multi-select, `--vantage` responsive breakpoints.
