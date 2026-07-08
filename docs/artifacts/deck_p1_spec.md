# Spec: Deck P1 on the graph (TRL-294)

**Parent design:** TRL-293  
**Proposal:** TRL-289 · epic TRL-283  
**Design:** [deck_p1_design.md](./deck_p1_design.md) · [deck_p1_mockup.html](./deck_p1_mockup.html)

## Scope

**In:** Graph-native **deck projection** — ordered slides, thumb tablist, 16:9 canvas, **one editable title region** (TipTap lease), inspector stub, demo seed + route + e2e.

**Out (P1.1 — document only):** queryView slide regions, speaker-notes edit, Present vantage, drag-reorder thumbs, full `--vantage` CSS crossfade, multiplayer presence.

**Demo:** `entity:deck-yc-s26` with 3 slides at `/decks/yc-s26`.

---

## Architecture

```
entity type `deck` (showroom zone)
  data.title, zoneId, facilityId

entity type `slide` (showroom zone)
  data.title          — thumb label fallback
  data.deckId         — parent deck entity id (query + stamp)
  data.order          — integer position (1-based display)
  data.regions        — JSON { title?: string (HTML), body?: string (HTML), eyebrow?: string }
  data.speakerNotes   — plain text (read-only P1)

link: deck parentOf slide (optional P1 — also stamp deckId on slide for TQL)

/decks/[slug]
  └─ DeckProjectionFrame
       ├─ useDeckProjection(deckId)
       │    ├─ fetchNode deck meta
       │    ├─ TQL slides by deckId ORDER BY order
       │    └─ SSE via useSSEStatus
       ├─ SlideThumbList (tablist)
       ├─ SlideCanvas + useEditorLease (title region only)
       └─ DeckInspector (read-only meta, Present disabled)
```

### Entity schemas (application types)

```ts
type SlideRegions = {
  eyebrow?: string
  title?: string      // HTML from TipTap lease
  body?: string       // HTML static render P1
}

type SlideDefinition = {
  entityId: string
  title: string
  order: number
  regions: SlideRegions
  speakerNotes?: string
}

type DeckDefinition = {
  title: string
  zoneId?: string
  facilityId?: string
}
```

**Slide query (normative):**

```
FIND entity AS ?s WHERE ?s.type = "slide" AND ?s.deckId = "<deckEntityId>"
RETURN ?s
```

Hydrate slide bodies via `fetchNodes` (EQL-S cannot RETURN `?s.order` — reserved — or unregistered attrs like `regions`; node data uses flattened `regions.*` keys). Client sorts by `order` ascending.
```

Parse `?s` as entity id; flatten `regions` from EAV or JSON blob (same pattern as sheet `columns` in `useSheetProjection`).

### Ordered slides

- **Primary:** `data.order` integer on each slide entity (1, 2, 3…).
- **Graph link (P1):** after seed, `link` `{ action: "link", e1: deckId, relation: "parentOf", e2: slideId }` for each slide — enables future edge-metadata ordering in P1.1.
- UI never hardcodes slide order — always from query result sorted by `order`.

### Title editor lease

Reuse `useEditorLease` + single `UiRichTextEditor` Teleport (same pattern as `SheetProjectionFrame.vue`).

- **Cell key:** `makeSlideRegionKey(slideEntityId, 'title')` — pipe delimiter (`entity:slide-x|title`).
- **Acquire:** double-click / Enter on title region in `SlideCanvas`.
- **Commit:** on blur / Esc → `updateSlideRegions(slideId, { title: html })` merging into existing `regions` JSON.
- **Extensions:** `compact`, `seamless`, `embeds: false`, `mentions: false` for title-only.

### SlideCanvas (P1 regions)

| Region | P1 behavior |
| ------ | ----------- |
| `eyebrow` | Static text from `regions.eyebrow` |
| `title` | Editable via lease; showroom ring when focused |
| `body` | Static HTML render (`v-html` sanitized or text strip) — no lease |
| `speakerNotes` | Read-only strip below canvas from `data.speakerNotes` |

No queryView blocks, no chart tiles in P1.

### DeckInspector (P1)

- Vantage chips: only **editor** `aria-pressed=true`; others visual-only
- Slide entity id + deck relation text (read-only)
- **Present** button: `disabled`, `title="P1.1"`

---

## UI contract

Tokens from `deck_p1_design.md` — showroom purple `#8b5cf6` for PROJECTION badge and selection rings.

| Region | Component | Notes |
| ------ | --------- | ----- |
| Frame bar | title, PROJECTION badge, slide count, LIVE | mirror sheet frame |
| Thumb list | 148px rail, `role="tablist"` | mini 16:9 preview optional (label-only OK P1) |
| Canvas | 16:9, `#0d0d11` bg | `role="tabpanel"`, `aria-live="polite"` |
| Inspector | 208px rail | responsive stack ≤900px |

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/types/deck.ts` | **add** |
| `apps/web/app/lib/slide-region-key.ts` | **add** — `entityId|regionId` |
| `apps/web/app/lib/slide-region-key.test.ts` | **add** |
| `apps/web/app/lib/deck-demo.ts` | **add** — demo deck + 3 slides |
| `apps/web/app/composables/useDeckProjection.ts` | **add** |
| `apps/web/app/components/deck/DeckProjectionFrame.vue` | **add** |
| `apps/web/app/components/deck/SlideThumbList.vue` | **add** |
| `apps/web/app/components/deck/SlideCanvas.vue` | **add** |
| `apps/web/app/components/deck/DeckInspector.vue` | **add** |
| `apps/web/app/pages/decks/[id].vue` | **add** |
| `apps/web/scripts/seed-deck-demo.mjs` | **add** |
| `apps/web/tests/e2e/deck-projection.spec.ts` | **add** |

**Reuse:** `useEditorLease.ts`, `useTrellisGraph`, `useSSEStatus`, `entityId` from `tql-namespace`.

**Do not add:** `DeckEditorShell` with Present route, queryView region parser, drag-and-drop reorder.

---

## P1.1 stub (spec note only)

Follow-up proposal after P1 PASS: queryView region in slides, notes lease, `--vantage` thumb/sorter/present, `/decks/[id]/present` fullscreen.

---

## Verification

```bash
pnpm --dir apps/web exec vitest run app/lib/slide-region-key.test.ts
pnpm --dir apps/web exec playwright test tests/e2e/deck-projection.spec.ts --project=chromium
bun apps/web/scripts/seed-deck-demo.mjs
# Manual: http://localhost:1414/decks/yc-s26 — thumb switch, edit title, blur commits
```

---

## Acceptance criteria (TRL-294)

1. `deck` + `slide` demo entities seeded; slides query by `deckId` ordered by `order`.
2. `/decks/yc-s26` renders PROJECTION frame, tablist, 16:9 canvas, inspector.
3. Thumb click switches slide; title region editable via single TipTap lease; commit persists to `regions.title`.
4. Present button disabled; no queryView region code in wedge.
5. E2e: `deck-projection.spec.ts` passes chromium (PROJECTION, tablist, slide title visible).
6. A11y: tablist/tab/tabpanel roles; title `aria-label="Slide title"`.
