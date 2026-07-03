# Proposal: Kernel-bridge TrellisDb (embedded live query without sidecar)

**VCS:** TRL-16 (proposal) · parent TRL-12 (ADR-002 epic)  
**Human decision:** kernel-bridge — 2026-07-02  
**Builds on:** TRL-15 (P3 sidecar-first live query) · P1 graph-residency  
**Status:** queue-ready

---

## Problem

P3 live app config requires **two extra steps** in the default dev loop:

1. `TRELLIS_SIDECAR=1` + sidecar on `:8230`
2. `node scripts/import-app-config-to-sidecar.mjs`

Most day-to-day work runs **embedded kernel only** (`just run-kernel`, `TRELLIS_SIDECAR=0`). In that mode `useTrellisDb()` is null → `useTrellisConfig` stays on P1 SSE snapshot refetch.

Agents and developers editing `route:*` / ontology entities in the embedded graph don't get `trellis/vue` live diffs without sidecar.

## Goal

**`trellis/vue` live queries work against the embedded kernel** — no sidecar, no import script — for app config (first wedge), reusing P3 `useTrellisConfigLive` + `useEntities`.

## Non-goals

- Full sidecar replacement for pages/browse (Option B Phase 2)
- P2 capability-gated relay / zone enforcement
- Retiring `@turtle.tech/trellis-kernel` from Nuxt server
- Cross-machine WS relay (P4)
- InstantDB / DataAdapter changes

---

## Proposed architecture

```
Nuxt client (TRELLIS_SIDECAR=0)
  └─ createKernelBridgeClient()
       TrellisDb (trellis/browser) with patched _fetch + realtime seam
       ├─ HTTP → /api/graph/kernel-bridge/*  (new proxy routes)
       │     maps to embedded kernel queries + entity CRUD
       └─ Live subscribe → SSE /api/graph/events + typed entity diff
             OR minimal WS shim on Nuxt (pick in spec)

useTrellisDb() returns:
  sidecar client when TRELLIS_SIDECAR=1  (unchanged)
  kernel-bridge client when sidecar off   (new)

useTrellisConfig → useTrellisConfigLive (unchanged composable)
```

**Key insight:** P3 already assembles config from `useEntities` — kernel-bridge only needs to make `TrellisDb` talk to embedded kernel instead of sidecar `:8230`.

### Slice options (architect picks one)

| Option | Realtime | Effort | Notes |
|--------|----------|--------|-------|
| **A — SSE-backed live** | Map `trellis` live subscription to kernel SSE + EQL refetch per type | Days | No new WS server; may poll on mutation events |
| **B — Nuxt WS relay** | `/api/graph/realtime` speaks trellis WS subset | Larger | Closer to sidecar protocol; reusable for pages later |

Recommend **A for wedge 1** (app config only), document path to B.

### Server routes (sketch)

| Route | Purpose |
|-------|---------|
| `GET/POST /api/graph/kernel-bridge/entities` | List/create typed entities (AppRoute, etc.) |
| `GET/PATCH/DELETE .../entities/:id` | Entity by id |
| Existing `GET /api/graph/config` | Unchanged fallback |

Entity rows mirror P1 seed shapes (`configJson` blob) — **no second seed**; read directly from embedded kernel facts.

---

## Success criteria

1. `just run-kernel` → `useTrellisConfig().transportMode === 'live'` without import script
2. Mutate `route:home` via CLI/API → rail label updates without full-page reload
3. `TRELLIS_SIDECAR=1` behavior unchanged (sidecar client takes precedence)
4. Tests: kernel-bridge client factory + mode resolution (vitest)

---

## Risks

| Risk | Mitigation |
|------|------------|
| TrellisDb internal API drift | Pin `trellis@^3.2`; patch via `_fetch` like http-proxy |
| SSE ≠ true WS diffs | Document as bridge v1; Option B later |
| Duplicate clients | Single `useTrellisDb()` priority: sidecar > kernel-bridge > null |

---

## Handoff

```bash
trellis issue create -t "Spec: kernel-bridge TrellisDb" -l spec --parent TRL-16 -S queue
# Architect → Executor
```
