# Spec: File Browse Category Facets

**Parent:** `file-card-view-profiles` (shipped)  
**Baseline:** [`file-card-view-profiles.ts`](../../apps/web/app/lib/file-card-view-profiles.ts), [`fileClassification.ts`](../../apps/web/app/utils/fileClassification.ts), [`browse/index.vue`](../../apps/web/app/pages/workspace/browse/index.vue)  
**VCS:** Informal wedge `file-browse-category-facets` — promote to `TRL-*` when lane available  
**Executor lane:** active dev lane (`agent:cursor`)

---

## Problem

Files browse (`?type=file`) shows every blob in one grid — images, videos, PDFs, spreadsheets mixed. `file-card-view-profiles` fixed *card face* noise but users still need **wayfinding**: "show me only images" without inventing separate entity types.

Turtlecode pattern: one `Asset` entity + `category` subtype, routed via query/filter — not `image` / `video` / `document` graph types.

## Goal

Add **category facets** to workspace file browse: URL-driven filter on `fileCategory` (with mime/extension fallback), toolbar pill bar, breadcrumb segment, and client-side filtering. Reuse existing classification helpers.

## Non-goals (this wedge)

- New entity types (`image`, `video`, …)
- Server-side EQL filter / new API route (client filter on loaded items is sufficient for local mode)
- Sidebar nested tree under Files (toolbar pills only in P1; sidebar sub-nav is P2)
- Per-category `browse:view-fields:*` storage keys (stay `type=file`)
- Separate dialogs per category (`FileDialog` + `FileContent` already branch on category)
- Upload pipeline changes (classification on read via `resolveFileCategory` is enough)

---

## URL contract

| URL | Meaning |
|-----|---------|
| `/workspace/browse?type=file` | All files |
| `/workspace/browse?type=file&category=image` | Images only |
| `/workspace/browse?type=file&category=video` | Videos only |
| `/workspace/browse?type=file&category=document` | Documents (PDF, DOCX, …) |
| `/workspace/browse?type=file&category=audio` | Audio |
| `/workspace/browse?type=file&category=spreadsheet` | Spreadsheets |
| `/workspace/browse?type=file&category=presentation` | Presentations |
| `/workspace/browse?type=file&category=code` | Code files |
| `/workspace/browse?type=file&category=archive` | Archives |
| `/workspace/browse?type=file&category=other` | Unclassified / fallback |

**Rules:**

- `category` is **ignored** unless `type=file`. Strip or ignore when user switches to another type.
- Invalid `category` value → treat as **all files** (no filter), optionally `router.replace` to drop bad param.
- `category=all` or omitted → no filter (equivalent).
- Preserve other query keys (`view`, search state is in composable not URL — unchanged).

**Redirect alias (optional, low priority):**  
`/workspace/files?category=image` → `/workspace/browse?type=file&category=image` via extend [`files.vue`](../../apps/web/app/pages/workspace/files.vue).

---

## Classification source of truth

Reuse — do **not** duplicate mime maps:

```ts
import { resolveFileCategory } from '~/lib/file-card-view-profiles'
import type { FileCategory } from '~/utils/fileClassification'
```

- Prefer stored `item.fileCategory` when present.
- Else `classifyFile(mimeType, title)` from [`fileClassification.ts`](../../apps/web/app/utils/fileClassification.ts).

Filter predicate:

```ts
function fileMatchesCategory(item: Entity, category: FileCategory): boolean {
  return resolveFileCategory(item as Record<string, unknown>) === category
}
```

---

## Facet catalog

New module: `app/lib/file-browse-categories.ts`

```ts
export interface FileBrowseFacet {
  id: FileCategory | 'all'
  label: string
  labelPlural: string
  icon: string
  color: string  // tailwind color token, match FILE_CATEGORY_META where possible
}

export const FILE_BROWSE_FACETS: FileBrowseFacet[]  // ordered for toolbar
export function parseFileCategoryParam(raw: string | null | undefined): FileCategory | 'all'
export function isValidFileCategoryParam(raw: string): raw is FileCategory
export function fileMatchesBrowseCategory(item: Record<string, unknown>, category: FileCategory | 'all'): boolean
export function countFilesByCategory(items: Entity[]): Record<FileCategory | 'all', number>
```

**Toolbar order (recommended):** All → Images → Videos → Documents → Audio → Spreadsheets → Code → Archives → Other  
(Presentation can merge into Documents facet **or** stand alone — **lock: include `presentation` as its own pill** between Documents and Audio.)

Icons/colors: import from `FILE_CATEGORY_META` in `fileClassification.ts`.

---

## Browse page integration

[`browse/index.vue`](../../apps/web/app/pages/workspace/browse/index.vue)

1. **Read param:** `activeCategoryParam = computed(() => route.query.category as string | undefined)` — only when `activeTypeParam === 'file'`.

2. **Select facet:** `selectFileCategory(category: FileCategory | 'all')` → `router.replace({ query: { type: 'file', ...(category !== 'all' ? { category } : {}) } })`.

3. **Filter:** Pass `itemFilter` to `useBrowsePage` when `type=file` and category ≠ `all`:

```ts
const fileCategoryFilter = computed(() => {
  if (activeTypeParam.value !== 'file') return undefined
  const cat = parseFileCategoryParam(activeCategoryParam.value)
  if (cat === 'all') return undefined
  return (item: Entity) => fileMatchesBrowseCategory(item as Record<string, unknown>, cat)
})

useBrowsePage({
  entityType: activeTypes,
  itemFilter: (item) => !fileCategoryFilter.value || fileCategoryFilter.value(item),
  // ...
})
```

> **Note:** `useBrowsePage` `itemFilter` is static at init today — if not reactive, use computed wrapper inside composable or apply filter in page-level `filteredItems` computed. Executor: verify `useBrowsePage` supports reactive `itemFilter`; extend with `MaybeRef` if needed (minimal change).

4. **Reset category** when `selectType` changes away from `file`.

5. **Stats / empty state:** Page title/subtitle or stats chip reflects facet (e.g. "Images · 42").

---

## UI: Category pill bar

New component: `app/components/browse/FileCategoryPills.vue`

- Renders when `type=file` on browse page.
- Horizontal scrollable pill row (match existing browse type pill styling).
- Each pill: icon + label + optional count badge.
- Active pill: `category` query match (or "All" when param absent).
- Placement: browse `Page` slot — `#toolbarActions` area **before** New File button, or dedicated `#belowHeader` slot if cleaner.

**Counts:** `countFilesByCategory(items)` from all `type=file` items (pre-facet), shown on pills. Hide `0` counts or show muted — **lock: show count when > 0**.

---

## Breadcrumb

[`CampusContextBreadcrumb.vue`](../../apps/web/app/components/app/CampusContextBreadcrumb.vue)

When `type=file` and valid `category` param:

- Append crumb after "Files" (e.g. `Images`) with facet icon.
- Disabled/non-link (leaf), same pattern as type crumb.

---

## Card / view-fields interaction

- `useViewFields(cardPropsKey, activeTypeParam)` unchanged — key stays `file`.
- Category filter does not alter Properties popover or `file-card-view-profiles` behavior.
- Grid file cards continue using compact footer + category badges from profiles module.

---

## Acceptance criteria

### Automated

- [ ] `test:pnpm check` passes
- [ ] Unit tests in `app/lib/file-browse-categories.test.ts`:
  - `parseFileCategoryParam` accepts valid categories, rejects unknown → `all`
  - `fileMatchesBrowseCategory` uses `fileCategory` field when set
  - `fileMatchesBrowseCategory` falls back to mime classification
  - `countFilesByCategory` tallies correctly
- [ ] Unit test or browse-page test: switching `type` away from `file` clears category from effective filter

### Behavioral (manual or e2e follow-up)

- [ ] `/workspace/browse?type=file` shows All pill active; grid shows mixed file types
- [ ] `/workspace/browse?type=file&category=image` shows only image mime/category items
- [ ] Clicking Videos pill updates URL and grid without full page reload
- [ ] Breadcrumb shows `… / Files / Images` when category=image
- [ ] Switching browse type to Notes clears category filter and hides pill bar
- [ ] Properties popover on filtered file browse still works; defaults unchanged
- [ ] Empty facet shows browse empty state ("No images") not a crash

### Regression

- [ ] Non-file browse types unaffected
- [ ] `file-card-view-profiles` card rendering unchanged
- [ ] Table projection on files browse still lists filtered rows only

---

## File plan (Executor)

| Action | Path |
|--------|------|
| Add | `app/lib/file-browse-categories.ts` + test |
| Add | `app/components/browse/FileCategoryPills.vue` |
| Edit | `app/pages/workspace/browse/index.vue` — query param, filter, pills |
| Edit | `app/components/app/CampusContextBreadcrumb.vue` — category crumb |
| Edit (optional) | `app/pages/workspace/files.vue` — forward `category` query |
| Edit (if needed) | `app/composables/useBrowsePage.ts` — reactive `itemFilter` |

---

## Risks / decisions (locked)

| Decision | Choice |
|----------|--------|
| Entity model | Single `file` type; filter on `fileCategory` |
| Filter location | Client-side on browse items (local-first) |
| Classification | `resolveFileCategory` — single helper |
| Facet UI | Toolbar pills P1; sidebar nesting P2 |
| Invalid category | Treat as all; optionally strip from URL |
| Presentation | Own facet pill (not merged into document) |

---

## Verification commands

```bash
cd apps/web
pnpm check
pnpm exec vitest run app/lib/file-browse-categories.test.ts
# Manual: /workspace/browse?type=file → Images pill → URL ?category=image
```

---

## Follow-up (P2 — out of scope)

- Sidebar sub-nav under Files (pinned facets)
- Server-side EQL `WHERE ?e.fileCategory = "image"` when cloud mode scales
- Deep links from FileDialog ("Show all images")
- Facet-specific default view mode (e.g. moodboard for images)
