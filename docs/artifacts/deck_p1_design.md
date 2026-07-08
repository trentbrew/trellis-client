---
version: alpha
name: Deck P1 on the Graph
description: Design artifact for TRL-289 — deck projection shell, slide list, one editable region (P1 milestone)
source:
  tool: fable
  url: derived from sheets_decks mock #deck section (TRL-283)
  mock: docs/artifacts/deck_p1_mockup.html
  parentMock: docs/artifacts/sheets_decks_mockup.html#deck
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
  DeckProjectionFrame:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.lg}"
  SlideThumbList:
    width: 148px
    backgroundColor: "{colors.surface-2}"
  SlideCanvas:
    aspectRatio: "16/9"
    backgroundColor: "#0d0d11"
  EditorLeaseRing:
    outline: "2px solid {colors.zone-showroom}"
---

# Design: Deck P1 on the Graph

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-289 · epic TRL-283  
**Mock:** [deck_p1_mockup.html](./deck_p1_mockup.html) · full reference: [sheets_decks_mockup.html#deck](./sheets_decks_mockup.html#deck)  
**Prior art:** [sheets_decks_design.md](./sheets_decks_design.md) §03 Deck

---

## Overview

P1 introduces the **deck projection** — a showroom-zone surface where a `deck` entity owns an **ordered relation** of `slide` entities. Each slide stores TipTap JSON fragments per **region** (title, body, notes). P1 ships the **shell + thumb list + one editable title region**; queryView regions, speaker-notes editing, and Present vantage are **P1.1**.

Brand posture matches sheets: craftpunk dark, IBM Plex, showroom purple `{colors.zone-showroom}` for deck chrome. Density: presentation-editor — wide canvas, compact thumbs, inspector rail.

**Demo target:** `entity:deck-yc-s26` with 3 slides (`title`, `problem`, `traction`) at `/decks/yc-s26`.

## Colors

| Token | Usage |
| ----- | ----- |
| `{colors.zone-showroom}` | Frame badge, thumb selection ring, editable title lease ring |
| `{colors.surface}` / `{colors.surface-2}` | Frame panel / sorter + inspector rails |
| `{colors.live}` | Reserved for queryView LIVE badge (P1.1) |
| `{colors.border}` | Shell dividers, canvas border |

Extend Trellis shadcn theme — do not fork a new palette.

## Typography

- **Frame chrome:** `{typography.mono}` 10–11px uppercase badges
- **Slide title (editable region):** `{typography.slideTitle}` — balance, centered or left per layout
- **Slide eyebrow:** mono 10.5px, letter-spacing 0.14em, uppercase, zone tint
- **Speaker notes strip:** 12.5px muted body (read-only P1)

## Layout

```
DeckProjectionFrame
├─ frame-bar: crumb · PROJECTION badge · slide count · presence (optional P1.1)
├─ deck-shell (grid: 148px | 1fr | 208px)
│   ├─ SlideThumbList (role=tablist)
│   ├─ stage: SlideCanvas (16:9) + speaker notes strip
│   └─ inspector: vantage chips (editor on) · slide entity meta · Present (disabled P1)
└─ responsive ≤900px: stack sorter horizontal scroll · inspector below
```

**Fractal vantages (design now, impl P1.1+):** thumb / sorter / editor / present share one `SlideCanvas` via CSS `--vantage`. P1 implements **editor** vantage only; others are visual stubs in inspector.

## Elevation & Depth

- Frame: `{colors.surface}` + 1px `{colors.border}`, `{rounded.lg}`
- Canvas: inset `{colors.surface-3}` on `#0d0d11` stage — slide “projector screen”
- Editable title lease: 2px showroom ring (reuse sheet editor lease pattern)
- Thumbs: flat; selected = 1px showroom ring (no shadow stack)

## Shapes

- Thumbs: `{rounded.sm}`, 16:9 mini preview
- Canvas: `{rounded.md}`
- Vantage chips: `{rounded.pill}`
- Present CTA: `{rounded.md}` (disabled styling in P1 mock)

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| `DeckProjectionFrame` | frame-bar · deck-shell | loading, live (SSE), error | **New** — mirror `SheetProjectionFrame.vue` |
| `SlideThumbList` | ordered thumbs from graph edges | selected, focus, reorder (P1.1) | **New** |
| `SlideCanvas` | regions container (title, body, notes) | per-slide entity | **New** |
| `SlideTitleRegion` | TipTap lease mount for `h4`/title | default, focused, editing | **New** — reuses `useEditorLease` |
| `DeckInspector` | vantage · entity meta · Present | read-only P1 | **New** |
| `ProjectionBadge` | PROJECTION + zone dot | — | Reuse sheet pattern |

### Graph model (normative for P1)

| Entity | Class | Key fields |
| ------ | ----- | ---------- |
| `deck` | container | `title`, `zoneId`, `facilityId` |
| `slide` | document | `title`, `regions` (JSON: `{ title: TipTapJSON, body?: … }`), `speakerNotes?` |

| Relation | Meaning |
| -------- | ------- |
| `deck` → `slide` via `childOf` / `position` edge | Ordered slide list; position integer on edge or `data.order` |

**Route:** `/decks/[slug]` → `entity:deck-{slug}`

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| Click thumb | tab unselected → selected | Load slide entity; update canvas + inspector meta |
| Arrow keys on tablist | roving tabindex | Move selection per WAI-ARIA tabs |
| Double-click / Enter on title region | default → lease | Mount shared TipTap; commit to `slide.regions.title` on blur/Esc |
| Click body / notes (P1) | — | No edit — static render or placeholder |
| Present button (P1) | disabled | No-op; tooltip “P1.1” |
| Vantage chips (P1) | editor only active | thumb/sorter/present visual-only |
| SSE mutation on slide | — | Update canvas if current slide; LIVE badge when connected |
| Deck frame crumb click | — | Navigate to showroom browse (optional) |

## Accessibility

- **Focus order:** frame bar → tablist (thumbs) → canvas regions (title focusable) → speaker notes (read-only) → inspector → Present (disabled, skipped or aria-disabled)
- **Tablist:** `role="tablist"` / `role="tab"` / `aria-selected`; canvas `role="tabpanel"` linked via `aria-labelledby`
- **Editable title:** `aria-label="Slide title"`; lease container matches sheet `aria-label="Cell editor"` pattern
- **Canvas updates:** `aria-live="polite"` on canvas wrapper when slide switches
- **Motion:** no crossfade on slide switch under `prefers-reduced-motion: reduce`; instant swap
- **Present / queryView:** not focusable in P1 when disabled/deferred

## Do's and Don'ts

**Do**

- Store slide content as TipTap JSON per region on the slide entity
- Load slide order from graph edges — never hardcode array order in UI
- Reuse `useEditorLease` + single `UiRichTextEditor` Teleport for title region
- Stamp `zoneId` / `facilityId` showroom on deck + slides

**Don't**

- Don't implement Present mode or fullscreen projector in P1
- Don't embed queryView / live chart regions in P1 (design in full mock only)
- Don't create per-region TipTap instances — one lease at a time
- Don't copy slide content between decks — duplicate = graph fork + new entities

## Open for Architect

1. **Ontology** — `deck` + `slide` system-tier schemas; `regions` JSON shape `{ title: ProseMirrorDoc, body?: … }`.
2. **Ordered relation** — spec edge model (`childOf` + `position` or ordered relation type); query for slides by deck id sorted by position.
3. **DeckProjectionProvider** — composable `useDeckProjection(deckId)`: load deck meta, slide ids, active slide, SSE subscribe.
4. **P1 route** — `pages/decks/[id].vue` + seed `entity:deck-yc-s26` with 3 slides.
5. **Editor lease** — title region only; commit to `slide.regions.title` via graph mutate; same extension set as sheet lease (`embeds: true` optional off for title).
6. **P1 AC boundary** — no `queryView` region parser, no Present, no drag-reorder thumbs, no speaker-notes edit.
7. **P1.1 stub** — document follow-up: queryView region, notes lease, `--vantage` CSS, Present route.
8. **Reuse** — `ProjectionBadge`, `useEditorLease`, `useSSEStatus`, frame-bar patterns from sheet P0.

## Handoff checklist

- [x] `docs/artifacts/deck_p1_design.md` (this file)
- [x] `docs/artifacts/deck_p1_mockup.html` (P1-scoped mock)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] Open for Architect enumerated
