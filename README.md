# TQL Hooks + Context Graph: Project Brain

Establish TQL as the project's decision trace / context graph — a shared knowledge base for agent and developer — by fixing the broken hook imports, creating a portable JSONL backend, upgrading archive responses to JSON-LD, and adding self-healing capabilities.

---

## Context: Why This Matters (The Article Connection)

The "Context Graphs" article by Gupta & Garg describes exactly what we're building. Their thesis:

> The next trillion-dollar platforms are systems of record for **decisions**, not just objects.

Traditional SoRs capture *what* (Salesforce: the deal price, Jira: the ticket status). What's missing is *why* — the decision traces: what context was gathered, what policies applied, what exceptions were granted, who approved, and what precedent existed.

**TQL + hooks is a context graph for software development.** Here's the mapping:

| Article Concept | Our Implementation |
|---|---|
| Decision traces | Every hook event → Action entity with full context (what was read, written, why) |
| Exception handling | Guard policies + spiral detection + pattern promotion |
| Precedent building | Recurring issues → durable Pattern entities that inform future sessions |
| Cross-system synthesis | Kernel sees across files, git, sessions, commands, dependencies |
| Replayable history | Append-only JSONL op log with hash chain = event-sourced decision ledger |
| Context at commit time | Hooks fire *during* agent execution, not after-the-fact via ETL |
| Feedback loop | Captured traces → searchable precedent → better future decisions |

The key insight from the article: **"Being in the execution path at commit time"** is the structural advantage. We have that — hooks fire inside Windsurf's lifecycle, capturing context *as decisions happen*, not retrospectively.

### What makes this different from just logging

Logs are flat, unlinked, and append-only. A context graph is:
- **Linked** — sessions → actions → files → changes → patterns → evaluations
- **Queryable** — EQL-S can answer "which files always break together?" or "what patterns recur in Friday sessions?"
- **Precedent-aware** — Pattern promotion means the system *learns* from its own failure modes
- **Bidirectional** — the dashboard inbox lets humans inject intent back into the agent loop

The JSON-LD archive upgrade (below) is exactly what the article calls for: turning raw responses into **structured, auditable decision records** with semantic typing and entity links.

---

## Decisions

### 1. JSONL Backend: Portable (Node `fs`)
Use `fs.appendFileSync` / `fs.readFileSync` — no Bun-specific APIs. The package stays usable from any Node-compatible runtime.

### 2. `.tql/` Git Strategy

| Path | Git Status | Rationale |
|---|---|---|
| `workspace.json` | **Tracked** | Schema/config, small, rarely changes |
| `policies.eqls` | **Tracked** | Guard rules, should be versioned |
| `graph.jsonld` | **Tracked** | Service definitions, seed state |
| `ops.jsonl` | **Gitignored** | Grows fast (every hook event = 1+ ops). Ephemeral log. |
| `snapshot.json` | **Tracked** | Compacted state checkpoint. Portable. |

**Implications of gitignoring `ops.jsonl`:**
- Each fresh clone starts from `snapshot.json` (last compacted state) — no session/action history until hooks start firing
- `tql-compact.ts` already exists and does exactly this: replay → snapshot → truncate. Run it before commits to preserve state.
- File/Dependency/Commit entities survive compaction (they're in the snapshot). Session/Action entities are ephemeral by nature.
- Middle ground: could add a `tql-compact` post-commit hook to auto-snapshot before push

### 3. Graceful No-Op + Self-Healing

**Graceful no-op:** Every TQL hook gets a fast-path guard at the top:
```ts
if (!existsSync(resolve(import.meta.dirname, '../.tql/ops.jsonl'))) {
  process.exit(0); // No-op, don't block
}
```
Some hooks already do this (`tql-ingest.ts`, `tql-eval.ts`). Others don't (`tql-guard.ts` partially). Standardize across all.

**Self-healing via `tql-eval.ts`:** The eval hook already detects spirals. We can extend it to:
1. Detect **hook infrastructure failures** (e.g., kernel boot errors, missing files)
2. Attempt **auto-repair** (re-run `tql-init.ts` if `.tql/` is corrupted, re-create missing files)
3. Log a **HealEvent** entity to the graph so the repair is itself a decision trace
4. Surface the repair to the user via `show_output`

This creates a self-monitoring feedback loop: hooks monitor the agent, and a meta-hook monitors the hooks.

---

## Phase 1: Fix Infrastructure

### 1.1 Create `packages/tql/persist/jsonl-backend.ts`
Portable `KernelBackend` implementation using Node `fs` APIs:
- `appendFileSync` for writes (atomic per-line)
- `readFileSync` + line-split for reads
- Snapshot stored as `{filename}.snapshot.json` sibling
- No external dependencies

### 1.2 Update import paths in `_kernel.ts`
```
../tql/kernel/trellis-kernel.js  →  ../packages/tql/kernel/trellis-kernel.js
../tql/persist/jsonl-backend.js  →  ../packages/tql/persist/jsonl-backend.js
```

### 1.3 Update 12 hook files with direct TQL imports
All `../tql/kernel/trellis-kernel.js` → `../packages/tql/kernel/trellis-kernel.js`

### 1.4 Add JSONL backend export to `packages/tql/package.json`

### 1.5 Standardize graceful no-op guards across all TQL hooks

---

## Phase 2: Bootstrap `.tql/`

### 2.1 Create `workspace.json` with entity types used by hooks
Session, Action, File, Change, Commit, Dependency, Task, Feature, Milestone, Decision, Convention, Pattern, Eval, Service, HealEvent

### 2.2 Create `policies.eqls` (starter guard rules)

### 2.3 Create `graph.jsonld` (dev server service node, `userManaged: true`)

### 2.4 Create `.tql/.gitignore` (ignore `ops.jsonl`, keep `snapshot.json`)

### 2.5 Run `tql-init.ts` → scans project, seeds files + deps + git log

### 2.6 Run `tql-seed.ts` → populates milestones, features, tasks, decisions

### 2.7 Verify with `tql-status.ts`

---

## Phase 3: JSON-LD Archive Responses

Upgrade `archive-response.ts` from flat markdown to structured JSON-LD.

### Current output (markdown)
```markdown
---
trajectory_id: ...
execution_id: ...
timestamp: ...
---
# Cascade Response
{raw response text}
```

### Proposed output (JSON-LD)
```jsonld
{
  "@context": {
    "tql": "https://trellis.dev/ns/",
    "schema": "https://schema.org/",
    "prov": "http://www.w3.org/ns/prov#"
  },
  "@id": "tql:response:{execution_id_short}",
  "@type": ["tql:AgentResponse", "prov:Activity"],
  "tql:trajectoryId": "...",
  "tql:executionId": "...",
  "schema:dateCreated": "...",
  "tql:session": { "@id": "tql:session:{trajectory_id}" },
  "tql:content": {
    "@type": "tql:ResponseContent",
    "tql:rawText": "...",
    "tql:wordCount": 342,
    "tql:sections": [
      {
        "@type": "tql:ResponseSection",
        "tql:heading": "Planner Response",
        "tql:actions": [
          { "@type": "tql:FileRead", "tql:path": "app/config/app-config.jsonld" },
          { "@type": "tql:FileEdit", "tql:path": "app/pages/collections/index.vue", "tql:linesAdded": 5, "tql:linesRemoved": 8 },
          { "@type": "tql:CodeSearch", "tql:query": "sidebarSections" },
          { "@type": "tql:BrowserVerification", "tql:url": "http://localhost:$TRELLIS_PORT/collections", "tql:result": "0 errors" }
        ],
        "tql:decisions": [
          {
            "@type": "tql:Decision",
            "tql:description": "Used 'unpinned' keyword instead of new sidebar resolver",
            "tql:rationale": "Existing pipeline already resolves collectionsChildren"
          }
        ]
      }
    ]
  },
  "tql:artifacts": [
    { "@type": "tql:FileModified", "tql:path": "app/config/app-config.jsonld" },
    { "@type": "tql:FileModified", "tql:path": "app/pages/collections/index.vue" },
    { "@type": "tql:BugFixed", "tql:description": "CollectionCreateModal → CollectionCreateDialog" }
  ],
  "tql:verification": {
    "@type": "tql:VerificationResult",
    "tql:consoleErrors": 0,
    "tql:consoleWarnings": 0,
    "tql:browserTested": true
  }
}
```

### Implementation approach
The response text needs lightweight parsing to extract structure:
1. **Section detection** — split on `### Planner Response` or similar headings
2. **Action extraction** — regex for `*Viewed file:*`, `*Edited relevant file*`, `*Grep searched*`, `*Running MCP tool*`
3. **File path extraction** — regex for `file:///...` references
4. **Decision extraction** — heuristic: sentences containing "chose", "decided", "because", "instead of", "approach"
5. **Verification extraction** — regex for error/warning counts, browser test mentions

This is best-effort parsing — the structure won't be perfect, but even partial extraction is vastly more useful than raw markdown for auditing and graph queries.

### File format
- Extension: `.jsonld` (replaces `.md`)
- Directory: `cascade-archive/` (same location)
- Filename: `{date}_{time}_{execution_id}.jsonld`

---

## Phase 4: Self-Healing Hook

Add a `tql-heal.ts` hook (or extend `tql-eval.ts`) that:

1. **Detects infrastructure issues:**
   - `.tql/` directory missing → re-run init
   - `ops.jsonl` corrupted (invalid JSON lines) → truncate + restore from snapshot
   - `workspace.json` missing → regenerate from template
   - Kernel boot failure → log error, attempt recovery

2. **Repair actions:**
   ```
   [HQ Heal] ⚕ Detected: ops.jsonl corrupted (line 47: invalid JSON)
   [HQ Heal] → Restoring from snapshot.json (last compacted state)
   [HQ Heal] → Truncated ops.jsonl, kernel healthy (142 entities)
   ```

3. **Records the repair as a decision trace:**
   - Creates `HealEvent` entity in the graph
   - Links to the session that triggered the repair
   - Captures what was broken, what was done, and the result

4. **Registered on:** `post_cascade_response` (periodic health check) and triggered on-demand via `bun run hooks/tql-heal.ts`

---

## Phase 5: Verify End-to-End

- Run each hook with sample stdin JSON
- Confirm hooks fire during normal Windsurf usage (`[HQ]` output visible)
- Verify guard blocks dangerous commands
- Trigger a spiral to test eval detection
- Corrupt `.tql/ops.jsonl` to test self-healing
- Check a JSON-LD archive file for correct structure
- Run `tql-status.ts` to confirm graph health

---

## Open Questions

1. **Archive parsing depth** — The JSON-LD response parsing is heuristic-based (regex on markdown). Should we invest in a more robust parser, or is best-effort fine for v1? We can always improve the parsing later as we learn what's most useful for auditing.

2. **Hook frequency** — `tql-ingest` fires on 7 of 8 hook events. Each boot replays the op log. As the graph grows, this could add latency. Options:
   - **Compaction cadence**: auto-compact when `ops.jsonl` > N lines (e.g., 500)
   - **In-memory cache**: keep kernel alive between hook invocations (harder, requires a daemon)
   - **Skip redundant events**: not all events need full kernel boot (e.g., `pre_user_prompt` could just append to a lightweight log)

3. **Dashboard integration** — The `tql-server.ts` hook includes a WebSocket server + REST API + static dashboard. Should we wire that up as part of this work, or keep it as a separate phase?
