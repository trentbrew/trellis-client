# Spec: Document Chrome — seamless title + AI summary in properties (document-chrome)

**Parent design:** document-chrome  
**Proposal:** document-chrome  
**Design:** [document_chrome_design.md](./document_chrome_design.md) · [document_chrome_mockup.html](./document_chrome_mockup.html)  
**Labels:** `spec`, `needs-e2e`

## Scope

**In:** Unified document reading column for `note` (EntityDialog) and `page` (`pages/[id].vue`); shared `DocumentTitleField`; remove inline description from reading column; AI `summary` in properties sidebar sourced from `content`; extend `useEntitySummary` with per-type source resolution.

**Out:** Title-as-first-TipTap-block; quick-note auto-rename from H1; `DocumentDialogShell` / `workspace/pages/[pageId].vue`; summary behavior changes for task, person, email, bookmark; stale-summary badge (defer P1.1).

**Demo:** Open any long note (e.g. essay note from quick capture after rename) — title scrolls with body; Properties tab shows AI Summary after content ≥120 chars.

---

## Architecture

```
lib/document-chrome.ts
├─ DOCUMENT_CHROME_TYPES = ['note', 'page']
├─ isDocumentChromeType(type)
├─ DOC_COLUMN_CLASS = 'max-w-[720px] mx-auto px-8'
└─ DOC_TITLE_CLASS = 'text-3xl font-bold tracking-tight …'

components/entity/DocumentTitleField.vue
├─ props: title, mode, placeholder, entityId?, peers?
├─ emits: update:title
└─ data-testid="document-title"

components/entity/DocumentPropertiesSummary.vue
├─ props: summary, isGeneratingSummary, contentLength, summaryGeneratedAt?, isStale?
├─ emits: regenerateSummary
└─ reuses EntityDescriptionBlock read-only branch OR inline equivalent

components/entity/EntityBodyHeader.vue
├─ prop variant: 'default' | 'document'
└─ when document: no border-b, no EntityDescriptionBlock, uses DocumentTitleField

composables/useEntitySummary.ts
├─ resolveSummarySource(entity) → 'content' | 'description'
├─ resolveSummaryText(entity) → stripHtml(field).trim()
└─ ensure/regenerate hash resolveSummaryText(entity)

EntityDialog.vue
├─ isDocumentChrome = type ∈ DOCUMENT_CHROME_TYPES
├─ EntityBodyHeader variant=document when isDocumentChrome
├─ watch [id, content] for note/page → ensureSummary
├─ properties slot: DocumentPropertiesTab when isDocumentChrome
└─ (keep description watch for non-document types)

pages/[id].vue
├─ header: chrome only (badge, tags, actions) — no title/description
├─ scroll column: DocumentTitleField + UiRichTextEditor (shared DOC_COLUMN_CLASS)
├─ sidebar: add Properties tab → DocumentPropertiesSummary
└─ wire useEntitySummary on content save
```

### Source resolution

```ts
// apps/web/app/lib/document-chrome.ts
export const DOCUMENT_CHROME_TYPES = ['note', 'page'] as const

export function isDocumentChromeType(type?: string): boolean {
  return DOCUMENT_CHROME_TYPES.includes(type as (typeof DOCUMENT_CHROME_TYPES)[number])
}

// apps/web/app/composables/useEntitySummary.ts
import { stripHtml } from '~/utils/stripHtml'
import { isDocumentChromeType } from '~/lib/document-chrome'

export function resolveSummarySource(entity: EntityLike): 'content' | 'description' {
  return isDocumentChromeType(entity.type) ? 'content' : 'description'
}

export function resolveSummaryText(entity: EntityLike): string {
  const field = resolveSummarySource(entity) === 'content' ? entity.content : entity.description
  return stripHtml(field).trim()
}
```

`regenerate` and `ensure` use `resolveSummaryText(entity)` instead of `(entity.description || '').trim()`. Hash compares against plain text from resolved source.

**EntityDialog watch** — replace single description watch with:

```ts
watch(
  () => [editableItem.id, editableItem.type, editableItem.description, editableItem.content] as const,
  () => {
    if (isCreateMode.value || !editableItem.id) return
    const source = resolveSummaryText(editableItem)
    if (source.length < MIN_SOURCE_LENGTH) return
    void ensureSummary(editableItem)
  },
  { immediate: true },
)
```

**pages/[id].vue** — identical `useEntitySummary` watch on `currentPage` content after autosave.

---

## Component contracts

### `DocumentTitleField.vue`

| Prop | Type | Default |
| ---- | ---- | ------- |
| `title` | `string` | — |
| `mode` | `'view' \| 'create' \| 'edit'` | `'edit'` |
| `placeholder` | `string` | `'Untitled'` |
| `entityId` | `string?` | — |
| `peers` | `PresencePeer[]?` | — |

**Styles (normative):**

```html
class="w-full bg-transparent border-0 outline-none
  text-3xl font-bold tracking-tight leading-[1.15]
  placeholder:text-muted-foreground/40
  focus:ring-2 focus:ring-primary/35 rounded-sm
  hover:border-0 hover:bg-transparent"
```

- **No** `hover:border-border`, **no** `hover:bg-muted/20` at rest
- View mode: `<h1 class="…same typography…">`
- `aria-label="Document title"`
- `data-testid="document-title"`

### `EntityBodyHeader` — `variant="document"`

| Change | default | document |
| ------ | ------- | -------- |
| Root `border-b` | present | **removed** |
| `EntityDescriptionBlock` | rendered | **hidden** |
| Title | inline input | `DocumentTitleField` |
| Padding | `px-6 pt-6 pb-4` | `DOC_COLUMN_CLASS` + `pt-8 pb-5` |

Prop: `variant?: 'default' | 'document'` (default `'default'`).

`EntityDialog.vue`:

```vue
<EntityBodyHeader
  v-if="editableItem.type !== 'bookmark'"
  :variant="isDocumentChrome ? 'document' : 'default'"
  … />
```

### `DocumentPropertiesSummary.vue`

Read-only sidebar block. Mount via new `DocumentPropertiesTab.vue` wrapper (thin — Summary row + pass-through to `OntologyPropertiesTab` fields for note, or page metadata).

| State | UI |
| ----- | -- |
| `isGeneratingSummary && !summary` | "Summarizing…" + spinner |
| `summary` present | Text + "Generated · {relative}" + regenerate icon |
| content &lt; 120 chars, no summary | "Write more to generate a summary" (italic muted) |
| empty content | hide row or show muted hint |

- `aria-label="AI-generated summary"` on value region
- Regenerate: `aria-label="Regenerate summary"`, `aria-busy` while generating
- Optional `border-l-2 border-violet-400/40` on value (design `ai-accent`)

### `DocumentPropertiesTab.vue` (new)

Combines `DocumentPropertiesSummary` at top + existing ontology/sidebar fields for the entity type. Used in:

- `EntityDialog` `#properties` when `isDocumentChrome && !isBookmark`
- `EntityDialog` inset properties tab (same condition)

For **notes**: render `OntologyPropertiesTab` below summary (owner, category, pinned, timestamps).

For **pages** (`pages/[id].vue`): new **Properties** sidebar tab (third tab before References/Activity or first — recommend **Properties | References | Activity**). Summary + created/updated timestamps; folder/status pills may remain in horizontal bar for P1 (no forced migration).

---

## Page layout refactor (`pages/[id].vue`)

### Before (remove)

- Title + description in fixed `border-b` header block (lines ~614–672)
- `localDescription`, `onDescriptionUpdate`, `descPeers`, description presence

### After

```
┌─ shrink-0 border-b (chrome only) ─────────────────────┐
│ [Page] [tags]                    [save][nav][menu]    │
└───────────────────────────────────────────────────────┘
┌─ flex-1 overflow-y-auto ────────────┬─ sidebar ──────┐
│  DOC_COLUMN_CLASS                   │ Properties|…   │
│  DocumentTitleField                 │                │
│  UiRichTextEditor (unchanged props)   │                │
└─────────────────────────────────────┴────────────────┘
```

- Move `data-testid="page-title"` → `document-title` on `DocumentTitleField` (keep `page-title` as alias in e2e migration if needed)
- Title peers: pass `titlePeers` to `DocumentTitleField`
- Scroll container wraps title + editor (single `overflow-y-auto`)
- Remove description editor and related autosave/presence for `description` field

---

## `NoteContent.vue` alignment

Wrap editor in shared column class so title (in `EntityBodyHeader` above panel) and body share width:

```vue
<div :class="DOC_COLUMN_CLASS">
  <UiRichTextEditor … />
</div>
```

Or apply `DOC_COLUMN_CLASS` on parent scroll wrapper in `EntityDialog` so header + `EntityContentPanel` share column — **preferred**: one wrapper around `EntityBodyHeader` + `EntityContentPanel`.

---

## API / data model

No ontology changes. Reuse existing entity fields:

| Field | Usage |
| ----- | ----- |
| `title` | Document H1 (unchanged) |
| `content` | Body + summary source for note/page |
| `description` | Unused in UI for note/page; retained in model |
| `summary` | AI blurb (unchanged) |
| `summarySourceHash` | Hash of `stripHtml(content)` for note/page |
| `summaryGeneratedAt` | ISO timestamp |

`/api/summarize-entity-llm` — no change; client sends plain text from `resolveSummaryText`.

---

## Verification

Run from **trellis-client** repo root:

```bash
pnpm --dir apps/web exec vitest run app/composables/useEntitySummary.test.ts
pnpm --dir apps/web check
PW_REUSE=1 pnpm --dir apps/web exec playwright test tests/e2e/document-chrome.spec.ts --project=chromium
```

### Manual

1. Open note dialog — title has no hover border; no "Add a description…" between title and body.
2. Type in title — autosaves; no form box chrome at rest.
3. Scroll note — title scrolls with content.
4. Note with ≥120 chars content — Properties tab shows Summary after debounced generation.
5. Click regenerate — summary updates; spinner on icon.
6. Open `/pages/{id}` — same title treatment; no header description; Properties tab has Summary.
7. Task dialog — unchanged (description still in header; summary from description).

### E2e (`tests/e2e/document-chrome.spec.ts`)

Mock `**/api/summarize-entity-llm` → `{ summary: 'Mock summary for e2e.' }`.

1. Create or open note via graph/browse (`?id=` query or API seed).
2. Assert `[data-testid="document-title"]` visible; assert no `[placeholder="Add a description…"]` in center column.
3. Assert title input does not have class matching `hover:border-border` (or assert `document-title` lacks `border-border` when not focused).
4. Fill editor with >120 chars plain text; wait for summary API; open Properties tab; assert text "Mock summary".
5. Page route: navigate to known demo page; assert `document-title` in scroll area; assert description editor absent.

---

## Acceptance criteria

1. **`lib/document-chrome.ts`** exports `DOCUMENT_CHROME_TYPES`, `isDocumentChromeType`, `DOC_COLUMN_CLASS`, `DOC_TITLE_CLASS`.
2. **`DocumentTitleField.vue`** — H1 typography, no hover chrome, `data-testid="document-title"`, a11y label.
3. **`EntityBodyHeader`** — `variant="document"` removes `border-b` and description block; uses `DocumentTitleField`.
4. **`EntityDialog`** — `note` uses `variant="document"`; `task`/`event` keep `default`.
5. **`DocumentPropertiesSummary.vue`** + **`DocumentPropertiesTab.vue`** — summary row in properties for note; regenerate wired.
6. **`useEntitySummary`** — `resolveSummarySource` / `resolveSummaryText`; note/page hash `content`; other types unchanged; unit test covers both paths.
7. **`EntityDialog` watch** triggers `ensureSummary` on `content` change for note (and page if opened in dialog).
8. **`pages/[id].vue`** — title in scroll column; description removed from header; Properties tab with Summary; `useEntitySummary` on content.
9. **Note body column** — title and editor share `max-w-[720px] mx-auto px-8` (±8px tolerance).
10. **`test:pnpm check`** passes.
11. **`useEntitySummary.test.ts`** — passes (content vs description source).
12. **`document-chrome.spec.ts`** — passes with mocked LLM route.
13. **No regression** — existing entity dialogs for task/person/email unaffected (smoke: open task dialog, description field still present).

---

## File manifest (Executor)

| File | Action |
| ---- | ------ |
| `apps/web/app/lib/document-chrome.ts` | **add** |
| `apps/web/app/lib/document-chrome.test.ts` | **add** (optional — can live in summary test) |
| `apps/web/app/components/entity/DocumentTitleField.vue` | **add** |
| `apps/web/app/components/entity/DocumentPropertiesSummary.vue` | **add** |
| `apps/web/app/components/entity/DocumentPropertiesTab.vue` | **add** |
| `apps/web/app/components/entity/EntityBodyHeader.vue` | **modify** |
| `apps/web/app/components/dialogs/EntityDialog.vue` | **modify** |
| `apps/web/app/composables/useEntitySummary.ts` | **modify** |
| `apps/web/app/composables/useEntitySummary.test.ts` | **add** |
| `apps/web/app/pages/pages/[id].vue` | **modify** |
| `apps/web/tests/e2e/document-chrome.spec.ts` | **add** |

---

## P1.1 stub (do not implement)

- Stale summary when `summarySourceHash !== hash(resolveSummaryText(entity))` — show "May be outdated"
- Auto-rename quick-note title from first H1 when title matches `/^Quick Note —/`
- Migrate page metadata pills into Properties tab

---

## Handoff checklist

- [x] `docs/artifacts/document_chrome_spec.md` (this file)
- [x] AC testable and scoped
- [x] Design artifact paths cited
- [x] `needs-e2e` e2e file named
- [x] Out of scope explicit
- [x] File manifest for Executor
