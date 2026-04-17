# Workflows — Audit & Feature-Complete Plan

_Snapshot audit + scoped roadmap. Not a commitment; read, prune, prioritize._

## 1. Current State (as of today)

### What works end-to-end

| Capability                            | Status | Notes                                                                   |
| ------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Create workflow (blank + 4 templates) | ✅     | Templates in `app/data/workflowTemplates.ts`                            |
| VueFlow canvas + 9 node kinds         | ✅     | start, agent, tool, router, guard, memory-read, memory-write, end, note |
| Edit graph (add/remove/connect/drag)  | ✅     | Via `useWorkflowEditor`                                                 |
| Undo/redo + auto-layout               | ✅     | 50-step history, BFS topological layout                                 |
| Debounced autosave (800ms)            | ✅     | Persists to InstantDB via `useInstantData().updateWorkflow`             |
| Graph validation warnings             | ✅     | Missing start/end, isolated nodes                                       |
| Export / Import JSON                  | ✅     | Manual download/upload                                                  |
| Delete workflow                       | ✅     | —                                                                       |
| Inline title editing                  | ✅     | —                                                                       |
| Client-side execution engine          | ✅     | TQL `@turtle.tech/tql/graph` Engine                                     |
| Execution panel with traces           | ✅     | Step inspector, per-node status, animated states                        |

### What's a stub

| Item                                                      | Issue                                                                                        | Impact                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `active` toggle                                           | Just flips a boolean, does nothing                                                           | Active/Inactive label is a lie             |
| `trigger: 'manual' \| 'schedule' \| 'webhook' \| 'event'` | Field exists, no runtime                                                                     | Templates advertise triggers but none fire |
| LLM                                                       | `createPassthroughLLM()` — echoes input                                                      | Agent nodes don't think                    |
| Tool registry                                             | `options.tools` never populated                                                              | Tool nodes don't do anything               |
| Execution history                                         | In-memory only                                                                               | Refresh = lost traces                      |
| Secrets / credentials                                     | None                                                                                         | Can't call any real API                    |
| Node config UI                                            | `FlowNodeConfig.vue` exists — needs verification                                             | Unknown how editable nodes are             |
| Server-side execution                                     | None; client-only                                                                            | Can't run when browser is closed           |
| Dual storage                                              | Client uses InstantDB (`useInstantData`), server has `/api/platform/workflow/*` (TQL kernel) | Drift inevitable                           |

### Small wins already available

- Bottom rail (layout preference respected now)
- Bordered card wrapper (fixed via `bg-color: transparent` on `.flow-container`)
- Sidebar lists workflows from `useInstantData().workflows`
- URL routing preserves workspace prefix

---

## 2. Target: Feature-Complete in 4 Phases

### Phase 1 — **Make It Real** (Foundation, ~1–2 days)

Goal: Workflows that actually execute against real data.

- **Node config UI** — audit `FlowNodeConfig.vue`, fix any missing fields (system prompt, model, tool args, router routes, guard conditions, memory keys)
- **LLM integration** — swap passthrough for OpenAI/Anthropic via existing API key management (check `server/api/integrations/`)
- **Tool registry** — define a typed registry with built-in tools:
  - `web_search` (Brave/Serper)
  - `http_request` (generic GET/POST)
  - `run_js` (sandboxed — audit safety)
  - `trellis_query` (run EQL-S against the graph)
  - `trellis_mutate` (create/update/delete entities)
  - `notification_send` (email/push)
- **Secrets** — read from workspace settings via existing `settings` entities; never embed in graph JSON
- **Memory nodes → Trellis entities** — `memory-read` / `memory-write` bind to the TQL graph (`entity:` namespace). Key = entity ID or EQL query. This is the killer move: workflows operate on the graph.
- **Consolidate storage** — decide: InstantDB (current) OR TQL kernel via `/api/platform/workflow/*` (not both). Pick TQL since workflows belong to the graph.

### Phase 2 — **Triggers** (~2–3 days)

Goal: Workflows fire without a user clicking "Run".

- **Manual trigger** — already works (Run button)
- **Schedule trigger** — cron expression field; server-side scheduler (Trigger.dev is available per MCP config, or a lightweight node-cron worker)
- **Webhook trigger** — auto-generate `/api/workflows/webhook/:id` endpoint; signed secret; payload becomes input
- **Entity event trigger** — subscribe to `entityType + action` (e.g. "when task created" or "when note tagged #review"); hook into existing SSE mutation stream
- **Active toggle** — finally means something: enabled triggers register, disabled don't

### Phase 3 — **Observability** (~1–2 days)

Goal: Debug, audit, and trust your workflows.

- **Execution history** — persist each run as an entity (`entity:workflow-run-{id}`); show list on workflow detail page
- **Run detail view** — traces, step outputs, final state, timing, errors — viewable after-the-fact
- **Live runs** — if a workflow is executing elsewhere (scheduled/webhook), watch it via SSE
- **Metrics** — avg duration, success rate, last run, error trend (sparkline on workflow card)
- **Logs** — per-node stdout/stderr capture for debugging

### Phase 4 — **Advanced** (~2–4 days)

Goal: From automation tool → agent platform.

- **Sub-workflows** — a "workflow" node that invokes another workflow
- **Parallel branches** — run-in-parallel with a `join` node
- **Retries + error paths** — per-node retry count, onError edges
- **Approval nodes** — pause workflow until a human clicks approve/reject in UI or Slack
- **Streaming agent output** — UI shows tokens as they arrive (WebSocket/SSE)
- **Versioning** — graph revisions with restore; autosave creates versions
- **Collaboration** — real-time multi-user editing (longer-term; InstantDB presence)
- **Marketplace / sharing** — publish templates; browse community workflows
- **Cost tracking** — LLM token usage per run

---

## 3. Recommended Order

**Must-have for "works":** Phase 1 (Make It Real) + Phase 2 Triggers (at minimum manual+webhook+schedule)

**Polish pass:** Phase 3 (Observability) — so users can trust it

**Delightful & differentiated:** Phase 4 — hold until the above is solid

---

## 4. Decisions (locked in)

| Q                       | Decision                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LLM provider**        | **Ollama primary** (`gemma4:e4b`, local, free). **Gemini fallback** via `GEMINI_API_KEY`. Both accessed through a Nuxt server proxy at `/api/llm/generate` to (a) avoid CORS with Ollama from browser, (b) keep Gemini key server-only. |
| **Scheduler**           | **Native** — `node-cron` running inside the Nuxt Nitro server. Registers/unregisters jobs on workflow `active` toggle.                                                                                                                  |
| **Webhook signing**     | **HMAC-SHA256** with per-workflow secret. Secret rotates on-demand. Header: `X-Trellis-Signature: sha256=<hex>`.                                                                                                                        |
| **Sub-workflow limits** | Max depth 5. Detect cycles by tracking workflow-ID chain in execution context.                                                                                                                                                          |
| **Cost containment**    | Skipped — Ollama is free and local. Gemini path will get a default `maxSteps: 50` (already enforced by engine).                                                                                                                         |
| **Role gating**         | **Admin-only** — both read and write. Gated via existing `userRole` check in `useRoutes` / middleware.                                                                                                                                  |
| **Execution location**  | **Local** — runtime runs server-side in the Nuxt process for all modes. Client streams progress via SSE.                                                                                                                                |

---

## 5. Files to Touch (Phase 1 shortlist)

- `app/components/Flow/FlowNodeConfig.vue` — config UI audit
- `app/composables/useWorkflowExecution.ts` — real LLM + tool registry
- `app/composables/useInstantData.ts` → migrate workflow CRUD to `/api/platform/workflow/*`
- `server/api/workflows/execute.post.ts` — **new** — server-side execution endpoint
- `server/api/workflows/tools/*.ts` — **new** — tool handlers
- `server/utils/workflow-runtime.ts` — **new** — shared runtime (tool registry, LLM clients, secrets resolver)
- `instant.schema.ts` — may need workflow-runs entity

---

## 6. Progress

### ✅ Phase 1.1 — Real LLM (shipped)

- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/server/api/llm/generate.post.ts`** — unified proxy
  - Ollama primary (default `gemma4:e4b`)
  - Gemini cloud fallback via `GEMINI_API_KEY`
  - `passthrough` model for workflow Start nodes (no LLM call)
  - Model routing via prefix: `gemini-*` → Gemini, else Ollama
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/app/lib/llm/index.ts`** — `createLLMClient()` factory conforming to `@turtle.tech/tql/graph` `LLMClient` shape
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/app/composables/useWorkflowExecution.ts`** — swapped passthrough default for `createDefaultLLMClient()`; default Agent model is now `gemma4:e4b`
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/app/components/Flow/FlowNodeConfig.vue`** — model dropdown updated to real supported models (Ollama locals + Gemini cloud)

**Verified**: Research & Summarize template runs end-to-end (7 steps in ~27s) with 0 console errors. Real Gemma 4 output captured in step inspector.

### ✅ Phase 1.2 — Tool Registry (shipped)

- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/server/utils/workflow-tools.ts`** — six handlers:
  - `http_request` — fetch wrapper with AbortController timeout (default 10s), safe header merge
  - `tql_query` — EQL-S against the kernel, returns `{ rows, count }`
  - `tql_load_data` — load entity by ID from the EAV store
  - `tql_mutate` — `createNode` / `updateNode` / `deleteNode` / `link` against the kernel, emits mutation events
  - `send_email` — Resend wrapper (graceful no-op without `RESEND_API_KEY`)
  - `run_js` — sandboxed Node `vm` eval; 5s timeout; only `input`, `JSON`, scoped `console` exposed
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/server/api/workflows/tool/[name].post.ts`** — unified POST proxy (looks up handler, routes args, returns `{ ok, name, result }`)
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/app/lib/workflow-tools/index.ts`** — `createWorkflowTools()` / `createDefaultWorkflowTools()` factory returning a `Record<string, ToolFn>` that proxies to the server
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/app/composables/useWorkflowExecution.ts`** — default tools switched from `undefined` to `createDefaultWorkflowTools()`
- **`@/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web/app/components/Flow/FlowNodeConfig.vue`** — tool dropdown now matches the server registry (added `tql_mutate`, dropped stub labels)

**Verified** (curl against live dev server):

- `http_request` → GET httpbin.org/json → 200, JSON body ✓
- `tql_query` → EQL-S → rows ✓
- `tql_mutate createNode` → `entity:tool-test-phase12` created ✓
- `tql_load_data` → loaded the just-created entity ✓
- `send_email` → graceful "RESEND_API_KEY not configured" response ✓
- `run_js` → `return { sum: 1+2, got: input }` → `{ sum: 3, got: { foo: "bar" } }` with captured logs ✓

### ⏭ Next — Phase 1.3: Memory Nodes → Trellis Graph

Right now `memory-read` / `memory-write` nodes use arbitrary in-memory keys. Rewire them so:

- `memory-read` accepts an **EQL-S query** or **entity ID** and puts results into engine state
- `memory-write` creates/updates a Trellis entity (goes through `tql_mutate` internally)

This is the killer feature — it makes workflows first-class graph citizens instead of standalone scripts.
