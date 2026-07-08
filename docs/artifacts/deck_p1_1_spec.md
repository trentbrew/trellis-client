# Spec: Deck P1.1 — queryView, notes lease, Present (TRL-299)

**Parent design:** TRL-298  
**Proposal:** TRL-297 · epic TRL-283  
**Prior impl:** TRL-295 (closed)  
**Design:** [deck_p1_1_design.md](./deck_p1_1_design.md) · [deck_p1_1_mockup.html](./deck_p1_1_mockup.html)  
**Baseline:** [deck_p1_spec.md](./deck_p1_spec.md)

## Scope

**In:** Extend Deck P1 with **queryView region** (static demo on traction slide), **speaker-notes editor lease**, **Present route**, e2e harden (thumb switch + title visible on traction).

**Out (P1.2 — document only):** live TQL refresh in queryView, drag-reorder thumbs, `--vantage` CSS crossfade, body lease, layout picker grid, multiplayer.

**Demo:** `entity:deck-yc-s26` — traction slide shows queryView block; notes editable; Present at `/decks/yc-s26/present?slide=2`.

---

## Architecture

```
/decks/[slug]                    /decks/[slug]/present?slide=N
  └─ DeckProjectionFrame           └─ DeckPresentShell
       ├─ useDeckProjection              ├─ SlideCanvas (read-only regions)
       ├─ SlideThumbList                 ├─ nav overlay (← → counter Esc)
       ├─ SlideCanvas                    └─ data-vantage="present"
       │    ├─ title lease (P1)
       │    └─ QueryViewRegion (NEW)
       ├─ SpeakerNotesStrip + lease (NEW)
       └─ DeckInspector — Present enabled (EXTEND)
```

### Type delta

```ts
type QueryViewRegionConfig = {
  query: string
  viz?: 'chart' | 'tiles' | 'both'
  title?: string
}

type SlideRegions = {
  eyebrow?: string
  title?: string
  body?: string
  queryView?: QueryViewRegionConfig | string  // JSON or parsed object
}
```

**Flattened EAV on seed/mutate:** `regions.queryView` as JSON string (same pattern as P1 `regions.title`).

**Speaker notes:** top-level `speakerNotes` string (HTML from lease); not nested in `regions`.

### Editor lease (two regions, one instance)

| Region | Key | Commit target |
| ------ | --- | ------------- |
| title | `makeSlideRegionKey(id, 'title')` | `regions.title` via `updateSlideRegions` |
| notes | `makeSlideRegionKey(id, 'notes')` | `speakerNotes` via `updateSpeakerNotes` |

Lease handler in `DeckProjectionFrame`:

```ts
const lease = useEditorLease(async (cellKey, html) => {
  const parsed = parseSlideRegionKey(cellKey)
  if (!parsed) return
  if (parsed.regionId === 'title') await updateSlideRegions(parsed.entityId, { title: html })
  if (parsed.regionId === 'notes') await updateSpeakerNotes(parsed.entityId, html)
})
```

**Extensions:** notes lease uses same `compact`, `seamless`, `embeds: false`, `mentions: false` as title.

### QueryViewRegion (P1.1 static)

Render when `slide.regions.queryView` present. **No live TQL** in P1.1 — use demo payload from `lib/deck-query-view-demo.ts` keyed by slide entity id (or embedded `demoData` in seed JSON).

| Sub-region | P1.1 behavior |
| ---------- | ------------- |
| Header | LIVE badge + truncated query string (mono) |
| Tiles | 3-column grid (partners, MRR, entities) |
| Chart | 6-bar static MRR chart (Feb–Jul) |

`role="region"` `aria-label="Live query view"`; LIVE badge `aria-live="polite"`.

**Do not** embed TipTap `queryView` node inside slide canvas — deck queryView is a **projection component**, not a doc editor atom.

### Present route

- **Path:** `pages/decks/[id]/present.vue`
- **Query:** `?slide=N` (0-based index, default 0)
- **Shell:** black fullscreen, centered 16:9 canvas, floating pill controls
- **Nav:** Prev/Next buttons + ArrowLeft/ArrowRight; Esc → `navigateTo(/decks/[slug]?slide=N)` (editor route with index preserved — optional query on editor)
- **Read-only:** no leases, no notes strip, no inspector

### DeckInspector delta

- Present button **enabled** → `navigateTo(\`/decks/${slug}/present?slide=${activeIndex}\`)`
- Optional: present vantage chip triggers same navigation

---

## Files (trellis-client)

| File | Action |
| ---- | ------ |
| `apps/web/app/types/deck.ts` | **extend** — `QueryViewRegionConfig`, `queryView?` on regions |
| `apps/web/app/lib/deck-query-view-demo.ts` | **add** — static tiles/chart for traction slide |
| `apps/web/app/lib/deck-demo.ts` | **extend** — traction `regions.queryView` JSON |
| `apps/web/app/composables/useDeckProjection.ts` | **extend** — `updateSpeakerNotes`, parse `queryView` from flattened keys |
| `apps/web/app/components/deck/QueryViewRegion.vue` | **add** |
| `apps/web/app/components/deck/SpeakerNotesStrip.vue` | **add** |
| `apps/web/app/components/deck/DeckPresentShell.vue` | **add** |
| `apps/web/app/components/deck/SlideCanvas.vue` | **extend** — render QueryViewRegion |
| `apps/web/app/components/deck/DeckProjectionFrame.vue` | **extend** — notes lease, extract notes strip |
| `apps/web/app/components/deck/DeckInspector.vue` | **extend** — Present enabled + navigate |
| `apps/web/app/pages/decks/[id]/present.vue` | **add** |
| `apps/web/scripts/seed-deck-demo.mjs` | **extend** — traction queryView seed |
| `apps/web/tests/e2e/deck-projection.spec.ts` | **extend** — thumb switch + traction content |

**Do not add:** drag-reorder, live queryView TQL runner, second TipTap instance, layout picker.

---

## Seed delta (traction slide)

```json
{
  "regions.queryView": "{\"query\":\"find revenue where product = \\\"raster\\\" group by month\",\"viz\":\"both\",\"title\":\"Raster.tv MRR\"}"
}
```

Update traction `regions.body` to remove P1 placeholder copy (optional — queryView replaces body emphasis).

---

## Verification

```bash
bun apps/web/scripts/seed-deck-demo.mjs
pnpm --dir apps/web exec playwright test tests/e2e/deck-projection.spec.ts --project=chromium
# Manual: /decks/yc-s26 — tab 3 shows queryView LIVE block
# Manual: dblclick notes → edit → blur persists
# Manual: Present → fullscreen → Esc returns
```

---

## Acceptance criteria (TRL-299)

1. Traction slide renders `QueryViewRegion` with LIVE badge + tiles/chart (static demo).
2. Speaker notes editable via shared lease; commit to `speakerNotes`.
3. `/decks/yc-s26/present?slide=2` renders Present shell with nav; Esc exits to editor.
4. Present button in inspector enabled and navigates with current slide index.
5. E2e: click tab "Traction" (or slide 3), assert "Traction" eyebrow or queryView region visible.
6. E2e: title region still visible on default slide (regression).
7. No drag-reorder or live TQL queryView in wedge.

---

## P1.2 stub

Live queryView TQL refresh, thumb drag-reorder, `--vantage` crossfade, body lease, layout picker.
