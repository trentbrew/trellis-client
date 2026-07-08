---
version: alpha
name: Deck P1.1 — queryView, notes lease, Present
description: Design artifact for TRL-297 — deck projection follow-up after P1 shell shipped
source:
  tool: derived
  url: docs/artifacts/sheets_decks_mockup.html#deck
  mock: docs/artifacts/deck_p1_1_mockup.html
  parentDesign: docs/artifacts/deck_p1_design.md
  parentMock: docs/artifacts/deck_p1_mockup.html
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-2: "#1a1a21"
  surface-3: "#202028"
  text: "#e8e8ec"
  text-muted: "#888894"
  text-faint: "#55555f"
  border: "#2a2a32"
  zone-showroom: "#8b5cf6"
  live: "#34d399"
  series: "#6366f1"
  primary: "#6366f1"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  slideTitle:
    fontFamily: IBM Plex Sans
    fontSize: clamp(20px, 3.6vw, 32px)
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
  sm: 8px
  md: 16px
  lg: 24px
components:
  QueryViewRegion:
    borderColor: "{colors.border}"
    liveBadgeColor: "{colors.live}"
    backgroundColor: "{colors.surface-2}"
    borderRadius: "{rounded.md}"
  SpeakerNotesLease:
    outline: "2px solid {colors.zone-showroom}"
    fontSize: 12.5px
  PresentShell:
    backgroundColor: "#000000"
    controlsOpacity: 0.85
  DeckProjectionFrame:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.lg}"
---

# Design: Deck P1.1 — queryView, notes lease, Present

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-297 · epic TRL-283  
**Prior shipped:** TRL-295 (Deck P1 shell + title lease)  
**Mock:** [deck_p1_1_mockup.html](./deck_p1_1_mockup.html) · full reference: [sheets_decks_mockup.html#deck](./sheets_decks_mockup.html#deck)  
**Baseline:** [deck_p1_design.md](./deck_p1_design.md) · [deck_p1_spec.md](./deck_p1_spec.md) §P1.1 stub

---

## Overview

P1.1 extends the **deck projection** shipped in TRL-295 with three user-visible capabilities:

1. **queryView region** — live chart/tile block on the traction slide (same visual language as full epic mock mark 10)
2. **Speaker-notes editor lease** — second editable region via shared `useEditorLease` (one lease at a time)
3. **Present vantage** — enabled Present CTA → `/decks/[slug]/present` fullscreen projector shell

**Optional stretch (design included, impl may defer):** drag-reorder thumbs in sorter rail.

**Out of scope:** multiplayer cursors, full `--vantage` CSS crossfade between editor/thumb/sorter/present, body-region lease, slide layout picker grid from full mock.

**Demo target:** Same deck `entity:deck-yc-s26` — traction slide (`entity:slide-yc-traction`) gains a `regions.queryView` atom; notes editable on all slides; Present opens slide 1 fullscreen.

---

## Colors

| Token | Usage |
| ----- | ----- |
| `{colors.zone-showroom}` | Title + notes lease rings, thumb selection, Present CTA |
| `{colors.live}` | queryView LIVE badge, live tile accent |
| `{colors.series}` | Chart bars in queryView region |
| `{colors.surface-2}` | queryView block background, notes strip |

Inherit P1 tokens — no palette fork.

---

## Typography

- **queryView query string:** `{typography.mono}` 9–10px, muted, truncated in header row
- **Chart title:** 11px mono uppercase tracking
- **Tile values:** 18–22px semibold tabular
- **Speaker notes (editable):** 12.5px body; lease ring on focus

---

## Layout

### Editor vantage (default `/decks/[slug]`)

```
DeckProjectionFrame (unchanged grid: 148px | 1fr | 208px)
├─ SlideThumbList — optional drag handles (stretch)
├─ SlideCanvas
│   ├─ eyebrow (static)
│   ├─ title region (lease — P1)
│   ├─ body (static P1.1)
│   └─ QueryViewRegion (NEW — traction slide only in demo)
├─ SpeakerNotesStrip (NEW lease target)
└─ DeckInspector
    ├─ vantage: editor active; present chip clickable preview hint
    └─ Present button ENABLED → navigates to present route
```

### Present vantage (`/decks/[slug]/present`)

```
DeckPresentShell (minimal chrome)
├─ SlideCanvas only — 16:9 centered, max viewport
├─ Floating controls (auto-hide): ← → slide nav · Esc exit · slide counter
└─ No thumb list, no inspector, no notes (projector mode)
```

**CSS `--vantage`:** P1.1 sets `data-vantage="editor"` on editor route and `data-vantage="present"` on present route. Full crossfade between vantages is **P1.2** — instant swap OK for P1.1.

---

## Elevation & Depth

- **queryView block:** inset `{colors.surface-2}` panel, 1px border, LIVE badge top-left
- **Notes lease:** same 2px showroom ring as title (mutually exclusive leases)
- **Present shell:** true black stage `#000`; controls float with subtle blur panel

---

## Shapes

- queryView tiles: `{rounded.sm}` grid cells
- Chart bars: 2px top radius
- Present controls: `{rounded.pill}` ghost buttons

---

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `QueryViewRegion` | head (LIVE + query) · tiles row · chart | loading, live, error stub | **New** — parse `regions.queryView` JSON `{ query, viz: "chart" \| "tiles" }` |
| `SpeakerNotesStrip` | label + lease mount | default, editing | **Extend** `DeckProjectionFrame` — `makeSlideRegionKey(id, 'notes')` |
| `DeckPresentShell` | canvas + nav overlay | slide index, exit | **New** — `pages/decks/[id]/present.vue` |
| `DeckInspector` | Present enabled | editor / present vantage chips | **Extend** P1 component |
| `SlideThumbList` | + drag handle (stretch) | dragging, drop target | **Extend** optional |

### Graph model (delta from P1)

| Field | Change |
| ----- | ------ |
| `slide.regions.queryView` | JSON `{ query: string, viz?: "chart" \| "tiles", title?: string }` — demo uses static render + LIVE badge; live TQL refresh is stretch |
| `slide.speakerNotes` | HTML string from TipTap lease commit (plain text fallback OK P1.1) |

**Lease keys:**

| Region | Key pattern |
| ------ | ----------- |
| title | `entity:slide-x\|title` |
| notes | `entity:slide-x\|notes` |

Only one lease active — acquiring notes releases title and vice versa.

---

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| View traction slide | — | Renders `QueryViewRegion` with LIVE badge + chart/tiles (static demo data OK) |
| Double-click / Enter on speaker notes | default → lease | Mount shared TipTap; commit to `speakerNotes` on blur/Esc |
| Click Present | enabled | Navigate `/decks/yc-s26/present?slide=0` (or current index) |
| Present: Arrow keys / click zones | — | Prev/next slide; loop at bounds |
| Present: Esc | — | Return to editor route preserving slide index |
| Click vantage "present" chip | — | Same as Present button (optional shortcut) |
| Drag thumb (stretch) | grab → drag → drop | Reorder `data.order` + graph link metadata |
| SSE on slide entity | — | Refresh queryView + notes if current slide |
| Title lease (P1) | unchanged | Still commits to `regions.title` |

---

## Accessibility

- **Focus order (editor):** frame → tablist → canvas title → queryView (focusable bars/tiles if interactive) → speaker notes → inspector → Present
- **queryView:** `role="region"` `aria-label="Live query view"`; LIVE badge `aria-live="polite"`
- **Speaker notes lease:** `aria-label="Speaker notes"`; readonly strip when not leased
- **Present route:** focus trap on slide canvas + nav; Esc exits; `aria-label="Presentation mode"`
- **Motion:** instant slide swap under `prefers-reduced-motion: reduce`

---

## Do's and Don'ts

**Do**

- Reuse single `useEditorLease` + one `UiRichTextEditor` Teleport for title **and** notes
- Mirror queryView visual from `sheets_decks_mockup.html` traction slide (mark 10)
- Seed traction slide with `regions.queryView` in demo script
- Extend e2e: thumb switch changes canvas; title edit persists after blur

**Don't**

- Don't add second TipTap instance for notes
- Don't implement multiplayer avatars or Yjs collab in P1.1
- Don't build full layout picker grid from epic mock (defer)
- Don't require live TQL re-query for queryView in P1.1 — static seeded tiles/chart acceptable with LIVE chrome

---

## Open for Architect

1. **`regions.queryView` schema** — `{ query: string, viz?: string, title?: string }`; flattened EAV `regions.queryView` or nested JSON
2. **`QueryViewRegion.vue`** — static demo render for `entity:slide-yc-traction`; optional hook to `useDeckProjection` query later
3. **Notes lease** — `parseSlideRegionKey` regionId `notes`; commit `speakerNotes` field (not nested in regions)
4. **Present route** — `pages/decks/[id]/present.vue`; query param `?slide=N`; minimal `DeckPresentShell.vue`
5. **Inspector** — enable Present button; wire `navigateTo` with current slide index
6. **E2e harden** — extend `deck-projection.spec.ts`: click tab 2, assert traction eyebrow; dblclick title, type, blur, reload assert (or API check)
7. **Stretch AC** — drag-reorder thumbs: separate impl flag or P1.2 if timeboxed
8. **P1.2 stub** — `--vantage` crossfade, live queryView refresh, body lease, layout picker

---

## Handoff checklist

- [x] `docs/artifacts/deck_p1_1_design.md` (this file)
- [x] `docs/artifacts/deck_p1_1_mockup.html` (P1.1-scoped mock with Present toggle)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] Open for Architect enumerated
