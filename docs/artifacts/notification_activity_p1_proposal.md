# Proposal: Alarm panel vs activity stream (TRL-PROP-alarm-discipline-p1)

**Status:** Queued — `needs-design`  
**Parent:** TRL-PROP-alarm-discipline (P0 PASS — admission control shipped)  
**Essay:** [the-lost-discipline-of-the-alarm.md](../essays/the-lost-discipline-of-the-alarm.md)  
**P0 spec:** [notification_rationalization_spec.md](./notification_rationalization_spec.md)

## Problem

P0 split **interrupt** from **passive** at the data layer and client gate:

- Bell badge, toast, and sound → `delivery: interrupt` only
- Graph-notifier, task completion, bulk ops → `delivery: passive` (no toast)

Passive notifications are **invisible** in the UI today. The bell footer links to `/activity`, which **does not exist** — a dead end. Users completing tasks or receiving sync events have no surface to review status without querying the graph.

EEMUA 191: non-actionable signals belong on a **quiet surface** (trend screen / log), not the alarm panel.

## Goals (P1)

1. **Alarm panel** — bell dropdown remains interrupt-only; visual language signals *action required*
2. **Activity stream** — dedicated surface for passive notifications + optional mutation context
3. **Navigation coherence** — fix `/activity` (or rename) so bell → activity is real
4. **Campus fit** — align with Lobby / shell chrome (see `campus_shell_chrome_design.md`); rail tooltip already says "Lobby — notifications"

## Out of scope (P1)

- McFarlane scheduled digest batching
- Gmail per-user interrupt rules
- User notification preferences UI
- Persistent earned-interrupt store (server restart)

## Constraints

- Reuse `TrellisNotification` + `resolveNotificationDelivery()` — no ontology change required
- `useTrellisNotifications` already hydrates `delivery`; filter `passive` client-side
- Do not re-introduce toast/sound for passive items
- `/ontologies/activity` exists (mutation log) — **do not conflate** without explicit UX decision (merge vs separate vs cross-link)

## UX success

| Scenario | Expected |
| -------- | -------- |
| Task completed | Passive row appears in activity stream; bell unchanged |
| System alert (Gmail revoke) | Interrupt in bell + toast; also visible in activity with distinct styling |
| Bell empty, activity has items | User can review status without alarm fatigue |
| Bell footer "View all activity" | Lands on real page with passive feed |

## Designer deliverables

- `docs/artifacts/notification_activity_p1_design.md`
- `docs/artifacts/notification_activity_p1_mockup.html`

Cover: alarm panel anatomy, activity feed layout, empty states, interrupt vs passive visual differentiation, mobile/rail placement, a11y (live regions for interrupts only).

## Open questions for design

1. **Route:** `/activity`, `/lobby/activity`, or extend existing ontology activity page?
2. **Feed scope:** passive notifications only, or unified timeline (notifications + graph ops)?
3. **Unread passive:** badge on activity nav item, or count-free quiet feed?
4. **Shell:** header bell vs IconRail bell — same dropdown or rail-specific compact variant?

## After design

Architect specs implementation → Executor builds page + wires bell footer.
