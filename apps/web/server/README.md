# `apps/web/server/`

Nitro server runtime for the Trellis web app. Handles all HTTP API routes, server plugins (TQL kernel, realtime notifiers), and server-side utilities.

> Nuxt automatically discovers everything here. Do not add a build step.

---

## Layout

```
apps/web/server/
├── api/         HTTP route handlers (one file per route)
├── plugins/     Lifecycle plugins (run on Nitro start)
└── utils/       Server-side helpers (auto-imported in route handlers)
```

---

## `api/` — Route handlers

Nitro maps the file path to the URL path. Conventions:

| File pattern                    | URL                          |
|---------------------------------|------------------------------|
| `api/foo.get.ts`                | `GET /api/foo`               |
| `api/foo.post.ts`               | `POST /api/foo`              |
| `api/foo/[id].get.ts`           | `GET /api/foo/:id`           |
| `api/foo/[...path].ts`          | `GET/POST /api/foo/*` (catch-all) |

### Route groups

| Group                  | Purpose                                                               |
|------------------------|-----------------------------------------------------------------------|
| `api/graph/`           | TQL kernel surface — `query`, `mutate`, `node`, `events` (SSE), `log` |
| `api/platform/`        | Workspace data — orgs, apps, members, settings (cloud mode)           |
| `api/agent/`           | Agent chat + tool routing                                             |
| `api/chat/`            | Chat messaging                                                        |
| `api/integrations/`    | OAuth + webhook handlers (Google Calendar, Gmail, GitHub)             |
| `api/storage/`         | File upload + signed URLs                                             |
| `api/llm/`             | LLM enrichment endpoints (entity, file, email)                        |
| `api/notifications/`   | Notification CRUD                                                     |
| `api/admin/`           | Admin-only routes (gated by middleware)                               |
| `api/workflows/`       | Workflow execution                                                    |
| `api/youtube/`         | YouTube metadata + transcript                                         |

Top-level helpers (`notify.post.ts`, `unfurl.get.ts`, `weather.get.ts`, etc.) are documented inline.

---

## `plugins/` — Lifecycle hooks

Plugins run once when Nitro boots. They're how the kernel and notifiers get wired up.

| File                       | Responsibility                                                                         |
|----------------------------|----------------------------------------------------------------------------------------|
| `tql.ts`                   | Opens the TQL kernel and exposes it via `useWorkspaceConfig().kernel`. **Critical.**   |
| `graph-notifier.ts`        | Bridges kernel mutations to SSE clients on `/api/graph/events`.                        |
| `calendar-notifier.ts`     | Pushes Google Calendar webhook events to listeners.                                    |
| `gmail-notifier.ts`        | Pushes Gmail webhook events.                                                           |
| `workflow-scheduler.ts`    | Schedules workflow runs (cron-like).                                                   |

> The order plugins load in is deterministic but not configured here — Nitro loads alphabetically. If ordering matters, encode the dependency explicitly inside the plugin.

---

## `utils/` — Server-side helpers

29 utility modules. Tests are **colocated** (`<name>.ts` + `<name>.test.ts`) — see [`apps/web/app/CONVENTIONS.md`](../app/CONVENTIONS.md) → "Testing".

Notable ones:

| Module                  | Purpose                                                                         |
|-------------------------|---------------------------------------------------------------------------------|
| `agent-routing.ts`      | Picks Claude model variant per request (lookup vs. analysis vs. composition).   |
| `kernel-checkpoint.ts`  | Auto-snapshot policy: when to compact the op log on boot.                       |
| `connection-auth.ts`    | OAuth connection ownership check (multi-tenant data leak fix).                  |
| `email.ts`              | Resend email dispatch (uses `email-templates.ts` + `notification-email.ts`).    |
| `zone-router.ts`        | Maps URL `Referer` → campus zone (lab, lobby, workshop, showroom, vault).       |
| `zone-guard.ts`         | Advisory grant evaluator for the campus substrate (Phase 0: log-only).          |
| `tql-events.ts`         | SSE event types and broadcast helpers.                                          |
| `campus-decisions.ts`   | Captures agent decisions as `decision` entities in the graph.                   |

`server/utils/` is **auto-imported** inside route handlers — no need to write `import` statements for these.

---

## Request lifecycle (typical mutation)

```
POST /api/graph/mutate
   ↓
api/graph/[...path].ts                     ← catch-all route
   ↓
useWorkspaceConfig().kernel                ← from server/plugins/tql.ts
   ↓
kernel.applyOp({ action: 'createNode', ... })
   ↓                       ↓
.tql/ops.jsonl   .tql/state.sqlite        ← persistence
   ↓
graph-notifier broadcasts → /api/graph/events (SSE)
   ↓
clients (browser tabs, MCP, CLI watch) re-render
```

See [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) for the system-level view.

---

## Adding a new route

1. Create `api/<group>/<name>.<verb>.ts` (e.g. `api/agent/recall.post.ts`).
2. Import shared types from `~/types/...` (auto-aliased) or `@turtle.tech/types`.
3. Use `defineEventHandler(async (event) => { ... })`.
4. For DB writes, prefer the kernel via `useWorkspaceConfig().kernel.applyOp(...)` — never bypass it.
5. Add a colocated test if the route has non-trivial pure logic (extract to a util and test the util — route handlers should stay thin).
6. Validate input with Zod (`event.context.body` after `await readBody(event)`).

---

## Tests

```bash
pnpm --filter @trellis/web test          # vitest (colocated)
pnpm --filter @trellis/web test:e2e      # Playwright (apps/web/tests/e2e/)
```
