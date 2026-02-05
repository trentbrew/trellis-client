# Verticals

Verticals are domain-specific extensions to the core scaffold. Each vertical provides specialized functionality for a particular use case while sharing the common infrastructure.

## Structure

```
verticals/
├── ecms/                    # Environmental Compliance Management System
│   ├── types/               # ECMS-specific type definitions (10 files)
│   ├── composables/         # useFacilities, useEcmsData, useFacilityEntities
│   ├── components/          # Task dialogs, folder views, permit components
│   │   ├── dialogs/         # UnifiedTaskDialog, TaskDetailDialog, etc.
│   │   ├── views/           # FoldersView, ScheduledTasksView, etc.
│   │   └── permit/          # ConditionCard, PdfViewer, etc.
│   ├── pages/               # ECMS-specific pages (tasks, permits, folders, etc.)
│   ├── lib/                 # ecmsSeedData.ts
│   ├── data/                # ecmsSeedData.json
│   └── index.ts             # Main export
└── README.md
```

## ECMS Vertical

The ECMS vertical provides:
- **Facility management**: Organizations have facilities (sites/locations)
- **Task scheduling**: Recurring tasks, templates, generators
- **Compliance tracking**: Environmental compliance tasks and audits
- **Folder-based grouping**: Documents organized in folder hierarchies
- **Permit management**: Permit applications, indexing, conditions

### Key Differences from Generic Scaffold

| Feature | ECMS | Generic Scaffold |
|---------|------|------------------|
| Grouping | Folders (hierarchical) | Tags (flat, flexible) |
| Context | Org → Year → Facility | Workspace → App |
| Entities | Tasks, Permits, Inspections | Collections, Records |
| Pages | 11 specialized pages | 4 generic pages |

### Enabling ECMS Pages

To enable ECMS pages in your app, you have two options:

1. **Symlink** (development): Create symlinks from `pages/[workspace]/[app]/` to the vertical pages
2. **Copy** (production): Copy the pages you need to the main pages directory

```bash
# Example: Enable tasks page
ln -s ../../../verticals/ecms/pages/tasks.vue pages/[workspace]/[app]/tasks.vue
```

## Generic Scaffold Features

The generic scaffold uses:
- **Tags** for grouping (via `useTags` composable and `TagPicker` component)
- **Collections** for data organization
- **Records** with flexible field schemas

## Creating a New Vertical

1. Create a folder under `verticals/` with your vertical name
2. Add types, composables, and components specific to your domain
3. Export everything from an `index.ts` file
4. Optionally create backward-compatible re-exports in main folders
5. Add pages to `pages/` subfolder

## Backward Compatibility

The original import paths (e.g., `~/types/ecms`, `~/composables/useFacilities`) still work via re-export stubs. New code should import directly from the vertical:

```typescript
// Preferred (new)
import { useFacilities } from '~/verticals/ecms'

// Deprecated (still works)
import { useFacilities } from '~/composables/useFacilities'
```
