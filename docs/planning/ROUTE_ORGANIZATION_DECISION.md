# Route Organization & UI Pattern Decision Document

**Date:** January 5, 2026  
**Status:** Proposal for Implementation  
**Purpose:** Define consistent UI/UX patterns for navigating major sections and demo effectiveness

---

## Executive Summary

We need to standardize the "Add New + Sidebar List" pattern across all major sections (Collections, Types, Graph, Projections, Workflows) to create a consistent, intuitive navigation experience. This document outlines the architectural approach, rationale, and implementation strategy.

**Key Decision:** Apply the **Collections Pattern** (add new button + dynamic sidebar list) to all major data/schema sections for consistency and demo impact.

---

## Current State Analysis

### Existing Patterns

| Section            | Page Structure                                       | Sidebar                      | Status            | Add Pattern                  |
| ------------------ | ---------------------------------------------------- | ---------------------------- | ----------------- | ---------------------------- |
| **Collections** ✅ | `/collections/index.vue` + `/collections/[slug].vue` | Dynamic list from DB         | Working           | "Create Collection" button   |
| **Types** ⚠️       | `/types/ontology/index.vue` + static children        | Static (hardcoded in routes) | Partial           | No "add" UX                  |
| **Graph** ❌       | `/graph.vue` → redirects to `/graph/visualize`       | None (hardcoded children)    | Hub only          | N/A                          |
| **Projections** ⚠️ | `/projections.vue` → static children                 | None                         | Placeholder       | N/A                          |
| **Workflows** ⚠️   | `/workflows/index.vue` + multiple views              | Feed/Library                 | Different pattern | Works but not sidebar-driven |
| **Reports** ❌     | `/reports.vue`                                       | None                         | Empty placeholder | N/A                          |

### Collections Pattern (Reference Implementation)

**How it works:**

1. User visits `/collections`
2. If collections exist → Shows sidebar with dynamic list + main content area
3. If no collections → Shows empty state with "Create Collection" button
4. Each collection auto-redirects to most-recently visited collection via `lastVisitedKey`
5. Sidebar provides: view, rename, delete, change icon
6. Breadcrumbs auto-generate from route path

**Why it works:**

- Clear navigation affordance
- Dynamic content from database
- One-click "create" in sidebar header
- Context awareness (remembers last visited)
- Scalable to hundreds of items

---

## Proposed Unified Pattern

### Pattern: "Dynamic Sidebar" Architecture

All major sections should follow this structure:

```
/section/index.vue                  # Hub/overview page
  ├── Sidebar (dynamic list)         # Items from database/config
  ├── "Add New" button in sidebar    # Create new item
  └── Main content area              # Current item details

/section/[id-or-slug].vue           # Detail page (optional, depends on section)
```

### Application by Section

#### 1. **Collections** (✅ Already Done)

- **Current:** Working perfectly
- **File Structure:**
  - `/collections/index.vue` - Hub with sidebar + empty state
  - `/collections/[slug].vue` - Collection detail page
  - `CollectionList.vue` - Sidebar component
  - `CollectionCreateModal.vue` - Create modal
- **Sidebar Features:**
  - List all collections (from InstantDB)
  - Pin/unpin to rail
  - Rename via inline prompt
  - Delete with confirmation
  - Change icon

---

#### 2. **Types** (Currently Disconnected)

- **Goal:** Make Types feel as discoverable and manageable as Collections

- **Proposed File Structure:**

  ```
  /types/index.vue                    # Hub page (NEW)
  /types/[type-id].vue                # Type editor (NEW)
  /types/ontology/index.vue           # Pre-built system types (EXISTING)
  /types/presets.vue                  # Reusable field sets (EXISTING)
  /types/field-types.vue              # Custom field types (EXISTING)

  Components:
  - TypeList.vue                      # Sidebar component (NEW)
  - TypeCreateModal.vue               # Create/edit modal (NEW)
  ```

- **Data Model Assumptions:**
  - Types stored in Instant.db `types` collection
  - Each type has: `id`, `name`, `icon`, `description`, `fields[]`
  - System types vs. custom types (different tabs/sections)

- **UX Flow:**
  1. Visit `/types` → redirects to `/types/ontology` (system types hub)
  2. Sidebar shows "Custom Types" section
  3. Click "Add Custom Type" → `TypeCreateModal` opens
  4. Can also browse System Types in tabs/sub-navigation

---

#### 3. **Graph** (Currently Minimal)

- **Current Problem:** Just a redirect hub; no real content navigation

- **Proposed Structure:**

  ```
  /graph/index.vue                    # Hub page (REPLACE current /graph.vue)
  /graph/[graph-id].vue               # Specific graph view (NEW)

  Sub-sections (keep as is):
  /graph/visualize/index.vue          # Force-directed visualization
  /graph/query/index.vue              # TQL Playground
  /graph/stats/index.vue              # Statistics/metrics

  Components:
  - GraphList.vue                     # Sidebar: saved graphs (NEW)
  - GraphCreateModal.vue              # Create/save graph (NEW)
  ```

- **Data Model:**
  - Store "saved graphs" in Instant.db `graphs` collection
  - Each graph has: `id`, `name`, `filters`, `layout`, `zoom`, `pan`, `created`
  - Distinguish from graph **views** (visualize, query, stats)

- **Dual Navigation:**
  - **Left Sidebar:** Saved graph instances (what user saved)
  - **Tab Navigation:** Graph tools (Visualization, TQL Playground, Statistics)

---

#### 4. **Projections** (Query/View Layer)

- **Current Problem:** Placeholder only; `/projections.vue` is empty

- **Proposed Structure:**

  ```
  /projections/index.vue              # Hub page (ENHANCE)
  /projections/[projection-id].vue    # View editor/explorer (NEW)

  Organization Tabs:
  /projections/starred                # Favorite views
  /projections/by-collection          # Grouped by source
  /projections/by-type                # Grouped by view type (table, kanban, etc)

  Components:
  - ProjectionList.vue                # Sidebar: all projections (NEW)
  - ProjectionCreateModal.vue         # Create view modal (NEW)
  ```

- **Data Model:**
  - `projections` collection: `id`, `name`, `sourceCollection`, `type`, `filters`, `sort`, `viewConfig`
  - Support: Table, Kanban, Grid, Timeline, Calendar views
  - Sync with collection schema changes

- **UX Innovation:**
  - "Quick View" button on each collection → auto-creates projection
  - Projection templates for common patterns
  - Star/unstar for quick access

---

#### 5. **Workflows** (Already Has Pattern)

- **Current Status:** Works but different from Collections pattern
- **Existing Structure:**

  ```
  /workflows/index.vue                # Feed view (hub)
  /workflows/new.vue                  # Create workflow
  /workflows/builder.vue              # Visual builder
  /workflows/library.vue              # Template library
  /workflows/feed.vue                 # Activity feed
  ```

- **Decision:** Keep current structure BUT add sidebar option:
  - Option A: Enhance with sidebar list of user workflows
  - Option B: Keep as-is (different pattern is OK for automation)
  - **Recommendation:** Option A for consistency

---

#### 6. **Reports** (Placeholder)

- **Status:** Empty placeholder
- **Proposed Structure:**

  ```
  /reports/index.vue                  # Hub (currently empty)
  /reports/[report-id].vue            # Report editor (NEW)

  Components:
  - ReportList.vue                    # Sidebar: saved reports
  - ReportCreateModal.vue             # Create/edit report
  - ReportPreview.vue                 # Print/export preview
  ```

- **Data Model:**
  - `reports` collection: `id`, `name`, `template`, `datasource`, `format`, `recipients`
  - Support templates: PDF, HTML, Email, Slack

---

## Demo & Showcase Value

### Why This Pattern Matters for Demos

#### 1. **Collections Demo** (Data Foundation)

- Show how to quickly create a collection
- Import sample data (JSON-LD schema)
- Demonstrate type inference

#### 2. **Types Demo** (Schema/Ontology)

- Create custom type extending system types
- Build relationships between types
- Show validation rules

#### 3. **Projections Demo** (Query Power)

- Create multiple views of same collection
- Show TQL expressions
- Demonstrate filtering, sorting, grouping
- **KEY DEMO MOMENT:** Show how one collection can have infinite views

#### 4. **Graph Demo** (Semantic Power)

- Save graph snapshots with specific filters/zoom
- Show relationship discovery
- **KEY DEMO MOMENT:** Visual proof of TQL queries in action
- Demonstrate cross-collection relationships

#### 5. **End-to-End Scenario**

- Create Collection (with data)
- Define Types/Schema
- Build Projections (different views)
- Query with TQL
- Visualize in Graph
- **Story:** Show complete data workflow in 10 minutes

---

## Technical Implementation Details

### Route Configuration Changes

#### Current routes.ts Structure

```typescript
routeConfig: RouteConfig[] = [
  {
    path: '/collections',
    label: 'Collections',
    icon: 'lucide:database',
    inRail: true,
    railPosition: 'primary',
    children: []  // STATIC IN CONFIG (but populated dynamically in useRoutes.ts)
  },
  ...
]
```

#### Changes Needed

**For Collections-like sections (Types, Graph, Projections, Workflows):**

1. **Add `loadChildren` function** to route config:

   ```typescript
   {
     path: '/types',
     label: 'Types',
     loadChildren: () => Promise<RouteConfig[]>  // NEW
   }
   ```

2. **Create composable for each section:**

   ```typescript
   // composables/useTypesList.ts
   export const useTypesList = () => {
     const { customTypes } = useInstantData(); // or useTypeStore()
     return computed(() =>
       customTypes.value.map((type) => ({
         path: `/types/${type.id}`,
         label: type.name,
         icon: type.icon,
       })),
     );
   };
   ```

3. **Update useRoutes.ts:**
   - Add section-specific children generators (like `collectionsChildren`)
   - Merge dynamic children into final route tree
   - Update sidebar rendering logic

4. **Pattern in useRoutes.ts:**

   ```typescript
   // EXISTING
   const collectionsChildren = computed<RouteConfig[]>(() => {
     if (!instantCollections.value) return []
     return instantCollections.value.map(col => ({...}))
   })

   // NEW - follow same pattern
   const typesChildren = computed<RouteConfig[]>(() => {
     if (!customTypes.value) return []
     return customTypes.value.map(type => ({...}))
   })

   const graphsChildren = computed<RouteConfig[]>(() => {
     if (!savedGraphs.value) return []
     return savedGraphs.value.map(graph => ({...}))
   })
   ```

### Page Component Changes

#### Hub Pages (index.vue)

Each hub needs to:

1. Check if items exist (empty state)
2. Redirect to first item if none selected
3. Remember last visited (localStorage key)
4. Provide sidebar + content area via Page slots

```vue
<script setup lang="ts">
  const { items, create, update, delete: deleteItem } = useSection();
  const isCreating = ref(false);

  const lastVisitedKey = computed(() => {
    // Generate unique key per workspace
  });

  const redirectToLastVisited = async () => {
    // Redirect on mount if no item selected
  };

  watch(
    [items, route.path],
    () => {
      void redirectToLastVisited();
    },
    { immediate: true },
  );
</script>

<template>
  <Page
    :title="title"
    :subtitle="subtitle"
    :fill-height="true"
    :full-width="true"
  >
    <template v-if="items.length > 0" #sidebar>
      <SectionSidebar
        :items="items"
        @create="isCreating = true"
        @delete="deleteItem"
      />
    </template>

    <div
      v-if="items.length === 0"
      class="flex items-center justify-center h-full"
    >
      <!-- Empty state with create button -->
    </div>

    <div v-else class="flex items-center justify-center h-full">
      <!-- Default content or message -->
    </div>

    <SectionCreateModal v-model:open="isCreating" />
  </Page>
</template>
```

#### Detail Pages ([id].vue)

```vue
<script setup lang="ts">
  const route = useRoute();
  const id = route.params.id as string;
  const { item, update } = useSection(id);

  // Page content for editing/viewing specific item
</script>

<template>
  <Page :title="item?.name" :show-back-button="true">
    <!-- Detail view content -->
  </Page>
</template>
```

---

## Navigation & Breadcrumb Strategy

### Breadcrumb Generation

Current implementation already supports dynamic breadcrumbs in `getBreadcrumbs()` function. This will automatically work once routes are properly configured.

**Example breadcrumbs:**

- `/collections/users/profile` → Collections > Users > Profile
- `/types/custom-types/person` → Types > Custom Types > Person
- `/graph/sales-network/visualize` → Graph > Sales Network > Visualize

### Sidebar Context Switching

The existing `AppSidebar.vue` uses `routes.currentSectionLinks` to determine what to show. With proper route configuration, it will automatically switch sidebar content based on current section.

---

## Data Models & Database Schema

### InstantDB Collections Needed

```typescript
// Collections (already exists)
db.collections = {
  id: string
  title: string
  slug: string
  description: string
  icon: string
  fields: FieldDefinition[]
  createdAt: number
  updatedAt: number
}

// Types (custom types, not the system ontology)
db.types = {
  id: string
  name: string
  description: string
  icon: string
  extends?: string  // system type it extends
  fields: FieldDefinition[]
  isSystem: boolean
  createdAt: number
  updatedAt: number
}

// Graphs (saved graph views/snapshots)
db.graphs = {
  id: string
  name: string
  description: string
  filters?: TQLExpression
  layout?: { zoom: number, pan: Point, algorithm: string }
  createdAt: number
  updatedAt: number
}

// Projections (saved views/queries)
db.projections = {
  id: string
  name: string
  description: string
  sourceCollection: string  // collection ID
  type: 'table' | 'kanban' | 'grid' | 'calendar' | 'timeline'
  filters: TQLExpression[]
  sort: { field: string, direction: 'asc' | 'desc' }[]
  viewConfig: { columns?, groupBy?, etc }
  starred: boolean
  createdAt: number
  updatedAt: number
}

// Workflows (already has different structure)
db.workflows = {
  id: string
  name: string
  // ... existing workflow config
}

// Reports (future)
db.reports = {
  id: string
  name: string
  templateId: string
  datasourceId: string
  // ... report config
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

- [ ] Create data models in Instant.db schema
- [ ] Add `loadChildren` function to route config
- [ ] Update `useRoutes.ts` with dynamic children generators
- [ ] Test route generation

### Phase 2: Collections Validation (Week 1-2)

- [ ] Verify existing collections pattern works with new route config
- [ ] Update AppSidebar to handle dynamic collections
- [ ] Test sidebar rendering and interactions

### Phase 3: Types Section (Week 2)

- [ ] Create `/types/index.vue` hub
- [ ] Create `/types/[type-id].vue` detail page
- [ ] Create `TypeList.vue` sidebar
- [ ] Create `TypeCreateModal.vue`
- [ ] Implement type creation flow
- [ ] Test sidebar redirection

### Phase 4: Graph Section (Week 2-3)

- [ ] Create `/graph/index.vue` hub
- [ ] Create `GraphList.vue` sidebar
- [ ] Create `GraphCreateModal.vue`
- [ ] Integrate with visualize/query/stats sub-pages
- [ ] Test graph saving/loading

### Phase 5: Projections Section (Week 3)

- [ ] Create `/projections/index.vue` hub
- [ ] Create `/projections/[projection-id].vue` detail
- [ ] Create `ProjectionList.vue` sidebar
- [ ] Create `ProjectionCreateModal.vue`
- [ ] Integrate with TQL playground
- [ ] Test view creation and filters

### Phase 6: Polish & Demo Prep (Week 3-4)

- [ ] Create end-to-end demo script
- [ ] Test all sections work together
- [ ] Optimize performance (sidebar rendering, route matching)
- [ ] Add helpful empty states
- [ ] Create tutorial/walkthrough

---

## Success Criteria

✅ **Consistency:** All major sections (Collections, Types, Graph, Projections) use same sidebar pattern  
✅ **Discoverability:** Users can easily create and find items in each section  
✅ **Performance:** Sidebar renders smoothly with 100+ items  
✅ **Demo Worthy:** Can tell complete data story in 10-minute demo  
✅ **Type Safety:** Routes are fully typed and validated  
✅ **Accessibility:** Keyboard navigation works in all sidebars  
✅ **Mobile Friendly:** Sidebar is responsive/collapsible on mobile

---

## Risk Mitigation

| Risk                                 | Probability | Impact | Mitigation                                            |
| ------------------------------------ | ----------- | ------ | ----------------------------------------------------- |
| Route config becomes too large       | High        | Medium | Lazy-load routes dynamically, cache computed children |
| Sidebar rendering performance        | Medium      | Medium | Virtual scrolling for large lists, memoization        |
| Data sync issues                     | Low         | High   | Use optimistic updates, add offline queue             |
| Type/Graph/Projection models unclear | Medium      | High   | Define schemas early, get stakeholder buy-in          |
| Breaking existing functionality      | High        | High   | Test thoroughly, keep feature flags for rollback      |

---

## Questions for Stakeholder Review

1. **Data Models:** Are the proposed InstantDB schemas aligned with your TQL data layer?
2. **Scope:** Should all 6 sections be implemented, or prioritize Collections > Types > Projections > Graph?
3. **Workflows:** Keep different sidebar pattern for automation, or force consistency?
4. **Demo Focus:** What's the primary story we want to tell? (data layer → schema → queries → visualization?)
5. **Timeline:** What's the target completion date?

---

## Appendix: Reference Documentation

### Collections Pattern Details

**Files Involved:**

- `app/pages/collections/index.vue` - Hub with sidebar + empty state
- `app/pages/collections/[slug].vue` - Collection detail/editor
- `app/components/CollectionList.vue` - Sidebar list component
- `app/components/CollectionCreateModal.vue` - Create dialog
- `app/config/routes.ts` - Route definitions
- `app/composables/useRoutes.ts` - Dynamic route generation
- `app/composables/useInstantData.ts` - Data fetching

**Key Features:**

1. Dynamic sidebar from InstantDB
2. "Create Collection" button in sidebar header
3. Last-visited tracking via localStorage
4. Rename, delete, icon change on hover
5. Auto-redirect to first collection on empty
6. Pin/unpin to rail navigation
7. Breadcrumb auto-generation

**Why It Works:**

- Single source of truth (InstantDB)
- One-click creation without modal complexity
- Visual context (icon + label)
- Progressive disclosure (more options on hover)
- Scales to hundreds of items

---

## Next Steps

1. **Review this document** with stakeholders
2. **Approve proposed architecture** and scope
3. **Define exact data models** for Types, Graph, Projections
4. **Begin Phase 1 implementation** (route config updates)
5. **Test Collections pattern** with new config
6. **Proceed with Types section** as template for others

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2026  
**Author:** AI Assistant  
**Status:** Ready for Review
