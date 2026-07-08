---
version: alpha
name: Browse Form View — ontology intake on browse pages
description: Design artifact for forms-browse wedge — Form as a browse view mode (Notion model); submit-then-create via OntologyFormRenderer
source:
  parent: forms-browse
  mock: docs/artifacts/browse_form_view_mockup.html
  codeRefs:
    - apps/web/app/components/forms/ontology/OntologyFormRenderer.vue
    - apps/web/app/pages/workspace/browse/[entityType].vue
    - apps/web/app/composables/useBrowsePage.ts
colors:
  background: "hsl(var(--background))"
  surface: "hsl(var(--card))"
  surface-muted: "hsl(var(--muted))"
  text: "hsl(var(--foreground))"
  text-muted: "hsl(var(--muted-foreground))"
  primary: "hsl(var(--primary))"
  border: "hsl(var(--border))"
  success: "#22c55e"
  form-accent: "#8b5cf6"
typography:
  body:
    fontFamily: inherit
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  formTitle:
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  formDescription:
    fontSize: 13px
    color: "{colors.text-muted}"
  statChip:
    fontSize: 11px
    fontWeight: 500
    letterSpacing: 0.02em
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  BrowseFormView:
    maxWidth: 640px
    padding: "{spacing.lg}"
    centered: true
  FormViewHeader:
    height: 40px
    gap: "{spacing.sm}"
  ResponseCountChip:
    padding: "4px 10px"
    borderRadius: "{rounded.pill}"
    backgroundColor: "{colors.surface-muted}"
  CopyLinkButton:
    variant: outline
    size: sm
    disabledUntilPublish: true
  FormSuccessPanel:
    padding: "{spacing.xl}"
    iconSize: 48px
    borderRadius: "{rounded.lg}"
  OntologyFormRenderer:
    reuse: true
    layouts: [stacked, survey, wizard]
---

# Design: Browse Form View

**Status:** Design complete — handoff to Architect  
**Parent:** forms-browse (Pathway B)  
**Mock:** [browse_form_view_mockup.html](./browse_form_view_mockup.html)  
**Playground reference:** `/playground/ontology-form`

---

## Overview

Add **Form** as a browse view mode on per-type browse pages (`/workspace/browse/:entityType`). Same ontology, same entity records — Form is the **intake surface**; Table/List/Grid are the **response admin views**.

**Locked product decisions (from Strategist):**

| Decision | Rationale |
|----------|-----------|
| Form = browse view, not entity type | Notion database model; responses are records |
| No separate Responses tab | Table already shows submissions |
| `+ New` stays record-create | Admin shortcut; does not split into record vs form |
| Submit-then-create | Survey/wizard/stacked must not pre-create empty entities |
| v1: one presentation per ontology | `formPresentation` on schema; no multi-form artifact |

**Scope:** `[entityType].vue` browse only in v1 (not All-mode browse index). Form tab appears when type has `formPresentation` set **or** always (with default `stacked`) — **Architect: recommend always show Form tab for dynamic/user-tier types.**

---

## Colors

Inherit Trellis shadcn theme (`--background`, `--card`, `--primary`, `--border`). Form view uses a centered card on `bg-card/50` with subtle border — distinct from full-bleed table view but not a separate color system.

| Token | Use |
|-------|-----|
| `{colors.form-accent}` | Form tab active indicator, presentation badge (violet — intake, not CRUD) |
| `{colors.success}` | Post-submit thank-you state |
| `{colors.surface-muted}` | Response count chip, disabled copy-link |

---

## Typography

| Element | Spec |
|---------|------|
| Page title | Existing `Page` header — unchanged |
| Form title | Schema `label` — `text-xl font-semibold` |
| Form description | Optional ontology description or first-field hint — `text-sm text-muted-foreground` |
| Field labels | From `OntologyFormField` stacked variant — `text-sm font-medium` |
| Survey question | `text-lg font-medium` (existing survey variant) |

---

## Layout

```
┌─ Page (browse variant) ─────────────────────────────────────────────┐
│ [icon] Feedback · Custom Type          [search] [view switcher ▼]   │
│                                      [List][Table][Grid][Graph][Form]│
├─────────────────────────────────────────────────────────────────────┤
│ Toolbar (form view):                                                │
│   [12 responses]  [Copy link — disabled]  [Presentation: Survey ▾]  │  ← author-only controls
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              ┌─ Form card (max-w-lg mx-auto) ─────┐                 │
│              │  Product Feedback                    │                 │
│              │  Share your experience…              │                 │
│              │  ─────────────────────────────────   │                 │
│              │  [OntologyFormRenderer body]         │                 │
│              │  Step 2 of 4 · ████░░░░ 50%          │  ← survey/wizard │
│              │  [Back]              [Next →]        │                 │
│              └──────────────────────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### View switcher

Add to `viewModeOptions`:

```ts
{ mode: 'form', label: 'Form', icon: 'lucide:clipboard-list' }
```

Position: after Graph, before any projection-specific modes. Icon alternatives: `lucide:form-input`, `lucide:inbox`.

### Form view body

- **Container:** `flex flex-1 flex-col items-center py-8 px-4`
- **Card:** `w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm`
- **Renderer:** `OntologyFormRenderer` with `layout` from `typeConfig.formPresentation ?? 'stacked'`
- **No results footer** in form view (response count lives in header strip)

### Toolbar behavior by view mode

| View | `+ New` button | Search | Selection bar |
|------|----------------|--------|---------------|
| list/table/grid/graph | Visible | Visible | Visible when selecting |
| form | **Hidden** | Hidden (or disabled — no filter needed) | Hidden |

Rationale: Form view is intake, not browse. Admin creates via other views' `+ New`.

---

## Elevation & Depth

- Form card: single border + `shadow-sm` — no modal overlay (unlike `entity-dialog` presentation)
- Success panel: same card, content replaced — no navigation away
- Survey progress bar: inset 1.5px track, primary fill

---

## Shapes

- Response count chip: pill
- Copy link: outline button, sm
- Form card: `rounded-xl` (14px)
- Progress bar: `rounded-full`

---

## Components

### `BrowseFormView` (new — Executor)

| Prop | Type | Notes |
|------|------|-------|
| `schema` | ontology slice | `@id`, `label`, `fields`, `formPresentation` |
| `responseCount` | number | `filteredItems.length` |
| `onSubmit` | fn | create entity + toast |

Composes: `FormViewHeader` + `OntologyFormRenderer` + `FormSuccessPanel`.

### `FormViewHeader` (new)

Left: `ResponseCountChip` — "{n} responses"  
Right: `CopyLinkButton` (disabled, tooltip "Publishing coming soon") + optional `PresentationBadge` (read-only, shows current `formPresentation`)

Author settings (presentation picker) — **out of scope v1**; show badge only.

### Reuse: `OntologyFormRenderer`

| `formPresentation` | Form view behavior |
|--------------------|-------------------|
| `stacked` | Inline labels, single Submit at card footer |
| `survey` | One field per step, progress, Back/Next/Submit |
| `wizard` | Grouped steps by `field.group`, Back/Next/Submit |
| `entity-dialog` | **Fallback to `stacked`** in Form view (dialog chrome inappropriate here) |

### `FormSuccessPanel` (new)

Shown after successful submit. Replaces form body in card.

- Check icon (success color)
- "Response recorded" (or schema-specific thank-you when `formThankYou` exists — future)
- Primary action: **Submit another** (resets form defaults)
- Secondary: **View responses** (switches `viewMode` to `table`)

### `useBrowsePage` changes (Architect AC)

| `formPresentation` | `handleNewItem` behavior |
|--------------------|--------------------------|
| `entity-dialog` | Current: create empty → open dialog |
| `stacked` / `survey` / `wizard` | `setViewMode('form')` — no entity created |

Optional: deep-link `?view=form` on browse URL.

---

## Interaction matrix

| State | Trigger | UI | Result |
|-------|---------|-----|--------|
| **Idle — stacked** | Land on Form tab | Card + all fields + Submit | — |
| **Idle — survey** | Land on Form tab | Step 1 of N, one field | — |
| **Step advance** | Next (valid step) | Progress updates | Stay in form |
| **Step blocked** | Next (invalid) | Inline field errors | No advance |
| **Submit** | Submit / final Next | Loading on button | `createItem` with values + `submittedVia: 'form'` |
| **Success** | Create OK | `FormSuccessPanel` | Toast optional |
| **Submit another** | Click on success | Reset to defaults | Back to idle |
| **View responses** | Click on success | `viewMode = 'table'` | See records |
| **Copy link** | Click | Tooltip "Coming soon" | No-op v1 |
| **Empty schema** | No fillable fields | Empty state in card | Link to schema editor |
| **Switch away** | Click Table tab | Unsaved values lost | Confirm if dirty (v1.1 — Architect: optional defer) |

### Data stamped on submit

```ts
{
  type: entityType,
  title: values.title || 'Untitled',
  ...fieldValues,
  submittedVia: 'form',
  // submittedAt: ISO — use createdAt from kernel
}
```

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Focus order | View switcher → header chips → form fields → step nav → submit |
| Labels | All fields via `OntologyFormField` stacked labels; survey mode announces step ("Step 2 of 4") in `aria-live="polite"` region |
| Errors | `aria-invalid` + `aria-describedby` on invalid fields; step cannot advance until resolved |
| Progress | `role="progressbar"` with `aria-valuenow` / `aria-valuemax` on survey/wizard bar |
| Success | Focus moves to success heading on submit |
| Reduced motion | Progress bar width transition respects `prefers-reduced-motion` |
| Copy link disabled | `aria-disabled="true"` + tooltip explains why |

---

## Do's and Don'ts

**Do**

- Keep Form view visually centered and calm — intake UX, not admin CRUD
- Hide `+ New` and selection chrome in Form view
- Reuse `OntologyFormRenderer` — no duplicate field widgets
- Default `entity-dialog` presentation to stacked inside Form view

**Don't**

- Add a separate Responses tab or entity type
- Split `+ New` into record vs form dropdown
- Pre-create empty entities when entering Form view
- Enable Copy link until publish route exists (stub only)

---

## Open for Architect

1. **Add `form` to `BROWSE_VIEW_MODES`** and `browse-view-mode.ts` reconciliation map.
2. **Spec `BrowseFormView.vue`** + wire into `[entityType].vue` template slot.
3. **`useBrowsePage.handleNewItem` branch** on `formPresentation` — document in spec AC.
4. **`createFormResponse(values)`** helper — merge defaults, validate via `validateFormValues`, call `createItem`.
5. **When to show Form tab** — recommend: all `dynamic: true` types; optional hide when zero fillable fields.
6. **E2E:** navigate to browse → Form tab → fill → submit → row appears in table.
7. **Defer:** dirty-form confirm on tab switch, `formPublish` metadata, public `/forms/:slug` route.

**Non-blocking questions:** None — ready for spec.
