# Spec: Browse route import/export

**Issue:** TRL-38  
**Parent:** TRL-37  
**Status:** Spec ready for Executor  
**Scope:** P0 — workspace browse toolbar only (`/workspace/browse`, `/workspace/browse/[entityType]`)

---

## Problem

Browse pages render entities via `ProjectionOutlet` but have **no** bulk import/export. Collections already ship export (CSV/JSON/JSON-LD/XLSX) in `CollectionDataTableProjection.vue`; import is stubbed (`disabled`). `Page.vue` contains unused `_exportToCsv()`.

Users need to export the **current filtered view** and import entity batches without leaving browse.

---

## Architecture

### 1. Shared export lib — `apps/web/app/lib/entity-export.ts`

Extract from `CollectionDataTableProjection` (lines ~166–260):

| Export | Signature |
|--------|-----------|
| `downloadBlob(blob, filename)` | DOM helper |
| `entitiesToExportRows(entities, columnKeys?)` | `Entity[]` → flat `Record<string, unknown>[]` |
| `exportEntities(entities, format, options)` | `format: 'csv' \| 'json' \| 'jsonld' \| 'xlsx'` |
| `defaultEntityExportKeys(entity)` | title, type, id, startDate, updatedAt + scalar data fields |

**Row rules:**

- Serialize objects/arrays as JSON strings in CSV cells
- Skip `body`, `content`, large blobs in CSV (include in JSON/JSON-LD)
- JSON export: full entity objects (strip runtime-only fields if any)
- JSON-LD: `@context` + `trellis:entities` array (mirror collection export shape)
- XLSX: optional P0 — include if trivial after refactor (SheetJS already imported in collections)

**Refactor:** `CollectionDataTableProjection.handleExport` delegates to `exportEntities()` — no duplicated switch/case.

### 2. Shared toolbar component — `BrowseImportExportActions.vue`

Location: `apps/web/app/components/browse/BrowseImportExportActions.vue`

Props:

```ts
{
  items: Entity[]           // filteredItems from browse page
  selectedItems?: Entity[]  // when selectionCount > 0, export selection only
  filenameSlug: string      // e.g. browse-all, browse-task
}
```

UI (match collections toolbar styling — `outline sm`, `lucide:upload` / `lucide:download`):

- **Export** dropdown: CSV, JSON (min); JSON-LD + XLSX if shared lib supports all four
- Export source: `selectedItems.length ? selectedItems : items`
- Disabled when export set is empty
- **Import** button opens `BrowseEntityImportDialog`

### 3. Import dialog — `BrowseEntityImportDialog.vue`

Location: `apps/web/app/components/browse/BrowseEntityImportDialog.vue`

**P0 formats:**

| Format | Shape | Action |
|--------|-------|--------|
| JSON array | `[{ type, title, ...fields }]` | `create()` each via `useEntities` |
| JSON export round-trip | Same array from our export | Same |
| Trellis JSON-LD | `{ trellis:entities: [...] }` or `@graph` with entity nodes | Map to create payloads |

**Not P0:** CSV import, URL import, collection Trellis doc import (`CollectionImportDialog` stays separate).

**Create rules:**

- Require `title` and `type` on each row; default title `"Untitled"` if missing
- Omit `id` on create (server assigns) OR accept explicit id if valid slug
- `agentId`: browser session default (existing graph mutate path)
- Show progress: `N created, M failed` toast; close dialog on success
- On partial failure: list first 3 errors in dialog body

**Validation:** Zod-lite or manual — reject non-array root, empty array, rows without `type`.

### 4. Browse page wiring

Both pages mount `<BrowseImportExportActions>` in `Page` `#filters` slot (left of Properties / sort), **before** New button area:

| File | `filenameSlug` | `items` |
|------|----------------|---------|
| `pages/workspace/browse/index.vue` | `browse-${activeTypeParam}` | `filteredItems` |
| `pages/workspace/browse/[entityType].vue` | `browse-${entityType}` | `filteredItems` |

Pass `selectedItems` from `useBrowseSelection`.

### 5. Cleanup

- Remove `Page.vue` `_exportToCsv()` (dead code) OR replace with `exportEntities` if any page still needs it — grep first
- Do **not** enable collections import button in this wedge (separate issue)

---

## Acceptance criteria (testable)

1. Export dropdown visible on browse toolbar (all + typed routes)
2. Export CSV/JSON downloads file named `{slug}-export.{ext}`
3. Export respects active search/filter/sort (uses `filteredItems`)
4. When items selected, export uses selection only
5. Import dialog creates entities; new items appear in browse via SSE
6. `entity-export.ts` unit test: `entitiesToExportRows` + CSV escaping
7. `CollectionDataTableProjection` uses shared export lib (no duplicate export switch)
8. `pnpm check` passes
9. Vitest: `entity-export.test.ts` green

**E2E (optional P0.5):** `tests/e2e/browse-import-export.spec.ts` — export JSON, re-import, assert count bump. Label `needs-e2e` on spec; executor may defer if timeboxed.

---

## Files touched (expected)

| Action | Path |
|--------|------|
| add | `apps/web/app/lib/entity-export.ts` |
| add | `apps/web/app/lib/entity-export.test.ts` |
| add | `apps/web/app/components/browse/BrowseImportExportActions.vue` |
| add | `apps/web/app/components/browse/BrowseEntityImportDialog.vue` |
| mod | `apps/web/app/components/data/CollectionDataTableProjection.vue` |
| mod | `apps/web/app/pages/workspace/browse/index.vue` |
| mod | `apps/web/app/pages/workspace/browse/[entityType].vue` |
| mod | `apps/web/app/components/layout/Page.vue` (remove dead export) |

---

## Out of scope (P0)

- CSV import
- Graph/kanban/moodboard-only export (toolbar export always uses entity list, not projection-specific shapes)
- Ontology/schema import
- Collections import button enablement
