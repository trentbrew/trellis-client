# Lib

Non-reactive libraries, TipTap extensions, and data adapters. **Not** auto-imported — require explicit `import from '~/lib/...'`.

## When to put code here vs. elsewhere

| Here (`lib/`) | Composables (`composables/`) | Utils (`utils/`) |
|---|---|---|
| Classes, extension configs | Reactive state + effects | Pure functions |
| TipTap extensions | Vue lifecycle hooks | No side effects |
| Data adapter internals | Nuxt auto-imported | Nuxt auto-imported |
| Complex non-reactive logic | — | — |

## Key Files

| File | Purpose |
|---|---|
| `dialogResolver.ts` | Maps entity type → dialog component. Single source of truth for dialog routing. |
| `projections.ts` | Projection types, scoring, view mode options, default projections |
| `permissions.ts` | Role hierarchy, permission checks |
| `tql-namespace.ts` | Entity ID helpers (`entityId()`, `entityQuery()`, `ENTITY_NAMESPACE`) |
| `workspaceTemplates.ts` | World template definitions |
| `appTemplates.ts` | App template presets for marketplace |
| `systemTypes.ts` | System entity type constants (deprecated — use `useOntologyRegistry`) |
| `noteTemplates.ts` | Rich text note templates |
| `detailSchema.ts` | Detail view field schemas |
| `fieldEditorConfig.ts` | Field editor configurations |
| `adminCleanup.ts` | Admin cleanup utilities |

## TipTap Extensions (`*-extension.ts`)

| Extension | Purpose |
|---|---|
| `mention-extension.ts` | `@mention` inline entity search + chip insertion |
| `entity-embed-extension.ts` | `/entity` block embed (live entity card) |
| `query-view-extension.ts` | `/query` block (live mini data table) |
| `slash-command-extension.ts` | `/` slash command suggestion system |
| `callout-extension.ts` | Callout block (info/warning/success/danger) |
| `inline-comment-extension.ts` | Inline comment highlights |
| `resizable-image-extension.ts` | Resizable image nodes |
| `table-controls-plugin.ts` | Table editing controls |
| `url-embed-extension.ts` | URL embed blocks |
| `tabs-extension.ts` | Tab container blocks |
| `card-extension.ts` | Card container blocks |
| `collapsible-extension.ts` | Collapsible/accordion blocks |
| `drop-indicator-extension.ts` | Drag-and-drop indicators |

## Data Adapter (`data-adapter/`)

Unified data layer abstracting local (TQL/instant-local) vs. cloud (InstantDB).

| File | Purpose |
|---|---|
| `types.ts` | `DataAdapter` interface |
| `local-adapter.ts` | Wraps instant-local |
| `cloud-adapter.ts` | Wraps `@instantdb/core` |
| `migrate.ts` | Export/import between modes |
| `index.ts` | Barrel export |

## instant-local (`instant-local/`)

Local-first InstantDB adapter. Same API as `@instantdb/core` — zero consumer changes needed for cloud migration.
