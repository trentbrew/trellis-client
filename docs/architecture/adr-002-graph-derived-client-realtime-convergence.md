# ADR-002: Graph-derived client, two-tier realtime, and engine convergence

**Status:** Accepted
**Date:** 2026-07-02
**VCS:** TRL-12 (epic) · TRL-13 (spec: P0) · builds on TRL-2/3/4/7/10
**Human decision:** Pathway A — accept ADR, P0 first (2026-07-02)
**Builds on:** ADR-001 (TQL → Trellis rename, shell/projection split)
**Informed by:** `~/turtleos` (capability modules, Campus ontology), `~/TURTLE/Projects/TRELLIS/trellis-node` (published `trellis` engine), `~/TURTLE/Projects/trellis/fractal-playground` (room-node topology), `~/TURTLE/Projects/Sandbox/threlte-skeleton` (state-tier + transport-seam patterns)

---

## Context

Four questions accumulated across the trellis-client / turtleOS convergence work:

1. **Which engine is canonical?** Three kernels exist with shared ancestry but divergent evolution:
   - `@turtle.tech/trellis-kernel` — private fork embedded in this repo's Nuxt server
   - `@turtleos/kernel` — turtleOS monorepo kernel with capability modules (VCS, decisions, links, search, formulas, identity, federation)
   - `trellis` (npm, v3.2.4, AGPL, in `trellis-node`) — published engine with realtime, identity/signing, protocol, and vue/react/svelte bindings

2. **Which realtime model?** Fractal-playground proved room-node live queries (SDK `TrellisDb` over HTTP/WS against a sidecar or Sprites-hosted node). Threlte-skeleton proved an ephemeral presence session over a dumb transport seam (BroadcastChannel ↔ relay swap with zero session changes). This repo currently has a third thing: embedded kernel + SSE mutation watch + sidecar page realtime.

3. **Where does authority live?** Room-node realtime implies server-enforced permissions; the decentralized direction requires capability grants bound to Ed25519 identity (Wallet model). These diverge in exactly one place: who enforces visibility. The Campus ontology (Facility/Zone spatial model, inherited from turtleOS) defines zones *as* visibility scopes backed by capability grants. The zone guard in this repo is advisory (Phase 0: logs allow/deny, enforces nothing).

4. **How far is "entirely graph-derived"?** Audit result: app definitions are already graph-*shaped* but not graph-*resident*.
   - Shell routes: JSON-LD entities (`@type: 'trellis:Route'`) in `trellis-shell-routes.ts`, served via `/api/graph/config` — data-driven, but sourced from a TS module
   - Domain views: collapsed into generic surfaces (`workspace/browse?type=…` redirects, `collections/[slug]` + projection registry)
   - User content: block-editor pages are fully graph-resident today
   - Ontologies: defined in a ~1,200-line server util; user-ontology CRUD routes exist
   - `config/routes.ts` (692 lines): explicitly a "synchronous baseline" — already the bootstrap-fallback shape

## Guiding principle

> **Mechanism in the kernel. Ontology in schemas. Projection in the client.**

Litmus test for placement: *if a second client (React studio, TUI, MCP agent, raw WS) got this wrong, would security or semantics break?* If yes → kernel. If it's names/types/scopes → schema package. If it's pixels/interaction → client.

---

## Decisions

### D1 — Canonical engine: published `trellis` (trellis-node)

Convergence flows **toward** `trellis` (npm), not toward either monorepo kernel.

- It is published, versioned, AGPL, powers fractal-playground in production, and already ships the layers this ADR needs: `trellis/realtime` (RealtimeRoom, presence, BroadcastChannel/WS-relay/Durable-Object transports), `trellis/identity` (Ed25519, signing middleware, governance), `trellis/vue` (+ `/typed`), `trellis/schema` (`defineType`).
- `@turtle.tech/trellis-kernel` (this repo's embedded fork) is **transitional** — it disappears once the Nuxt server and Vue app consume `trellis` directly.
- `@turtleos/kernel` capability modules are the layer *above* the engine; porting direction for kernel-level deltas (query optimizer, workflows, analytics) is fork → upstream, decided file-by-file in a divergence audit (scoped separately).

**Client contract:** the Vue app's data layer converges on the SDK surface — live queries via `trellis/vue`, ephemeral sessions via `trellis/realtime`. The existing `DataAdapter` interface is the seam; a `trellis`-SDK-backed adapter joins (then replaces) the local/cloud pair.

### D2 — Two-channel realtime; three-tier state discipline

Every piece of client state is classified into exactly one tier:

| Tier | Examples | Channel | Persisted? |
|------|----------|---------|------------|
| **Durable** | entity edits, links, ontology changes, app config | op-log mutations + live queries | yes — causal history |
| **Realtime (ephemeral)** | presence, peer selections, cursors, typing, room chat, "agent is working here" | `RealtimeRoom` over a transport | never |
| **Derived** | projections, rollups, formula fields, reputation | computed locally per client | never stored or sent |

Rules:

- Ephemeral traffic **never** touches the op-log (no heartbeats in causal history).
- Derived values are **never** synced — every client recomputes (only authoritative inputs cross the wire).
- Optimistic multiplayer: durable edits may broadcast to peers on the ephemeral channel immediately while the op-log write lands async (threlte `durable` message pattern).
- Conflict posture: per-entity **ownership + visible peer selections** (collision avoidance through awareness), not CRDTs. Owner-authoritative; host = deterministic election where needed. CRDT merge semantics deferred until proven necessary.

### D3 — Zone = room = presence scope

The realtime layer does **not** get its own "room" concept. **The zone ID is the room key.**

- A Facility's node serves its zones; each zone has one ephemeral channel (`zone:<id>`).
- Joining a zone's realtime channel is gated by the **same capability grant** that gates reading its entities. Presence in the Workshop is visible because you're *in* the Workshop.
- Fractal-playground's room-isolation tiers (public readonly embed / session room / named deploy) and Campus visibility tiers (Lobby / Workshop / Lab) are the same lattice — one implementation.

### D4 — Capability-gated room join lands in the kernel (the one new mechanism)

The join path of the relay (`trellis/realtime` relay-server) consults capability grants resolved from the graph for the joining identity (human or agent — same Ed25519/signing machinery), and admits or refuses. Implemented as middleware beside the existing signing middleware. Both halves already exist in `trellis`; this decision wires them together.

- The advisory zone guard in this repo's Nuxt server **stays advisory while it lives in the client-side server**. The moment enforcement begins, it must already have moved down into kernel middleware. Authority never ships inside one client.
- Permission semantics are designed **decentralized-first** at the op-log/capability level (SPEC-v1.1 territory), so server-enforced filtering today is an optimization, not a trust root. The client must never assume "the server filters what I'm allowed to see" as a load-bearing invariant.

### D5 — Campus ontology ships as a schema package, not kernel code

Facility, Lobby, Lab, Workshop, Showroom, Classroom, Giftshop are **content**. The kernel stays ontology-agnostic (the EAV thesis): it knows *scopes exist and gate rooms and queries*; the Campus schema **names** them and maps zone types → capability scopes. Versioned, forkable — a different spatial metaphor over the same kernel must remain possible.

### D6 — Transport is swappable; the ladder is the local-first UX story

`NetTransport`-style seam (already the shape of `trellis/realtime`): connect / disconnect / send / onMessage / whenReady. Session and capability logic live above it; transports below.

| Rung | Transport | Works with |
|------|-----------|-----------|
| 0 | none (static) | single tab, offline |
| 1 | BroadcastChannel | multi-tab presence, **no server** |
| 2 | WS relay (sidecar / Sprites room node) | cross-machine |
| 3 | Iroh peer gossip (future, post-SPEC-v1.1) | fully decentralized |

Every rung fully functions; features light up as infrastructure appears. Rung 1 is immediately implementable in this repo's sidecar realtime with zero server involvement.

### D7 — App definitions become graph-resident (the graph-derived client)

The client is graph-derived when **the graph decides which renderer runs, over which query, with which config**. Renderer code is always code — projection-registry string keys naming renderers are the permanent seam. We do not store Vue components in EAV triples.

Residency migration:

1. **Ingest** route entities, projection-registry entries, and ontology definitions into the kernel on boot (idempotent seed — shapes already match; they carry `@id`/`@type` today).
2. **Swap the read path**: `useTrellisConfig()` subscribes via live query instead of fetching a code-built object. Nav/rail/palette update when the graph changes.
3. **Demote** `config/routes.ts` to bootstrap-fallback snapshot only (its current framing already says this).
4. **Zone-gate config entities**: app definitions are Facility-level config → Vault/Lab scope under D3/D4.
5. **Payoff**: agents edit the app via graph mutations with decision traces — "add a permits section with a board view" is a mutation, not a deploy.

Remaining bespoke pages (chat/agent, query playground, graph visualizer, settings) are **tools/renderers** — correctly code; not migration targets. Residual domain-ish pages (contacts, locations, permits) collapse into browse/collections where possible.

### D8 — Agents are first-class on both channels

- **Ephemeral:** agent activity is presence — same `selection`/`presence` vocabulary as human peers, same identity system. "Agent is editing entity:X in the Lab" renders exactly like a human collaborator.
- **Durable:** the decision trace is the agent's durable shadow (rationale, alternatives, files touched), written to the op-log. Presence shows *what now*; the trace shows *why, after*. This repo's mutation log already carries `agentId` + `zoneId` + `facilityId` — the seed of this.

### D9 — Behavioral data stays portal-local

Watch/engagement/attention data (what a user viewed, dwelled on, boosted) is **not** written to the shared graph. It belongs to the portal/client instance. Reputation is **derivable, not canonical** — a query over the op-log (e.g. fork-and-retain rates) that different portals may weight differently. This is the structural defense against synthetic-engagement graph poisoning once agents are first-class economic actors.

---

## Consequences

**Positive**

- One realtime contract across trellis-client, fractal-playground, Studio, and future clients; transports (including Iroh) swap beneath it without session changes.
- The Vue client becomes a beautiful, **entirely replaceable** window: zero authority logic, projections all the way down.
- The Campus model becomes load-bearing (zones scope presence, capabilities, and app config) instead of decorative.
- Agents editing the app via mutations falls out of D7 + D4 rather than requiring a bespoke feature.

**Negative / accepted costs**

- AGPL engine at the center (already chosen for `trellis`; commercial layers live in `@turtle.tech/*` per the namespace split).
- Ownership-based conflict posture defers true concurrent-edit merge; acceptable for knowledge-work UX, revisit if co-editing collides in practice.
- Kernel-fork divergence audit (this repo's `trellis-kernel` vs published `trellis`) is real work and gates full convergence.
- Bootstrap complexity: client needs nav before the graph loads → seed snapshot must be maintained (small, mechanical).

## Alternatives considered

- **Thin client directly against `@turtleos/server` HTTP/WS** — cleaner long-term but blocks on that server's realtime maturity; also leaves this repo's richer graph API behind. Rejected for now; revisit post-convergence.
- **Baking Campus types into the kernel** — betrays ontology-agnosticism, makes the spatial metaphor unforkable. Rejected.
- **CRDTs for conflict resolution** — cost and complexity unjustified before awareness-based collision avoidance is even in place. Deferred.
- **A separate room concept for realtime** — creates a second scoping lattice that drifts from zones. Rejected (D3).
- **Global shared behavioral graph** for recommendations/reputation — poisoned the moment agents transact at scale. Rejected (D9).

## Phasing (scoping skeleton)

| Phase | Scope | Depends on |
|-------|-------|-----------|
| **P0** | BroadcastChannel presence in sidecar realtime, keyed `zone:<id>` (rung 1; no server work) | — |
| **P1** | Graph-residency migration for routes/projections/ontologies; `useTrellisConfig` → SSE-invalidated `/api/graph/config` snapshot (true SDK live query in P3); demote static baseline | — |
| **P2** | Capability-gated join middleware in `trellis` relay; Campus schema package; zone guard enforcement moves down | P0 (vocabulary), SPEC-v1.1 direction for grant semantics |
| **P3** | Vue data layer onto `trellis/vue` + SDK adapter; retire embedded kernel fork (divergence audit → port/keep/drop) | P1 |
| **P4** | WS relay rung for cross-machine presence (sidecar/Sprites); agent presence rendering | P0, P2 |
| **P5+** | Iroh transport rung; Wallet/reputation projections | SPEC-v1.1, P2 |

P0 and P1 are independent and both immediately actionable; each is days-scale.

**P3 wedge (TRL-15):** Sidecar-first — `useTrellisConfig` live subscribe via `trellis/vue` when `TrellisDb` client present; embedded kernel retains P1 SSE snapshot until kernel-bridge lands. See `.agent/plans/WU-ADR002-P3-spec.md`.
