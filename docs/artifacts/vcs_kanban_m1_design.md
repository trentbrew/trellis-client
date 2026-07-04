---
version: alpha
name: VCS Issue Kanban — Lab board M1 (filters + epic swimlanes)
description: Client-side label/assignee filters and collapsible epic swimlanes on the shipped M0 board — still read-only
source:
  url: "docs/artifacts/vcs_kanban_m1_mockup.html"
  parent: "TRL-21"
  baseline: "docs/artifacts/vcs_kanban_design.md"
  decision: "Client-only filters (AND labels, OR assignees); epic swimlanes with collapse; flat fallback toggle"
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-elevated: "#1a1a20"
  text: "#e8e8ec"
  text-muted: "#888894"
  primary: "#6366f1"
  border: "#2a2a32"
  filter-active: "#6366f1"
  filter-active-bg: "rgba(99, 102, 241, 0.12)"
  swimlane-header: "#16161c"
  swimlane-border: "#32323c"
  status-backlog: "#6b7280"
  status-queue: "#f59e0b"
  status-in-progress: "#10b981"
  status-paused: "#eab308"
  status-closed: "#52525b"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  filterChip:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: 500
  swimlaneTitle:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 600
  epicId:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: 11px
    fontWeight: 500
rounded:
  sm: 6px
  md: 10px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  filterPopover:
    minWidth: 220px
    maxHeight: 280px
    padding: "{spacing.sm}"
    borderRadius: "{rounded.md}"
  filterChipActive:
    borderColor: "{colors.filter-active}"
    background: "{colors.filter-active-bg}"
  swimlaneHeader:
    height: 40px
    padding: "0 {spacing.lg}"
    background: "{colors.swimlane-header}"
    borderRadius: "{rounded.md}"
  swimlaneGrid:
    columnWidth: 260px
    gap: "{spacing.md}"
    collapsedMaxHeight: 0
---

# Design: VCS Issue Kanban M1 (filters + epic swimlanes)

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** TRL-21 · WU-VCS-KANBAN-000 M1  
**Baseline:** [vcs_kanban_design.md](./vcs_kanban_design.md) · [vcs_kanban_mockup.html](./vcs_kanban_mockup.html)  
**Mock:** [vcs_kanban_m1_mockup.html](./vcs_kanban_m1_mockup.html)  
**Scope:** M1 read-only — **no drag**, **no status mutation**, **no SSE** (15s poll unchanged)

---

## Overview

M0 shipped a flat five-column board at `/lab/issues`. M1 adds **portfolio slicing** without new API routes:

1. **Label filter** — multi-select from distinct labels in current issue set  
2. **Assignee filter** — multi-select from distinct assignees (+ “Unassigned”)  
3. **Epic swimlanes** — group child issues under collapsible parent epic rows  
4. **View mode** — `Grouped` (default when ≥1 parent link exists) vs `Flat` (M0 layout)

**Primary question answered in &lt;5s:** *What's in flight for epic TRL-15, owned by me, tagged `spec`?*

All filtering is **client-side** on the existing `GET /api/vcs/issues` payload. Detail drawer unchanged from M0.

---

## Colors

Inherit M0 tokens. M1 additions:

| Token | Hex | Use |
|-------|-----|-----|
| `filter-active` | `#6366f1` | Active filter chip border + badge dot |
| `filter-active-bg` | `rgba(99,102,241,0.12)` | Active chip fill |
| `swimlane-header` | `#16161c` | Epic row header bar |
| `swimlane-border` | `#32323c` | Lane separator below header |

Filter popover uses `bg-popover` / `border-border` from shadcn — match existing `UiPopover` patterns.

---

## Typography

- **Filter chips:** 11px medium — `{components.filterChip}`
- **Swimlane title:** 12px semibold + mono epic id (`TRL-15 · Proposal: VCS kanban…`)
- **Swimlane meta:** 11px muted — child count, open vs closed rollup

---

## Layout

```
┌─ Lab header (unchanged M0) ────────────────────────────────┐
├─ Filter bar M1 ────────────────────────────────────────────┤
│ [Labels ▾ 2] [Assignee ▾] [Grouped ▾] │ Clear │ ↻ │ sync  │
├─ Swimlane TRL-15 ─────────────────────────────── [▼] ─────┤
│  │ Backlog │ Queue │ In progress │ Paused │ Done │          │
│  │         │ TRL-21│             │        │ TRL-16…        │
├─ Swimlane Ungrouped ──────────────────────────── [▼] ─────┤
│  │ TRL-1   │       │             │        │                │
└────────────────────────────────────────────────────────────┘
```

### Filter bar anatomy

| Control | Type | Behavior |
|---------|------|----------|
| **Labels ▾** | `UiPopover` + checkbox list | Multi-select; chip shows count when &gt;0 |
| **Assignee ▾** | `UiPopover` + checkbox list | Multi-select; includes “Unassigned” row |
| **Grouped ▾** | `UiSelect` or segmented control | `Grouped` \| `Flat` — persists in `localStorage` key `vcs-kanban-view` |
| **Clear** | Text button | Visible only when any filter active; resets labels + assignee |
| **Refresh** | Unchanged M0 | Re-fetch API; filters re-applied client-side |

### Swimlane rules

| Rule | Detail |
|------|--------|
| **Epic key** | Issue `parent` field (e.g. `TRL-15`) |
| **Lane header** | Resolve parent id → title from same issue list; fallback `TRL-N` if parent not in payload |
| **Lane contents** | Only issues where `parent === epicId` — **parent card never duplicated** in column |
| **Ungrouped lane** | Issues with no `parent` — always last swimlane |
| **Collapse** | Chevron toggles visibility of lane grid; state in `localStorage` `vcs-kanban-collapsed:<epicId>` |
| **Default expand** | All lanes expanded; Ungrouped expanded |
| **Flat mode** | Hides swimlane chrome — identical to M0 board (parent still on card as `← TRL-N` chip) |

### Column counts (M1)

- **Grouped mode:** count badge on each column header = **sum across visible swimlanes** for that status (after filters)
- **Swimlane sub-counts:** optional muted count per lane column header (Architect: skip if noisy — mock shows lane-level only)

---

## Elevation & Depth

- Filter popovers: `z-50`, shadow-md, align start below chip
- Swimlane header: inset `bg-muted/30` with 1px bottom border — sits above lane grid, sticky within board scroll
- Collapsed lane: header only, chevron rotated −90°

---

## Shapes

Unchanged from M0 (`rounded.md` cards, `rounded.pill` chips).

---

## Components

| Component | Change | Maps to |
|-----------|--------|---------|
| `VcsIssueFilterBar` | Enable popovers; emit `filters` + `viewMode` | Extend existing component |
| `VcsIssueBoard` | Accept `viewMode`, `filteredIssues` | Existing — branch layout |
| `VcsIssueSwimlane` | **New** — header + nested 5-column grid | `components/vcs/VcsIssueSwimlane.vue` |
| `VcsIssueColumn` | Unchanged | Reused inside swimlane |
| `VcsIssueCard` | Unchanged | Hide redundant parent chip when already inside parent swimlane (optional polish) |

### Filter logic (normative)

```
visibleIssues = issues
  .filter(labelMatch)   // OR: issue.labels intersects selectedLabels (empty selection = all)
  .filter(assigneeMatch) // OR: assignee in selected OR unassigned if "Unassigned" selected
```

**Label default:** none selected → show all  
**Assignee default:** none selected → show all  
**Combined:** AND between label and assignee dimensions

### Empty states (new)

| State | Message |
|-------|---------|
| Filters match zero | “No issues match filters” + **Clear filters** button |
| Epic lane empty after filter | Lane hidden entirely (don't render empty swimlane) |
| All lanes hidden | Same as filter empty state |

---

## Interaction matrix

| Input | State | Output |
|-------|-------|--------|
| Open Labels popover | Board loaded | Checkbox list of distinct labels sorted alpha |
| Toggle label | — | Chip shows `Labels · N`; board re-filters instantly |
| Open Assignee popover | — | Distinct assignees + Unassigned |
| Toggle assignee | — | Chip active styling |
| Click Clear | Any filter active | Reset labels + assignee; focus Clear button |
| Switch to Flat | Grouped | M0 flat columns; swimlane headers hidden |
| Switch to Grouped | Flat | Swimlanes render; orphans in Ungrouped |
| Collapse swimlane | Expanded | Grid hidden; chevron left; counts in header |
| Expand swimlane | Collapsed | Grid shown |
| Refresh | Filters active | API refetch; filters preserved |
| `f` shortcut | — | Focus Labels popover trigger (optional M1) |
| Card click | Unchanged M0 | Drawer opens |

**No new keyboard shortcuts required for AC** — `r` refresh from M0 retained.

---

## Accessibility

- **Filter chips:** `aria-haspopup="dialog"` / `aria-expanded`; popover `role="dialog"` with label “Filter by label” / “Filter by assignee”
- **Checkbox list:** native `<label>` + `<input type="checkbox">`; announce count via `aria-live="polite"` region: “Showing 4 of 12 issues”
- **View mode:** `role="radiogroup"` + `aria-label="Board layout"`
- **Swimlane header:** `<button type="button">` with `aria-expanded` + `aria-controls="swimlane-TRL-15-grid"`
- **Collapse:** respect `prefers-reduced-motion` — instant hide/show, no height animation
- **Focus order:** sub-nav → filter bar (left→right) → first swimlane header → column cards top-to-bottom

---

## Open for Architect

1. **Composable:** extend `useVcsIssues` with `filters`, `viewMode`, `filteredColumns`, `swimlanes` computed — no new API routes M1
2. **localStorage keys:** `vcs-kanban-view`, `vcs-kanban-collapsed:<id>` — document in spec
3. **Parent title resolution:** O(n) map from issue list; handle missing parent gracefully
4. **E2e AC:** filter reduces visible cards; grouped mode shows swimlane header for TRL-15 epic; flat toggle restores flat layout
5. **Performance:** fine for &lt;200 issues; note defer virtualized board to M2+
6. **Optional polish:** hide `← parent` on card when inside matching swimlane — not blocking

**Explicitly deferred M2+:** drag reorder, status mutation, SSE refresh, multi-workspace picker

---

## Do's and Don'ts

**Do**

- Keep filters client-side — ship fast on M0 API
- Hide empty swimlanes after filter
- Show active filter count on chips
- Preserve M0 drawer, polling, empty states

**Don't**

- Add server query params M1
- Show parent epic as both lane header and column card
- Block board when one swimlane is collapsed
- Introduce drag handles (M2)

---

## Handoff checklist

- [x] `docs/artifacts/vcs_kanban_m1_design.md` (this file)
- [x] `docs/artifacts/vcs_kanban_m1_mockup.html` (interactive filters + swimlanes)
- [ ] Architect spec + AC
- [ ] Executor impl
- [ ] Reviewer e2e extension
