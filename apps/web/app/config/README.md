# Config

Static configuration objects. Explicit `import from '~/config/...'` required.

## Files

| File | Purpose |
|---|---|
| `entityRegistry.ts` | **Per-type UI metadata**: icon, color, projections, property fields, search fields. Lookup helpers: `getEntityTypeConfig()`, `typeHasField()`, `getPropertyFieldsForType()`. |
| `routes.ts` | Route paths (`ROUTE_PATHS`), sidebar section builder, breadcrumbs, command palette routes. `UserRole` type. `parseFullPath()` for route parsing. |
| `presets.ts` | Re-exports theme presets from `lib/theme-presets.ts`. |

## Entity Registry (`entityRegistry.ts`)

The registry is the **sync fallback** — the server ontology (via `useOntologyRegistry`) is the primary source. The registry provides:

- `ENTITY_CLASSES` — config per entity class (temporal, document, actor, container)
- `ENTITY_TYPES` — config per entity type (task, note, person, project, etc.)
- **Field factory `F`** — `Record<PropertyFieldId, PropertyFieldConfig>` with all field definitions
- **`fields(...ids)`** — Pick fields by ID for per-type property assignments
- **Lookup helpers** — `getEntityTypeConfig(type)`, `typeHasField(type, fieldId)`, `getPropertyFieldsForType(type)`, `getFieldsByGroup(type, group)`, `getDefaultProjectionForType(type)`

### Adding a new entity type to the registry

1. Add entry to `ENTITY_TYPES` with: `class`, `label`, `icon`, `color`, `projections`, `searchFields`, `propertyFields`
2. The `propertyFields` array uses `fields('startDate', 'priority', ...)` to pick from the field factory
