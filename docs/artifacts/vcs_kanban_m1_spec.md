# Spec: VCS Issue Kanban — Lab board M1 (TRL-23)

**Status:** Spec ready for implementation  
**Parent:** TRL-22 (design) → TRL-21 (proposal) · WU-VCS-KANBAN-000 M1  
**Design:** [vcs_kanban_m1_design.md](./vcs_kanban_m1_design.md) · [vcs_kanban_m1_mockup.html](./vcs_kanban_m1_mockup.html)  
**Baseline:** [vcs_kanban_spec.md](./vcs_kanban_spec.md) (M0 shipped `62c3bbc`)  
**Scope:** M1 read-only — client-side filters + epic swimlanes; **no API changes**, **no mutations**, **no SSE**

---

## Summary

Extend **`/lab/issues`** with:

1. **Label filter** — multi-select popover (OR within labels)  
2. **Assignee filter** — multi-select + “Unassigned” (OR within assignees)  
3. **View mode** — `grouped` (epic swimlanes) vs `flat` (M0 layout)  
4. **Swimlanes** — collapsible epic rows; Ungrouped lane for orphans  

All logic runs **client-side** on the existing `GET /api/vcs/issues` payload. Detail drawer, polling, and server routes unchanged from M0.

---

## Architectural decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data | Reuse M0 list fetch only | Ship fast; defer query params to M2+ |
| Filter semantics | Labels OR, assignees OR, dimensions AND | Matches design normative rules |
| Default view | `grouped` when ≥1 issue has `parent`; else `flat` | Auto on first load if no localStorage |
| View persistence | `localStorage` key `vcs-kanban-view` = `grouped` \| `flat` | Design |
| Collapse persistence | `localStorage` key `vcs-kanban-collapsed:<epicId>` = `1` | Per-lane; default expanded |
| Epic header title | Resolve from issue list by id; fallback to id string | O(n) map, no extra API |
| Parent in column | **Never** — parent issues appear only as swimlane headers, not as cards in grouped mode | Design rule |
| Empty swimlane | Hide lane when zero visible children after filter | Design |
| Filter empty | Full-page inline empty state + Clear filters | Design |
| Pure filter logic | `app/lib/vcs-issue-filters.ts` + vitest | Testable without Vue mount |
| Optional polish | Hide `← parent` on card when `hideParent` prop true inside swimlane | Non-blocking |

---

## Types

```ts
// apps/web/app/types/vcs-issue.ts (additions)

export type VcsKanbanViewMode = 'grouped' | 'flat'

export interface VcsIssueFilters {
  labels: string[]      // empty = all
  assignees: string[]   // empty = all; use sentinel UNASSIGNED below
}

export const VCS_ASSIGNEE_UNASSIGNED = '__unassigned__'

export interface VcsIssueSwimlane {
  epicId: string        // 'ungrouped' for orphan lane
  epicTitle: string
  issues: VcsIssueSummary[]
}
```

---

## File plan

### New files

| Path | Responsibility |
|------|----------------|
| `apps/web/app/lib/vcs-issue-filters.ts` | `filterIssues`, `buildSwimlanes`, `distinctLabels`, `distinctAssignees` |
| `apps/web/app/lib/vcs-issue-filters.test.ts` | Filter + swimlane grouping fixtures |
| `apps/web/app/components/vcs/VcsIssueSwimlane.vue` | Collapsible epic header + nested 5-column grid |
| `apps/web/tests/e2e/vcs-kanban-m1.spec.ts` | M1 filter + view mode e2e |

### Modified files

| Path | Change |
|------|--------|
| `apps/web/app/composables/useVcsIssues.ts` | Filters, viewMode, filteredIssues, swimlanes, collapse state, visibleCount |
| `apps/web/app/components/vcs/VcsIssueFilterBar.vue` | Enable popovers, view select, Clear, aria-live count |
| `apps/web/app/components/vcs/VcsIssueBoard.vue` | Branch: flat columns vs swimlane list |
| `apps/web/app/components/vcs/VcsIssueCard.vue` | Optional `hideParent` prop |
| `apps/web/app/pages/lab/issues.vue` | Wire filter empty state; pass swimlanes to board |

### Explicitly out of scope (M1)

- New server routes or CLI calls  
- Drag-and-drop / status mutation (M2)  
- SSE / live sync label beyond M0 poll  
- Multi-workspace picker (M3)  
- `f` keyboard shortcut for filter focus (optional — not in AC)

---

## Pure functions (`vcs-issue-filters.ts`)

```ts
export function filterIssues(
  issues: VcsIssueSummary[],
  filters: VcsIssueFilters,
): VcsIssueSummary[]

/** Group filtered issues into swimlanes. Parent issues excluded from column cards. */
export function buildSwimlanes(
  issues: VcsIssueSummary[],
  titleById: Map<string, string>,
): VcsIssueSwimlane[]

export function distinctLabels(issues: VcsIssueSummary[]): string[]
export function distinctAssignees(issues: VcsIssueSummary[]): string[] // excludes unassigned
```

**Filter rules:**

- `filters.labels.length === 0` → pass all  
- Else → issue must have **at least one** selected label  
- `filters.assignees.length === 0` → pass all  
- Else → match assignee or `VCS_ASSIGNEE_UNASSIGNED` when assignee absent  

**Swimlane rules:**

- Collect distinct `parent` values from filtered issues (non-null)  
- For each epic id (sorted alpha): children where `parent === epicId`  
- `ungrouped` lane last: issues where `!parent`  
- Skip lanes with zero children  

---

## Composable extensions (`useVcsIssues.ts`)

Add state:

```ts
const filters = ref<VcsIssueFilters>({ labels: [], assignees: [] })
const viewMode = ref<VcsKanbanViewMode>('grouped')
const collapsedEpics = ref<Set<string>>(new Set())
```

Computed:

```ts
const filteredIssues = computed(() => filterIssues(issues.value, filters.value))
const flatColumns = computed(() => groupByStatus(filteredIssues.value)) // existing logic
const swimlanes = computed(() => buildSwimlanes(filteredIssues.value, titleById.value))
const visibleCount = computed(() => ({ shown: filteredIssues.value.length, total: issues.value.length }))
const hasActiveFilters = computed(() => filters.value.labels.length > 0 || filters.value.assignees.length > 0)
```

Methods:

```ts
function clearFilters(): void
function toggleEpicCollapsed(epicId: string): void
function isEpicCollapsed(epicId: string): boolean
```

**localStorage (client-only):**

- On mount: read `vcs-kanban-view`; if absent, default `grouped` when any issue has parent else `flat`  
- On viewMode change: write `vcs-kanban-view`  
- On collapse toggle: write/remove `vcs-kanban-collapsed:<epicId>`  
- Guard with `import.meta.client` / `typeof localStorage !== 'undefined'`

**Refresh:** M0 `refresh()` unchanged — filters preserved, recomputed on new `issues`.

---

## UI components

### `VcsIssueFilterBar`

- Replace disabled chips with `UiPopover` + checkbox lists  
- Distinct options from composable (`distinctLabels`, `distinctAssignees` + Unassigned row)  
- Active chip styling + count badge when selection non-empty  
- `UiSelect` or native `<select>` for view mode  
- Clear button: disabled when `!hasActiveFilters`  
- `aria-live="polite"` span: `Showing {shown} of {total}`  
- Emit `update:filters`, `update:viewMode`, `clear`

### `VcsIssueSwimlane`

Props: `epicId`, `epicTitle`, `columns` (status-grouped issues), `collapsed`, `hideParentOnCards`

- Header: `<button aria-expanded aria-controls="swimlane-{id}-grid">`  
- Grid id: `swimlane-{epicId}-grid`  
- Reuse `VcsIssueColumn` × 5 inside grid  
- Collapsed: hide grid (no height animation if `prefers-reduced-motion`)

### `VcsIssueBoard`

Props: `viewMode`, `columns` (flat), `swimlanes`, `loading`, `collapsedEpics`

- `flat` → current M0 layout  
- `grouped` → render `VcsIssueSwimlane` list  

### Filter empty state (`issues.vue`)

When `!loading && !error && issues.length > 0 && filteredIssues.length === 0`:

- Heading: “No issues match filters”  
- Button: Clear filters → `clearFilters()`

---

## Acceptance criteria

### Unit (filter logic)

- [ ] **AC-1:** `filterIssues` — empty filters returns all; label OR; assignee OR; combined AND (vitest)
- [ ] **AC-2:** `buildSwimlanes` — groups by parent, ungrouped last, excludes parent-as-card, hides empty (vitest)
- [ ] **AC-3:** `distinctLabels` / `distinctAssignees` sorted alpha (vitest)

### Filter bar & composable

- [ ] **AC-4:** Labels popover lists distinct labels from loaded issues; toggling filters board instantly
- [ ] **AC-5:** Assignee popover includes Unassigned; active filters show count badge on chips
- [ ] **AC-6:** Clear resets filters; `aria-live` announces visible count
- [ ] **AC-7:** View mode Flat restores M0 five-column layout without swimlane headers

### Swimlanes

- [ ] **AC-8:** Grouped mode renders swimlane header for epic with child issues (e.g. TRL-15 chain)
- [ ] **AC-9:** Collapse toggles hide grid; state survives page reload via localStorage
- [ ] **AC-10:** Ungrouped lane renders issues without `parent` when present

### Regression

- [ ] **AC-11:** M0 e2e still passes: `tests/e2e/vcs-kanban.spec.ts`
- [ ] **AC-12:** No new server routes under `server/api/vcs/` (grep / file list unchanged except docs)

### E2e (M1)

- [ ] **AC-13:** M1 e2e — label filter reduces visible cards; clear restores (`vcs-kanban-m1.spec.ts`)
- [ ] **AC-14:** M1 e2e — grouped mode shows swimlane region; flat mode hides it

---

## Verification commands

```bash
cd apps/web

# Unit — filter logic
pnpm exec vitest run app/lib/vcs-issue-filters.test.ts

# Regression M0
pnpm exec vitest run server/utils/vcs-root.test.ts server/utils/vcs-issue-parser.test.ts
pnpm exec playwright test tests/e2e/vcs-kanban.spec.ts

# M1 e2e
pnpm exec playwright test tests/e2e/vcs-kanban-m1.spec.ts

# Manual
# /lab/issues — toggle Labels proposal only; confirm count + swimlane TRL-15
# Switch Flat — flat columns; Grouped — swimlanes return
# Collapse swimlane — reload — still collapsed
```

---

## E2e notes (`vcs-kanban-m1.spec.ts`)

Use `gotoWithAuthBypass(page, '/lab/issues')`. Repo must have issues with parent links (trellis-client TRL-15 epic chain).

**Test 1 — filter:**

1. Wait for board cards (`getByRole('button', { name: /TRL-\d+/i })`)  
2. Open Labels popover; check `proposal`; expect fewer cards or `Showing N of M` with N < M  
3. Click Clear filters; count restores  

**Test 2 — view mode:**

1. Select `Grouped by epic` — expect `getByRole('region', { name: /swimlane|TRL-15/i })` or swimlane header button with epic id  
2. Select `Flat` — swimlane headers absent; column groups remain  

Use `{ name: 'Close', exact: true }` scoped to dialog (M0 lesson).

---

## Executor notes

1. **Extract pure functions first** — vitest green before Vue.  
2. **Reuse `VcsIssueColumn`** inside swimlane — don't duplicate column markup.  
3. **Do not add PATCH/POST** routes.  
4. **Popover patterns** — grep existing `UiPopover` usage in app.  
5. **Parent issue exclusion** — in grouped mode, issue that is only a parent (has children, no parent itself) shows as swimlane header only, not in Ungrouped unless it has no parent field and is root.  
6. **Optional polish** — `hideParent` on card inside swimlane; skip if timeboxed.

---

## Handoff checklist

- [x] Spec artifact: this file  
- [ ] Executor implements on lane `agent:executor`  
- [ ] Reviewer: vitest + M0/M1 e2e  
- [ ] Strategist: M2 mutations or cohesion pass
