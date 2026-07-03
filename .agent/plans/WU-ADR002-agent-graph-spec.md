# Spec: ADR-002 agent graph engine audit (TRL-21)

**VCS:** TRL-21 (spec) · parent TRL-12 · proposal `WU-ADR002-agent-graph-proposal.md`  
**Audit parent:** `docs/architecture/adr-002-kernel-fork-file-audit.md` § port queue #3  
**Builds on:** TRL-18 · TRL-19a · TRL-20  
**Compared versions:** `@turtle.tech/trellis-kernel/graph` vs `trellis@3.2.3` (`trellis/ai`, `trellis/core/agents`)  
**Status:** queue-ready

---

## Problem

The Flow workflow builder runs a **client-side DAG executor** (`Graph` + `Engine`) compiled from Vue Flow node defs in `useWorkflowExecution`. Published npm `trellis@3.2.3` exposes:

| Subpath | Actual surface | Workflow DAG? |
|---------|----------------|---------------|
| `trellis/ai` | Embeddings, chunkers, RAG (`EmbeddingManager`) | **No** |
| `trellis/core/agents` | `AgentHarness` — graph-resident agents, tool registry, decision traces | **No** — single-agent task runs, not visual DAG |
| `trellis/core` | `TrellisKernel`, persistence, EQL | Kernel only |

No npm export provides `Graph`, `Engine`, `NodeKind`, or `ExecutorTable`. TRL-18 pre-verdict **keep embedded**; this wedge supplies proof and integration map.

## Goal

Deliver **`docs/architecture/adr-002-agent-graph-engine-audit.md`** with a binding **keep embedded** verdict for `packages/trellis-kernel/graph/` through ADR-002 P1.

## Non-goals

- Code ports, dependency swaps, or deleting `graph/`
- Server-side workflow API migration (routes live in `packages/trellis-cli/web` bundle today)
- `workflows/WorkflowEngine` port decision (note as sibling module; verdict **keep embedded** per TRL-18)
- AgentHarness integration wedge
- Runtime verification of Flow execution

---

## Methodology

### A — Embedded graph inventory

Enumerate all `*.ts` under `packages/trellis-kernel/graph/`:

| File | LOC (approx) | Role |
|------|--------------|------|
| `index.ts` | 10 | Barrel export |
| `graph.ts` | 38 | `Graph` container (nodes + edges) |
| `engine.ts` | 378 | `Engine` — async generator `run()`, step budget, orchestrator hooks |
| `executors.ts` | 156 | Default executors per `NodeKind` |
| `tools.ts` | 217 | Tool registry helpers |
| `types.ts` | 157 | `NodeKind`, `EngineState`, `Trace`, `LLMClient`, `ToolFn` |
| `validators.ts` | 22 | Graph validation |
| `util.ts` | 10 | Helpers |
| `logger.ts` | 507 | Structured logger (**drop** per TRL-18 — unused by app) |
| `logger-index.ts` | 16 | Logger factory (**drop**) |

**Runtime-critical subset:** 8 files (~956 LOC excluding logger).

### B — npm comparison matrix

Document side-by-side:

| Capability | Embedded `Engine` | `AgentHarness` | `trellis/ai` |
|------------|-----------------|----------------|--------------|
| Visual DAG nodes | 7 kinds | — | — |
| Client/browser execution | Yes (`globalThis.crypto`) | Server/kernel | Server |
| Step traces (`Trace[]`) | Yes | `DecisionTrace[]` (different shape) | — |
| LLM integration | `LLMClient` inject | `LLMProvider` via config | Embedder only |
| Tool invocation | `Record<string, ToolFn>` | `registerTool` + `invokeTool` | — |
| Graph memory R/W nodes | `MemoryRead` / `MemoryWrite` | Context manager | Vector store |
| Orchestrator hooks | `beforeNode`, `onError`, … | — | — |
| Streaming LLM | `LLMClient.stream?` | Provider-dependent | — |

**Expected conclusion:** No npm drop-in. `AgentHarness` is complementary (zone agents, MCP-style runs), not a replacement.

### C — App integration map

| Consumer | Path | Imports from `graph/` |
|----------|------|------------------------|
| Workflow compiler + runner | `app/composables/useWorkflowExecution.ts` | `Graph`, `Engine`, types, re-exports `Trace` |
| Tool proxy client | `app/lib/workflow-tools/index.ts` | `ToolFn` |
| LLM shim | `app/lib/llm/index.ts` | `LLMClient` |
| Run persistence UI | `app/composables/useWorkflowRuns.ts` | via `useWorkflowExecution` (no direct import) |
| Flow editor | `app/components/Flow/FlowEditor.vue`, `FlowExecutionPanel.vue` | via composables |
| Deprecated re-export | `packages/tql/graph.ts` | `export * from '@turtle.tech/trellis-kernel/graph'` |

Document **node-kind mapping** in `useWorkflowExecution` (`agent` → `Agent`, `tool` → `Tool`, `router` → `Router`, etc.) — proves UI schema is embedded-engine-specific.

### D — Sibling module note (`workflows/`)

One paragraph: `packages/trellis-kernel/workflows/WorkflowEngine` executes **YAML dataset pipelines** (parser, planner, runners). Used by CLI / notification triggers (`/api/workflows/run`), **not** by Flow editor. Verdict **keep embedded** (TRL-18). Do not conflate with `graph/Engine`.

### E — Verdict + follow-ons

**Primary verdict:** `keep embedded` for `graph/` through ADR-002 P1.

**Rationale bullets (executor expands to paragraphs):**

1. Zero npm API parity for DAG executor + node kinds
2. Browser-first execution path; `AgentHarness` requires `TrellisKernel` server instance
3. `trellis/ai` is embeddings/RAG — name collision only
4. Three app files + Flow UI directly type against embedded interfaces
5. Porting before TRL-19b risks dual-engine drift during kernel swap

**Optional follow-on wedges (document only — do not queue impl):**

| ID | Title | Trigger |
|----|-------|---------|
| TRL-22 | Upstream `graph/` to published `trellis` | Product wants single npm engine |
| TRL-23 | AgentHarness bridge for zone agents | `/agent` lab UI uses harness instead of custom runs |
| TRL-24 | Retire `packages/tql/graph.ts` shim | After any port |

---

## Implementation slices (executor order)

### Slice 1 — Skeleton + inventory

| File | Action |
|------|--------|
| `docs/architecture/adr-002-agent-graph-engine-audit.md` | New — header, problem, executive summary with verdict |

### Slice 2 — npm comparison + API gap table

| File | Action |
|------|--------|
| same | Add comparison matrix (§B) + “what trellis/ai is not” callout |

### Slice 3 — App integration + node-kind map

| File | Action |
|------|--------|
| same | Import usage table + `useWorkflowExecution` kind mapping |
| same | Flow UI / composable dependency diagram (ascii or mermaid) |

### Slice 4 — Cross-links + follow-ons

| File | Action |
|------|--------|
| same | Sibling `workflows/` note, follow-on table, appendix commands |
| `docs/architecture/adr-002-kernel-fork-file-audit.md` | Add “Shipped TRL-21” note under port queue item #3 |
| `docs/architecture/adr-002-kernel-divergence-audit.md` | Optional one-line link under workflow row |

---

## Acceptance criteria

1. **Artifact exists:** `docs/architecture/adr-002-agent-graph-engine-audit.md` ≥ 120 lines, ≥ 7 `##` sections
2. **Graph coverage:** all 10 `packages/trellis-kernel/graph/*.ts` files appear in inventory with role + TRL-18 verdict echo
3. **npm comparison:** table covers embedded `Engine`, `AgentHarness`, and `trellis/ai` with ≥ 8 capability rows
4. **Import usage:** documents all 3 direct `@turtle.tech/trellis-kernel/graph` importers + `packages/tql/graph.ts` shim
5. **UI coupling:** lists `useWorkflowExecution`, `useWorkflowRuns`, `FlowEditor`, `FlowExecutionPanel` with dependency notes
6. **Node kinds:** documents 7 `NodeKind` values and UI `kind` → `NodeKind` mapping from `useWorkflowExecution`
7. **Verdict:** explicit **keep embedded** with ≥ 2 paragraphs rationale; states `trellis/ai` is not a workflow engine
8. **No runtime changes:** `git diff` touches only `docs/**` (and optional cross-link lines in existing audit docs)

**Verification commands:**

```bash
# Section count
rg -n "^## " docs/architecture/adr-002-agent-graph-engine-audit.md

# Graph file coverage (expect 10)
find packages/trellis-kernel/graph -name '*.ts' | wc -l

# Direct importers (expect 3 in apps/web + 1 shim)
rg -l '@turtle.tech/trellis-kernel/graph' apps/web packages/tql --glob '*.{ts,vue}'

# Docs-only diff
git diff --stat -- docs/
```

**Manual AC:** Strategist can answer “why not trellis/ai?” from executive summary alone.

---

## Handoff

```bash
trellis issue start TRL-21
trellis issue create -t "Impl: agent graph engine audit (TRL-21)" -l impl --parent TRL-21 -S queue
```
