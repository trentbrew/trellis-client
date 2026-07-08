# Spec: View Projection Shell Cohesion (TRL-28)

**Status:** Spec ready for Executor  
**Parent design:** `TRL-27`  
**Parent proposal:** `TRL-26`  
**Design:** [view_projection_shell_cohesion_design.md](./view_projection_shell_cohesion_design.md)  
**Mock:** [view_projection_shell_cohesion_mockup.html](./view_projection_shell_cohesion_mockup.html)  
**Prior work:** `TRL-26` M0/M1 (`normalizeBrowseViewMode`, `ProjectionOutlet`)

## Goal

Make the browse projection surface visibly and structurally use the projection registry as its orientation layer, without creating a second page shell or prematurely moving deck/VCS routes.

This is the next bounded slice after `ProjectionOutlet`: add a registry-backed projection options helper and a reusable projection spine/chrome around the existing outlet. VCS kanban and deck canvas remain recipe candidates documented by the design, but this implementation only prepares the shell contract and proves it on `/workspace/browse`.

## Scope

### In

- Add a composable/helper that produces registry-backed projection options for browse:
  - Starts from `PROJECTION_REGISTRY_NODES`.
  - Intersects with `entityRegistry.projections` when the active type supplies projections.
  - Preserves capability state (`supported`, `disabled`, `reason`) when schema requirements are not met.
  - Returns options compatible with existing `Page.vue` `viewModeOptions`.
- Add a `ProjectionSpine` component as the design’s registry-driven orientation strip.
- Wire `/workspace/browse` so its view switcher/options come from the helper, not local hardcoded options.
- Keep `Page.vue` as host shell. Do not replace it.
- Keep `ProjectionOutlet` as renderer dispatch. Do not move renderer bodies back into `browse/index.vue`.
- Add a lightweight shell/slot contract in code comments/types for optional future `toolbar`, `inspector`, `unsupported` slots.
- Update browse e2e coverage to assert registry-driven projection switching and disabled/unavailable projection affordance.

### Out

- Moving VCS board into `ProjectionOutlet`.
- Moving deck canvas into browse or `slide-deck` registry routing.
- New custom/agent-authored projection entities.
- New renderer visuals beyond spine/chrome.
- Reworking global `IconRail` or app navigation.

## Architecture

```
Page.vue                         existing host shell
  viewModeOptions                registry-backed options
  #viewSwitcher (optional)       future override point
  ProjectionSpine                new orientation strip for projection layouts
  ProjectionOutlet               existing layout → renderer dispatch
```

### New / Updated Modules

| File | Change |
| ---- | ------ |
| `apps/web/app/composables/useProjectionOptions.ts` | New helper that converts registry nodes + active entity config/schema into `ViewModeOption[]`. |
| `apps/web/app/components/views/ProjectionSpine.vue` | New reusable vertical/horizontal projection selector using registry option data. |
| `apps/web/app/pages/workspace/browse/index.vue` | Replace local/hardcoded projection option construction with `useProjectionOptions`; render `ProjectionSpine` in the browse content shell while preserving existing `Page.vue` switcher unless it conflicts. |
| `apps/web/app/components/views/ProjectionOutlet.vue` | Keep renderer dispatch; add slot/type comments for future `toolbar`, `inspector`, `unsupported` contract if needed. |
| `apps/web/tests/e2e/browse-projection-outlet.spec.ts` | Extend coverage for projection spine, registry option switching, and no page errors. |

## Data Contract

Create a UI-level option type if the existing `Page.vue` `ViewModeOption` cannot be imported cleanly:

```ts
export type ProjectionOption = {
  mode: ProjectionType
  label: string
  icon: string
  order: number
  disabled?: boolean
  reason?: string
  suggested?: boolean
}
```

The helper should expose:

```ts
export function useProjectionOptions(options: {
  activeType?: Ref<string | undefined>
  activeTypeConfig?: Ref<{ projections?: ProjectionType[]; defaultProjection?: ProjectionType } | null | undefined>
  schemaFields?: Ref<Array<{ type?: string }> | null | undefined>
  currentProjection?: Ref<ProjectionType>
}): {
  projectionOptions: ComputedRef<ProjectionOption[]>
  defaultProjection: ComputedRef<ProjectionType>
}
```

Implementation may adapt the shape to current local types, but the behavior must stay the same.

## Behavioral Requirements

1. Browse projection options are derived from `PROJECTION_REGISTRY_NODES`, not duplicated in `browse/index.vue`.
2. Active entity type projections narrow the offered options when `entityRegistry` declares `projections`.
3. Capability-gated layouts are visible as disabled (with `reason`) or omitted only when current UX already omits unsupported views. Pick one behavior and keep it consistent between `Page.vue` switcher and `ProjectionSpine`.
4. `ProjectionSpine` and `Page.vue` switcher stay in sync because both write to the same `viewMode` ref.
5. `ProjectionOutlet` remains the only body dispatch for flat browse views.
6. Group-by-class card layout remains supported and does not route table/graph through the grouped card branch.
7. Unsupported registered projections still render the existing `ProjectionOutlet` fallback when selected through a test harness or direct state, with explanatory copy.
8. No production behavior change to deck routes or VCS routes in this slice.

## Accessibility

- `ProjectionSpine` is a `nav` or `radiogroup` labelled `Projection layouts`.
- Each projection control has:
  - `aria-pressed` or `aria-checked` for active state.
  - Disabled state and tooltip/title text when capability gated.
  - Keyboard focus ring.
- Projection changes announce through existing page/results chrome or a local `aria-live="polite"` status.
- On narrow layouts, the spine can wrap horizontally without changing tab order.
- Respect `prefers-reduced-motion`; no required animated transitions.

## Implementation Plan

1. Add `useProjectionOptions.ts`.
2. Add focused unit tests for helper behavior:
   - registry order is preserved.
   - active type projections narrow options.
   - schema capability requirements produce disabled/reason state or consistent omission.
   - default projection falls back to `card-grid` if configured default is unavailable.
3. Add `ProjectionSpine.vue`.
4. Wire browse page:
   - Replace hardcoded projection option list with helper output.
   - Render `ProjectionSpine` near the content region or via `Page.vue` `#viewSwitcher` if that creates less duplication.
   - Preserve current search, field visibility, file-category pills, group-by-class, and infinite scroll.
5. Extend e2e coverage in `browse-projection-outlet.spec.ts`.
6. Run targeted lint/tests, then existing reviewer checks.

## Acceptance Criteria

1. `useProjectionOptions` derives browse projection options from `PROJECTION_REGISTRY_NODES` and active entity config, with tests covering order, narrowing, capability gating, and default fallback.
2. `/workspace/browse` renders a labelled projection spine/shell control driven by the same `viewMode` ref as `Page.vue`.
3. Switching Card Grid ↔ Table through the spine renders through `ProjectionOutlet` and preserves existing results count behavior.
4. Unsupported or not-yet-wired registered projections show explanatory unavailable/fallback copy rather than a blank panel.
5. Existing browse interactions remain intact: search, selection, field updates, `groupByClass` card grouping, and infinite-scroll sentinel.
6. No route or behavior changes are made to `/decks/*` or `/lab/issues` beyond shared types/comments.
7. E2E: `pnpm --filter @trellis/web test:e2e tests/e2e/browse-projection-outlet.spec.ts` passes.
8. Static: targeted ESLint for touched files passes; `pnpm check` may still report known baseline failures, but no new failures in touched files.

## Suggested Test Additions

### Unit

Create or extend:

- `apps/web/app/composables/useProjectionOptions.test.ts`

Cases:

- `returns registry ordered options`.
- `narrows to entity config projections`.
- `marks select/date/number-gated projections unavailable when matching fields are missing`.
- `chooses configured default when available, otherwise first supported option`.

### E2E

Extend:

- `apps/web/tests/e2e/browse-projection-outlet.spec.ts`

Assertions:

- Projection shell/spine is visible with label `Projection layouts`.
- Card/Grid and Table controls both switch views without page errors.
- Unsupported/unavailable projection affordance is labelled or disabled with a reason.

## Notes For Executor

- Keep the implementation narrow. Do not refactor `Page.vue` broadly.
- Prefer adding a helper and a small component over inlining another options ladder in `browse/index.vue`.
- If importing `ViewModeOption` from `Page.vue` is awkward, define a local shared type in the helper and map it to Page’s prop shape structurally.
- The `LayoutPicker.vue` lint warning is pre-existing and not part of this slice.
