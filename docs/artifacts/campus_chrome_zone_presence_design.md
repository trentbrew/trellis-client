---
version: alpha
name: campus_chrome_zone_presence
description: Design artifact for TRL-53 — ghost logo, dock-corner resident controls, header zone presence avatars, dock active bg-card; P2 zones-as-rooms bridge
source:
  tool: greenfield
  url: docs/artifacts/campus_chrome_zone_presence_mockup.html
  mock: docs/artifacts/campus_chrome_zone_presence_mockup.html
colors:
  background: "#0a0a0c"
  surface: "#141418"
  card: "#1a1a20"
  surface-1: "#0e0e11"
  surface-2: "#121216"
  text: "#e8e8ec"
  text-muted: "#888894"
  primary: "#6366f1"
  border: "#2a2a32"
  zone-lab: "#6366f1"
  zone-lobby: "#f59e0b"
  zone-workshop: "#10b981"
  zone-showroom: "#8b5cf6"
  zone-vault: "#f43f5e"
  presence-self: "#8b5cf6"
  presence-remote: "#f59e0b"
  presence-away: "#3a3a44"
  logo-ghost: "rgba(232, 232, 236, 0.45)"
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
  avatarInitials:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: 600
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
components:
  appHeader:
    height: 56px
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text}"
  ghostLogo:
    size: 32px
    backgroundColor: "transparent"
    textColor: "{colors.logo-ghost}"
  presenceAvatarStack:
    size: 24px
    backgroundColor: "{colors.presence-self}"
    textColor: "#ffffff"
  iconRail:
    height: 48px
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
  dockActiveItem:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
  dockResident:
    size: 32px
    backgroundColor: "{colors.presence-self}"
    textColor: "#ffffff"
  zonePlacard:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  presenceAway:
    backgroundColor: "{colors.presence-away}"
    textColor: "#c8c8d0"
  presenceRemote:
    backgroundColor: "{colors.presence-remote}"
    textColor: "{colors.background}"
  campusBorder:
    backgroundColor: "{colors.border}"
  zoneLab:
    backgroundColor: "{colors.zone-lab}"
  zoneLobby:
    backgroundColor: "{colors.zone-lobby}"
  zoneWorkshop:
    backgroundColor: "{colors.zone-workshop}"
  zoneShowroom:
    backgroundColor: "{colors.zone-showroom}"
  zoneVault:
    backgroundColor: "{colors.zone-vault}"
---

# Design: Campus chrome + zone presence

**Status:** Design complete (handoff to Architect)\
**Parent:** TRL-54 epic remap — proposal ids unstable post ops-repair; treat
this design as SoT for chrome+presence wedge\
**Design issue:** TRL-56 (remaps TRL-53 / TRL-55)\
**Mock:**
[campus_chrome_zone_presence_mockup.html](./campus_chrome_zone_presence_mockup.html)\
**Prior chrome:**
[campus_shell_chrome_design.md](./campus_shell_chrome_design.md) — **human
override** of header-only resident cluster\
**North star:** ADR-002 P2 — Campus zones are rooms (no `?room=` session layer)

---

## Overview

Shell chrome rebalance for a quieter sky and clearer locomotion dock.

**Emotional tone:** ghost brand mark (presence without chrome weight); identity
and create sit on the dock corners like physical affordances; collaboration
peers live in the sky next to ambient menubar.

**Who it serves:** solo local users (self avatar still visible) and multi-tab /
multi-peer zone presence without InstantDB cloud membership.

**Human override (2026-07-11):** Resident controls **split** — avatar and `+`
leave `AccountRailCluster` / header. Update
`.cursor/rules/trellis-shell-chrome.mdc` and placement tests to match this
design (old lock cancelled).

## Colors

| Role        | Token                                                                            | Use                                                  |
| ----------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Ghost logo  | `{colors.logo-ghost}`                                                            | Mark stroke/fill; no chip                            |
| Dock active | `{colors.card}`                                                                  | Selected nav pill — **no border**, no zone-tint fill |
| Zone accent | `--campus-zone-accent`                                                           | Separators / placard only — **not** dock active fill |
| Presence    | `{colors.presence-self}` / `{colors.presence-remote}` / `{colors.presence-away}` | Avatar fills                                         |

**Inset note:** Production `tailwind.css` derives `--surface-1/2` via
`color-mix(card × background)`. DESIGN.md lint requires literal colors —
`{colors.surface-1}` `#0e0e11` and `{colors.surface-2}` `#121216` are static
equivalents of card@25% / card@50% over `{colors.background}`. Mock `:root` uses
the same hex values (not live `color-mix`).

**Ghost logo hover:** raise from `{colors.logo-ghost}` toward `{colors.text}`
(color transition; not a YAML component sub-token).

**Presence stack:** max 4 visible + `+N`; overlap `-6px`; ring
`2px solid {colors.background}`.

## Typography

Avatar initials at 10px semibold. Tooltips use body 13px. No new display faces.

## Layout

```
┌─ Header ─────────────────────────────────────────────────────────────┐
│ [ghost logo] [breadcrumb…] [org?] … Omnibox …                         │
│              … [Menubar] [Presence×N] [Bell] [Capture]                │
└──────────────────────────────────────────────────────────────────────┘
┌─ Main (bg-surface-2) ────────────────────────────────────────────────┐
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
┌─ Dock (IconRail bottom) ─────────────────────────────────────────────┐
│ [Local?][Avatar] ………… [Chat · Graph · zone nav…] ………… [+]             │
└──────────────────────────────────────────────────────────────────────┘
```

| Region       | Contents                                                                            | Notes                                                               |
| ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Header left  | Ghost `AppLogo` + existing `CampusContextBreadcrumb` (+ org/app pickers when shown) | Unwrap logo chip only — **do not remove breadcrumb** (P0A baseline) |
| Header right | Menubar → **ZonePresenceAvatars** → Bell → Capture                                  | Presence before lobby/capture                                       |
| Dock start   | Optional `AdapterModeBadge` + `UserAccountMenu`                                     | Local badge rides with dock avatar                                  |
| Dock center  | Existing nav                                                                        | Active = `bg-card`, no border                                       |
| Dock end     | `QuickCreateButton`                                                                 | Primary furnish affordance                                          |

**Not on dock:** NotificationBell, QuickCapture (stay header).\
**Not remounting:** full `AccountRailCluster` on IconRail — mount children
separately.

### Replacement shell-chrome invariants (paste into `.mdc`)

1. **Header:** ghost logo, breadcrumb/org chrome, menubar, zone presence
   avatars, NotificationBell, QuickCapture.
2. **Dock start:** AdapterModeBadge (local) + UserAccountMenu.
3. **Dock end:** QuickCreateButton.
4. **Forbidden:** mounting `<AccountRailCluster>` on `IconRail` (whole cluster).
5. **Allowed:** mounting individual resident children on dock corners as above.
6. **Active dock:** `bg-card`, no border (no zone-tint active fill).

## Elevation & Depth

Inset surfaces: frame `{colors.surface-1}`, main `{colors.surface-2}`. Dock
transparent over frame. Active pill opaque `{colors.card}`.

## Shapes

Dock icons and resident buttons stay circular / pill (`{rounded.pill}`).
Presence avatars 24px with background ring for overlap.

## Components

| Component               | Anatomy                                   | States                                               | Maps to codebase                                                                                                                                 |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GhostLogo               | AppLogo, no wrapper fill                  | default / hover toward text                          | `AppHeader.vue` logo chip → unwrap                                                                                                               |
| CampusContextBreadcrumb | unchanged placard                         | zone label                                           | Keep left of omnibox (P0A)                                                                                                                       |
| ZonePresenceAvatars     | max 4 + `+N`, tooltip name·you·away·route | **always ≥ self when presence layer on**; away muted | Shell component; density from fractal `PresenceAvatars`; generalize `PresenceAvatarStack` (header 10px / -6px vs deck 8px / -ml-2 — intentional) |
| DockAvatar              | UserAccountMenu                           | open menu                                            | `UserAccountMenu.vue` on IconRail start                                                                                                          |
| AdapterModeBadge        | Local badge                               | local mode only                                      | Dock start, before avatar                                                                                                                        |
| DockCreate              | QuickCreateButton variant primary         | idle / menu open                                     | `QuickCreateButton.vue` on IconRail end                                                                                                          |
| DockActive              | RailNavItem / AppNavLink                  | inactive hover / active card                         | `.rail-nav-active-zone` → `bg-card border-0`                                                                                                     |
| HeaderBellCapture       | NotificationBell + QuickCapturePopover    | unchanged                                            | Remain in header                                                                                                                                 |

## Interaction matrix

| Input                            | States                    | Output                                                                        |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| Route enters zone                | zoneId changes            | Presence room = `zone:${zoneId}`; roster refreshes                            |
| Peer joins zone room             | 1–4 peers                 | Avatars stack in header; overflow `+N`                                        |
| Peer away                        | away flag                 | `{colors.presence-away}` fill; tooltip "· away"                               |
| Solo (self only)                 | presence enabled          | **Always show self** — never hide stack while presence layer is on            |
| Presence layer off               | sidecar/presence disabled | Hide entire stack (no InstantDB swap unless Architect chooses cloud fallback) |
| Hover / focus `+N`               | overflow > 0              | Tooltip lists remaining names (read-only; not a button)                       |
| Click / activate avatar in stack | —                         | **No activation** — decorative status; tooltips only                          |
| Click dock avatar                | menu closed→open          | Account menu (same content as today)                                          |
| Click dock `+`                   | menu closed→open          | Quick create (same content as today)                                          |
| Navigate dock item               | inactive→active           | Active item `bg-card`, no border; others ghost hover                          |
| Hover ghost logo                 | logo-ghost→text           | Optional navigate home if already wired                                       |
| `prefers-reduced-motion`         | —                         | No color transition on logo; presence appear/disappear instant                |

## Accessibility

- **Focus order (LTR):** ghost logo → breadcrumb → org/app pickers → omnibox →
  menubar items → **skip presence** (decorative) → bell → capture → main → dock
  Local badge → dock avatar → dock nav → dock `+`
- **Presence:** group `aria-label="People in this zone"`; children **not tab
  stops**. Tooltips on hover/pointer only for P0.
- **Labels:** dock avatar / create keep existing menu labels; Local badge
  labeled
- **Live regions:** optional polite announce when peer count changes
  (non-blocking for P0)
- **Motion:** honor `prefers-reduced-motion` on logo color transition and avatar
  enter
- **Hit targets:** dock corners ≥32px; presence avatars 24px status-only

## Do's and Don'ts

**Do**

- Key presence with `zonePresenceRoom(zoneId)` (ADR-002 D3)
- Keep menubar ambient-only (no furnish)
- Update shell-chrome rule + unit/e2e when implementing
- Use `bg-card` for active dock — not zone-tinted mix

**Don't**

- Remount whole `AccountRailCluster` on IconRail
- Put presence avatars on the dock
- Reintroduce filled logo chip
- Port playground `?room=` session rooms in this wedge
- Use zone accent border on active dock item

## Open for Architect

1. **Cloud roster:** When zone presence enabled, prefer zone stack; keep
   InstantDB members strip only when `isCloud && !zonePresenceEnabled`.
2. **Generalize vs fork:** Promote `PresenceAvatarStack` to
   `components/presence/` with peer shape shared by header + decks; unstub
   `useDeckPresence` to zone room. Header density deltas (10px / -6px) are
   intentional vs deck.
3. **Bell/capture / Local badge / breadcrumb:** Locked in this design — encode
   as AC.
4. **Rule rewrite:** Replace shell-chrome mdc with invariants listed under
   Layout (verbatim).
5. **Tests:** Rewrite `shell-chrome-placement.test.ts` +
   `campus-dock-resident.spec.ts`; assert active class has no border; presence
   in header; avatar/`+` on dock.
6. **Out of scope AC:** cron ticker, content-addressed blobs, hard zone ACL (P2
   proper).

## Handoff checklist

- [x] `docs/artifacts/campus_chrome_zone_presence_design.md`
- [x] `docs/artifacts/campus_chrome_zone_presence_mockup.html`
- [x] Paths ready for design issue `describe` SUMMARY
