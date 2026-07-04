# Spec: VCS Issue Kanban — Lab board M0 (TRL-17)

**Status:** Spec ready for implementation  
**Parent:** TRL-16 (design) → TRL-15 (proposal) · WU-VCS-KANBAN-000  
**Design:** [vcs_kanban_design.md](./vcs_kanban_design.md) · [vcs_kanban_mockup.html](./vcs_kanban_mockup.html)  
**Scope:** M0 read-only — no drag-and-drop, no status mutation, no live filters

---

## Summary

Ship **`/lab/issues`** — a five-column kanban of TrellisVCS issues loaded from the local `.trellis/` workspace via new **`GET /api/vcs/issues`** and **`GET /api/vcs/issues/:id`** routes. Lab sub-nav links Op log (`/agent`) and Issues (`/lab/issues`). Card click opens a read-only detail drawer.

---

## Architectural decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| VCS root | `resolveVcsRoot()` walks up from `process.cwd()` for `.trellis/ops.json`; override `TRELLIS_VCS_ROOT` | Works when Nuxt cwd is `apps/web` or repo root |
| Data source | Subprocess `trellis issue list` / `trellis issue show <id> --path <root>` | No `trellis-vcs` lib in monorepo; CLI is source of truth |
| Response shaping | Parse CLI text → JSON in `vcs-issue-parser.ts` (vitest fixtures) | Avoid blocking on CLI `--json` flag |
| Refresh | 15s `useIntervalFn` poll + manual Refresh + `r` shortcut | SSE on `vcs:issue*` deferred M1 |
| Board components | Standalone `VcsIssue*` under `components/vcs/` | No `BoardView.vue` refactor in M0 |
| Filters | Disabled chips (visual only) | M1 |
| Route | `/lab/issues` — no new primary-rail item | Design: sidebar stays single **Lab** → `/agent`; sub-nav on both pages |
| Auth | Same as `/agent` (local dev bypass OK) | Internal founder tool |
| Detail fetch | Lazy on drawer open (`GET /api/vcs/issues/:id`) | List endpoint stays light |

---

## Types

```ts
// apps/web/app/types/vcs-issue.ts

export type VcsIssueStatus = 'backlog' | 'queue' | 'in_progress' | 'paused' | 'closed'

export interface VcsIssueSummary {
  id: string
  title: string
  status: VcsIssueStatus
  labels: string[]
  assignee?: string
  parent?: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  acPassed?: number
  acTotal?: number
  branch?: string
}

export interface VcsIssueCriterion {
  index: number
  text: string
  state: 'passed' | 'failed' | 'pending'
  command?: string
}

export interface VcsIssueDetail extends VcsIssueSummary {
  description?: string
  criteria: VcsIssueCriterion[]
  createdAt?: string
  startedAt?: string
  closedAt?: string
}

export interface VcsIssuesListResponse {
  workspaceRoot: string
  workspaceName: string
  fetchedAt: string
  issues: VcsIssueSummary[]
}

export interface VcsIssuesErrorResponse {
  code: 'NO_VCS_REPO' | 'CLI_ERROR' | 'PARSE_ERROR'
  message: string
}
```

---

## File plan

### New files

| Path | Responsibility |
|------|----------------|
| `apps/web/app/pages/lab/issues.vue` | Page shell: `Page variant="canvas" fill-height`, composable wiring |
| `apps/web/app/components/vcs/LabSubNav.vue` | Op log \| Issues tabs |
| `apps/web/app/components/vcs/VcsIssueBoard.vue` | Five columns + loading/error/empty |
| `apps/web/app/components/vcs/VcsIssueColumn.vue` | Column header (dot, title, count) + card list |
| `apps/web/app/components/vcs/VcsIssueCard.vue` | Card UI per design tokens |
| `apps/web/app/components/vcs/VcsIssueDetailDrawer.vue` | Sheet/drawer — read-only detail |
| `apps/web/app/components/vcs/VcsIssueFilterBar.vue` | Disabled filter chips + refresh + last sync |
| `apps/web/app/composables/useVcsIssues.ts` | Fetch list, poll, refresh, selected issue detail |
| `apps/web/app/types/vcs-issue.ts` | Shared types |
| `apps/web/server/utils/vcs-root.ts` | `resolveVcsRoot(): string \| null` |
| `apps/web/server/utils/vcs-root.test.ts` | Root walk + env override |
| `apps/web/server/utils/vcs-issue-cli.ts` | Spawn trellis, capture stdout/stderr |
| `apps/web/server/utils/vcs-issue-parser.ts` | Parse list + show output |
| `apps/web/server/utils/vcs-issue-parser.test.ts` | Fixture-based parser tests |
| `apps/web/server/api/vcs/issues.get.ts` | List endpoint |
| `apps/web/server/api/vcs/issues/[id].get.ts` | Detail endpoint |
| `apps/web/tests/e2e/vcs-kanban.spec.ts` | Smoke e2e |

### Modified files

| Path | Change |
|------|------|
| `apps/web/app/pages/agent/index.vue` | Add `LabSubNav` below title (active: Op log) |
| `apps/web/nuxt.config.ts` | `runtimeConfig.trellisVcsRoot` ← `TRELLIS_VCS_ROOT` (optional) |

### Explicitly out of scope (M0)

- Drag-and-drop status change
- `POST/PATCH` mutation routes
- Label/assignee filter logic
- Multi-workspace picker
- Epic swimlanes
- Markdown rendering in description (pre-wrap plain text OK)
- Shared kanban primitive extraction from `BoardView.vue`

---

## Server: VCS root resolution

```ts
// apps/web/server/utils/vcs-root.ts
import { existsSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'

export function resolveVcsRoot(explicit?: string, startDir = process.cwd()): string | null {
  if (explicit && existsSync(join(explicit, '.trellis', 'ops.json'))) return explicit
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, '.trellis', 'ops.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}
```

**Env:** `TRELLIS_VCS_ROOT` — absolute path to repo with `.trellis/`. Document in spec verification section.

---

## Server: CLI integration

```ts
// apps/web/server/utils/vcs-issue-cli.ts
export function runTrellisIssueList(root: string): { stdout: string; exitCode: number }
export function runTrellisIssueShow(root: string, id: string): { stdout: string; exitCode: number }
```

- Binary: `trellis` on `PATH` (same as dev environment)
- Args: `issue list --path <root>`, `issue show <id> --path <root>`
- Timeout: 10s; non-zero exit → 503 with `CLI_ERROR`

**Parser fixtures** must cover lines like:

```
  medium TRL-16 queue Design: VCS issue kanban (Lab board) [design] → agent:trentbrew ← TRL-15 (5/5 AC)
```

Extract: priority, id, status, title, labels[], assignee, parent, ac fraction.

---

## API routes

### `GET /api/vcs/issues`

**200:**

```json
{
  "workspaceRoot": "/Users/.../trellis-client",
  "workspaceName": "trellis-client",
  "fetchedAt": "2026-07-04T20:00:00.000Z",
  "issues": [ { "id": "TRL-15", "title": "...", "status": "queue", "labels": ["proposal"], ... } ]
}
```

**404 `NO_VCS_REPO`:** no `.trellis/ops.json` found  
**503 `CLI_ERROR`:** trellis not on PATH or command failed

### `GET /api/vcs/issues/:id`

**200:** `VcsIssueDetail`  
**404:** unknown issue id or show failed

---

## Client: composable

```ts
// useVcsIssues.ts
export function useVcsIssues() {
  const issues = ref<VcsIssueSummary[]>([])
  const workspaceName = ref('')
  const loading = ref(true)
  const error = ref<VcsIssuesErrorResponse | null>(null)
  const lastFetchedAt = ref<Date | null>(null)
  const selectedId = ref<string | null>(null)
  const detail = ref<VcsIssueDetail | null>(null)

  async function refresh() { /* fetch list */ }
  async function openDetail(id: string) { /* fetch detail */ }
  function closeDetail() { /* ... */ }

  // 15s poll while page mounted
  // keyboard: r → refresh (when not in input)

  const columns = computed(() => groupByStatus(issues.value))

  return { ... }
}
```

**Status column order:** `backlog`, `queue`, `in_progress`, `paused`, `closed` (design labels: Backlog, Queue, In progress, Paused, Done).

---

## UI notes (from design)

- Column status colors: CSS vars from design doc (`--status-queue`, etc.) — add to page scope or `vcs-kanban.css`
- Closed cards: `opacity-75`
- Label chips: map `proposal|spec|impl|review|design` to tinted classes; fallback neutral
- Drawer: use existing `Sheet`/`Drawer` from shadcn-vue if available; else fixed panel matching mock
- Empty column: dashed placeholder per design
- Workspace badge: `basename(workspaceRoot)` + `title={workspaceRoot}`

---

## Acceptance criteria

### Server

- [ ] **AC-1:** `resolveVcsRoot()` finds repo root from `apps/web` cwd when `.trellis/ops.json` exists at monorepo root (vitest)
- [ ] **AC-2:** `resolveVcsRoot()` respects `TRELLIS_VCS_ROOT` when set (vitest)
- [ ] **AC-3:** `vcs-issue-parser` parses list + show fixtures — ids, status, labels, AC counts (vitest)
- [ ] **AC-4:** `GET /api/vcs/issues` returns 200 + issues array when VCS repo present
- [ ] **AC-5:** `GET /api/vcs/issues` returns 404 `NO_VCS_REPO` when no `.trellis/` (vitest or integration with temp dir)
- [ ] **AC-6:** `GET /api/vcs/issues/TRL-N` returns detail with criteria rows

### Page & navigation

- [ ] **AC-7:** `GET /lab/issues` renders five column headers without SSR throw
- [ ] **AC-8:** `LabSubNav` on `/agent` and `/lab/issues` — Issues tab links `/lab/issues`, Op log links `/agent`
- [ ] **AC-9:** Workspace badge shows repo basename

### Board UX

- [ ] **AC-10:** Issues grouped into correct status columns
- [ ] **AC-11:** Card shows id, title, labels (max 3 + overflow), assignee, parent, AC bar when acTotal > 0
- [ ] **AC-12:** Click card opens drawer with title, status, description, criteria, CLI hint footer
- [ ] **AC-13:** Esc / backdrop / × closes drawer; focus returns to card
- [ ] **AC-14:** Refresh button re-fetches; loading skeleton on initial load
- [ ] **AC-15:** Empty states: no VCS repo, zero issues, fetch error (with retry)

### Accessibility

- [ ] **AC-16:** Columns `role="group"` + `aria-label`; cards keyboard activatable
- [ ] **AC-17:** Drawer `role="dialog"` + focus trap

### Tests

- [ ] **AC-18:** `pnpm exec vitest run server/utils/vcs-root.test.ts server/utils/vcs-issue-parser.test.ts` — all pass
- [ ] **AC-19:** `pnpm exec playwright test tests/e2e/vcs-kanban.spec.ts` — board renders, sub-nav visible, at least one column header

---

## Verification commands

```bash
cd apps/web

# Unit
pnpm exec vitest run server/utils/vcs-root.test.ts server/utils/vcs-issue-parser.test.ts

# E2e (dev server must reach repo with .trellis/)
pnpm exec playwright test tests/e2e/vcs-kanban.spec.ts

# Manual
# Open /lab/issues — confirm TRL-15/16 cards, drawer, refresh
# Open /agent — confirm sub-nav Op log active
```

**E2e note:** Use `gotoWithAuthBypass(page, '/lab/issues')` from `./helpers/auth-bypass`. Assert column headers: Backlog, Queue, In progress, Paused, Done.

---

## Executor notes

1. **Parser first** — vitest before Vue; check in sample stdout from `trellis issue list` in this repo.
2. **trellis on PATH** — document requirement; server logs clear error if missing.
3. **Do not mutate issues** from UI in M0 — no PATCH routes.
4. **Polling** — pause when document hidden (`useDocumentVisibility` or `visibilitychange`).
5. **Sheet component** — grep existing drawer/sheet usage in app before adding deps.

---

## Handoff checklist

- [x] Spec artifact: this file
- [ ] Executor implements on lane `agent:executor`
- [ ] Reviewer: vitest + e2e + manual drawer check
- [ ] Strategist: M1 filters or ship M0
