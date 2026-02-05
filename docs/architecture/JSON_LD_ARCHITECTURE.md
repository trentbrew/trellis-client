# JSON-LD Architecture & Layer Boundaries

**Status:** Phase 1 Complete (Type Extensions)
**Date:** 2024-12-23

## Core Principle: Turtles Go Down, Not Up

The app **contains** a JSON-LD system, it's not **built from** one. This prevents the meta-circular "turtles all the way down" trap.

```
[App Shell - Code]           ← Not turtles (static routes, nav)
    ↓
[Collections - Config]       ← Turtles start here (@context, schema)
    ↓
[Projections - Config]       ← Turtles (views over data)
    ↓
[Records - Data]             ← Turtles all the way down
```

## Layer Boundaries

### Code Layer (Nuxt App Shell)

**What it contains:**

- Routing (`/welcome`, `/settings`, `/collections`)
- Navigation chrome (IconRail, AppHeader, AppSidebar)
- Auth boundaries and middleware
- System settings persistence

**Where it lives:**

- `app/config/routes.ts` - Route definitions
- `app/components/App*.vue` - Shell components
- `app/middleware/` - Auth and navigation guards

**Storage:** Code (version controlled)

---

### Config Layer (JSON-LD Semantic)

**What it contains:**

- Collection schemas (`@context`, `@type`)
- Projection templates (card layouts, graph configs, dashboard compositions)
- View definitions (filters, sorts, groups)
- Semantic relationships between collections

**Where it lives:**

- `Collection.context` - JSON-LD @context URL or inline definition
- `Collection.ldType` - JSON-LD @type (e.g., 'schema:Dataset')
- `DatabaseSchema.projections[]` - How to render collection data

**Storage:** InstantDB `settings` table with `entityType: 'collection'`

---

### Data Layer (User Content)

**What it contains:**

- User-created collection instances
- DatabaseRecords with field values
- Relationships, files, metadata

**Where it lives:**

- InstantDB `collections` entity
- Future: `records` entity for user data

**Storage:** InstantDB operational store

---

## Settings vs. Builder: The Mental Model

### Settings Page (`/settings`)

**Purpose:** System-wide preferences
**Questions it answers:**

- "How does my workspace look/behave?"
- "What theme am I using?"
- "What notifications do I receive?"

**Examples:**

- Appearance settings
- Theme customization
- Profile configuration
- Rail navigation preferences

**Access pattern:** Section in main nav with sidebar links

---

### Builder Tools (Modals)

**Purpose:** Collection-specific configuration
**Questions it answers:**

- "What does this specific collection _do_?"
- "What fields does it have?"
- "How should its data be displayed?"

**Examples:**

- Schema editor (field definitions)
- Projection config (card templates, graph layouts)
- View filters and sorts
- Collection metadata (@context, @type)

**Access pattern:** Context-specific modals triggered from within collections

**Implementation:** `SchemaEditorModal.vue` (existing pattern to extend)

---

## Phase 1 Implementation (Complete)

### Type Extensions

**Collection Interface** (`types/database.ts:36-54`):

```typescript
export interface Collection {
  // ... existing operational fields ...

  // JSON-LD semantic layer (optional)
  context?: string | object; // @context URL or inline definition
  ldType?: string; // JSON-LD @type (e.g., 'schema:Dataset', 'dcat:Catalog')
}
```

**DatabaseSchema Interface** (`types/database.ts:56-64`):

```typescript
export interface DatabaseSchema {
  // ... existing fields ...
  projections?: Projection[]; // How to render this collection's data
}
```

**New Types** (`types/database.ts:128-187`):

- `ProjectionType` - Union type for projection variants
- `Projection` - Projection definition with config and query
- `ProjectionConfig` - Type-specific rendering configuration
- `QueryConfig` - Semantic query filters (datalog/SPARQL-like)
- `QueryCondition` - Individual query conditions

### Backward Compatibility

✅ **All new fields are optional** - No breaking changes to existing code
✅ **Existing CRUD uses `Partial<>`** - Spread operators handle new fields gracefully
✅ **No dependencies on new fields** - Pure additive changes

---

## Phase 2 Roadmap (Next Steps)

### 1. Extend SchemaEditorModal

Add "Projections" tab to existing schema editor:

- Visual builder for card templates
- Graph layout configuration
- Dashboard composition tools
- Store alongside schema in `settings` table

### 2. Projection Renderers

Implement rendering components:

- `ProjectionCardGrid.vue` - Card-based layouts
- `ProjectionSankey.vue` - Flow diagrams
- `ProjectionGraph.vue` - Network visualizations
- `ProjectionTimeline.vue` - Temporal views

### 3. Collection Page Integration

Update `pages/collections/[slug].vue`:

- Load projections from schema
- Render default projection
- Projection switcher UI
- Edit projection button → opens SchemaEditorModal

---

## Phase 3 Roadmap (Future)

### Semantic Query Layer

Create `composables/useSemanticQuery.ts`:

- Translate JSON-LD-aware queries to InstantDB datalog
- Map semantic field names to operational fields
- Support graph traversals and joins

### Federation Support

Enable portable collections:

- **Export:** Collection → JSON-LD document (includes @context, schema, projections)
- **Import:** JSON-LD document → Collection + DatabaseSchema in InstantDB
- **Sync:** Bidirectional federation between instances

### Query Language

Implement semantic query capabilities:

- SPARQL-like graph queries
- Datalog-style rules
- JSON-LD framing for projections

---

## InstantDB + JSON-LD Strategy

### Persistence Layer: InstantDB

- Operational storage (fast, reactive, local-first)
- CRUD operations
- Real-time sync

### Semantic Layer: JSON-LD

- Portable schemas (federated)
- Rich context (linked data)
- Query flexibility (SPARQL/datalog)

### Translation Pattern

```typescript
// Semantic query (user-facing)
const semanticQuery: QueryConfig = {
  where: [{ field: 'schema:name', operator: 'contains', value: 'John' }],
};

// Translated to InstantDB (internal)
const instantQuery = {
  collections: {
    $: {
      where: {
        title: { $contains: 'John' }, // Mapped via @context
      },
    },
  },
};
```

---

## Key Architectural Decisions

### ✅ DO

- Store `@context` + `ldType` on Collection entities (self-describing)
- Store projections in DatabaseSchema (builder config, not system config)
- Keep Settings as code-driven system config
- Use modal-based builder tools (context-specific)
- Keep app shell as code (routes, nav, auth)

### ❌ DON'T

- Make routing/nav JSON-LD-configurable (circular dependency)
- Store system preferences (theme, appearance) in JSON-LD
- Generate app shell from config (meta-circular trap)
- Mix builder tools into Settings page (wrong mental model)

---

## Example: Creating a Semantic Collection

```typescript
// 1. User creates a collection (existing flow)
await createCollection({
  appId: currentApp.id,
  title: 'Research Papers',
  type: 'database',
  slug: 'research-papers',

  // 2. NEW: Add JSON-LD context
  context: {
    '@vocab': 'https://schema.org/',
    dct: 'http://purl.org/dc/terms/',
    title: 'name',
    author: 'creator',
    publishedDate: { '@id': 'datePublished', '@type': 'Date' },
  },
  ldType: 'schema:ScholarlyArticle',
});

// 3. Define schema with projections (modal-based builder)
const schema: DatabaseSchema = {
  fields: [
    { id: '1', name: 'title', type: 'text', required: true },
    { id: '2', name: 'author', type: 'text', required: true },
    { id: '3', name: 'publishedDate', type: 'date', required: false },
  ],
  views: [{ id: '1', name: 'All Papers', type: 'table', isDefault: true }],

  // 4. NEW: Add projections
  projections: [
    {
      id: '1',
      type: 'card-grid',
      name: 'Paper Cards',
      config: {
        cardTemplate: '<h3>{{title}}</h3><p>by {{author}}</p>',
        columns: 3,
        spacing: 'comfortable',
      },
      isDefault: true,
    },
    {
      id: '2',
      type: 'timeline',
      name: 'Publication Timeline',
      config: {
        dateField: 'publishedDate',
        labelField: 'title',
      },
    },
  ],
};
```

---

## Migration Path

**Phase 1** (✅ Complete):

- Type extensions (non-breaking)
- Foundation for semantic layer

**Phase 2** (In Progress):

- Builder UI enhancements
- Projection renderers
- Collection page integration

**Phase 3** (Future):

- Semantic query engine
- Federation protocol
- Import/export flows

**No breaking changes** - All phases are backward compatible
