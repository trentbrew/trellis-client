---
version: alpha
name: VCS Issue Kanban — Lab board (M0 read-only)
description: Read-first TrellisVCS issue board at /lab/issues — five status columns, card detail drawer, Lab chrome reuse
source:
  url: "docs/artifacts/vcs_kanban_mockup.html"
  parent: "TRL-15"
  decision: "Dedicated /lab/issues route with Lab sub-nav; flat board M0; drawer detail on card click"
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-elevated: "#1a1a20"
  surface-glass: "rgba(20, 20, 24, 0.72)"
  text: "#e8e8ec"
  text-muted: "#888894"
  primary: "#6366f1"
  border: "#2a2a32"
  status-backlog: "#6b7280"
  status-queue: "#f59e0b"
  status-in-progress: "#10b981"
  status-paused: "#eab308"
  status-closed: "#52525b"
  label-proposal: "#8b5cf6"
  label-spec: "#3b82f6"
  label-impl: "#10b981"
  label-review: "#f59e0b"
  label-design: "#ec4899"
  ac-track: "#6366f1"
  ac-track-bg: "rgba(99, 102, 241, 0.15)"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  columnHeader:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.06em
    textTransform: uppercase
  cardId:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: 11px
    fontWeight: 500
  cardTitle:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.35
rounded:
  sm: 6px
  md: 10px
  lg: 12px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  labSubNav:
    height: 40px
    tabPadding: "8px 14px"
    activeIndicator: "2px bottom border {colors.primary}"
  boardColumn:
    minWidth: 240px
    maxWidth: 280px
    gap: "{spacing.sm}"
    headerHeight: 36px
    countBadgeSize: 22px
  issueCard:
    padding: "{spacing.md}"
    borderRadius: "{rounded.md}"
    borderColor: "{colors.border}"
    hoverBorder: "color-mix(in oklch, {colors.primary} 35%, {colors.border})"
  labelChip:
    height: 20px
    padding: "0 6px"
    fontSize: 10px
    borderRadius: "{rounded.sm}"
  acProgress:
    height: 4px
    borderRadius: "{rounded.pill}"
    trackColor: "{colors.ac-track-bg}"
    fillColor: "{colors.ac-track}"
  detailDrawer:
    width: 420px
    backdrop: "rgba(0,0,0,0.45)"
---

# Design: VCS Issue Kanban (Lab board)

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-15 · WU-VCS-KANBAN-000  
**Mock:** [vcs_kanban_mockup.html](./vcs_kanban_mockup.html)  
**Scope:** M0 read-only — no drag-and-drop, no status mutation

---

## Overview

Add a **portfolio kanban** for TrellisVCS issues inside the existing **Lab** zone — complementing the op-log feed at `/agent`, not replacing agent pipeline tabs.

**Primary question answered in &lt;5s:** *What's queued vs in progress vs done?*

**Route decision (resolved):** **`/lab/issues`** — dedicated page with **Lab sub-navigation** (`Op log` | `Issues`). Sidebar keeps single **Lab** entry (`lucide:flask-conical`); sub-nav lives in page header (same pattern as zone tabs on op-log).

**Workspace:** Header shows **workspace root** basename + full path on hover (`trellis-client`, `client-nuxt`). Architect wires `TRELLIS_VCS_ROOT` or server cwd — design treats path as read-only metadata.

**Board layout:** **Flat five-column kanban** (no epic swimlanes in M0). Parent epic shown as muted chip on card (`← TRL-9`).

---

## Colors

Inherit Campus / Trellis dark shell (`campus_shell_chrome_design.md`). Column accents map to **pipeline status semantics** (not agent ball emojis — color only):

| Status | Token | Hex | Use |
|--------|-------|-----|-----|
| Backlog | `status-backlog` | `#6b7280` | Column dot + count |
| Queue | `status-queue` | `#f59e0b` | Ready to pick up |
| In progress | `status-in-progress` | `#10b981` | Active work |
| Paused | `status-paused` | `#eab308` | Blocked / parked |
| Closed | `status-closed` | `#52525b` | Done column (cards at 75% opacity) |

**Label chips** use soft tinted backgrounds by label type (proposal, spec, impl, review, design) — see mock `:root` and `components.labelChip`.

---

## Typography

- **Column headers:** 11px uppercase semibold — count badge right-aligned
- **Card ID:** IBM Plex Mono 11px (`TRL-15`) — primary scan anchor
- **Card title:** 13px medium, 2-line clamp
- **Meta row:** 11px muted (assignee, parent)

---

## Layout

```
┌─ Lab header ─────────────────────────────────────────────┐
│ [Op log] [Issues ●]          workspace: trellis-client ▾ │
├─ Filter bar (M0: static / M1: live) ─────────────────────┤
│ Labels ▾   Assignee ▾   Refresh ↻   Last sync 12s ago    │
├─ Kanban (horizontal scroll on narrow) ───────────────────┤
│ Backlog │ Queue │ In progress │ Paused │ Done            │
│  card   │ card  │    card     │        │  card           │
└──────────────────────────────────────────────────────────┘
```

- **Page shell:** `Page variant="canvas" fill-height` — matches `/agent`
- **Board:** `flex gap-3 overflow-x-auto pb-4` — columns `shrink-0 w-[260px]`
- **Column body:** `flex flex-col gap-2 min-h-[120px]` — empty column shows dashed placeholder
- **Sticky column headers** within board scroll region

---

## Elevation & Depth

- Cards: `bg-card/60 border border-border` — hover lifts with subtle border tint (no scale transform; respect reduced motion)
- Detail drawer: slides from **right**, `bg-background border-l border-border`, scrim behind
- Filter bar: `bg-muted/20 border-b border-border` — inset within canvas

---

## Shapes

- Cards and columns: `{rounded.md}` (10px)
- Label chips: `{rounded.sm}` (6px)
- Count badges: `{rounded.pill}`

---

## Components

### `LabSubNav`

| Tab | Route | Icon |
|-----|-------|------|
| Op log | `/agent` | `lucide:activity` |
| Issues | `/lab/issues` | `lucide:square-kanban` |

Active tab: bottom 2px `{colors.primary}` indicator.

### `VcsIssueBoard`

Container for five `VcsIssueColumn` components. Props: `issues: VcsIssueCard[]`, `loading`, `error`.

**Reuse:** Column/card density from `BoardView.vue` — do not fork card CSS; extract shared `KanbanColumn` / `KanbanCard` primitives if Architect agrees (optional M0 refactor).

### `VcsIssueCard`

**Visible fields (M0):**

- `id` (mono, top-left)
- `title` (2-line clamp)
- `labels[]` (max 3 visible + `+N`)
- `assignee` (avatar initial or `agent:…` truncated)
- `parent` (`← TRL-N` if set)
- `acPassed/acTotal` — thin progress bar when `acTotal > 0`

**Priority:** icon only when `critical` | `high` — medium/low omitted to reduce noise.

**Interaction (M0):** click → open drawer. **No drag handle** (M2).

### `VcsIssueDetailDrawer`

Read-only panel — `trellis issue show` shape:

- Title, status badge, labels
- Description (markdown render or pre-wrap)
- AC list with ✓/○/✗ rows
- Meta: branch, assignee, parent, created/closed
- Footer: "Edit via CLI" hint (`trellis issue show TRL-N`) — not a deep link

Close: Esc, backdrop click, × button.

### Empty states

| State | Message |
|-------|---------|
| No `.trellis/` | "No TrellisVCS repo in this workspace" + init hint |
| Zero issues | "No issues yet" + `trellis issue create` hint |
| Load error | Retry button |

---

## Interaction matrix

| State | User input | System output |
|-------|------------|---------------|
| Board loading | Page mount | Skeleton columns (5 shimmer headers) |
| Board ready | — | Cards distributed by `status` |
| Card click | Primary click / Enter | Drawer opens with issue detail |
| Drawer open | Esc / backdrop / × | Drawer closes, focus returns to card |
| Refresh | Click ↻ or `r` shortcut | Re-fetch `/api/vcs/issues` |
| Filter (M1) | Label chip toggle | Client filter — **disabled in M0 mock** |
| Op log tab | Click | Navigate `/agent` |
| Narrow viewport | Horizontal scroll | Columns scroll; headers sticky |

**Polling (Architect):** Recommend 15s poll + manual refresh M0; SSE on VCS ops is M1+.

---

## Accessibility

- **Focus order:** sub-nav → filter bar → column 1..5 top-to-bottom cards → drawer controls
- **Column headers:** `role="group"` + `aria-label="Queue, 3 issues"`
- **Cards:** `<button type="button">` or interactive article with `aria-label="TRL-10, Spec TTS providers, in progress"`
- **Drawer:** `role="dialog"` + `aria-modal="true"` + focus trap
- **Motion:** no card drag animation M0; drawer slide respects `prefers-reduced-motion` (instant show/hide)
- **Color:** status never conveyed by color alone — column title text always present

---

## Open for Architect

1. **API:** `GET /api/vcs/issues` response shape — align with `VcsIssueCard` + detail endpoint `GET /api/vcs/issues/:id`
2. **Workspace root:** `TRELLIS_VCS_ROOT` env vs server cwd — expose in response `workspaceRoot`
3. **Refresh strategy:** poll interval vs hook into existing SSE mutation stream for `vcs:issue*` ops
4. **Shared primitives:** extract from `BoardView.vue` or standalone `VcsIssueBoard` only
5. **E2e fixture:** seed minimal `.trellis/` issues for CI smoke
6. **Route registration:** `apps/web/app/pages/lab/issues.vue` + sidebar unchanged (Lab single entry)

**Deferred to M1+:** label/assignee filters, drag status change, multi-workspace picker, epic swimlanes.

---

## Do's and Don'ts

**Do**

- Keep read-only posture obvious (no drag handles, no drop zones M0)
- Show AC progress when data exists
- Match Lab dark glass aesthetic
- Truncate long assignee lanes (`agent:executor` → `executor`)

**Don't**

- Conflate with entity kanban or GitHub issues
- Add sprint/cycle UI (use labels later)
- Auto-mutate status from UI in M0
- Block board on empty columns — show placeholders
