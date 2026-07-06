---
version: alpha
name: Alarm panel vs Activity stream — Lobby P1
description: Design artifact for TRL-PROP-alarm-discipline-p1 — EEMUA split between interrupt bell and passive activity feed
source:
  tool: greenfield
  url: docs/artifacts/notification_activity_p1_mockup.html
  mock: docs/artifacts/notification_activity_p1_mockup.html
  parent: TRL-PROP-alarm-discipline-p1
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-elevated: "#1a1a20"
  surface-glass: "rgba(20, 20, 24, 0.65)"
  text: "#e8e8ec"
  text-muted: "#888894"
  primary: "#6366f1"
  border: "#2a2a32"
  zone-lobby: "#f59e0b"
  interrupt: "#ef4444"
  interrupt-muted: "rgba(239, 68, 68, 0.12)"
  passive: "#64748b"
  passive-muted: "rgba(100, 116, 139, 0.10)"
  success: "#34d399"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: 600
    letterSpacing: -0.02em
  label:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.06em
    textTransform: uppercase
  meta:
    fontFamily: IBM Plex Mono
    fontSize: 10px
    fontWeight: 400
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
  alarmPanel:
    width: 420px
    maxHeight: 520px
    headerPadding: "{spacing.lg}"
    rowPadding: "{spacing.md}"
    interruptAccentWidth: 3px
    interruptAccentColor: "{colors.interrupt}"
  activityPage:
    maxWidth: 720px
    headerPadding: "{spacing.xl}"
    rowGap: 0
    dayDividerHeight: 32px
  activityRow:
    passiveIconSize: 32px
    interruptIconSize: 36px
    passiveOpacity: 0.85
  lobbyNavDot:
    size: 6px
    color: "{colors.zone-lobby}"
    showWhen: unread_passive_only
---

# Design: Alarm panel vs Activity stream

**Status:** Design complete (handoff to Architect)  
**Parent:** [notification_activity_p1_proposal.md](./notification_activity_p1_proposal.md) · TRL-PROP-alarm-discipline-p1  
**Mock:** [notification_activity_p1_mockup.html](./notification_activity_p1_mockup.html)  
**P0 baseline:** [notification_rationalization_spec.md](./notification_rationalization_spec.md)  
**Shell context:** [campus_shell_chrome_design.md](./campus_shell_chrome_design.md)

---

## Overview

P0 separated **interrupt** (bell/toast) from **passive** (graph status) at the data layer. P1 gives passive notifications a **quiet home** without weakening the alarm panel.

**Posture:** Industrial control-room discipline — the bell is the alarm annunciator; the activity stream is the trend screen. Lobby zone (`zone-lobby` amber) owns this surface because the rail tooltip already reads "Lobby — notifications."

**Audience:** Solo operator reviewing sync status after the fact; not interrupted during flow.

---

## Design decisions (proposal open questions)

| Question | Decision | Rationale |
| -------- | -------- | --------- |
| Route | **`/lobby/activity`** | Campus Lobby semantics; avoids collision with `/ontologies/activity` (mutation log). Bell footer + rail deep-link here. Legacy `/activity` → 301 redirect. |
| Feed scope | **Unified notification timeline** on Status tab; **separate link** to mutation log | Show passive + interrupt history with delivery styling. Do not merge TQL op-log into same query P1 — cross-link only. |
| Unread passive | **Soft lobby dot** on activity nav entry; **no numeric badge** | EEMUA: status is not an alarm. Numeric badges reserved for interrupt bell. |
| Header vs rail bell | **Same panel content**; rail uses existing compact trigger | One `AlarmPanel` composition; placement prop only affects trigger + popover side. |

---

## Colors

| Token | Role |
| ----- | ---- |
| `{colors.interrupt}` | Interrupt row accent bar, ACTION chip, bell badge dot |
| `{colors.passive}` | Passive row icons, STATUS chip, muted timestamps |
| `{colors.zone-lobby}` | Activity page zone stripe, lobby nav dot, page eyebrow |
| `{colors.surface-elevated}` | Activity page canvas; alarm panel floats above |

Interrupt rows use **left accent bar** (3px, `{colors.interrupt}`). Passive rows have **no accent bar** — density and muted type signal quiet status.

---

## Typography

- **Alarm panel title:** "Action required" — semibold 16px when interrupts present; "All caught up" when empty.
- **Activity page title:** "Activity" — `{typography.title}`; subtitle 12px muted: "Status and sync — review when ready."
- **Day dividers:** `{typography.label}` — "Today", "Yesterday"
- **Row title:** 13px semibold (interrupt) / 13px medium (passive unread) / 13px regular muted (passive read)

---

## Layout

### Alarm panel (bell dropdown)

```
┌────────────────────────────────────── 420px ──┐
│ Action required          [Mark all read]      │
│ 2 need your attention                         │
├───────────────────────────────────────────────┤
│ ▌ [icon] Gmail connection lost          2m    │  ← interrupt only
│ ▌         Reconnect to restore sync           │
│ ▌         [Reconnect] [Dismiss]                 │
├───────────────────────────────────────────────┤
│ (empty state: bell icon + "All caught up")    │
├───────────────────────────────────────────────┤
│        View activity in Lobby →               │  → /lobby/activity
└───────────────────────────────────────────────┘
```

- **Interrupt-only list** in panel body (unchanged P0 filter).
- Footer CTA copy: **"View activity in Lobby"** (not "View all activity").
- Empty state: no passive teaser in bell — passive lives on activity page only.

### Activity page (`/lobby/activity`)

```
┌────────────────────────────────────────────────────────┐
│ LOBBY · Activity                                       │
│ Activity                                               │
│ Status and sync — review when ready.                   │
│ [Status] [Alerts history]                              │
├────────────────────────────────────────────────────────┤
│ TODAY                                                  │
│ ○ Task completed · graph · 4m                          │  passive
│ ○ Bulk update finished · 12 entities · 1h              │  passive
│ ▌ Gmail connection lost · ops · 2m        [ACTION]     │  interrupt (styled)
├────────────────────────────────────────────────────────┤
│ Footer: Mutation log lives at Ontologies →             │
└────────────────────────────────────────────────────────┘
```

- Max width **720px**, centered in main shell content area.
- Tabs: **Status** (default, all deliveries) · **Alerts history** (interrupt only, archive-friendly).
- Group by calendar day.

### Rail placement

- Trigger: 32px circle in `AccountRailCluster` (shipped).
- Popover opens **up** from bottom rail / **right** from side rail (shipped `menuSide` logic).
- Tooltip: "Lobby — notifications (N unread)" — N = interrupt count only.

---

## Elevation & Depth

- Alarm panel: `shadow-2xl`, `border-border/50`, `bg-card` — floating annunciator.
- Activity page: inset canvas `{colors.surface-elevated}` with subtle top border; rows separated by `border-b border-border/40`.
- No toast or sound on activity page load.

---

## Shapes

- Row icons: 36px rounded-xl (interrupt) / 32px rounded-lg (passive) — passive slightly smaller = lower salience.
- Chips: 9px uppercase label style (match existing `NotificationItem` source chip).
- Delivery chip: `ACTION` (interrupt, red ring) vs `STATUS` (passive, slate ring).

---

## Components

| Component | Anatomy | States | Maps to codebase |
| --------- | ------- | ------ | ---------------- |
| **AlarmPanel** | Header + scroll list + footer link | empty · has-interrupts · loading | Extract from `NotificationBell.vue` dropdown content |
| **NotificationBell** | Trigger + `AlarmPanel` | header/rail placement | `NotificationBell.vue` — update footer `navigateTo('/lobby/activity')` |
| **ActivityFeedPage** | Zone eyebrow + title + tabs + timeline | loading · empty · populated | **new** `pages/lobby/activity.vue` |
| **ActivityFeedRow** | Icon + title + body + chips + actions | passive-unread · passive-read · interrupt | Extend `NotificationItem.vue` with `variant` from `resolveNotificationDelivery()` |
| **ActivityDayGroup** | Sticky day label + rows | — | **new** presentational |
| **LobbyActivityNavDot** | 6px dot on sidebar/rail activity link | hidden · visible (unread passive) | **new** composable `hasUnreadPassive` |

### ActivityFeedRow visual diff

| Delivery | Left bar | Icon size | Title weight | Chip |
| -------- | -------- | --------- | ------------ | ---- |
| `interrupt` | 3px red | 36px | semibold | ACTION |
| `passive` | none | 32px | medium / muted | STATUS |

Reuse `resolveNotificationVisual()` for kind icons; do not duplicate color maps.

---

## Interaction matrix

| Input | States | Output |
| ----- | ------ | ------ |
| SSE: new passive notification | activity page open / closed | Row appended to activity feed; **no** toast/sound; lobby dot appears if nav visible |
| SSE: new interrupt | any | Toast + sound (P0); bell badge++; row in bell panel; also in activity Status tab with interrupt styling |
| Click bell footer | — | `navigateTo('/lobby/activity')` |
| Click passive row | unread | `markAsRead`; optional navigate via `url` / `entityId` |
| Click interrupt row on activity page | unread | Same as `NotificationItem`; CTA buttons visible on hover |
| Tab: Alerts history | — | Filter `delivery === 'interrupt'` |
| Tab: Status | — | All notifications, passive-first sort within day |
| Mark all read (bell) | interrupts only | P0 behavior unchanged |
| Keyboard: bell open | focus trap in panel | Esc closes; footer link focusable |
| `/activity` legacy URL | — | 301 → `/lobby/activity` |

---

## Accessibility

- **Focus order:** Bell trigger → panel header actions → list items → footer link. Activity page: tabs → first row → pagination/load-more.
- **Live regions:** `aria-live="assertive"` **only** for interrupt toast channel (P0). Activity feed uses `aria-live="polite"` on list container — passive inserts only.
- **Labels:** Bell `aria-label`: "Lobby notifications, N action required" (N = interrupt unread). Activity page `h1`: "Activity".
- **Motion:** Row enter animation 150ms fade; respect `prefers-reduced-motion: reduce` — instant insert.
- **Color:** Interrupt/passive never distinguished by color alone — chips + left bar + copy ("Action required" vs "Status").

---

## Do's and Don'ts

**Do**

- Keep bell badge **interrupt-only**.
- Show interrupts in activity feed with distinct styling (audit trail).
- Cross-link to `/ontologies/activity` as "Mutation log" — separate product surface.
- Group activity feed by day.

**Don't**

- Add numeric badge for passive unread count.
- Toast or play sound for passive items on activity page.
- Merge TQL mutation log into notification query P1.
- Show passive rows inside bell dropdown.

---

## Open for Architect

1. **Route module:** `pages/lobby/activity.vue` + `pages/activity.vue` redirect shim.
2. **Composable extension:** `passiveUnread` computed + `hasUnreadPassive` for nav dot (no count).
3. **Query:** Activity page uses existing `useTrellisNotifications().notifications` — client-side filter/sort; no new API P1.
4. **Tab filter:** `Status` \| `Alerts history` as local UI state.
5. **E2E AC:** Task complete → passive row on `/lobby/activity`, bell badge unchanged; system alert → bell + activity interrupt row.
6. **Redirect:** `validate-routes.ts` add `/lobby/activity`; `/activity` → `/lobby/activity`.

Non-blocking: P2 digest batching, Gmail interrupt rules, user prefs.

---

## Handoff checklist

- [x] `docs/artifacts/notification_activity_p1_design.md`
- [x] `docs/artifacts/notification_activity_p1_mockup.html`
- [x] Interaction matrix + a11y + component anatomy
- [x] Open questions resolved with explicit decisions
