# Spec: VCS Kanban Projection Recipe

**Status:** Spec ready for Executor  
**Parent design:** `TRL-27`  
**Parent proposal:** `TRL-26`  
**Prior slice:** `TRL-28` browse projection shell cohesion  
**Design:** [view_projection_shell_cohesion_design.md](./view_projection_shell_cohesion_design.md)

## Goal

Prove that the VCS issue board can behave as a `kanban` projection recipe behind the existing projection shell grammar, without rebuilding the board visuals or changing global navigation.

This is the next bounded slice after browse adopted registry-backed projection options and `ProjectionSpine`. The work should define a reusable adapter seam around the current VCS board pieces (`useVcsIssues`, `VcsIssueFilterBar`, `VcsIssueBoard`, `VcsIssueDetailDrawer`) so `/lab/issues` keeps its current behavior while the kanban body can be treated as a renderer recipe.

## Scope

### In

- Add a VCS-specific kanban recipe component that composes the existing VCS issue board pieces.
- Keep `/lab/issues` as the route owner and preserve its header, `LabSubNav`, route path, data source, polling, filters, grouped/flat mode, detail drawer, and keyboard shortcuts.
- Route the VCS board body through a projection-style adapter seam:
  - canonical projection type is `kanban`;
  - board chrome is split into `toolbar`/recipe controls and renderer body;
  - the recipe can later be mounted by `ProjectionOutlet` without moving VCS data fetching into browse.
- Reuse `VcsIssueFilterBar`, `VcsIssueBoard`, `VcsIssueSwimlane`, `VcsIssueColumn`, and `VcsIssueDetailDrawer` rather than rewriting them.
- Add a small typed recipe contract for VCS kanban props/emits or a documented adapter comment if a shared generic type would overreach.
- Extend e2e coverage to prove existing `/lab/issues` behavior survives the adapter:
  - board shell/subnav/columns;
  - card detail drawer;
  - filters and clear;
  - grouped/flat swimlane toggle.

### Out

- Moving `/lab/issues` into `/workspace/browse`.
- Reworking `IconRail`, `AppSidebar`, or global route IA.
- Drag/drop issue mutation.
- Persisting VCS issues as graph entities.
- Custom/agent-authored projections.
- Deck canvas or `slide-deck` routing.
- Visual redesign of VCS cards, columns, filters, or drawer.

## Architecture

Current shape:

```text
pages/lab/issues.vue
  Page variant="canvas"
  LabSubNav
  VcsIssueFilterBar
  error / empty / filtered-empty states
  VcsIssueBoard
  VcsIssueDetailDrawer
```

Target shape:

```text
pages/lab/issues.vue                         route owner stays
  Page variant="canvas"                      host shell stays
  LabSubNav                                  lab navigation stays
  VcsKanbanProjectionRecipe                  new adapter/recipe
    #toolbar / VcsIssueFilterBar             recipe controls
    error / empty / filtered-empty states    current route states preserved
    VcsIssueBoard                            kanban renderer body
    VcsIssueDetailDrawer                     recipe inspector/detail
```

The route should still call `useVcsIssues()` unless moving that call into the recipe is the smaller change. If the recipe owns `useVcsIssues()`, it must expose the same visible behavior and avoid coupling to browse entities.

## Module Plan

| File | Change |
| ---- | ------ |
| `apps/web/app/components/vcs/VcsKanbanProjectionRecipe.vue` | New component that composes current VCS toolbar, board, states, and detail drawer behind a projection recipe boundary. |
| `apps/web/app/pages/lab/issues.vue` | Replace inline board composition with the recipe while preserving page header and `LabSubNav`. |
| `apps/web/app/components/views/ProjectionOutlet.vue` | Do not route `/lab/issues` through browse yet. Add only a narrow comment/type hook if needed to document `kanban` recipe compatibility. |
| `apps/web/app/components/vcs/*` | Keep existing visual components; only adjust props/emits if needed for recipe composition. |
| `apps/web/tests/e2e/vcs-kanban.spec.ts` | Keep/extend M0 coverage for shell, columns, and detail drawer. |
| `apps/web/tests/e2e/vcs-kanban-m1.spec.ts` | Keep/extend M1 coverage for filters and grouped/flat swimlanes. |

## Data And Interaction Contract

The recipe should remain VCS-domain-specific:

```ts
type VcsKanbanProjectionRecipeProps = {
  preserveRouteChrome?: boolean
}

type VcsKanbanProjectionRecipeEmits = {
  // Optional future shell hook; do not require it for this slice.
  ready: [{ projectionType: 'kanban'; total: number }]
}
```

Implementation may skip exported types if they add noise, but the component boundary should make it clear which parts are VCS data/controller (`useVcsIssues`) and which parts are renderer recipe (`VcsIssueBoard` + toolbar + drawer).

## Behavioral Requirements

1. `/lab/issues` URL, route meta, page title behavior, and `LabSubNav` remain unchanged.
2. Existing VCS issue loading, refresh, polling, visibility pause/resume, and `r` refresh shortcut remain unchanged.
3. Existing filter behavior remains unchanged: label/assignee filters update visible count, and clear restores the previous count.
4. Existing grouped/flat view mode remains unchanged, including localStorage persistence via `VCS_KANBAN_VIEW_STORAGE_KEY`.
5. Existing swimlane collapse behavior remains unchanged, including per-epic localStorage keys.
6. Existing card selection opens `VcsIssueDetailDrawer`; Escape closes it and focus returns to the card.
7. Error, no-repo, no-issues, and filtered-empty states continue to render with the same copy/actions.
8. VCS kanban is represented as a `kanban` projection recipe in code comments/types, but browse entity kanban behavior must not regress.
9. No production behavior change to `/workspace/browse`, `/decks/*`, global `IconRail`, or app navigation.

## Accessibility

- Existing `LabSubNav` navigation label remains visible to e2e and assistive tech.
- `VcsIssueBoard` regions keep their current labels:
  - flat: `VCS issue board`;
  - grouped: `VCS issue board grouped by epic`.
- Filter popovers keep labels for label/assignee controls.
- Board layout select keeps `aria-label="Board layout"`.
- Detail drawer keeps `role="dialog"`, close button, Escape handling, and focus return behavior.
- No new keyboard shortcuts are introduced.

## Acceptance Criteria

1. New `VcsKanbanProjectionRecipe.vue` (or equivalently named recipe component) composes the existing VCS toolbar, board, states, and detail drawer behind a projection recipe boundary.
2. `/lab/issues` renders through the VCS kanban recipe while preserving the current route header and `LabSubNav`.
3. Existing VCS behaviors remain intact: refresh/polling, label/assignee filters, clear filters, grouped/flat mode, swimlane collapse, detail drawer, Escape close/focus return.
4. `ProjectionOutlet` and browse entity kanban are not refactored broadly; any changes there are limited to comments/types or compatibility hooks.
5. No route or navigation changes are made to `/workspace/browse`, `/decks/*`, `IconRail`, or `AppSidebar`.
6. E2E: `pnpm --filter @trellis/web test:e2e tests/e2e/vcs-kanban.spec.ts tests/e2e/vcs-kanban-m1.spec.ts` passes.
7. Static: targeted ESLint for touched VCS/projection files passes; `pnpm --filter @trellis/web check` may still report known package-wide baseline failures, but no new touched-file errors.
8. Existing browse projection outlet e2e remains green if `ProjectionOutlet` is touched: `pnpm --filter @trellis/web test:e2e tests/e2e/browse-projection-outlet.spec.ts`.

## Notes For Executor

- Treat this as a component boundary extraction, not a redesign.
- Prefer moving the current `/lab/issues` middle section into `VcsKanbanProjectionRecipe.vue` with minimal prop churn.
- Keep `useVcsIssues()` behavior intact; do not alter polling cadence, localStorage keys, or API endpoints.
- Do not attempt to make `ProjectionOutlet` fetch VCS data in this slice.
- If a test becomes flaky because of persisted localStorage view mode, clear or set `VCS_KANBAN_VIEW_STORAGE_KEY` in the test setup rather than weakening assertions.
