# Spec: ADR-002 P0 — Zone-keyed BroadcastChannel presence

**VCS:** TRL-13 (spec) · parent TRL-12 (epic)  
**ADR:** `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` § P0, D2, D3, D6  
**Status:** queue-ready

---

## Problem

Page presence today joins `page:<pageId>` rooms (`lib/presence/config.ts`). ADR-002 D3 requires **zone = room = presence scope** (`zone:<zoneId>`). BroadcastChannel (rung 1) already works via `joinPresence` when `relayUrl` is omitted — but room keys and zone routing are not wired.

## Decision summary

| Topic | Choice |
|-------|--------|
| Room key | `zone:<zoneId>` (e.g. `zone:entity:founder-facility-showroom`) |
| Page scope | **Presence state** fields (`pageId`, `editingField`) — not a second room |
| Transport | `joinPresence` with **no** `relayUrl` → `BroadcastChannelTransport` (`presence:${room}` channel) |
| Zone source | `useZoneContext().zoneId` (route + override); mirror `zoneIdFromPath` |
| Sidecar gate | Keep `useTrellisSidecar().enabled` gate for page presence composable (minimal blast radius) |
| Relay | Unchanged opt-in via `VITE_PRESENCE_RELAY_URL` — **out of P0 AC** |

## Files (executor)

| File | Change |
|------|--------|
| `apps/web/app/lib/presence/config.ts` | Add `zonePresenceRoom(zoneId)`, deprecate direct `pagePresenceRoom` for join key |
| `apps/web/app/lib/presence/use-joined-room.ts` | Extend `PagePresenceState` with `zoneId`; include in snapshot |
| `apps/web/app/composables/useTrellisPagePresence.ts` | Room = `zonePresenceRoom(zoneId)` from `useZoneContext()`; filter viewers by `pageId` in state |
| `apps/web/app/lib/presence/zone-presence.test.ts` | **New** — unit tests for room key + BC round-trip (injectable `BroadcastChannelImpl`) |
| `apps/web/tests/e2e/zone-presence-bc.spec.ts` | **New** — same browser context, two tabs, viewer chips visible |
| `docs/sidecar-dev.md` | Document zone room keys + rung 1 (BC) vs rung 2 (relay) |

## Behavior

1. User opens `/pages/:id` → `zoneIdFromPath` → showroom zone → joins `zone:entity:founder-facility-showroom`.
2. `register(pageId)` sets presence `{ pageId, zoneId, name, color }`.
3. Second tab same zone, different page → sees peer in zone; `getViewers(pageId)` filters to same page only.
4. Route change to different zone → room watch reconnects to new `zone:<id>`.
5. No op-log writes for presence heartbeats (existing `trellis/realtime` guarantee).

## Out of scope (P0)

- Capability-gated join (P2)
- WS relay cross-browser (P4) — e2e uses **same context, two tabs** for BC
- Graph-residency (P1)
- Shell-wide zone roster UI (optional: viewer chips on page suffice for AC)
- Rich-text CRDT / ownership enforcement

## Acceptance criteria

1. `test:bun test apps/web/app/lib/presence/zone-presence.test.ts` — zone room key format; two peers same zone see each other via injectable BC; no relayUrl used
2. `test:PW_REUSE=1 pnpm --filter web test:e2e tests/e2e/zone-presence-bc.spec.ts` — two tabs same context, `VITE_PRESENCE_RELAY_URL` unset, viewer avatars (`data-testid=page-viewer-avatar` or existing chip selector) count ≥ 2
3. `zonePresenceRoom` returns `zone:${zoneId}`; page join no longer uses `page:` as `joinPresence.room`
4. `pnpm check` passes in `apps/web`
5. `docs/sidecar-dev.md` documents zone room naming and BC rung

## Test notes

- **BroadcastChannel does not cross Playwright `browser.newContext()`** — use one `browserContext`, two `newPage()` tabs.
- Sidecar e2e pattern: `tests/e2e/sidecar-page-sync.spec.ts`.
- Pin `trellis@^3.2.0` — `createPresenceTransport` already selects BC when `relayUrl` omitted.

## Handoff

Executor implements on lane `agent:trentbrew`, branch from `trellis issue start TRL-14`.
