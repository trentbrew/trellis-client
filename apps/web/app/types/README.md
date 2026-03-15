# Types

TypeScript type definitions for the app. Explicit imports required (`import type { ... } from '~/types/...'`).

## Key Files

| File | Purpose | Size |
|---|---|---|
| `entity.ts` | **Core** — All entity interfaces, unions, type guards, factories, option arrays | 38KB |
| `database.ts` | Platform types: projections, collections, integrations, workflows, shares | 12KB |
| `grid.ts` | Grid page editor: GridView, GridConfig, presets | 6KB |
| `shortcuts.ts` | Keyboard shortcut system: definitions, scopes, categories | 5KB |
| `dashboard.ts` | Dashboard widget types | 4KB |
| `workspace-template.ts` | World template definitions | 3KB |
| `contextMenu.ts` | Context menu action/config types | 3KB |
| `theme.ts` | Theme preset types | 2KB |
| `agent.ts` | Agent panel types | 1KB |

## Entity Type System (entity.ts)

Two-axis: **class** × **type**.

```
EntityClass = 'temporal' | 'document' | 'actor' | 'container'
EntityType  = TemporalEntityType | DocumentEntityType | ActorEntityType | ContainerEntityType
```

- **`EntityBase`** — Shared fields (id, type, title, tags, owner, references, etc.)
- **`EntityItemBase`** — Flat runtime shape extending EntityBase with temporal fields
- **Per-type interfaces** — `TaskItem`, `EventItem`, `NoteItem`, `PageItem`, `PersonItem`, etc.
- **`Entity`** — Discriminated union of all per-type interfaces
- **Type guards** — `isTask()`, `isNote()`, `isPage()`, etc.
- **Factory functions** — `createDefaultItem(type)`, `createDefaultTask()`, etc.
- **Option arrays** — `PRIORITY_OPTIONS`, `TASK_STATUS_OPTIONS`, `CATEGORY_OPTIONS`, etc.

### Adding a field to an entity type

1. Add the field to the appropriate interface (e.g. `PageItem`)
2. If it's a new enum, add its type alias and options array
3. Update `createDefaultXxx()` factory with the default value
4. If the field should appear in dialogs, add a `PropertyFieldId` entry in the registry

### Deprecated aliases (backward compat)

- `CalendarItem` → `Entity`
- `CalendarItemType` → `EntityType`
- `CalendarItemBase` → `EntityItemBase`
- `Attachment` → `FileReference`
