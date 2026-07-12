# Spec: Campus shell chrome + zone presence

**Parent design:**
[campus_chrome_zone_presence_design.md](./campus_chrome_zone_presence_design.md)\
**Mock:**
[campus_chrome_zone_presence_mockup.html](./campus_chrome_zone_presence_mockup.html)\
**VCS:** TRL-60 (remaps pipeline TRL-56 design handoff; intermediate TRL-57–59
lost to ops)\
**Labels:** `spec`, `needs-e2e`\
**ADR:** ADR-002 D3/P2 bridge — rooms = Campus zones (`zone:${zoneId}`); no
session-room port

**Supersedes (placement only):**
[campus_shell_chrome_p0b_spec.md](./campus_shell_chrome_p0b_spec.md) dock-mount
cancellation — human override 2026-07-11 **splits** resident controls onto dock
corners while still forbidding full `AccountRailCluster` on `IconRail`.

---

## Problem

Header is overcrowded with the full resident cluster. Dock active state uses
zone-tint + border (`.rail-nav-active-zone`) instead of a quiet `bg-card` chip.
Zone presence exists for pages only; decks stub a single self avatar; shell has
no zone peer strip like fractal-playground.

## Goal

1. Ghost logo (no fill chip) top-left; keep `CampusContextBreadcrumb`.
2. Zone presence avatars in header right (before bell/capture).
3. Dock start: Local badge + user avatar; dock end: Quick create `+`.
4. Header keeps bell + capture (not full cluster).
5. Active dock item: `bg-card`, no border.
6. Rewrite shell-chrome rule + unit/e2e to match.
7. Unstub deck presence onto the same zone room key.

## Non-goals

- Continuous fractal vantage / dual-shell morph
- Playground `?room=` / Room graph type
- Hard zone ACL enforcement (P2 proper — post SPEC-v1.1)
- Cron ticker / content-addressed blobs (follow-on wedges)
- Remounting `<AccountRailCluster>` on `IconRail`

---

## Decisions (locked)

| ID | Decision                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | **Split residents:** do not mount full `AccountRailCluster` on rail. Mount children separately.                                                                                |
| D2 | **Header remains:** Menubar → ZonePresenceAvatars → NotificationBell → QuickCapture. Remove avatar + `+` from header cluster (or dissolve cluster into explicit mounts).       |
| D3 | **Dock:** start = `AdapterModeBadge` (local) + `UserAccountMenu`; end = `QuickCreateButton`.                                                                                   |
| D4 | **Presence room:** `zonePresenceRoom(zoneId)` from `useZoneContext()`. Always show ≥ self when presence layer enabled.                                                         |
| D5 | **Cloud roster:** Prefer zone stack when zone presence enabled; InstantDB member strip only when `isCloud && !zonePresenceEnabled`.                                            |
| D6 | **Active dock:** replace zone-tint/border active styles with `bg-card` + no border (`.rail-nav-active-zone` or successor class). Zone accent stays on separators/placard only. |
| D7 | **Presence a11y:** stack is decorative — `aria-label="People in this zone"`; children not tab stops.                                                                           |
| D8 | **Generalize stack:** move/adapt `PresenceAvatarStack` under `components/presence/` for header + decks (header density 10px / -6px OK).                                        |

---

## File touch map

| File                                                 | Change                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/components/app/AppHeader.vue`          | Unwrap logo chip; remove avatar/+ from cluster; mount zone presence; keep bell/capture (via slim mounts or reduced cluster) |
| `apps/web/app/components/app/AccountRailCluster.vue` | Slim to bell+capture for header, **or** delete usage and mount bell/capture directly                                        |
| `apps/web/app/components/layout/IconRail.vue`        | `sectionClass('start'/'end')`: Local badge, UserAccountMenu, QuickCreateButton                                              |
| `apps/web/app/assets/css/tailwind.css`               | `.rail-nav-active-zone` → card fill, no border                                                                              |
| `apps/web/app/components/layout/RailNavItem.vue`     | Match active classes                                                                                                        |
| `apps/web/app/components/presence/*` (new)           | Header/deck avatar stack + thin `useZonePresence` composable if needed                                                      |
| `apps/web/app/composables/useDeckPresence.ts`        | Join `zonePresenceRoom(zoneId)`; stop stub-only self                                                                        |
| `apps/web/app/composables/useTrellisPagePresence.ts` | Reuse shared join helper if extracted                                                                                       |
| `.cursor/rules/trellis-shell-chrome.mdc`             | Paste design invariants (header/dock split)                                                                                 |
| `AGENTS.md` § Shell chrome                           | Align with new rule                                                                                                         |
| `shell-chrome-placement.test.ts`                     | Assert split mounts; forbid full cluster on rail                                                                            |
| `tests/e2e/campus-dock-resident.spec.ts`             | Avatar dock-start; + dock-end; bell header; presence header; active card                                                    |

---

## Component contracts

### Ghost logo

- Remove wrapper `bg-rail-foreground/10` / `rounded-lg` chip around `AppLogo`.
- Transparent hit target ≥32px; muted mark (opacity or `text-muted` / ghost
  color).

### ZonePresenceAvatars

- Data: peers from `joinPresence` on `zone:${zoneId}`.
- UI: max 4 + `+N`; tooltips name · you · away · route; away muted.
- Show when presence layer on (always include self). Hide when presence
  disabled.
- `data-testid="zone-presence-avatars"` on group.

### IconRail corners

- Start: `AdapterModeBadge` (if local) +
  `UserAccountMenu placement="rail" rail-position="bottom"`.
- End: `QuickCreateButton placement="rail" … variant="primary"`.
- Center nav unchanged aside from active styles.

---

## Acceptance criteria

### Behavioral

1. Ghost logo in header left has no filled background chip.
2. `CampusContextBreadcrumb` still present in header.
3. `UserAccountMenu` is in Navigation rail start (bottom-left when dock bottom);
   not in header.
4. `QuickCreateButton` is in Navigation rail end (bottom-right); not in header.
5. `NotificationBell` and Quick capture remain in header (not rail).
6. Zone presence group (`People in this zone` /
   `data-testid="zone-presence-avatars"`) renders in header when presence
   enabled; includes self when solo.
7. Active dock nav item uses `bg-card` (or computed equivalent) and has **no**
   border.
8. `.cursor/rules/trellis-shell-chrome.mdc` documents split invariants; forbids
   `<AccountRailCluster>` on `IconRail`.
9. `useDeckPresence` joins `zonePresenceRoom(zoneId)` (not stub-only local
   viewer).
10. No `<AccountRailCluster>` mount on `IconRail.vue`.

### Machine

```
test:pnpm --filter @trellis/web exec vitest run app/components/layout/shell-chrome-placement.test.ts
test:pnpm --filter @trellis/web exec vitest run app/lib/presence/zone-presence.test.ts
test:pnpm check
test:pnpm --filter @trellis/web test:e2e tests/e2e/campus-dock-resident.spec.ts
```

---

## Verification notes for Executor / Reviewer

- Unit placement tests must assert: no `AccountRailCluster` on IconRail;
  `UserAccountMenu` + `QuickCreateButton` present in IconRail source; ghost logo
  wrapper absent or transparent; presence mount in AppHeader.
- E2E: avatar menu from **rail**; quick create from **rail**; bell from
  **header**; presence testid in header when presence on (skip or soft-assert if
  presence layer off in CI).
- Do not start Playwright as Executor — Reviewer/QA runs e2e AC.

## Out of scope follow-ons

- Cron ticker plugin
- Content-addressed / relay blobs
- Capability-gated join middleware (true ADR-002 P2)
