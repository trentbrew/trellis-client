# Proposal: ADR-002 fork file audit — embedded kernel vs published `trellis`

**VCS:** TRL-18 (proposal) · parent TRL-12 (ADR-002 epic)  
**Human decision:** pathway A ship TRL-17 complete — auto-route fork audit — 2026-07-03  
**Builds on:** TRL-16 (kernel-bridge) · TRL-17 (browse live) · divergence audit §4  
**Status:** queue-ready

---

## Problem

ADR-002 D1 commits convergence toward published `trellis` (npm). `@turtle.tech/trellis-kernel` in `packages/trellis-kernel/` is **transitional** — but we lack a **file-level map** of what the fork contains, what npm `trellis@3.2` already covers, and per-module verdicts (`port` | `keep embedded` | `drop` | `upstream`).

Surface-level divergence audit (`docs/architecture/adr-002-kernel-divergence-audit.md`) names query optimizer, workflows, and formula/analytics as **fork-only candidates** without inventory or import-usage proof.

## Goal

Produce a **maintainable audit artifact** that:

1. Inventories every file under `packages/trellis-kernel/`
2. Maps each module to the closest `trellis@^3.2` equivalent (or `—` if none)
3. Records monorepo **import usage** (who depends on embedded-only APIs)
4. Assigns verdicts with rationale for priority modules (query, workflows, computation, analytics, graph)
5. Recommends the **next 3 port wedges** (post-P2-blocked backlog)

## Non-goals

- Porting or deleting embedded code in this wedge
- Line-by-line diff of every file (spot-check + structural compare only)
- `@turtleos/kernel` comparison (separate track)
- Iroh / P5 transport
- Retiring MCP, CLI, or Nuxt server plugin in this pass
- Changing runtime behavior or dependencies

---

## Proposed deliverable

Single doc: `docs/architecture/adr-002-kernel-fork-file-audit.md`

Optional helper script (docs support only): `scripts/audit-kernel-fork-inventory.mjs` — regenerates file table; not required if manual table is complete.

## Success criteria (human)

- Architect can point Executor at the next concrete port wedge with file paths and verdict
- Strategist can prioritize without re-litigating D1
- Divergence audit §4 marked **in progress → shipped** when artifact lands

---

## Handoff

```bash
# → architect spec TRL-18
```
