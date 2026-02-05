# Graph-Driven Pages Implementation Plan

**Status:** Draft  
**Created:** 2026-01-27  
**Author:** Cascade + Trent Brew

---

## Executive Summary

Refactor ECMS facility pages to use a **graph-driven architecture** where:

1. `app-config.jsonld` serves as the canonical schema source
2. Routes derive their configuration (title, icon, entity type, projections) from the graph
3. Data is fetched dynamically based on entity type, not hardcoded in page components
4. The `[...path].vue` catch-all becomes a universal renderer

---

## Current State Analysis

### ✅ Already Implemented

| Component             | Status      | Location                                               |
| --------------------- | ----------- | ------------------------------------------------------ |
| JSON-LD Config        | ✅ Complete | `app/config/app-config.jsonld`                         |
| Config Loader         | ✅ Complete | `app/lib/appConfig.ts`                                 |
| Route Resolution      | ✅ Complete | `buildRouteConfigTree()`, `buildPageConfigFromRoute()` |
| Type → Schema Builder | ✅ Complete | `buildSchemaFromType()`, `getTypeProjectionTypes()`    |
| Browse Page Pattern   | ✅ Partial  | `browse/[entityType].vue` (schema-driven, no data)     |
| View Components       | ✅ Complete | `TableView`, `BoardView`, `CalendarView`               |
| Collection Data Layer | ✅ Complete | `useCollectionData.ts` (generic InstantDB)             |

### ❌ Gaps to Address

| Gap                               | Impact                                        | Priority |
| --------------------------------- | --------------------------------------------- | -------- |
| **Hardcoded page data**           | `tasks.vue` has 160 lines of mock data        | P0       |
| **No ECMS data composable**       | Can't fetch tasks/facilities/users from graph | P0       |
| **Placeholder catch-all**         | `[...path].vue` shows "under construction"    | P0       |
| **Entity types not in InstantDB** | ECMS data only in seed JSON file              | P1       |
| **No data persistence**           | Changes don't save to backend                 | P1       |

---

## Scope Definition

### 🎯 IN SCOPE (Phase 1)

1. **Create `useFacilityEntities` composable**
   - Fetch ECMS entities (tasks, users, folders, permits) scoped to current facility
   - Bridge JSON-LD schema → actual data retrieval
   - Support filtering, sorting, pagination

2. **Refactor `[...path].vue` to be graph-driven**
   - Use `buildPageConfigFromRoute()` to derive page config
   - Render dynamically based on `entityType` and `pageVariant`
   - Fall back to placeholder only for truly undefined routes

3. **Refactor `tasks.vue` as proof-of-concept**
   - Remove hardcoded mock data
   - Use `useFacilityEntities('task')` for data
   - Derive schema from `type:Task` in JSON-LD

4. **Add ECMS entity schemas to JSON-LD**
   - Define `type:Facility`, `type:User`, `type:Folder`, `type:Permit`
   - Add field definitions for each entity type

### 🚫 OUT OF SCOPE (Phase 1)

- Migrating ECMS seed data to InstantDB (Phase 2)
- Real-time sync with production ECMS backend
- User authentication against ECMS
- Complex workflow automation
- Permit PDF rendering/annotation

---

## Technical Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Route: /facility/tasks                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  buildPageConfigFromRoute('/facility/tasks')                    │
│  ────────────────────────────────────────────────────────────── │
│  Returns: {                                                     │
│    entityTypeId: 'type:Task',                                   │
│    projectionTypes: ['table', 'kanban', 'calendar'],            │
│    schema: { fields: [...] },                                   │
│    pageVariant: 'browse'                                        │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  useFacilityEntities('task', { facilityId })                    │
│  ────────────────────────────────────────────────────────────── │
│  Returns: {                                                     │
│    items: Ref<Task[]>,                                          │
│    loading: Ref<boolean>,                                       │
│    schema: DatabaseSchema,                                      │
│    create, update, delete                                       │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Page Component (graph-driven)                                  │
│  ────────────────────────────────────────────────────────────── │
│  <Page :title="pageConfig.title" ...>                           │
│    <TableView v-if="viewMode === 'table'" :items :schema />     │
│    <BoardView v-if="viewMode === 'kanban'" :items :schema />    │
│    <CalendarView v-if="viewMode === 'calendar'" :items :schema />│
│  </Page>                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure Changes

```
app/
├── composables/
│   ├── useFacilityEntities.ts    # NEW: Entity data for facility context
│   └── useGraphDrivenPage.ts     # NEW: Combines config + data + browse state
├── pages/[org]/[year]/[facility]/
│   ├── [...path].vue             # REFACTOR: Graph-driven universal renderer
│   ├── tasks.vue                 # REFACTOR: Use graph-driven pattern
│   └── browse/
│       └── [entityType].vue      # KEEP: Already uses pattern (enhance)
└── config/
    └── app-config.jsonld         # ENHANCE: Add ECMS entity types
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### Step 1.1: Create `useFacilityEntities` composable

**File:** `app/composables/useFacilityEntities.ts`

```typescript
interface UseFacilityEntitiesOptions {
  facilityId: string;
  entityType: string; // 'task' | 'user' | 'folder' | 'permit' | etc.
}

interface UseFacilityEntitiesReturn<T> {
  items: Ref<T[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  schema: ComputedRef<DatabaseSchema | null>;

  // CRUD
  create: (data: Partial<T>) => Promise<string>;
  update: (id: string, data: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  // Helpers
  refresh: () => Promise<void>;
  getById: (id: string) => T | undefined;
}
```

**Data Sources (in order of preference):**

1. InstantDB (if entity exists in schema)
2. ECMS seed data JSON (fallback for dev)
3. Empty array (graceful degradation)

#### Step 1.2: Create `useGraphDrivenPage` composable

**File:** `app/composables/useGraphDrivenPage.ts`

```typescript
interface UseGraphDrivenPageOptions {
  routePath: string;
  facilityId?: string;
}

interface UseGraphDrivenPageReturn {
  pageConfig: ComputedRef<DerivedPageConfig | null>;
  items: Ref<any[]>;
  loading: Ref<boolean>;
  browseState: ReturnType<typeof useBrowse>;
  viewModeOptions: ComputedRef<ViewModeOption[]>;

  // Actions
  openDetail: (item: any) => void;
  createItem: () => Promise<void>;
}
```

#### Step 1.3: Enhance JSON-LD with ECMS types

**File:** `app/config/app-config.jsonld`

Add these entity type definitions:

- `type:FacilityTask` (extends `type:Task` with ECMS-specific fields)
- `type:TaskGenerator` (scheduled/recurring tasks)
- `type:TaskTemplate` (reusable blueprints)
- `type:Permit` (with conditions, expiry, etc.)
- `type:PermitCondition`
- `type:Folder`

### Phase 2: Refactor Pages (Week 2)

#### Step 2.1: Refactor `[...path].vue`

Transform from placeholder to universal renderer:

```vue
<script setup lang="ts">
  const route = useRoute();
  const { currentFacility } = useFacilities();

  const routePath = computed(() => `/facility${facilityPath.value}`);

  const { pageConfig, items, loading, browseState, viewModeOptions } =
    useGraphDrivenPage({
      routePath: routePath.value,
      facilityId: currentFacility.value?.id,
    });
</script>

<template>
  <Page
    v-if="pageConfig"
    v-bind="pageConfigToPageProps(pageConfig)"
    :browse="browseState"
  >
    <component
      :is="getViewComponent(browseState.viewMode.value)"
      :items="items"
      :schema="pageConfig.schema"
    />
  </Page>
  <PageNotFound v-else :path="routePath" />
</template>
```

#### Step 2.2: Refactor `tasks.vue`

Before (578 lines with hardcoded data):

```vue
const tasks = ref([ { id: '1', title: 'Submit air permit renewal', ... }, // ...
20 hardcoded tasks ])
```

After (~100 lines):

```vue
<script setup lang="ts">
  const { currentFacility } = useFacilities();

  const {
    items: tasks,
    loading,
    schema,
  } = useFacilityEntities({
    facilityId: currentFacility.value?.id ?? '',
    entityType: 'task',
  });

  const { browseState, filteredItems } = useBrowse({
    items: tasks,
    searchFields: ['title', 'assignee'],
    // ... config derived from schema
  });
</script>
```

### Phase 3: Data Layer Integration (Week 3)

#### Step 3.1: InstantDB schema for ECMS entities

Add to `instant.schema.ts`:

```typescript
const ecmsTasks = i.entity('ecmsTasks', {
  facilityId: i.string().indexed(),
  title: i.string(),
  status: i.string(),
  dueDate: i.number().optional(),
  assignee: i.string().optional(),
  priority: i.string().optional(),
  // ... other fields from type:Task schema
});
```

#### Step 3.2: Seed data migration utility

Create `scripts/migrate-ecms-seed-to-instantdb.ts`:

- Read from `ecmsSeedData.json`
- Transform to InstantDB format
- Upsert to InstantDB
- Idempotent (can run multiple times)

---

## Entity Type Mappings

| Route Path                      | Entity Type         | JSON-LD Type             | Data Source              |
| ------------------------------- | ------------------- | ------------------------ | ------------------------ |
| `/facility/tasks`               | `task`              | `type:Task`              | `ecmsTasks`              |
| `/facility/scheduled-tasks`     | `taskGenerator`     | `type:TaskGenerator`     | `ecmsTaskGenerators`     |
| `/facility/suggested-tasks`     | `externalTask`      | `type:ExternalTask`      | `ecmsExternalTasks`      |
| `/facility/templates`           | `taskTemplate`      | `type:TaskTemplate`      | `ecmsTaskTemplates`      |
| `/facility/folders`             | `folder`            | `type:Folder`            | `ecmsFolders`            |
| `/facility/permit-indexing`     | `permit`            | `type:Permit`            | `ecmsPermits`            |
| `/facility/permit-applications` | `permitApplication` | `type:PermitApplication` | `ecmsPermitApplications` |

---

## Acceptance Criteria

### Phase 1 Complete When:

- [ ] `useFacilityEntities` returns typed data for `entityType: 'task'`
- [ ] `useGraphDrivenPage` combines config + data + browse state
- [ ] JSON-LD has `type:FacilityTask` with all ECMS task fields

### Phase 2 Complete When:

- [ ] `tasks.vue` has zero hardcoded mock data
- [ ] `[...path].vue` renders `/facility/tasks` correctly
- [ ] View switching (table/kanban/calendar) works from graph config

### Phase 3 Complete When:

- [ ] ECMS entities persist to InstantDB
- [ ] Changes sync across sessions
- [ ] Seed data migration script works

---

## Risk Mitigation

| Risk                            | Mitigation                                      |
| ------------------------------- | ----------------------------------------------- |
| Breaking existing pages         | Keep old pages working until new pattern proven |
| Performance with large datasets | Pagination built into `useFacilityEntities`     |
| Schema drift                    | Validate JSON-LD on app startup                 |
| InstantDB schema changes        | Migration scripts with versioning               |

---

## Open Questions

1. **Authentication scope:** Should facility-scoped data filter by user permissions?
2. **Offline support:** Do we need local-first with sync, or online-only?
3. **Real ECMS integration:** When/how do we connect to production ECMS API?

---

## Next Steps

1. Review and approve this plan
2. Create `useFacilityEntities.ts` composable
3. Enhance JSON-LD with ECMS types
4. Refactor `tasks.vue` as proof-of-concept
5. Expand to other facility pages
