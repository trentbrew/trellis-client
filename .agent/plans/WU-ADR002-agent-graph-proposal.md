# Proposal: ADR-002 agent graph engine audit (TRL-21)

**VCS:** TRL-21 (proposal) · parent TRL-12 (ADR-002 epic)  
**Human decision:** pathway A ship — auto-route agent graph audit after TRL-20 — 2026-07-03  
**Builds on:** TRL-18 fork file audit · TRL-19a persistence · TRL-20 ontology registry  
**Status:** queue-ready

---

## Problem

TRL-18 assigned **`keep embedded`** to `packages/trellis-kernel/graph/` without a focused comparison against published npm surfaces. Strategists and executors still ask whether `trellis/ai` or `trellis/core` agents replace the embedded `Graph` + `Engine` used by the Flow workflow UI.

The fork audit names three direct importers (`useWorkflowExecution`, `workflow-tools`, `llm` adapter) but does not document:

- Node-kind contract (`Agent` | `Tool` | `Router` | `Guard` | `MemoryRead` | `MemoryWrite` | `End`)
- Browser execution model (client-side `Engine.run()` generator + SSE-less step traces)
- Distinction from **`workflows/`** YAML `WorkflowEngine` (server-side dataset pipelines)
- Distinction from npm **`AgentHarness`** (graph-resident agent defs + decision traces)

Without a decision artifact, TRL-19b kernel swap risks accidental deletion or premature port of app-coupled graph code.

## Goal

Produce **`docs/architecture/adr-002-agent-graph-engine-audit.md`** — authoritative decision doc that:

1. Inventories `packages/trellis-kernel/graph/` (all 10 `.ts` files)
2. Maps app integration (composables, Flow UI, tool proxy, LLM shim)
3. Compares embedded `Engine` vs npm `trellis/ai` vs `trellis/core/agents/AgentHarness`
4. Records verdict: **keep embedded** (or documents port blockers if comparison surprises)
5. Recommends follow-on wedges (upstream graph to npm, AgentHarness bridge) without starting them

## Non-goals

- Porting graph engine to npm or swapping imports
- Rewriting `useWorkflowExecution` or Flow editor
- Unifying `workflows/WorkflowEngine` with `graph/Engine`
- Wiring `AgentHarness` into Nuxt server plugin
- E2e Flow execution tests in this wedge
- Changing runtime behavior or dependencies

---

## Proposed deliverable

Single doc: `docs/architecture/adr-002-agent-graph-engine-audit.md`

Cross-links:

- `docs/architecture/adr-002-kernel-fork-file-audit.md` § graph + workflows
- `docs/architecture/adr-002-kernel-divergence-audit.md` workflow row

## Success criteria (human)

- Executor can stop re-litigating “should we use trellis/ai for workflows?”
- TRL-19b full kernel swap proceeds without touching `graph/` imports
- Strategist has a clear optional follow-on (TRL-22 upstream graph) if product wants npm parity

---

## Handoff

```bash
# → architect spec TRL-21
```
