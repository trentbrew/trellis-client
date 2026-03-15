# Dialogs

Entity dialog components. All follow the same structural pattern.

## Dialog Resolution

`lib/dialogResolver.ts` maps entity type → dialog component:
- **System types with custom UX** → explicit overrides (see `DIALOG_OVERRIDES` map)
- **Everything else** → `DynamicEntityDialog` (schema-driven)

## Dialog Components

| Component | Types | Lines | Shell |
|---|---|---|---|
| `EntityDialog` | task, event, note, bookmark, diagram | 2100 | `EntityDialogShell` |
| `PersonDialog` | person, contact, vendor | 510 | `ActorDialogShell` |
| `OrganizationDialog` | organization | 500 | `ActorDialogShell` |
| `ProjectDialog` | project, folder, collection, goal | 310 | `ContainerDialogShell` |
| `FileDialog` | file | 430 | `EntityDialogShell` |
| `SlideDeckDialog` | slide_deck | 430 | Custom |
| `DynamicEntityDialog` | all custom/user types | 970 | `EntityDialogShell` |

## Shared Logic

All dialogs use `useEntityDialog()` composable (`composables/useEntityDialog.ts`) for:
- Mode management (`isViewMode`, `isCreateMode`, `isEditMode`)
- `editableItem` reactive + hydration watcher
- Auto-save via `useAutoSave`
- Comments via `useComments`
- Entity references via `useEntityReferences`
- Owner filtering
- Close/save/delete handlers

**Exception**: `EntityDialog.vue` still has its own script (temporal-specific: schedule, recurrence, reminders, calendar models). Composable migration deferred.

## Shared Components

- **`EntityRightSidebar`** (`components/entity/EntityRightSidebar.vue`) — Tabbed References + Activity sidebar. Used by all 4 major dialogs.
- **`EntityDialogShell`** — Header chrome, title input, nav arrows, properties slot, footer slots
- **`ActorDialogShell`** — Wider variant for person/org dialogs
- **`ContainerDialogShell`** — Variant for project/folder/collection

## Adding a New Dialog

1. Check if `DynamicEntityDialog` handles your type (it handles all custom types automatically)
2. If you need custom UX, create a new dialog component using `useEntityDialog()` + `EntityRightSidebar`
3. Register it in `lib/dialogResolver.ts` `DIALOG_OVERRIDES`
