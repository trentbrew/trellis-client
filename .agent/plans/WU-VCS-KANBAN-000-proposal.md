# WU-VCS-KANBAN-000: TrellisVCS issue board in the web client (proposal)

**Status:** M1 reviewed PASS (TRL-24 · 2026-07-04) — M0 shipped 62c3bbc · M1 uncommitted pending ship  
**Date:** 2026-07-04  
**Repo:** `trellis-client` (`apps/web`)  
**Pipeline context:** A WU-REMOTE-MCP ✅ · B TRL-10 spec ✅ · C **this wedge** · D TRL-12 review ✅

---

## 1. Problem

TrellisVCS issue tracking works well in the **CLI** (`trellis issue`, `lane`, `milestone`) and in **agent pipeline tabs**, but the founder has **no visual board** for portfolio state.

| Surface | Today | Gap |
| ------- | ----- | --- |
| **Entity kanban** | `BoardView.vue` in collections / page builder | Works for graph **entities** (tasks, etc.) — not wired to VCS issues |
| **VCS issues** | CLI + `.trellis/` op-log | Status lifecycle visible only via `trellis issue list` |
| **Lab (`/agent`)** | Zone-filtered mutation feed | Shows ops, not issue-centric kanban |
| **Milestones / lanes** | CLI only | No swimlane or milestone grouping in UI |

Active agent work (e.g. Studio workspace with 21 TRL issues) is invisible unless you run CLI in that repo.

---

## 2. Goal

Ship a **read-first VCS issue kanban** in the Trellis web client — columns mapped to TrellisVCS statuses, cards showing title, labels, assignee, parent, and AC progress.

**Primary user:** solo founder + agent tabs — glanceable "what's in flight" without leaving the browser.

**MVP columns (fixed):**

| Column | VCS `status` |
| ------ | ------------ |
| Backlog | `backlog` |
| Queue | `queue` |
| In progress | `in_progress` |
| Paused | `paused` |
| Done | `closed` |

**Card fields (M0):** `id`, `title`, `labels[]`, `assignee`, `parent`, `priority`, `acPassed/acTotal` (when available).

---

## 3. Non-goals (M0)

- **No drag-and-drop status mutation** in M0 (read-only board; CLI/agent remain write path)
- **No `cycle` / sprint entity** — TrellisVCS has no cycle command; use **labels** for sprint grouping in a later slice
- **No cross-repo aggregation** — one board per workspace root (the repo whose `.trellis/` the server reads)
- **No GitHub Issues sync** — separate ontology (`github_issue`); do not conflate
- **No replacement for agent pipeline tabs** — board complements, not replaces, Cursor handoffs

---

## 4. Architecture sketch

```
.trellis/ops.json (local workspace)
  → server route GET /api/vcs/issues  (new)
       → trellis-vcs reader OR spawn `trellis issue list --format json` (prefer in-process)
  → composable useVcsIssues()
  → page /lab/issues (or tab on /agent)
       → VcsIssueBoard.vue (reuse BoardView patterns / tokens)
```

**Reuse:**

- Visual patterns from `BoardView.vue` (column chrome, card density, label chips)
- Lab chrome from `/agent` (zone aesthetic, inset hierarchy)
- Status badge colors aligned with pipeline balls (optional cohesion pass)

**Data contract (draft):**

```ts
interface VcsIssueCard {
  id: string           // "TRL-10"
  title: string
  status: 'backlog' | 'queue' | 'in_progress' | 'paused' | 'closed'
  labels: string[]
  assignee?: string
  parent?: string
  priority?: string
  acPassed?: number
  acTotal?: number
  branch?: string
}
```

---

## 5. Milestones

| Milestone | Scope | Ship criteria |
| --------- | ----- | ------------- |
| **M0** | Read-only board | `/lab/issues` renders 5 columns; loads from local `.trellis/`; empty state when no VCS repo |
| **M1** | Filters | Label filter, assignee filter, parent epic collapse |
| **M2** | Mutations | Drag card → `trellis issue update --status` via API; lane-aware |
| **M3** | Multi-workspace | Pick registered workspace roots (Studio vs trellis-client) |

**Recommend:** Spec and implement **M0 only** in first impl wedge.

---

## 6. Open questions (Designer + Architect)

1. **Route:** dedicated `/lab/issues` vs tab on `/agent` vs sidebar item under Lab?
2. **Workspace root:** always `process.cwd()` of Nuxt server, or env `TRELLIS_VCS_ROOT`?
3. **Card click:** drawer with `trellis issue show` detail, or link to external CLI?
4. **Epic grouping:** parent issue as column header swimlane (M1) or flat board (M0)?

---

## 7. Success metrics

- Founder can answer "what's queue vs in_progress?" in <5s without terminal
- Board updates after `trellis issue` mutations (SSE or poll — Architect decides)
- Playwright smoke: board renders with seeded fixture `.trellis/` in CI

---

## 8. Dependencies

- TrellisVCS CLI / library readable from Nuxt server (may need `@turtle.tech/trellis-vcs` export or subprocess — Architect spike)
- Local dev: `.trellis/` present in repo root (true for trellis-client and Studio)

---

## 9. Handoff checklist

- [ ] Designer: `docs/artifacts/vcs_kanban_design.md` + mockup
- [ ] Architect: spec with API route + AC
- [ ] Executor: M0 impl
- [ ] Reviewer: e2e smoke on `/lab/issues`

---

## 10. Pipeline note

Path C of session queue **A→B→C→D**. Paths A (WU-REMOTE-MCP) and D (TRL-12 W3-C review) are **complete**. This proposal unblocks the next product wedge after deck-platform-v2 TTS ship.
