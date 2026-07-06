# Spec: Notification rationalization — EEMUA alarm discipline (TRL-PROP-alarm-discipline)

**Status:** Spec ready for implementation  
**Parent:** TRL-PROP-alarm-discipline (strategist proposal)  
**Essay baseline:** [the-lost-discipline-of-the-alarm.md](../essays/the-lost-discipline-of-the-alarm.md)

## Problem

Trellis treats every `notification` node as an **interrupt**: bell badge, toast, and sound (`useTrellisNotifications.ts` lines 141–147). With Gmail live and graph-notifier active, the system reproduces industrial **alarm flood** and **nuisance alarm** failure modes — training users to ignore the bell.

EEMUA 191 core rule:

> *Does this notification require the operator to take immediate action?*

If no → it is **status**, not an alarm. Route to a quiet surface.

Trellis occupies the “missing middle”: single operational authority, no adversarial engagement economy. Admission control can be **platform policy**, not user settings homework.

---

## Scope

### P0 — In (this impl)

1. **`delivery` + `requiredAction` fields** on notification ontology and types
2. **Server admission control** in `createNotification()` — rate limits, downgrade, routing
3. **Emitter audit** — reclassify `graph-notifier` + `createSystemAlert` writers
4. **Client interrupt gate** — toast/sound/badge only for `delivery: interrupt`
5. **Unit tests** for policy module

### P0 — Out

- Full Lobby / Campus shell redesign (`needs-design` → P1)
- User-configurable notification preferences UI
- Gmail per-user alarm rules (filters → interrupt) — P1 follow-up
- Persistent earned-interrupt store across server restarts (in-memory OK for P0)
- New `/activity` page (bell already links there; stub or redirect acceptable)

### P1 — Deferred (flag `needs-design`)

- **Alarm panel** (bell) vs **activity stream** (passive feed) visual split
- McFarlane **scheduled** modality (digest batch)
- Gmail: interrupt only when user rule matches

---

## 1. Data model

### 1.1 New fields (`notification` ontology v1.1.0)

| Field | Type | Values | Purpose |
| ----- | ---- | ------ | ------- |
| `delivery` | select | `interrupt` · `passive` | **Client routing** — interrupt = bell + optional toast/sound; passive = activity only |
| `requiredAction` | select | `none` · `acknowledge` · `navigate` · `resolve` | **EEMUA audit** — documents why interrupt was granted |

Add to:

- `apps/web/server/utils/trellis-ontologies.ts` (`notificationOntology`)
- `apps/web/app/types/notification.ts`

### 1.2 Defaults (backward compatible)

```ts
// createNotification input
delivery?: 'interrupt' | 'passive'  // inferred when omitted
requiredAction?: 'none' | 'acknowledge' | 'navigate' | 'resolve'
```

**Inference when `delivery` omitted:**

| Condition | `delivery` | `requiredAction` |
| --------- | ---------- | ---------------- |
| `createSystemAlert` with `severity: error` | `interrupt` | `resolve` |
| `createSystemAlert` with `severity: warning` | `interrupt` | `acknowledge` |
| `priority: critical` | `interrupt` | `navigate` |
| `priority: high` AND `actions` includes non-dismiss CTA | `interrupt` | `navigate` |
| Everything else | `passive` | `none` |

Explicit `delivery` on input **wins** over inference.

Persist both fields on every notification node.

---

## 2. Server policy module

**New file:** `apps/web/server/utils/notification-policy.ts`

Pure functions + in-memory state (testable without Nitro).

### 2.1 Rate limit (pocket EEMUA)

```ts
const INTERRUPT_WINDOW_MS = 10 * 60 * 1000  // 10 minutes
const MAX_INTERRUPTS_PER_WINDOW = 1         // per (source, groupKey)
```

Before creating an `interrupt` notification:

- If `(source, groupKey ?? sourceId ?? 'default')` already emitted ≥1 interrupt in window → **downgrade to `passive`** (log `[notification-policy] rate-limited interrupt → passive`).
- `priority: critical` bypasses rate limit.

### 2.2 Earned interrupt downgrade (P0 in-memory)

Track per `source` (rolling 24h):

- On interrupt created → increment `emitted`
- On user dismiss without opening linked entity (`actions` only dismiss used) → increment `ignored`
- If `ignored / emitted ≥ 0.8` and `emitted ≥ 5` → auto-downgrade that `source` to passive-only for 24h

Hook: `recordNotificationOutcome(source, outcome: 'acted' | 'dismissed')` called from `PATCH /api/notifications/:id` when status → `read` or `archived`.

### 2.3 Admission API

```ts
export function admitNotification(input: CreateNotificationInput): CreateNotificationInput
```

Returns normalized input with `delivery` + `requiredAction` set; applies rate limit + earned downgrade.

`createNotification()` calls `admitNotification()` before persisting.

---

## 3. Emitter rationalization table

Executor **must** update each writer. Default target for P0:

| Emitter | Handler | Today | P0 target | `requiredAction` |
| ------- | ------- | ----- | --------- | ---------------- |
| `graph-notifier` | `handleTaskCompletion` | interrupt (toast) | **`passive`** | `none` |
| `graph-notifier` | `handleBulkOp` | interrupt | **`passive`** | `none` |
| `graph-notifier` | `flushAgentBurst` | interrupt (low) | **`passive`** | `none` |
| `notification-service` | `createSystemAlert` error | interrupt | **`interrupt`** | `resolve` |
| `notification-service` | `createSystemAlert` warning | interrupt | **`interrupt`** | `acknowledge` |
| `gmail-notifier` | new email (nitro plugin) | TBD / possible alert | **`passive`** | `none` |
| `calendar-notifier` | sync events | TBD | **`passive`** | `none` |
| Client `useChat` | mentions | interrupt | **keep `interrupt`** | `navigate` |
| `workflow-server` | completion | interrupt | **keep `interrupt`** | `acknowledge` |

**Rule:** Ingest/sync pipelines → passive. Broken auth / failed integration → interrupt.

For `gmail-notifier`: if source only exists in compiled nitro bundle, add thin wrapper in `notification-service` or restore `server/plugins/gmail-notifier.ts` that calls `createNotification({ delivery: 'passive', ... })`.

---

## 4. Client changes

### 4.1 `useTrellisNotifications.ts`

```ts
// Only interrupt deliveries surface as interrupts
const incoming = next.filter(
  (n) => !_lastSeenIds.has(n.id) && n.status === 'unread' && n.delivery === 'interrupt',
)
```

- **Toast + sound:** only for `incoming` (interrupt)
- **`unreadCount`:** count only `delivery === 'interrupt' && status === 'unread'`
- **Bell dropdown `visible`:** show interrupt unread first; passive unread in collapsed “Activity” section (minimal P0: passive items omitted from bell, queryable later)

Extend EQL-S refresh query to `RETURN ?n.delivery, ?n.requiredAction` (add to guaranteed projection once backfilled).

### 4.2 `NotificationBell.vue`

- Badge dot: `interruptUnreadCount > 0` only
- Footer link: keep `/activity` (P1 builds real activity page; P0 may 404 — acceptable)

### 4.3 `agent-mutation-toast.ts`

No change — already separate from notification graph. Document: agent SSE toasts are a **third channel**; out of scope for P0 but note in README.

---

## 5. API

### `POST /api/notifications`

Accept `delivery` + `requiredAction`; run through `admitNotification()` server-side.

### `PATCH /api/notifications/:id`

On `status: read | archived`, call `recordNotificationOutcome(source, 'dismissed' | 'acted')` when metadata supports it.

---

## 6. Files

| File | Change |
| ---- | ------ |
| `server/utils/notification-policy.ts` | **new** — admission, rate limit, earned downgrade |
| `server/utils/notification-policy.test.ts` | **new** — unit tests |
| `server/utils/notification-service.ts` | call policy; persist new fields |
| `server/utils/trellis-ontologies.ts` | ontology v1.1.0 fields |
| `server/plugins/graph-notifier.ts` | explicit `delivery: 'passive'` on all three handlers |
| `app/types/notification.ts` | types + defaults |
| `app/composables/useTrellisNotifications.ts` | interrupt gate on toast/sound/count |
| `app/components/notifications/NotificationBell.vue` | interrupt-only badge |

---

## 7. Acceptance criteria

```text
test:bun test apps/web/server/utils/notification-policy.test.ts
test:pnpm check
test:pnpm test:e2e e2e/smoke.spec.ts
```

### Behavioral AC

1. **AC-1:** `createNotification({ kind: 'info', priority: 'low', ... })` persists `delivery: passive` and does **not** increment interrupt unread count client-side.
2. **AC-2:** `createSystemAlert({ severity: 'error', ... })` persists `delivery: interrupt` and surfaces toast + bell badge.
3. **AC-3:** Second interrupt from same `(source, groupKey)` within 10 minutes is downgraded to `passive` (unless `critical`).
4. **AC-4:** Task completion via `graph-notifier` creates **passive** notification only — no toast on SSE refresh.
5. **AC-5:** Bell badge count excludes passive notifications.
6. **AC-6:** Unit tests cover rate limit, inference defaults, and earned downgrade threshold.

### Manual smoke

1. Complete a task → no toast; optional passive row if querying all notifications.
2. Disconnect Gmail (revoke) → interrupt alert with bell + toast.
3. Bulk-update 10 entities → no toast flood.

---

## 8. Rollout / migration

- Existing notifications without `delivery` fact: client treats missing as `interrupt` (backward compat) for 30 days; server backfill not required P0.
- New notifications always persist `delivery`.

---

## 9. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Users miss passive events | P1 activity feed; mail/calendar are their own surfaces |
| In-memory rate state resets on server restart | Acceptable P0; persist in P2 |
| gmail-notifier only in nitro bundle | Explicit `delivery: passive` when restoring source plugin |

---

## 10. Executor handoff notes

- Start branch: `issue/TRL-PROP-alarm-discipline-impl-notification-rationalization`
- No designer dependency for P0
- After P0 PASS: queue P1 design for alarm vs activity shell split (`needs-design`)
