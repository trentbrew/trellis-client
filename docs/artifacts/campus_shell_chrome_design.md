---
version: alpha
name: Campus Shell Chrome — three-layer hybrid shell
description: Design artifact for Campus shell refactor — GNOME sky + browser projection URI + Campus spatial dock; zone placard, ambient menubar, Resident cluster
source:
  url: "docs/artifacts/campus_shell_chrome_mockup.html"
  decision: "Hybrid chrome — not pure browser or pure GNOME; role-separated by CAMPUS locomotion verbs"
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-glass: "rgba(20, 20, 24, 0.65)"
  text: "#e8e8ec"
  text-muted: "#888894"
  primary: "#6366f1"
  border: "#2a2a32"
  zone-lab: "#6366f1"
  zone-lobby: "#f59e0b"
  zone-workshop: "#10b981"
  zone-showroom: "#8b5cf6"
  zone-vault: "#f43f5e"
  local-badge: "#34d399"
  destructive: "#ef4444"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  menubar:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: 500
    letterSpacing: 0.02em
  label:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.06em
    textTransform: uppercase
  placard:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: 6px
  md: 10px
  lg: 12px
  pill: 9999px
spacing:
  xs: 4px 
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  appHeader:
    height: 56px
    backgroundColor: "transparent"
    backdropBlur: 8px
  campusZonePlacard:
    height: 28px
    padding: "4px 10px"
    borderRadius: "{rounded.pill}"
    borderColor: "{colors.border}"
    accentBorder: "1px solid color-mix(in oklch, var(--campus-zone-accent) 40%, transparent)"
  appMenubar:
    height: 28px
    gap: "{spacing.sm}"
    chipHeight: 28px
    chipPadding: "0 8px"
    separatorColor: "{colors.border}"
  iconRail:
    height: 48px
    backgroundColor: "{colors.surface-glass}"
    backdropBlur: 16px
    borderTop: "1px solid {colors.border}"
  residentCluster:
    iconSize: 36px
    gap: "{spacing.xs}"
  omniboxTrigger:
    width: 168px
    height: 28px
    borderRadius: "{rounded.pill}"
  projectionUri:
    height: 28px
    fontSize: 11px
    fontFamily: "IBM Plex Mono, monospace"
    collapsedMaxWidth: 280px
    expandedMaxWidth: 480px
---

# Design: Campus Shell Chrome

**Status:** Design revised (2026-07-06) — baseline reconciled with shipped `CampusContextBreadcrumb`  
**Parent:** menubar-dock-shell proposal (Campus embodiment)  
**Mock:** [campus_shell_chrome_mockup.html](./campus_shell_chrome_mockup.html) — **stale** vs production breadcrumb; see [Implementation baseline](#implementation-baseline-2026-07-06)  
**Spec (Wedge A):** [campus_shell_chrome_p0a_spec.md](./campus_shell_chrome_p0a_spec.md)  
**Spec (Wedge B):** [campus_shell_chrome_p0b_spec.md](./campus_shell_chrome_p0b_spec.md)  
**Reference:** [CAMPUS.md](/Users/trentbrew/turtleos/CAMPUS.md) · plan `menubar_dock_shell`

---

## Implementation baseline (2026-07-06)

Code has **landed** for P0 wedges A + B. Treat this section as source of truth; the HTML mock predates production.

### Shipped (do not re-build)

| Design artifact | Shipped as | Path |
|-----------------|------------|------|
| Zone placard + projection URI | **`CampusContextBreadcrumb`** — `Local / Lab / Notes` | [`CampusContextBreadcrumb.vue`](../../apps/web/app/components/app/CampusContextBreadcrumb.vue) |
| Zone metadata + picker | **`campus-zones.ts`** | [`campus-zones.ts`](../../apps/web/app/lib/campus-zones.ts) |
| `data-campus-zone` + accent tokens | Breadcrumb watcher + `tailwind.css` | same + [`tailwind.css`](../../apps/web/app/assets/css/tailwind.css) |
| Sky menubar | **`AppMenubar`** — vitals, weather, clock, compact Omnibox | [`AppMenubar.vue`](../../apps/web/app/components/app/AppMenubar.vue) |
| Resident cluster | **`AccountRailCluster`** in **`AppHeader` right** (after menubar) — bell, avatar, +, capture | [`AppHeader.vue`](../../apps/web/app/components/app/AppHeader.vue) + [`AccountRailCluster.vue`](../../apps/web/app/components/app/AccountRailCluster.vue) |
| Dock zone separators | **`RailZoneSeparator`** + `campus-zone-routes.ts` | [`IconRail.vue`](../../apps/web/app/components/layout/IconRail.vue) |
| Zone routing for sheets/decks | **`useZoneContext` + `zone-router.ts`** | Workshop zone |

**Adopt breadcrumb fusion** — do not split back into `CampusZonePlacard` + `CampusProjectionUri` pills.

**Sky layer rule:** menubar is ambient + Omnibox only — no Furnish (+) or Capture (✎) in `AppMenubar`. Those live in **`AccountRailCluster`** on the **header right** (next to menubar), not on `IconRail`.

**Resident cluster rule:** mount **`AccountRailCluster`** with `placement="header"` in `AppHeader` only. Do **not** mount on `IconRail` (e2e: `campus-dock-resident.spec.ts`).

### Shipped deviations (accept or fix in follow-up)

| Topic | Design | Shipped |
|-------|--------|---------|
| Resident cluster placement | Dock right zone (Wedge B draft) | **Header top-right** after `AppMenubar` — superseded 2026-07-06 |
| Dock left column | Graph + Chat | **Chat only** left; Graph in center |
| Local badge | Dock + breadcrumb | Breadcrumb shows user name; optional **`AdapterModeBadge`** on rail only if cluster returns to dock |
| Graph URI expand | Click to show `entity:… / projection:…` | Human breadcrumb only (Wedge C) |

### Remaining wedges

| Wedge | Scope | Spec |
|-------|-------|------|
| **A — Sky menubar** | ✅ Shipped | `campus_shell_chrome_p0a_spec.md` |
| **B — Dock Resident cluster** | ✅ Shipped | `campus_shell_chrome_p0b_spec.md` |
| **C — URI expand (P1)** | Last breadcrumb crumb → graph address copy | TBD |

### New projections since design (breadcrumb must cover)

- `/sheets/:id`, `/decks/:id` → Workshop zone; projection label = sheet/deck title
- VCS kanban Lab board → projection label = board title
- Entity dialogs — optional future: `entity:slug` in expanded URI

---

## Overview

Reframe Trellis global chrome as a **three-layer hybrid shell** — not pure browser, not pure GNOME, not pure Campus alone. Each layer maps to a CAMPUS.md locomotion verb or spatial primitive:

| Layer | Metaphor | Campus role | Chrome home |
|-------|----------|-------------|-------------|
| **Sky** | GNOME status strip | Ambient field conditions | Menubar right |
| **Intent** | Browser address bar | Graph/projection addressing + apparition | `CampusProjectionUri` + Omnibox |
| **Ground** | Campus-native | Spatial orientation + walking | Zone placard + dock |

**Sky (GNOME):** clock, weather, facility vitals, host stats — *state*, not navigation. No File/Edit/View menus in P0.

**Intent (Browser):** routes are **projections** over graph entities (`?view=grid`, `entity:note-meeting`). The URI strip shows human path (`lab › notes`) collapsed; click expands to graph address (`entity:founder-facility-lab / projection:notes-grid`). Omnibox resolves graph URIs, EQL, routes, and NL — the apparition verb.

**Ground (Campus):** zone placard answers *which room*; dock answers *how do I walk*; Resident cluster answers *who am I and what can I furnish here*.

Brand posture: horticultural-architectural, not cyber-city. Plain zone names (`Lab`, `Lobby`, …). Density matches current Trellis dark shell — glass surfaces, pill affordances, 48px bottom rail. Emotional tone: *inhabited field* — bounded, calm, oriented.

Extends existing shadcn/Trellis tokens (`bg-card/60`, `backdrop-blur-xl`, `rail-foreground`) — zone accents are additive via `--campus-zone-accent`.

**Deferred (not P0):** browser tabs, back/forward stack, bookmarks bar — real concepts later (op-log navigation, open projections, pinned entities) but browser cosplay if shipped early.

## Colors

| Token | Role |
|-------|------|
| `{colors.zone-lab}` | Default room; Notes, Calendar, Mail, workspace routes |
| `{colors.zone-lobby}` | Front door; notification bell semantic |
| `{colors.zone-workshop}` | Collaboration; Graph, Chat, Messages, Workflows |
| `{colors.zone-showroom}` | Published artifacts; Collections, Pages |
| `{colors.zone-vault}` | Privileged; Settings, integrations |
| `{colors.local-badge}` | "Finite disk is yours" — Local mode pill in Resident cluster |
| `{colors.surface-glass}` | Dock + menubar chip backgrounds |

Zone accent applies to: placard border/icon, active dock pill background (`color-mix 12%`), menubar separator tint. **Never** flood page content — chrome frame only.

## Typography

- **Menubar chips:** 11px medium — macOS menu bar density
- **Zone placard:** 12px semibold — readable at glance
- **Dock active pill label:** 12px regular — room name when active
- **Residence copy:** "28 entities" in vitals tooltip (not "entities" in user-facing chrome)

## Layout

```
┌─ Header (56px) ───────────────────────────────────────────────────────────────────────────────┐
│ [●●●] Logo / Org / App  │ [🧪 Lab] │ [lab › notes · ⌄]  │ (flex) │ vitals│wx│clk│⌕ Go anywhere │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
         threshold            placard    projection URI (browser)          menubar sky (GNOME)
┌─ Sidebar ─┬─ Main content (existing page chrome unchanged) ─────────────────┐
│ PINNED    │                                                                 │
│ TYPES     │                                                                 │
└───────────┴─────────────────────────────────────────────────────────────────┘
┌─ IconRail (48px) ─────────────────────────────────────────────────────────────┐
│ [Graph][Chat] │ ─Lab─│Coll│Loc│Cal│Mail│…│─Show─│Pages│ │ [L][🔔][👤][+][✎] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Header zones

| Zone | Contents | Notes |
|------|----------|-------|
| Left | Traffic lights (Tauri), logo, org/app pickers | Unchanged; drag region on macOS |
| Center-left | `CampusZonePlacard` | Spatial: *which room* |
| Center | `CampusProjectionUri` | Browser: *which projection/address*; expandable |
| Flex spacer | — | Pushes menubar right |
| Right | `AppMenubar` | GNOME sky: vitals · host · weather · clock · Omnibox |

Collection save status floats between placard and URI strip when on collection page — does not displace URI.

### Menubar chip order (right → left reading macOS style)

`Search ⌘K` · `72° SF` · `28 entities · healthy` · `Fri Jul 3 · 3:40 PM`

Host CPU/memory chips appear only in Tauri builds, after vitals, separated by `|`.

### Dock zones

| Column | Width | Contents |
|--------|-------|----------|
| Left `shrink-0` | auto | Graph, Chat — memory palace + companion |
| Center `flex-1` | centered | Zone-grouped doors with thin `|` separators |
| Right `shrink-0` | auto | Resident cluster: Local, Bell, Avatar, Furnish (+), Capture (✎) |

**P0 grouping:** visual separators only; no collapsible sections.

## Elevation & Depth

- Header: `backdrop-blur-sm`, no heavy border (matches current `AppHeader`)
- Dock: `bg-card/60 backdrop-blur-xl border-t` — floating inset above content margin (`p-2.5`)
- Menubar chips: `bg-muted/30 border border-border/40` — recessed into header
- Omnibox overlay: unchanged immersive card (`z-100`, `pt-[15vh]`) — not part of this wedge
- Dropdowns from dock: `side="top"`, `sideOffset=8`

Inset hierarchy: page content > dock > menubar chips (chrome is thinnest layer).

## Shapes

- Menubar + placard: `rounded-full` pills, `h-7` / `h-9` dock icons
- Active dock item: expands to pill `h-9 px-4` with label (existing `RailNavItem` behavior)
- Zone separator: 1px × 20px vertical rule, `opacity-30`
- Avatar: `size-8` in dock cluster (slightly larger than nav icons for Resident identity)

## Components

| Component | Anatomy | States | Maps to codebase |
|-----------|---------|--------|------------------|
| `CampusZonePlacard` | `[zone-icon] ZoneName` | default, hover (tooltip), override (publish flow) | **New** — `useZoneContext()` |
| `CampusProjectionUri` | `[human-path] [expand ▾]` → `[zone-id / projection:slug ?view=]` | collapsed, expanded, copy-on-click, focus-for-edit (P1) | **New** — `useProjectionUri()` composable |
| `AppMenubar` | flex row of chips + separators | default; widget-hidden per settings | **New** — replaces header right cluster |
| `MenubarClock` | `EEE MMM d · h:mm a` | ticking; respects profile TZ | **New** |
| `MenubarVitals` | dot + `N entities` + health | healthy / degraded / loading | Extends `useStatusBar` |
| `MenubarHostStats` | CPU · MEM · BAT | Tauri only; hidden web | **New** + Tauri command |
| `MenubarWeather` | icon + temp | loading, error (hide chip), popover detail | **New** + `/api/ambient/weather` |
| `MenubarSearch` / Omnibox trigger | icon + "Go anywhere" + ⌘K | focus ring; opens overlay | Refactor `AppOmnibox` `variant="menubar"` |
| `AccountRailCluster` | Local · Bell · Avatar · + · Capture | each independent interactive | **New** — extracts `AppHeader` right |
| `AdapterModeBadge` | pill with icon + "Local" | local (green), cloud (sky) | Extract from `AppHeader` |
| `UserAccountMenu` | avatar dropdown | menu opens upward | Extract from `AppHeader` |
| `IconRail` zone groups | separator between route groups | active pill zone-tinted | Modify `IconRail.vue` |

### Zone → route grouping (dock center)

| Group | Routes | Zone |
|-------|--------|------|
| Lab | Ontologies, Collections*, Calendar, Mail, Locations | `lab` (*Collections path maps showroom server-side — show under Showroom group in dock) |
| Showroom | Collections, Pages | `showroom` |
| Workshop | Messages, Workflows | `workshop` |
| Vault | Settings | `vault` |

Graph + Chat pinned left (Workshop-adjacent semantics).

### Resident cluster semantics

| Control | `aria-label` | Tooltip |
|---------|--------------|---------|
| Local pill | `Data mode: Local` | Finite disk copy |
| Bell | `Lobby — notifications` | Unread count badge |
| Avatar | `Resident menu` | Profile, sign out |
| + | `Furnish` | Quick create in current zone |
| ✎ | `Capture` | Quick capture (⌘⇧N) |

## Interaction matrix

| Input | States | Output |
|-------|--------|--------|
| Route navigation | any | Zone placard + URI strip update; `--campus-zone-accent` on `<html>`; active dock pill tints |
| Click URI strip | collapsed → expanded | Shows `entity:founder-facility-lab / projection:notes-grid`; click segment copies |
| Click URI strip (expanded) | expanded → collapsed | Returns to human path `lab › notes` |
| Click Omnibox trigger / ⌘K | closed → open | Full-screen omnibox overlay; accepts graph URI, EQL, route, NL |
| Click zone placard | default | Tooltip: zone description + mutation tag (educational) |
| Click weather chip | default → popover | Detail: condition, high/low, location |
| Click vitals chip | default → tooltip | Entity count, health, backends |
| Click Local pill | default → tooltip | Adapter details (existing) |
| Click Bell | closed → open upward | Notification list; link to `/activity` |
| Click Avatar | closed → open upward | Profile, edit mode, sign out |
| Click + | closed → open upward | Entity type picker → `EntityDialog` |
| Click Capture | closed → popover | Quick capture form |
| Furnish/create | — | Mutation includes `zoneHeaders()` from `useZoneContext` |
| Appearance settings | toggles | Show/hide weather, host stats, clock format |

## Accessibility

- **Focus order:** header left → placard → projection URI → menubar chips (L→R) → main landmark → dock left → dock center → dock right
- **Labels:** every icon-only dock control has `aria-label`; menubar chips are buttons with accessible names
- **Live regions:** notification unread count on bell (`aria-live="polite"`); vitals health change announced only on error transition
- **Motion:** `prefers-reduced-motion` — disable zone accent crossfade (instant swap); no dock pill width animation
- **Contrast:** zone accent on active pill uses background mix, not text color alone — maintain 4.5:1 on labels
- **Keyboard:** ⌘K omnibox global; dock items remain tabbable links; dropdowns trap focus per shadcn pattern

## Do's and Don'ts

**Do**

- Use plain zone names everywhere in chrome
- Keep page content area unchanged — chrome carries spatial metaphor
- Open all dock-mounted menus upward (`side="top"`)
- Persist dock order + menubar widget prefs as Resident-owned arrangement (graph entity Phase 1.5; localStorage bootstrap P0)
- Show "entities" not "entities" in user-facing vitals

**Don't**

- Put dashboard widgets or feed tiles in menubar
- Use cyber labels (Nexus, terminal, Verse)
- Tint entire page background per zone — chrome only
- Silently reorder dock on upgrade
- Duplicate full-width center omnibox — menubar compact trigger only
- Ship browser tabs/back/forward in P0 — defer to op-log navigation wedge
- Put app menus (File/Edit/View) in menubar — fights Campus room model

### Projection URI format (P0)

| Mode | Example | Source |
|------|---------|--------|
| Collapsed human | `lab › notes` | `useZoneContext()` zone kind + route label |
| Expanded graph | `entity:founder-facility-lab / projection:notes-grid` | zone entity id + route projection slug |
| Entity detail | `lab › entity:note-meeting-notes` | zone + focused entity id when dialog open |
| Sheet view | `lab › sheet:roadmap-q3 ?view=grid` | `useSheetProjection` entity + view param |

Omnibox paste of any format navigates or opens projection. URI strip is read-mostly in P0; editable URI bar is P1.

## Open for Architect

1. **Collections zone ambiguity:** `/collections` maps to Showroom server-side but appears in workspace nav today — dock group under Showroom only, or duplicate icon? **Recommend:** single Showroom group entry.
2. **Account cluster on left-rail layout:** when `iconRailPosition === 'left'`, mount cluster at header right or bottom of left rail? **Recommend:** header right fallback.
3. **Member presence avatars:** P0 omit from dock; P1 show in Workshop zone only — confirm scope.
4. **Collection save status:** floats between placard and URI when active — confirm layout.
5. **`data-campus-zone` on `<html>`:** set from `default.vue` watcher — document SSR hydration (default `lab`).
6. **`useProjectionUri()` contract:** derive human + graph forms from `route` + `useZoneContext()` + optional focused entity ref — Architect defines interface.
7. **URI strip default:** collapsed human path; expanded on click only (not hover) — confirm.
8. **Three-layer separation:** menubar chips must never duplicate URI navigation — ambient only.

## Handoff checklist

- [x] `docs/artifacts/campus_shell_chrome_design.md` (this file, DESIGN.md format)
- [x] `docs/artifacts/campus_shell_chrome_mockup.html` (self-contained; CSS vars mirror YAML tokens)
- [ ] VCS design issue + `describe` SUMMARY when parent TRL-P exists
- [ ] Architect spec AC from "Open for Architect" section
