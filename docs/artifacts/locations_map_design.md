---
version: alpha
name: Locations Map — rail affordance
description: Design artifact for TRL-LOC — full-page Mapbox view for geo-bearing graph entities
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-glass: "color-mix(in oklch, #141418 92%, transparent)"
  text: "#e8e8ec"
  text-muted: "#888894"
  primary: "#e85d4c"
  primary-muted: "color-mix(in oklch, #e85d4c 18%, transparent)"
  pin-event: "#fb923c"
  pin-trip: "#60a5fa"
  pin-appointment: "#34d399"
  pin-contact: "#a78bfa"
  destructive: "#ef4444"
  border: "#2a2a32"
  map-vignette: "radial-gradient(ellipse at center, transparent 40%, #0a0a0c 100%)"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.06em
    textTransform: uppercase
  title:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  filterPanel:
    backgroundColor: "{colors.surface-glass}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.sm}"
    backdropBlur: 12px
  mapPin:
    size: 28px
    selectedRing: "2px solid {colors.primary}"
  previewCard:
    backgroundColor: "{colors.surface-glass}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.lg}"
    width: 288px
    backdropBlur: 12px
  zoomCluster:
    backgroundColor: "{colors.surface-glass}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.md}"
---

# Design: Locations Map

**Status:** Design complete (handoff to Architect)  
**Parent:** TRL-LOC/proposal  
**Mock:** [locations_map_mockup.html](./locations_map_mockup.html)  
**Reference:** [deckgl-playground](https://github.com/trentbrew/deckgl-playground) — immersive map + GPU layers (deck.gl deferred to Phase 1)

---

## Overview

**Locations** is a primary-rail workspace mode — a full-bleed geographic canvas that answers *"where are my things?"* Events, trips, appointments, and any entity with coordinates or geocodable text appear as typed pins on a dark Mapbox base map.

**Brand posture:** Craftpunk observatory — the map is the hero; chrome floats in glass panels (same inset-hierarchy language as Graph visualization). Density is calm at default zoom; filters and previews appear on demand.

**Emotional tone:** Grounded, exploratory, slightly cinematic (subtle vignette at map edges). Not a GIS tool — a personal atlas of your graph.

**Who it serves:** Founders and knowledge workers who already store places in events/trips and want spatial context without leaving Trellis.

---

## Colors

| Token | Usage |
|-------|--------|
| `background` | Page fallback behind map; empty-state scrim |
| `surface` / `surface-glass` | Floating panels (filter, preview, zoom) — 92% opacity + blur |
| `primary` | Selected pin ring, active filter chip, "Locate me" accent |
| `pin-*` | Entity-type pin fill — aligned with Graph `ENTITY_COLORS` |
| `border` | Panel edges, pin hover ring at 40% opacity |
| `map-vignette` | Optional CSS overlay softening map corners (does not block interaction) |

Map base: **Mapbox `dark-v11`** (no custom style JSON in Phase 0). Selected pin uses `{colors.primary}` ring; unselected pins use type color at 85% opacity.

---

## Typography

| Level | Use |
|-------|-----|
| `label` | Filter group headers ("ENTITY TYPES"), map attribution |
| `body` | Filter chip labels, preview snippet, empty-state copy |
| `title` | Preview card entity title, empty-state headline |

Monospace only for coordinate debug (Architect may omit in MVP).

---

## Layout

### Shell

Reuse **Graph visualization** shell pattern:

```
┌─────────────────────────────────────────────────────────────┐
│ AppHeader (omnibox, org picker — unchanged)                 │
├────┬────────────────────────────────────────────────────────┤
│Rail│  Locations canvas (100% w/h of content column)         │
│    │  ┌─ filter panel (top-left, floating)                  │
│ G  │  │                                                     │
│ C  │  │              MAPBOX GL                              │
│ ···│  │                                                     │
│    │  └─ zoom cluster (bottom-right)                        │
│    │     preview card (anchored to pin, above when room)    │
└────┴────────────────────────────────────────────────────────┘
│ Bottom IconRail (mobile) — Locations active, expanded label │
└─────────────────────────────────────────────────────────────┘
```

| Region | Behavior |
|--------|----------|
| **Route** | `/locations` — `meta.fullWidth: true`, `collapseSidebar: true`, hide entity sidebar |
| **Rail icon** | `lucide:map-pin`, label **Locations**, **center primary group** (with Calendar, Collections — *not* left Graph/Chat cluster) |
| **Order** | `order: 3.5` (after Graph `3`, before Calendar `12`) |
| **Map** | `ClientOnly`; fills content area; `touch-action: none` on canvas |
| **Sidebar** | None in MVP — type filters live in floating panel |

### Breakpoints

| Viewport | Adjustments |
|----------|-------------|
| `≥ md` | Left vertical rail; filter panel top-left |
| `< md` | Bottom rail; filter panel becomes bottom sheet trigger (icon `lucide:sliders-horizontal`) |
| All | Preview card max-width 288px; flip above pin if within 120px of bottom edge |

---

## Elevation & Depth

Follow **inset hierarchy** from Graph:

1. **Map** — base plane (z-0)
2. **Vignette** — decorative z-1, `pointer-events: none`
3. **Floating panels** — z-10, `bg-card/90 backdrop-blur-sm border border-border shadow-sm`
4. **Preview card** — z-20, stronger shadow (`shadow-md`)
5. **Empty / error overlays** — z-30, centered modal card on dimmed map

No drop shadows on pins — selection ring communicates focus.

---

## Shapes

| Element | Radius / size |
|---------|----------------|
| Filter panel | `{rounded.lg}` (14px) |
| Filter chips | `{rounded.pill}` |
| Zoom buttons | `{rounded.md}`, 32×32px hit target |
| Pins | 28px circle; cluster badge 36px |
| Preview card | `{rounded.lg}` |

Icons: Lucide via Nuxt Icon, 16px in chips, 14px in preview type badge.

---

## Components

| Component | Anatomy | States | Maps to codebase |
|-----------|---------|--------|------------------|
| **LocationsPage** | `Page` canvas + `LocationsMapView` | loading, ready, empty, no-token | New `pages/locations/index.vue` |
| **LocationsMapView** | Map container + overlays | idle, panning, pin-hover, pin-selected | New `components/views/LocationsMapView.vue` |
| **MapFilterPanel** | Type toggle chips + count badge | all-on, filtered, collapsed (mobile) | Pattern from Graph layout toggle panel |
| **MapPin** | Circle + type icon + optional cluster count | default, hover, selected, dimmed | Mapbox `Marker` or custom layer |
| **MapPreviewCard** | `EntityPreviewCard` + "Click to open" footer | visible, hidden | Reuse `EntityPreviewCard.vue` |
| **MapZoomControls** | +/- / fit / locate-me | default, disabled (no geo perm) | Match Graph minimap control cluster |
| **MapEmptyState** | Icon + headline + CTA | no-entities, no-token, geocode-error | Pattern from Graph empty state |
| **RailNavItem** | Standard rail link | active shows "Locations" label on bottom rail | Existing `RailNavItem.vue` + route def |

### Pin visual spec

```
     ╭───╮
     │ ◉ │  ← type color fill, 2px border {colors.background}
     ╰───╯
       △    ← optional pointer when preview anchored below (prefer above)
```

- **Event:** `{colors.pin-event}` + `lucide:calendar`
- **Trip origin/destination:** `{colors.pin-trip}` + `lucide:map-pin` (two pins linked in Phase 1)
- **Appointment:** `{colors.pin-appointment}` + `lucide:stethoscope` or `lucide:calendar-clock`
- **Cluster (2+):** Merged circle, white count, `{colors.primary}` at 30% when selected

---

## Interaction matrix

| Input | States | Output |
|-------|--------|--------|
| Click **Locations** rail icon | — | Navigate to `/locations`; map animates to last viewport or fit-bounds |
| Pan / pinch map | — | Preview dismisses; viewport persists in sessionStorage |
| Scroll wheel | over map | Zoom (Mapbox default) |
| Hover pin | pin default → hover | Preview card above pin (8px gap); type + title + date snippet |
| Leave pin | — | Preview hides after 180ms (match AgentMessage mention timing) |
| Click pin | — | `dialogStack.push(entityId)`; preview stays until dialog closes |
| Toggle type filter chip | on ↔ off | Map re-filters pins; URL query `?types=event,trip` optional (Architect) |
| Click **Locate me** | geo denied / granted | Center on user; pulsing `{colors.primary}` dot |
| Click **Fit all** | 0 pins / N pins | Fit bounds or show empty state |
| **+ / −** zoom | — | Mapbox zoom by 1 level |
| No `MAPBOX_TOKEN` | — | Empty state with link to settings/docs; no crash |
| SSE entity mutation | pin added/removed | Pin layer refreshes (debounced 300ms) |

### Data → pin pipeline (for Architect)

1. Query entities with `latitude` + `longitude` **OR** geocodable fields (`location`, `origin`, `destination`)
2. Geocode text via Mapbox Geocoding API (client-side, cached Map keyed by normalized string)
3. Dedupe pins at identical coords (offset 12px spiral if collision)
4. Trips Phase 0: plot origin + destination as separate pins; Phase 1: arc layer

---

## Accessibility

**Focus order:** Rail Locations link → first filter chip → zoom + → zoom − → fit → locate me → map (roving tabindex on pin list alternative)

**Map canvas:** Provide **"List view"** toggle in filter panel (Architect AC) — same entities as accessible list beside/below map for keyboard users. Map-only is insufficient for a11y.

**Labels:**
- Rail: `aria-label="Locations map"`
- Pins: `role="button"`, `aria-label="{type}: {title}"`
- Filter chips: `aria-pressed` true/false
- Preview: `role="tooltip"` or `dialog` when click-to-open path active

**Motion:** Respect `prefers-reduced-motion` — disable flyTo animations; instant center instead.

**Contrast:** Preview card text meets WCAG AA on `{colors.surface}`; pin icons white on saturated type colors.

---

## Do's and Don'ts

**Do**

- Reuse Graph's floating panel visual language (blur, border, 11px chip text)
- Show entity count in filter panel header ("12 places")
- Prefer preview **above** pin (consistent with Chat mention previews)
- Client-only Mapbox; SSR placeholder skeleton
- Graceful degradation without token

**Don't**

- Add a permanent right sidebar — filters float
- Use deck.gl in Phase 0 (defer to Phase 1 wedge)
- Block the bottom mobile rail
- Geocode on every render — cache aggressively
- Custom Mapbox style until Phase 2

---

## Open for Architect

1. **Geocoding:** Client-side Mapbox Geocoding vs. server proxy (token exposure) — recommend server route `/api/geocode?q=` wrapping token.
2. **Ontology:** Add optional `latitude` / `longitude` number fields to event + trip schemas, or JSON `geo` object?
3. **URL state:** Persist `?types=` and viewport `{lng,lat,zoom}` in query for shareable links — MVP optional.
4. **List view:** Required for a11y — spec as parallel `LocationsList` column collapsible on desktop.
5. **Phase 1 deck.gl:** ScatterplotLayer + ArcLayer for trips — separate spec after MVP ships.

---

## Handoff checklist

- [x] `docs/artifacts/locations_map_design.md` (this file, DESIGN.md format)
- [x] `docs/artifacts/locations_map_mockup.html` (self-contained; CSS vars mirror YAML tokens)
- [ ] Architect encodes AC from Interaction matrix + Open items
- [ ] Human confirms Mapbox token available in `.env`
