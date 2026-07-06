# Spec: Notification activity stream — Lobby P1 (TRL-PROP-alarm-discipline-p1)

**Status:** Spec ready for implementation  
**Parent:** TRL-PROP-alarm-discipline-p1  
**Design:** [notification_activity_p1_design.md](./notification_activity_p1_design.md)  
**Mock:** [notification_activity_p1_mockup.html](./notification_activity_p1_mockup.html)  
**P0 baseline:** [notification_rationalization_spec.md](./notification_rationalization_spec.md)  
**Labels:** `spec`, `needs-e2e`

---

## Problem

P0 routes passive notifications away from the bell but provides **no surface** to read them. `NotificationBell` footer links to `/activity`, which does not resolve to a notification feed. Users cannot review task-completion or sync status without querying the graph.

## Goal

Ship **Lobby activity stream** at `/lobby/activity` and refactor the bell into an explicit **alarm panel** (interrupt-only). Passive notifications become visible on a quiet timeline; interrupts remain in the bell with toast/sound (P0 unchanged).

## Non-goals (P1)

- TQL mutation log merged into notification feed (cross-link only)
- McFarlane scheduled digest
- Gmail per-user interrupt rules
- User notification preferences UI
- Numeric badge for passive unread
- New server API or ontology fields

---

## 1. Routes

| Route | Handler | Behavior |
| ----- | ------- | -------- |
| `/lobby/activity` | `pages/lobby/activity.vue` | Activity feed page (primary) |
| `/activity` | `pages/activity/index.vue` | `navigateTo('/lobby/activity', { replace: true })` — **exact path only**; must not break `/activity/feed` or other `/activity/*` forms routes |

### Route registration

- Add `/lobby/activity` to `scripts/validate-routes.ts` known routes (if applicable).
- `definePageMeta`: `title: 'Activity'`, `icon: 'lucide:activity'`, `middleware: ['auth']`.

---

## 2. Composable extensions

**File:** `apps/web/app/composables/useTrellisNotifications.ts`

Add derived computeds (export from composable):

```ts
const passiveUnread = computed(() =>
  unread.value.filter((n) => resolveNotificationDelivery(n) === 'passive'),
)
const hasUnreadPassive = computed(() => passiveUnread.value.length > 0)
```

**Rules:**

- Do **not** add passive count to `unreadCount` (interrupt-only, P0).
- Activity page consumes `notifications` + client-side filter/sort — no new EQL query P1.
- Exclude `archived` and `snoozed` from default activity feed unless tab says otherwise.

---

## 3. Components

### 3.1 `AlarmPanel.vue` (new)

**Path:** `apps/web/app/components/notifications/AlarmPanel.vue`

Extract dropdown body from `NotificationBell.vue`:

| Region | Behavior |
| ------ | -------- |
| Header | Title **"Action required"** + subtitle `N need your attention` when `unreadCount > 0`; else **"All caught up"** / **"No action required"** |
| Body | Interrupt-only list (`resolveNotificationDelivery === 'interrupt'`, not archived), max 20 rows |
| Empty | Bell icon + "All caught up!" — **no passive teaser** |
| Footer | Button/link **"View activity in Lobby"** → `navigateTo('/lobby/activity')` |
| Actions | Mark all read (interrupts only — existing `markAllAsRead`) |

Props: none (uses `useTrellisNotifications`).

### 3.2 `NotificationBell.vue` (modify)

- Replace inline dropdown content with `<AlarmPanel />`.
- Keep `placement` / `railPosition` / trigger / popover side logic unchanged.
- Update `aria-label`: `Lobby notifications, ${unreadCount} action required` (or "no action required" when 0).

### 3.3 `NotificationItem.vue` (modify)

Add optional prop:

```ts
deliveryVariant?: 'auto' | 'interrupt' | 'passive'  // default 'auto'
```

When `auto`, derive from `resolveNotificationDelivery(notification)`.

**Visual (match design mock):**

| Delivery | Left accent bar | Icon container | Delivery chip |
| -------- | --------------- | -------------- | ------------- |
| `interrupt` | 3px `destructive` | 36px `rounded-xl` | `ACTION` (destructive ring) |
| `passive` | none | 32px `rounded-lg`, muted | `STATUS` (slate ring) |

Reuse existing `resolveNotificationVisual()` — do not duplicate `TOKEN_TO_RGB`.

### 3.4 `ActivityDayGroup.vue` (new)

**Path:** `apps/web/app/components/notifications/ActivityDayGroup.vue`

- Props: `label: string` (e.g. "Today", "Yesterday"), default slot for rows.
- Sticky day label per design (`text-[10px] uppercase tracking-widest`).

### 3.5 `ActivityFeed.vue` (new)

**Path:** `apps/web/app/components/notifications/ActivityFeed.vue`

- Props: `tab: 'status' | 'alerts'`
- **Status tab:** all non-archived notifications, grouped by calendar day, sorted `createdAt` DESC within day.
- **Alerts tab:** `delivery === 'interrupt'` only.
- Container: `aria-live="polite"` `aria-label="Activity feed"`.
- Empty state per tab (calm copy, no alarm language on Status tab).

### 3.6 `LobbyActivityNavDot.vue` (new, optional inline)

6px amber dot (`bg-amber-500` / `zone-lobby` token) when `hasUnreadPassive`. No numeric label.

**Mount point (pick one, document in impl SUMMARY):**

- Bell footer is sufficient for P1 **minimum**; prefer also dot on a Lobby nav entry if `AppSidebar` / `IconRail` has activity link.
- If no nav target exists, ship page + bell footer only; nav dot is **nice-to-have** not blocker.

---

## 4. Activity page

**File:** `apps/web/app/pages/lobby/activity.vue`

Layout:

```
[zone stripe 3px lobby amber]
LOBBY · Activity          (eyebrow)
Activity                  (h1)
Status and sync — review when ready.  (subtitle)
[Status] [Alerts history] (tabs, local state)
<ActivityFeed :tab="activeTab" />
Footer: Mutation log → link to /ontologies/activity
```

- Max width `720px`, centered (`mx-auto`).
- `data-campus-zone="lobby"` on page root or via zone context if available.
- **No toast/sound** on mount or SSE refresh while on this page (inherits P0 passive gate).

---

## 5. Redirect shim

**File:** `apps/web/app/pages/activity/index.vue`

```vue
<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
onMounted(() => navigateTo('/lobby/activity', { replace: true }))
</script>
<template><div /></template>
```

Nuxt file-based routing: this handles `/activity` only, not `/activity/feed`.

---

## 6. Files touched

| File | Change |
| ---- | ------ |
| `app/components/notifications/AlarmPanel.vue` | **new** |
| `app/components/notifications/ActivityFeed.vue` | **new** |
| `app/components/notifications/ActivityDayGroup.vue` | **new** |
| `app/components/notifications/NotificationBell.vue` | use AlarmPanel; footer route |
| `app/components/notifications/NotificationItem.vue` | delivery variant styling |
| `app/composables/useTrellisNotifications.ts` | `passiveUnread`, `hasUnreadPassive` exports |
| `app/pages/lobby/activity.vue` | **new** |
| `app/pages/activity/index.vue` | **new** redirect |
| `scripts/validate-routes.ts` | add `/lobby/activity` |
| `tests/e2e/notification-activity.spec.ts` | **new** |

---

## 7. Acceptance criteria

### Automated

```text
test:pnpm exec vitest run server/utils/notification-policy.test.ts
test:ReadLints on changed notification + lobby files
test:PW_REUSE=1 pnpm exec playwright test tests/e2e/notification-activity.spec.ts --project=chromium
```

`pnpm check` — run if feasible; pre-existing repo lint debt does not block this wedge if changed files are clean.

### Behavioral AC

1. **AC-1:** `/lobby/activity` renders `h1` "Activity" and Status tab with notification rows from graph.
2. **AC-2:** Bell dropdown lists **interrupt-only** rows; passive notifications do not appear in `AlarmPanel`.
3. **AC-3:** Bell footer navigates to `/lobby/activity` with copy "View activity in Lobby".
4. **AC-4:** `POST /api/notifications` with `{ delivery: 'passive', kind: 'info', ... }` → row visible on activity page; bell `unreadCount` unchanged.
5. **AC-5:** `createSystemAlert` (or POST with `delivery: 'interrupt'`) → bell badge increments **and** row appears on activity Status tab with ACTION chip / accent bar.
6. **AC-6:** Alerts history tab shows only `delivery === 'interrupt'` rows.
7. **AC-7:** `/activity` (exact) redirects to `/lobby/activity`; `/activity/feed` (if present) unchanged.
8. **AC-8:** Activity feed footer links to `/ontologies/activity` (mutation log) — separate surface.
9. **AC-9:** No toast fired when passive notification arrives while user is on `/lobby/activity` (P0 gate holds).

### E2E spec outline (`notification-activity.spec.ts`)

```ts
// 1. Navigate /lobby/activity — h1 visible
// 2. Seed passive via POST /api/notifications — row in feed, bell badge 0
// 3. Seed interrupt via POST — bell badge 1, row in feed with data-delivery=interrupt
// 4. Bell footer → lands on /lobby/activity
// 5. /activity → redirects to /lobby/activity
```

Use `page.request.post` for notification seeding (same pattern as other e2e specs).

---

## 8. Accessibility

- Bell `aria-label` includes interrupt count only.
- Activity list `aria-live="polite"` — not assertive.
- Tabs: `role="tablist"` / `role="tab"` / `aria-selected`.
- Interrupt vs passive distinguished by chip text + bar, not color alone.

---

## 9. Risks

| Risk | Mitigation |
| ---- | ---------- |
| `/activity` collision with forms routes | Redirect shim at `pages/activity/index.vue` only |
| Legacy notifications missing `delivery` in EQL | `resolveNotificationDelivery` defaults interrupt; may drop from query (P0 known) |
| No sidebar activity link | Ship page + bell path; nav dot optional |

---

## 10. Executor handoff

- Branch: `issue/TRL-PROP-alarm-discipline-p1-impl-activity-stream`
- Depends on P0 notification rationalization (merged or same branch)
- Verify manually: complete task → passive on activity, no bell toast
- Impl SUMMARY must note nav-dot mount decision
