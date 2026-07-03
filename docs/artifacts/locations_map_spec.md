# Spec: Locations Map (TRL-LOC)

**Status:** Spec ready for implementation  
**Parent:** TRL-LOC/design → TRL-LOC/proposal  
**Design:** [locations_map_design.md](./locations_map_design.md) · [locations_map_mockup.html](./locations_map_mockup.html)  
**Phase:** 0 (Mapbox GL MVP — no deck.gl)

---

## Summary

Add a **Locations** primary-rail route at `/locations` rendering a full-bleed Mapbox GL map. Plot pins for graph entities that have coordinates or geocodable location text (event, trip, appointment). Reuse Graph floating-panel chrome, `EntityPreviewCard`, and `useDialogStack` for pin interaction.

---

## Architectural decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map library | `mapbox-gl` v3 | Standard; no deck.gl in Phase 0 |
| Map style | `mapbox://styles/mapbox/dark-v11` | Matches design; no custom style JSON |
| Client token | `runtimeConfig.public.mapboxToken` ← `NUXT_PUBLIC_MAPBOX_TOKEN` | Required for GL JS tiles |
| Geocoding | Server proxy `GET /api/geocode?q=` | Keeps geocoding off client; uses `MAPBOX_ACCESS_TOKEN` server-side |
| Coordinates | Add optional `latitude` + `longitude` (`number`) to event, trip, appointment ontologies | EQL-queryable; avoids nested JSON in Phase 0 |
| Text → coords | Geocode `location` (event, appointment), `origin` + `destination` (trip) via proxy | Existing rich_text fields |
| Pin identity | One pin per `(entityId, fieldKey)` — trips may produce 2 pins | Phase 0; arcs deferred |
| Viewport persistence | `sessionStorage` key `trellis:locations:viewport` | MVP; URL query deferred |
| Filter persistence | In-memory + optional `?types=event,trip` sync | Lightweight share |
| SSE refresh | Watch `useEntities()` items + debounce 300ms | Matches graph live updates |
| Rail placement | Center primary via route config only — **no** IconRail special-case | Graph/Chat left split unchanged |
| List view | Collapsible left panel (desktop) / sheet (mobile) | A11y requirement from design |

---

## File plan

### New files

| Path | Responsibility |
|------|----------------|
| `apps/web/app/pages/locations/index.vue` | Page shell: `Page variant="canvas" fill-height`, `ClientOnly` wrapper |
| `apps/web/app/components/views/LocationsMapView.vue` | Map init, markers, overlays, empty states |
| `apps/web/app/components/locations/MapFilterPanel.vue` | Type chips, count, list-view toggle |
| `apps/web/app/components/locations/MapZoomControls.vue` | +/−, fit-bounds, locate-me |
| `apps/web/app/components/locations/LocationsListPanel.vue` | Keyboard-accessible entity list |
| `apps/web/app/components/locations/MapPreviewCard.vue` | Fixed-position wrapper around `EntityPreviewCard` + footer |
| `apps/web/app/composables/useLocationsMap.ts` | Pin derivation, filter state, geocode orchestration, viewport |
| `apps/web/app/lib/locations/types.ts` | `MapPin`, `GeocodeResult`, `LocationEntityType` |
| `apps/web/app/lib/locations/pin-styles.ts` | Type → color/icon (mirror design tokens + entityRegistry) |
| `apps/web/app/lib/locations/extract-pins.ts` | Pure: entities → pin candidates (testable) |
| `apps/web/app/lib/locations/geocode-cache.ts` | In-memory LRU keyed by normalized query string |
| `apps/web/server/api/geocode.get.ts` | Mapbox Geocoding API proxy with 24h in-memory cache |
| `apps/web/server/lib/locations/geocode-server.test.ts` | Unit tests for query validation + response shaping |

### Modified files

| Path | Change |
|------|--------|
| `apps/web/server/utils/tql-routes.ts` | Add `locationsRoute`; register in `getRouteDefinitions()` |
| `apps/web/server/utils/tql-ontologies.ts` | Add `latitude`, `longitude` number fields to event, trip, appointment |
| `apps/web/app/config/entityRegistry.ts` | Add lat/lng to property fields for those types (display: inline, optional) |
| `apps/web/nuxt.config.ts` | `runtimeConfig.public.mapboxToken`, `runtimeConfig.mapboxAccessToken` |
| `apps/web/package.json` | Dependency `mapbox-gl`; devDependency `@types/mapbox-gl` |
| `docs/sidecar-dev.md` (or root `.env` comment block) | Document `NUXT_PUBLIC_MAPBOX_TOKEN` + `MAPBOX_ACCESS_TOKEN` |

### Explicitly out of scope (Phase 0)

- `@deck.gl/*` packages
- Trip arc layers
- Mapbox custom style JSON
- IconRail.vue changes (route config drives center rail)
- Persistent geocode cache in SQLite

---

## Route definition

```typescript
// apps/web/server/utils/tql-routes.ts
const locationsRoute: RouteDefinition = {
  '@id': 'route:locations',
  '@type': 'trellis:Route',
  routePath: '/locations',
  label: 'Locations',
  icon: 'lucide:map-pin',
  order: 3.5,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: true,
  searchKeywords: ['locations', 'map', 'places', 'geo', 'travel'],
  meta: {
    title: 'Locations',
    description: 'Map view of places in your graph',
    fullWidth: true,
    hideSidebar: true,
  },
}
```

---

## Data model

### Ontology additions (all three types)

```typescript
f('latitude', 'number', { display: 'inline-input' }),
f('longitude', 'number', { display: 'inline-input' }),
```

Add to `propertyFieldIds` for event, trip, appointment.

### Pin extraction (`extract-pins.ts`)

For each entity of type `event` | `trip` | `appointment`:

1. If `latitude` and `longitude` are finite numbers → emit pin `{ entityId, fieldKey: 'coordinates', lat, lng, label: title }`
2. Else for text fields (strip HTML, trim):
   - **event / appointment:** `location`
   - **trip:** `origin` (label suffix `" (origin)"`), `destination` (suffix `" (destination)"`)
3. Skip empty strings; dedupe identical `(entityId, fieldKey)`

Geocoding happens in composable after extraction — not in pure extractor.

### Geocode API

```
GET /api/geocode?q=San+Francisco,+CA
→ { lat: number, lng: number, placeName: string } | 404
```

- Requires `MAPBOX_ACCESS_TOKEN` env; return 503 if missing
- Cache key: normalized lowercase trimmed query; TTL 24h
- Limit: forward geocode, `limit=1`, `types=place,locality,address,poi`
- Rate-limit: max 10 concurrent geocode requests from client composable

---

## Component architecture

```
locations/index.vue
└── ClientOnly
    └── LocationsMapView
        ├── MapFilterPanel
        ├── LocationsListPanel (v-show listOpen)
        ├── div.map-container (ref for mapbox)
        ├── MapPreviewCard (Teleport to body OR absolute in container)
        ├── MapZoomControls
        └── MapEmptyState (no-token | no-pins | loading)
```

### `useLocationsMap.ts` responsibilities

- `pins: ComputedRef<MapPin[]>` — extracted + geocoded
- `visiblePins` — filtered by active type chips
- `typeFilters: Ref<Record<LocationEntityType, boolean>>`
- `initMap(container: HTMLElement)` / `destroyMap()`
- `fitBounds()` / `zoomIn()` / `zoomOut()` / `locateUser()`
- `selectedPinId` / `hoveredPinId`
- `loadViewport()` / `saveViewport()` from sessionStorage
- Watch `items` from `useEntities()` → re-extract + debounced marker refresh

### Map markers

- Use Mapbox `Marker` with custom HTML element (28px circle per design)
- `role="button"`, `tabindex="0"`, `aria-label="{type}: {title}"`
- Selected: `box-shadow: 0 0 0 2px var(--primary)`
- Collision: if two pins share coords within 0.0001°, offset second by 12px spiral (max 3 attempts)

### Preview card

- Position **above** pin: `top = pinRect.top - 8px; transform: translateY(-100%)`
- Flip below if `pinRect.top < 120px` viewport from top
- 180ms hide delay on mouseleave (match `AgentMessage.vue`)
- Click pin → `useDialogStack().push(entityId, type, entity)`

### List panel (a11y)

- Toggle from filter panel button `☰ List view`
- Desktop: 280px column slides in from left over map (z-15)
- Mobile: bottom sheet (max 50vh)
- Each row: type icon, title, field label; Enter/click → same as pin click
- Roving tabindex when list open

### Empty states

| Condition | UI |
|-----------|-----|
| `!mapboxToken` | Center card: "Mapbox token not configured" + link to docs anchor |
| Token ok, geocoding, 0 resolved pins | Loading spinner overlay |
| Token ok, 0 candidates | Icon `lucide:map-pin`, "No places yet", CTA button → create event |
| Geocode failures for all text | Show partial pins + muted banner "Some locations couldn't be placed" |

### Motion

```typescript
const prefersReducedMotion = usePreferredReducedMotion()
// flyTo duration: prefersReducedMotion ? 0 : 800
```

---

## Environment

| Variable | Scope | Required |
|----------|-------|----------|
| `NUXT_PUBLIC_MAPBOX_TOKEN` | Client (GL JS) | Yes for map render |
| `MAPBOX_ACCESS_TOKEN` | Server (Geocoding API) | Yes for text locations; can equal public token in dev |

Document in `docs/sidecar-dev.md` env table.

---

## CSS

Import Mapbox CSS once in `LocationsMapView.vue`:

```typescript
import 'mapbox-gl/dist/mapbox-gl.css'
```

Override `.mapboxgl-ctrl-logo` opacity if needed; keep attribution visible (Mapbox ToS).

Optional vignette: absolute overlay per design `map-vignette`, `pointer-events: none`.

---

## Acceptance criteria

### Route & navigation

- [ ] **AC-1** `GET /locations` renders without SSR error; page uses `Page` `variant="canvas"` + `fill-height`
- [ ] **AC-2** Route registered in `tql-routes.ts` with label **Locations**, icon `lucide:map-pin`, `order: 3.5`, `inRail: true`, `collapseSidebar: true`, `meta.fullWidth: true`
- [ ] **AC-3** Locations appears in primary rail center group (not left Graph/Chat cluster) when server routes load
- [ ] **AC-4** Command palette includes Locations with search keywords

### Map rendering

- [ ] **AC-5** With valid `NUXT_PUBLIC_MAPBOX_TOKEN`, map renders `dark-v11` filling content area
- [ ] **AC-6** Without token, no throw — empty state card shown
- [ ] **AC-7** Map initializes inside `<ClientOnly>`; loading skeleton shown until ready
- [ ] **AC-8** Viewport saved/restored from `sessionStorage` on revisit

### Data & pins

- [ ] **AC-9** Entity with `latitude`/`longitude` appears as pin without geocoding
- [ ] **AC-10** Event with `location` text geocodes via `/api/geocode` and appears as pin
- [ ] **AC-11** Trip with `origin` and/or `destination` produces separate pins
- [ ] **AC-12** Appointment with `location` text geocodes and appears as pin
- [ ] **AC-13** Type filter chips toggle pin visibility; header shows `"N places"` count
- [ ] **AC-14** SSE entity update (create/update/delete) refreshes pins within 300ms debounce

### Interaction

- [ ] **AC-15** Hover pin shows preview card **above** pin with `EntityPreviewCard` content
- [ ] **AC-16** Click pin opens entity via `dialogStack.push`
- [ ] **AC-17** Zoom +/−, fit-all, locate-me controls work; locate-me handles permission denied gracefully
- [ ] **AC-18** `prefers-reduced-motion: reduce` disables flyTo animation

### Accessibility

- [ ] **AC-19** List view toggle opens keyboard-navigable entity list mirroring visible pins
- [ ] **AC-20** Filter chips use `aria-pressed`; pins use `role="button"` + descriptive `aria-label`

### Server

- [ ] **AC-21** `GET /api/geocode?q=` returns `{ lat, lng, placeName }` for valid query; 400 on empty; 503 without token
- [ ] **AC-22** Geocode responses cached (same query within 24h does not hit Mapbox twice — unit test with mock fetch)

### Tests

- [ ] **AC-23** `extract-pins.test.ts` — covers lat/lng, text fields, trip dual pins, HTML strip, skip empty
- [ ] **AC-24** `geocode-server.test.ts` — validation, cache hit, error shaping

### Docs

- [ ] **AC-25** Env vars documented for local dev setup

---

## Verification commands

```bash
cd apps/web
pnpm add mapbox-gl
pnpm add -D @types/mapbox-gl

# Unit tests
pnpm exec vitest run app/lib/locations/extract-pins.test.ts server/lib/locations/geocode-server.test.ts

# Manual (requires tokens in ../../.env)
# NUXT_PUBLIC_MAPBOX_TOKEN=pk.... MAPBOX_ACCESS_TOKEN=pk....
# Open /locations — confirm pins, filters, preview, dialog open
```

---

## Open questions (Executor defaults)

1. **Same token for public + server in dev?** Yes — acceptable for local; prod should use URL-restricted public token + secret for geocoding.
2. **Cluster plugin?** Defer — if >50 pins overlap, use simple spiral offset only in Phase 0.
3. **Workspace path prefix** `/w/:org/...` — page at `pages/locations/index.vue` auto-cloned like calendar; no extra work if existing route clone middleware covers new top-level routes.

---

## Handoff checklist

- [x] Spec encodes design interaction matrix as AC
- [x] File plan with create/modify list
- [x] Data model + API contract defined
- [ ] Executor implements; Reviewer validates AC-1–AC-25
