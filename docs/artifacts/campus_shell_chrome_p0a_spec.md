# Spec: Campus Shell Chrome — Wedge A (Sky Menubar)

**Parent:** [campus_shell_chrome_design.md](./campus_shell_chrome_design.md)  
**Baseline:** `CampusContextBreadcrumb` shipped — **do not modify** breadcrumb behavior in this wedge  
**VCS:** Create `TRL-*` spec issue when promoting to lane  
**Executor lane:** `agent:cursor` (or active dev lane)

---

## Problem

Header is overloaded: full-width center Omnibox competes with page chrome. Campus **sky layer** (ambient vitals, time, weather) has no home. Design intent (GNOME menubar) is unimplemented.

## Goal

Add **`AppMenubar`** to header right; relocate Omnibox to a compact menubar trigger; leave header center empty (collection save status may float left-of-menubar when contextual).

## Non-goals (this wedge)

- Moving notification bell / avatar to dock (Wedge B)
- Dock zone separators or accent pills (Wedge B)
- Expandable graph URI on breadcrumb (Wedge C)
- Tauri host stats (optional follow-up within A if trivial; else A.1)
- Weather API if blocked — ship vitals + clock first

---

## Layout (target)

```
[traffic · logo · CampusContextBreadcrumb · org/app]  (flex)  [vitals | host? | wx | clock | ⌕ Go anywhere ⌘K]
```

- Remove center `<AppOmnibox class="mx-2" />` from [`AppHeader.vue`](../../apps/web/app/components/app/AppHeader.vue)
- Mount `<AppMenubar />` in header right **before** existing action cluster OR **replace** vitals-overlap items only after Wedge B

**Wedge A keeps** header right: `NotificationBell`, members, avatar (unchanged until Wedge B).

---

## Components

### `AppMenubar.vue` (new)

Right-aligned `flex` row, `gap-2`, `h-7` chips, `app-region-no-drag`.

| Child | Responsibility |
|-------|----------------|
| `MenubarVitals` | Dot + `N residents` (from `useStatusBar` entity count); tooltip: health, backends. Copy: **residents** not entities. |
| `MenubarClock` | `Intl.DateTimeFormat` + `useUserProfile().timezone`; updates every 1s |
| `MenubarWeather` | Chip `icon + temp`; fetches `/api/ambient/weather`; hide chip on error |
| `MenubarHostStats` | Tauri only: CPU/MEM via `invoke('get_system_stats')`; omit on web |
| `MenubarSearch` | Compact Omnibox trigger |

Separators: 1px vertical rules tinted with zone accent when `--campus-zone-accent` lands (optional P0).

### `AppOmnibox.vue` (refactor)

- Split **trigger** from Teleport overlay body (already separate logically)
- Add prop `variant: 'center' | 'menubar'` (default `center` for backward compat during migration — then remove center)
- Menubar trigger: ~168px pill, label **"Go anywhere…"**, `⌘K` kbd, `aria-label="Go anywhere (Omnibox)"`
- Overlay unchanged (`z-100`, immersive card)

### Composables

| Composable | Notes |
|------------|-------|
| `useAmbientBar.ts` | Extends `useStatusBar`; aggregates clock, weather, host |
| `useWeather.ts` | Client fetch to server proxy; 15min cache |
| `useSystemStats.ts` | Tauri invoke; null on web |

### Server

`apps/web/server/api/ambient/weather.get.ts` — Open-Meteo proxy; query `lat`, `lon`.

### Tauri (optional A.1)

`get_system_stats` command in `apps/desktop/src-tauri` via `sysinfo` crate.

### Settings

[`settings/appearance.vue`](../../apps/web/app/pages/settings/appearance.vue) — toggles: show weather, show clock, show host stats (menubar widgets).

---

## CSS

Add to global CSS (e.g. `apps/web/app/assets/css/` or existing theme file):

```css
[data-campus-zone="lab"]      { --campus-zone-accent: … }
/* lobby, workshop, showroom, vault — match campus_shell_chrome_design.md tokens */
```

Apply to menubar separator tint only in Wedge A; dock pills in Wedge B.

`CampusContextBreadcrumb` already sets `data-campus-zone` on `<html>`.

---

## Acceptance criteria

1. **`AppMenubar` visible** in `AppHeader` right on `default` + `fullscreen` layouts when authenticated.
2. **No center Omnibox** — header center is empty on Notes/workspace routes; breadcrumb + pickers remain left.
3. **⌘K** opens Omnibox overlay from menubar trigger (global shortcut preserved).
4. **Clock** shows correct timezone from profile; ticks live.
5. **Vitals chip** shows resident count + health dot; tooltip includes adapter mode.
6. **Weather chip** renders when API succeeds; hidden (not broken layout) on failure.
7. **Host stats** hidden on web; visible in Tauri when command implemented.
8. **`CampusContextBreadcrumb` unchanged** — still `Local / Zone / Projection` with zone picker.
9. **Collection save status** still visible on collection pages (left header, not displaced by menubar).
10. **Tauri drag region** — menubar chips are `app-region-no-drag`.
11. **`bun run check`** (or project `pnpm check`) passes.
12. **Manual:** Notes page — header matches design density; no horizontal overflow at 1280px.

### E2E (optional P0)

Smoke: menubar visible, ⌘K opens dialog — add `e2e/campus-menubar.spec.ts` if QA time allows.

---

## File touch list

| Action | Path |
|--------|------|
| New | `app/components/app/AppMenubar.vue` |
| New | `app/components/app/menubar/MenubarVitals.vue` (or colocate) |
| New | `app/components/app/menubar/MenubarClock.vue` |
| New | `app/components/app/menubar/MenubarWeather.vue` |
| New | `app/components/app/menubar/MenubarSearch.vue` |
| New | `app/composables/useAmbientBar.ts` |
| New | `app/composables/useWeather.ts` |
| New | `server/api/ambient/weather.get.ts` |
| Modify | `app/components/app/AppHeader.vue` |
| Modify | `app/components/app/AppOmnibox.vue` |
| Modify | `app/pages/settings/appearance.vue` |
| Optional | `apps/desktop/src-tauri/src/lib.rs`, `Cargo.toml` |

---

## Open decisions (defaults for Executor)

| Question | Default |
|----------|---------|
| Menubar order L→R | vitals · host · weather · clock · search |
| Weather location | Profile city → browser geolocation → omit |
| Vitals in menubar vs duplicate breadcrumb Local tooltip | Menubar = aggregate health; breadcrumb Local = runtime detail (both OK) |

---

## Wedge B preview (out of scope)

Move `NotificationBell`, avatar menu from `AppHeader` to `AccountRailCluster` in `IconRail` right zone; add zone group separators.
