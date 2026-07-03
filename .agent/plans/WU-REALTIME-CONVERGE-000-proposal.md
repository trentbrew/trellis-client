# Proposal: Realtime SDK convergence (threlte-skeleton → trellis-client)

**VCS:** (to be assigned) · **Depends on:** WU-OPTION-B-001 Phase 0–1 (sidecar landed)  
**Reference:** `~/turtle/projects/sandbox/threlte-skeleton`  
**Graph:** `entity:project-realtime-sdk` (currently on-hold)

---

## Problem

trellis-client has **three overlapping realtime paths** (graph SSE, sidecar WS wedge, legacy InstantDB/Y.js) but no unified client SDK like threlte-skeleton's `NetTransport` + `TrellisDb` split. Option B Phase 1 (pages) is partially landed; Phases 2–3 (browse, relay) are deferred. Agents lack MCP in Cursor until manually wired.

## Goals

1. **MCP wired** — Cursor (and doc) can call `trellis-graph` tools against `:1414` dev server.
2. **Transport layer** — Port `NetTransport` pattern (local BroadcastChannel + relay WebSocket) into monorepo as reusable package or `apps/web/app/lib/net/`.
3. **Relay in dev** — `just run` spins Trellis DB `:8230` + relay `:8231` + Nuxt `:1414` (mirror threlte-skeleton `justfile`).
4. **Extend Option B** — Pages truth path (WS) + presence; then browse/collections (WU-OPTION-B Phase 2).
5. **No Y.js / InstantDB** for local-first path — graph truth + presence gossip only.

## Non-goals

- Merging HQ JSONL (`.trellis/hq/`) with web SQLite (`.data/trellis.db`)
- Full app cutover off embedded kernel in one PR
- Production relay hosting (dev + opt-in env only)

## Reference map (threlte-skeleton → trellis-client)

| threlte-skeleton | trellis-client target |
|------------------|----------------------|
| `src/lib/engine/net/transport.ts` | `apps/web/app/lib/net/transport.ts` or `packages/trellis-realtime/` |
| `src/lib/engine/net/local.ts` | BroadcastChannel transport |
| `src/lib/engine/net/relay.ts` | WS → `/rt` relay client |
| `src/lib/engine/net/createTransport.ts` | `resolveTransport(room)` + runtimeConfig |
| `scripts/relay.mjs` | `scripts/realtime-relay.mjs` |
| `TrellisDb` durable | existing `trellis-sidecar/create-client.ts` |
| `NetSession` ~20Hz ephemeral | defer — presence first, then optional session layer |

## Proposed wedges (sequenced)

### Wedge A — MCP + agent DX (1 PR, executor)

- Run `node scripts/setup-mcp.mjs cursor` (done)
- Add `.cursor/mcp.json` **project template** or doc pointer in `docs/getting-started/SETUP.md`
- Verify `get_graph_summary` from Cursor after restart

### Wedge B — Relay + NetTransport shell (architect → executor)

- `scripts/realtime-relay.mjs` using `createRealtimeRelay` from `trellis/server`
- `apps/web/app/lib/net/*` — transport interface + local + relay
- `justfile` / `apps/web/justfile`: `relay-serve`, wire into `just run`
- Env: `VITE_PRESENCE_RELAY_URL=ws://localhost:8231/rt` (already documented in sidecar-dev.md)
- Unit tests for transport message round-trip (BroadcastChannel in jsdom/bun)

### Wedge C — Option B Phase 2 (browse + collections)

- Extend sidecar path from `/pages/[id]` to browse grid + collection hosts
- Per WU-OPTION-B-001 Phase 2 scope

### Wedge D — Package extraction (optional)

- `packages/trellis-realtime` if net layer stabilizes — shared with threlte-skeleton later

## Success criteria

- [ ] Cursor agent can call `graph_health` / `get_graph_summary` via MCP
- [ ] Two tabs same page sync with `TRELLIS_SIDECAR=1` (existing AC)
- [ ] Two **different browsers** see presence when relay running + `VITE_PRESENCE_RELAY_URL` set
- [ ] `just run` starts relay without extra terminal
- [ ] No new `@turtle.tech/tql` imports (`check:kernel-imports` pass)

## Risks

| Risk | Mitigation |
|------|------------|
| npm `trellis` version drift vs threlte-skeleton | Pin `^3.2.3`, bump together |
| Relay port collision | Default 8231, env override |
| Option A / B dual path complexity | Feature flag `TRELLIS_SIDECAR` unchanged |

## Recommendation

**Ship Wedge A immediately** (MCP). **Spec Wedge B next** — relay + NetTransport is the highest-leverage convergence with threlte-skeleton before Phase 2 browse cutover.
