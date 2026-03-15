# App Conventions

> **Read this first.** This is the architectural guide for the `apps/web/app/` directory — the Nuxt 3 frontend of Trellis. It tells agents and developers where things live, what patterns to follow, and what to avoid.

---

## Directory Map

```
app/
├── assets/css/         Tailwind CSS, theme variables, global styles
├── components/         Vue components (Nuxt auto-imports by path)
│   ├── Ui/             shadcn/ui primitives (Button, Dialog, Popover, etc.)
│   ├── app/            App shell (AppSidebar, AppHeader, IconRail)
│   ├── dialogs/        Entity dialogs + create dialogs
│   ├── entity/         Entity-specific components
│   │   ├── cards/      Per-class grid cards (Temporal, Document, Actor, Container)
│   │   ├── panels/     Content panels used inside dialogs
│   │   └── shells/     Dialog shell wrappers per entity class
│   ├── dashboard/      Dashboard widget components
│   ├── data/           Data projections (table, kanban, calendar, etc.)
│   ├── editor/         TipTap NodeView components (CalloutBlock, EntityEmbed, etc.)
│   ├── grid/           Grid page editor components
│   ├── layout/         Page.vue and layout primitives
│   └── ...             Other feature-scoped component dirs
├── composables/        Reactive composables (Nuxt auto-imports)
├── config/             Static config (entityRegistry, routes, presets)
├── lib/                Non-reactive libraries, TipTap extensions, data adapters
├── pages/              File-based routing
├── plugins/            Nuxt plugins (theme, keyboard shortcuts, instant)
├── stores/             Pinia stores (theme only — most state is in composables)
├── types/              TypeScript type definitions
└── utils/              Pure utility functions (Nuxt auto-imports from here)
```

## Entity Type System

Two-axis: **class** (structural shape) × **type** (specific kind).

| Class | Types | Dialog Shell |
|---|---|---|
| **temporal** | task, event, trip, payment, appointment, reminder, deadline, milestone, sprint, budget | `EntityDialogShell` |
| **document** | note, file, page, template, slide_deck, bookmark, diagram | `EntityDialogShell` or full-page editor |
| **actor** | person, contact, organization, vendor | `ActorDialogShell` |
| **container** | project, folder, collection, goal | `EntityDialogShell` |

**Key files:**
- `types/entity.ts` — All interfaces, unions, type guards, factory functions
- `config/entityRegistry.ts` — Per-type UI metadata (icon, color, projections, property fields)
- `lib/dialogResolver.ts` — Maps entity type → dialog component

### Adding a New Entity Type

1. Add the type to the appropriate union in `types/entity.ts` (e.g. `TemporalEntityType`)
2. Create its interface extending `EntityBase` + the class mixin
3. Add it to the discriminated `Entity` union
4. Add a `createDefaultXxx()` factory function
5. Add it to the `createDefaultItem()` switch
6. Register it in `config/entityRegistry.ts` with icon, color, projections, propertyFields
7. Add an ontology in `server/utils/tql-ontologies.ts`
8. The dialog system auto-routes to `DynamicEntityDialog` unless you add an override in `lib/dialogResolver.ts`

## Data Flow

```
TQL Kernel (server) → /api/graph/* → useTrellisGraph (SSE + fetch)
                                    → useTrellisEntities (entity CRUD)
                                    → useEntities (canonical alias)

InstantDB (platform) → useInstantData (orgs, apps, members, settings)
```

- **`useEntities()`** — The canonical composable for entity CRUD. Delegates to `useTrellisEntities()`. Use this in pages and components.
- **`useTrellisEntities()`** — The implementation. Handles TQL vs cloud adapter, hydration, SSE sync.
- **`useInstantData()`** — Platform data (orgs/worlds, members, settings). Not for entities.

### Data Modes

| Mode | Entity Storage | Platform Data |
|---|---|---|
| `local` (default) | TQL kernel (SQLite) | instant-local (localStorage) |
| `cloud` | InstantDB cloud | InstantDB cloud |

Toggled via `TRELLIS_DATA_MODE` env var.

## Composable Patterns

### Singleton state (module-level)

Most composables use module-level `ref()` / `reactive()` for shared state:

```ts
const _items = ref<Entity[]>([])
const _loading = ref(true)

export function useMyComposable() {
  // _items and _loading are shared across all callers
  return { items: _items, loading: _loading }
}
```

### Browse pages

Use `useBrowsePage()` for any entity list/browse page:

```ts
const {
  filteredItems, viewMode, browseState,
  handleNewItem, viewOpen, viewingItem,
  handleUpdate, handleDelete,
} = useBrowsePage({
  entityType: 'task',
  defaultViewMode: 'kanban',
  searchFields: ['title', 'description'],
})
```

**Do not** hand-roll search/filter/sort/dialog state — `useBrowsePage` handles all of it.

### Auto-save

Use `useAutoSave()` in edit-mode dialogs:

```ts
const { status } = useAutoSave(editableItem, {
  enabled: isEditMode,
  beforeSave: (item) => applyFormulas(item),
})
```

**Do not** hand-roll debounced save logic with `setTimeout`.

## Dialog Patterns

### Entity dialogs (modal)

All entity dialogs use `UiDialog` + `UiDialogContent` directly with standard structure:

1. **sr-only** `UiDialogTitle` + `UiDialogDescription` for accessibility
2. **Header**: type badge, inline-editable title, nav arrows, close button
3. **Properties row**: horizontal flex-wrap of popover pill buttons
4. **Content area**: flex row with center content + optional right sidebar (References + Activity)
5. **Footer**: save status indicator (edit mode) or Create/Cancel buttons (create mode)

Base classes on `UiDialogContent`: `p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0`

**Property pills** use: `inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted`

### Dialog resolution

`lib/dialogResolver.ts` maps type → component:
- System types with custom UX → explicit overrides (`EntityDialog`, `PersonDialog`, etc.)
- Everything else → `DynamicEntityDialog` (schema-driven)

### Full-page editors (not dialogs)

Pages (`type: 'page'`) use a full-page editor at `/pages/[id]` instead of a dialog. This is the only entity type with a dedicated page-level editor.

## Page Layouts

**All pages must use the `<Page>` component** from `components/layout/Page.vue`. Never create bespoke one-off layouts.

Variants: `default`, `browse`, `feed`, `grid`, `detail`

```vue
<Page variant="browse" title="Tasks" :stats="stats">
  <!-- content -->
</Page>
```

If you need a new layout pattern, add it as a new variant to `Page.vue`.

## Component Naming

Nuxt auto-imports components by directory path. With `pathPrefix: false` in config:
- `components/entity/cards/EntityCard.vue` → `<EntityCard>`
- `components/Ui/RichTextEditor.vue` → `<UiRichTextEditor>`
- `components/dialogs/EntityDialog.vue` → `<EntityDialog>` (but often imported explicitly)

## Styling

- **Tailwind CSS v4** with CSS variables for theming
- Color tokens: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, etc.
- Use `bg-muted/50`, `text-muted-foreground`, `border-border` — not raw colors
- Use `!` suffix for override: `p-0!` not `!p-0`
- Section labels: `text-xs font-medium text-muted-foreground uppercase tracking-wide`

## File Placement Rules

| What | Where | Why |
|---|---|---|
| Reactive state + effects | `composables/useXxx.ts` | Auto-imported, reactive |
| Pure functions | `utils/xxx.ts` | Auto-imported, no side effects |
| TipTap extensions | `lib/xxx-extension.ts` | Not auto-imported, explicit import |
| Type definitions | `types/xxx.ts` | Explicit import with `type` keyword |
| Static config objects | `config/xxx.ts` | Explicit import |
| Data adapter internals | `lib/data-adapter/` | Isolated module |

## Testing

Tests live in `tests/` at the web app root (not colocated — historical).

```
apps/web/tests/
├── components/       Component tests
├── composables/      Composable tests
├── notifications/    Notification system tests
└── unit/             Unit tests
```

Run with: `pnpm test` or `vitest run`

## Known Aliases & Shims

- **`useEntities()`** → delegates to `useTrellisEntities()`. This is the canonical import — use it everywhere.
- **`useEntityFormulas()`** — Real implementation (not a shim). Computes priority/urgency from date proximity.
- **`CalendarItem`** type alias → `Entity` (deprecated alias in `types/entity.ts`)
- **`CalendarItemType`** type alias → `EntityType` (deprecated alias)

## What NOT to Do

- **Don't create bespoke page layouts** — use `<Page variant="...">` or add a new variant
- **Don't hand-roll entity browse logic** — use `useBrowsePage()`
- **Don't hand-roll auto-save** — use `useAutoSave()`
- **Don't add `as any` casts** — fix the type instead. If the entity type is missing a field, add it to the interface in `types/entity.ts`
- **Don't create new TipTap extensions** without putting them in `lib/` with the `-extension.ts` suffix
- **Don't start the dev server** — it's always running on `localhost:$TRELLIS_PORT`
- **Don't pipe CLI output** through `node -e`, `jq`, or inline scripts
