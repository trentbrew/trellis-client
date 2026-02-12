
25m

is @useGraphDrivenPage.ts still neccessary considering it was meant for the deprecated ecms app?

Let me check the file and its consumers to answer this properly.

Let me check the only real consumer:

Yes, it's vestigial ECMS infrastructure. Here's the breakdown:

Evidence it's ECMS-only
ROUTE_ENTITY_MAP maps exclusively /facility/* paths (lines 16–23)
useFacilityEntities — the data source is ECMS-specific (line 151)
facilityId parameter baked into the interface (line 47)
Hard-coded ECMS status filters — overdue, due-soon, on-track, completed (lines 221–246)
Only consumer
The sole real consumer is [...path].vue — which is itself the ECMS catch-all route (references currentFacility, currentOrganization, useYear(), etc.).

What replaced it
All workspace pages (/workspace/tasks, /workspace/today, /calendar, /documents, etc.) use their own composables:

useCalendarItems for data
useBrowse for search/filter/sort/view modes
useOntologyRegistry for type resolution
Verdict
Both useGraphDrivenPage.ts and pages/[workspace]/[app]/[...path].vue are safe to remove if you're done with ECMS. They share no data paths with the workspace/personal pages.

That's a good instinct. There's a clear pattern across your browse pages that a repurposed composable could absorb. Let me check the current boilerplate to see exactly what's repeated.

Let me sample a few pages to see the exact boilerplate pattern:

Here's what the pattern looks like across your browse pages — the boilerplate is nearly identical:

Repeated ~50 lines per page
Concern	notes.vue	bookmarks.vue	people.vue
useCalendarItems() + filter by type	✅	✅	✅
useBrowse() with search/sort/filters	✅	✅	✅
Stats computation	✅	✅	✅
Dialog state (createOpen, viewOpen, viewingItem)	✅	✅	✅
Nav prev/next logic	✅ (identical)	✅ (identical)	✅ (identical)
handleCreate/handleUpdate/handleDelete	✅ (identical)	✅ (identical)	✅ (identical)
Repurposed composable shape
A rewritten useGraphDrivenPage could collapse all of this into:

ts
const page = useGraphDrivenPage({
  entityType: 'note',                    // drives filter, search fields, projections, stats
  defaultViewMode: 'grid',               // override registry default
  filters: [/* optional extra filters */],
})
// Returns: items, filteredItems, browseState, viewMode, stats,
//          dialogOpen, dialogMode, dialogItem, canPrev, canNext,
//          openDetail, createItem, navPrev, navNext,
//          handleCreate, handleUpdate, handleDelete
Each page would shrink from ~120 lines of script to ~10 lines, keeping only the template (which is the truly unique part per page — grid cards, list rows, etc.).

What changes
Data source: useCalendarItems() instead of useFacilityEntities()
Type resolution: Entity registry / ontology registry (already there)
No facilityId — gone
No /facility/* route map — gone
Stats: Derived from registry metadata (icon, color) + common aggregations (total, pinned, by-category)
Good call. Let me re-scan the current state of the codebase to see what's actually there now before proposing anything.

Analyzed
apps/web/app/pages
Analyzed
apps/web/app/composables
Let me check the current state of key files that have likely changed:

Analyzed
apps/web/app/pages/workspace
Let me check more of the current page patterns and see what's actually being imported/used:

Analyzed
apps/web/app/pages/[workspace]
Analyzed
apps/web/app/pages/[workspace]/[app]
Let me check the current state of the catch-all page and see what else references ECMS patterns:

Now I have the full picture. Let me summarize what's actually going on:

Current state
useGraphDrivenPage.ts — unchanged from what I read earlier. Still ECMS-only (/facility/* routes, useFacilityEntities, facilityId).

Its only consumer — pages/[workspace]/[app]/[...path].vue — also unchanged, still fully ECMS (references currentFacility, currentOrganization, useYear()).

ECMS shims still exist — useFacilityEntities.ts, useFacilities.ts, useEcmsData.ts are all deprecated re-exports pointing to verticals/ecms/. The actual ECMS vertical is still there with its own pages.

All workspace pages — identical pattern to what I showed before. Every browse page (notes, bookmarks, people, projects, tasks, etc.) independently does:

useCalendarItems() + filter by type
useBrowse() with search/sort/filters
Stats computation
Dialog state boilerplate (create/view refs, nav prev/next, CRUD handlers)
Data layer — useCalendarItems() now delegates to useTrellisCalendarItems() (TQL graph API), not instant-local. Same API surface.

New composable — useDetailDialog.ts exists as a generic schema-driven dialog state manager, but the browse pages aren't using it yet — they still roll their own dialog state.

Revised assessment
The repurposing idea still makes sense and the plan I outlined is still accurate. The boilerplate across ~12 workspace browse pages is identical. A repurposed useGraphDrivenPage could:

Source: useCalendarItems() + type filter (replaces useFacilityEntities)
Browse: useBrowse() with entity-registry-derived search fields, projections, default view mode
Dialog: Encapsulate the repeated createOpen/viewOpen/viewingItem/nav/CRUD pattern (or leverage useDetailDialog)
Stats: Auto-derive from entity registry metadata
No ECMS concepts: No facilityId, no /facility/* routes
The [workspace]/[app]/* pages are a separate question — they're the ECMS catch-all and could be deleted independently or kept for the ECMS vertical.

=================================


Custom Page Views
Upgrade custom pages from hardcoded table to the full browse system, and introduce page types so not all pages are forced into data-view mode.

Problem
[pageId].vue uses variant="canvas" with a hardcoded <table> — it ignores the browse toolbar, view switcher, search, filters, sort, and projection system that entity pages (tasks.vue, notes.vue) already use. Meanwhile, the CreatePageDialog assumes all pages are data views.

UX Design: Page Types
Not all pages are data views. Introduce a page type as the first decision point:

Type	Page.vue Variant	What it does
Data View	browse	Entity data + projections (table, kanban, calendar, grid, list)
Document	prose	Rich text content — wiki page, meeting notes, spec
Dashboard	default	Widgets, stats, charts (future)
Freeform	canvas	Custom layout, whiteboard (future)
CreatePageDialog Changes
Add a page type picker as the first step (icon cards). The rest of the form adapts:

Data View → Title, Data Source, Default View (existing fields)
Document → Title, Icon only (content is the page body)
Dashboard / Freeform → Title, Icon only (shown as "coming soon" for v1)
Progressive Disclosure (Hick's Law)
Don't show irrelevant options. Data Source and Default View only appear for Data View pages. Document pages skip straight to creation. This reduces cognitive load and makes the dialog feel purpose-built for each type.

Implementation Plan
Phase 1: Upgrade Data View pages (immediate)
Goal: Custom pages with pageType: 'data' use variant="browse" with full toolbar.

usePages.ts — Add pageType field to PageConfig: 'data' | 'document' | 'dashboard' | 'canvas' (default: 'data')
[pageId].vue — Rewrite to branch on pageType:
data → variant="browse" with useBrowse, view switcher, search, filters, sort
document → variant="prose" with rich text editor slot (placeholder for now)
Others → appropriate variant with placeholder
Data View rendering — Use the entity registry to resolve:
View mode options from getEntityConfig(dataSource).projections → buildViewModeOptions()
Default view from getEntityConfig(dataSource).defaultProjection or pageConfig.defaultProjection
Search fields from getEntityConfig(dataSource).searchFields
Filters from entity type (status, priority, category — type-aware)
View mode persistence — Store active view mode per page in PageConfig so it survives navigation
Phase 2: CreatePageDialog update
Page type picker — Four icon cards at top of dialog. Only Data View and Document are enabled for v1.
Conditional form — Data Source + Default View fields hidden when type ≠ 'data'
Document creation — Creates page with pageType: 'document', navigates to it. The page renders a prose editor.
Phase 3: View content per mode (stretch)
#content slot rendering per view mode in [pageId].vue:
table → Reuse existing table or TableView component
list → List layout with entity cards
grid → Card grid
kanban → BoardView (requires status/select field)
calendar → CalendarView (requires date field)
Files to Change
File	Change
composables/usePages.ts	Add pageType to PageConfig
pages/workspace/pages/[pageId].vue	Branch on pageType, upgrade data → browse variant
components/dialogs/CreatePageDialog.vue	Page type picker, conditional form
UX Principles Applied
Progressive Disclosure — Page type determines which options appear
Hick's Law — Fewer choices per step = faster decisions
Jakob's Law — Data View pages work like the entity pages users already know
Consistency — Reuse browse toolbar, view switcher, search — same patterns everywhere
Affordance — View mode buttons in toolbar make switching discoverable (no right-click needed)
