# Spec: Card Property Visibility — P1 (Ontology Rows + Ordered View Fields)

**Parent:** card-property-visibility-p0 (shipped)  
**Baseline:** [`card-property-visibility.ts`](../../apps/web/app/lib/card-property-visibility.ts), [`CardPropertiesPopover.vue`](../../apps/web/app/components/browse/CardPropertiesPopover.vue), [`EntityCard.vue`](../../apps/web/app/components/entity/cards/EntityCard.vue)  
**VCS:** Informal wedge `card-property-visibility-p1` — promote to `TRL-*` when lane available  
**Executor lane:** active dev lane (`agent:cursor`)

---

## Problem

P0 toggles a fixed builtin catalog (`type`, `status`, `priority`, …). Custom ontology fields from `getBrowseConfig()` do not appear in the Properties popover or on card faces. Property order is stored but not applied (reorder UI was removed in P0). Table columns and card properties share the same schema source but not a unified field catalog.

## Goal

Extend browse card projections so **schema-driven fields** appear in the Properties popover and render as labeled rows on cards, with **display order** driven by the persisted `visible[]` list.

## Non-goals (P1)

- Cover / preview picker
- `pages/[pageId].vue` or `browse/[entityType].vue` alternate routes (browse index only)
- Table column visibility toggles (types may stub `showInTable` for P2)
- `ProjectionConfig` / page-entity persistence (localStorage only)
- `files` and `formula` ontology fields on cards

---

## Data model

### `ViewFieldDefinition`

```ts
type ViewFieldSource = 'builtin' | 'ontology'

interface ViewFieldDefinition {
  key: string           // unique within catalog
  label: string
  source: ViewFieldSource
  valueType?: string    // ontology fields; builtins infer from key
  /** Builtin-only: maps to EntityCard renderer branch */
  builtinKind?: BuiltinCardPropertyKey
}
```

- **Builtin keys** remain the P0 set (`type`, `status`, `priority`, `description`, `date`, `tags`, `recurrence`, `subtitle`, `contact`, `fileSize`).
- **Ontology keys** use schema `name` from `getBrowseConfig(entityType).tableColumns`.
- **Dedup:** If an ontology column key matches a builtin key or is `title`, skip ontology entry (builtin wins).
- **Skip ontology:** `files`, `formula`, `TABLE_SKIP_FIELD_NAMES`.

### `ViewFieldsState` (persisted)

```ts
interface ViewFieldsState {
  visible: string[]     // ordered keys — builtins + ontology
  showEmpty: boolean
}
```

**Storage key:** `browse:view-fields:{entityType}` (new).  
**Migration:** On load, if new key absent, read legacy `browse:card-props:{entityType}` and map through catalog normalization.

### Future stub (`types/database.ts`)

Extend `ProjectionConfig` (already has `cardProperties`, `cardShowEmpty`):

```ts
viewFields?: { key: string; showInCard?: boolean; showInTable?: boolean; order?: number }[]
```

No read/write in P1 — localStorage only.

---

## Catalog builder

### `buildViewFieldCatalog(entityType: string): ViewFieldDefinition[]`

New module: `app/lib/view-field-catalog.ts`

1. Start with `CARD_PROPERTY_OPTIONS` → `{ source: 'builtin', builtinKind: key }`.
2. If `entityType` is not `all`, append ontology columns from `getBrowseConfig(entityType).tableColumns`:
   - Exclude `isTitle`, skip list above, skip keys already in builtin set.
   - `{ source: 'ontology', key, label, valueType }`.
3. Return stable default order: **builtins first** (P0 order), then ontology fields in schema order.

Export helpers:

- `normalizeViewFieldKeys(catalog, saved: string[] | null): string[]`
- `toggleViewFieldKey(visible, key, on, catalog)`
- `moveViewFieldKey(visible, key, direction)` — reuse P0 `moveCardPropertyKey` logic generalized to `string[]`

Unit tests required for catalog merge, dedup, normalize, toggle, move.

---

## Composable

### Refactor `useCardPropertyVisibility` → `useViewFields`

**Signature:**

```ts
useViewFields(storageKey: Ref<string>, entityType: Ref<string>)
```

**Returns:**

| Export | Behavior |
|--------|----------|
| `catalog` | `computed` from `buildViewFieldCatalog(entityType)` |
| `visibleFields` | ordered visible keys |
| `showEmpty` | boolean |
| `hiddenCount` | `catalog.length - visible.length` |
| `setVisible(key, on)` | toggle against catalog |
| `move(key, direction)` | reorder within `visible` |
| `setShowEmpty` / `reset` | unchanged semantics |

Recompute `hiddenCount` against dynamic catalog length (not static `CARD_PROPERTY_OPTIONS.length`).

---

## UI: Properties popover

[`CardPropertiesPopover.vue`](../../apps/web/app/components/browse/CardPropertiesPopover.vue)

- Accept `options: ViewFieldDefinition[]` (or `{ key, label }[]`).
- **Re-enable** up/down reorder controls (P1 wires order to card DOM).
- Section ontology fields below builtins with subtle separator label optional (`Custom fields`) when `source === 'ontology'` entries exist.
- Title row note unchanged: “Title is always visible.”

---

## UI: EntityCard ordered rendering

### Zones (do not reorder across zones in P1)

| Zone | Keys | Notes |
|------|------|-------|
| **Preview** | — | Unchanged (bookmark, note, email iframe, etc.) |
| **Meta row** | `type`, `priority`, `status` | Render **in `visibleFields` order** among themselves; hide row if all three hidden/empty |
| **Title** | — | Always shown |
| **Body** | All other visible keys | Render **in `visibleFields` order** |

### Body key dispatch

| Key kind | Renderer |
|----------|----------|
| Builtin | Existing P0 branches (`description`, `date`, `tags`, …) |
| Ontology | New **`CardPropertyRow.vue`** |

### `CardPropertyRow.vue` (new)

Props: `item`, `field: ViewFieldDefinition`, `editable?`, `showEmpty?`

- Read value: `item[field.key]` with status-field resolution via `resolvePropertyKey` / `schemaFieldToPropertyFieldId` where applicable.
- Display: `formatFieldValue(value, valueType)` for read-only.
- Editable: `EntityFieldEditor` when `schemaFieldToPropertyFieldId(key)` maps or valueType in editable set (mirror `BrowseSpreadsheetView` rules).
- Layout: compact labeled row — `text-[10px] muted label` + value pill/text (match properties tab density).
- Hide when value empty and `!showEmpty`.

### Props threading

Extend props on `EntityCard`, `EntityCardCollection`, `ProjectionOutlet`:

```ts
visibleFields?: string[] | null   // rename from visibleProperties (alias ok for one release)
fieldCatalog?: ViewFieldDefinition[]  // optional — EntityCard can resolve ontology rows without if parent passes row defs only
showEmptyProperties?: boolean
```

Browse page passes `catalog` + `visibleFields` from `useViewFields`.

### List layout

Apply same ordered body rendering as grid (meta + body order). List and grid must stay consistent.

---

## Browse integration

[`browse/index.vue`](../../apps/web/app/pages/workspace/browse/index.vue)

```ts
const cardPropsKey = computed(() => activeTypeParam.value)
const { catalog, visibleFields, showEmpty, ... } = useViewFields(cardPropsKey, activeTypeParam)
```

- Pass `entityType` so catalog includes ontology fields when a single type is selected.
- **`all` mode:** builtins only (no ontology merge) — same as P0.
- Properties popover visible when `isCardProjection`.

---

## Acceptance criteria

### Automated

- [ ] `test:pnpm check` passes
- [ ] Unit tests in `app/lib/view-field-catalog.test.ts`:
  - Merges ontology columns for a type with custom field
  - Dedupes builtin/ontology collision on `description`
  - Skips `files`, `formula`, `title`
  - `normalizeViewFieldKeys` preserves saved order; drops unknown keys
  - `moveViewFieldKey` reorders
- [ ] Unit tests updated for composable migration / legacy storage read

### Behavioral (manual or e2e follow-up)

- [ ] On `/workspace/browse?type=deadline`, Properties lists ontology fields beyond builtins (e.g. any non-title schema field not in builtin set).
- [ ] Enabling a custom ontology field shows a labeled row on grid cards.
- [ ] Disabling **Priority** hides priority pill; order of **Status** vs **Priority** in popover matches card meta row order after reorder.
- [ ] **Show empty properties** shows placeholder row for empty ontology field.
- [ ] Settings persist per type across reload (`browse:view-fields:deadline`).
- [ ] Legacy `browse:card-props:*` still loads for users with P0 data.
- [ ] `all` browse mode: popover shows builtins only; no crash.

### Regression

- [ ] P0 builtin toggles still work for Deadlines grid (type, status, priority, description, date).
- [ ] Table projection unchanged (no column visibility coupling in P1).

---

## File plan (Executor)

| Action | Path |
|--------|------|
| Add | `app/lib/view-field-catalog.ts` + test |
| Refactor | `app/lib/card-property-visibility.ts` → re-export / thin wrapper or merge into view-field-catalog |
| Refactor | `app/composables/useCardPropertyVisibility.ts` → `useViewFields.ts` (keep re-export alias) |
| Add | `app/components/entity/cards/CardPropertyRow.vue` |
| Edit | `EntityCard.vue` — ordered meta + body loops |
| Edit | `CardPropertiesPopover.vue` — reorder + ontology section |
| Edit | `browse/index.vue` — wire `useViewFields` + entityType |
| Edit | `EntityCardCollection.vue`, `ProjectionOutlet.vue` — prop rename/thread |

---

## Risks / decisions (locked)

| Decision | Choice |
|----------|--------|
| Ontology vs builtin collision | Builtin wins; ontology column omitted from catalog |
| Meta vs body zones | Meta pills stay above title; only relative order within meta changes |
| Editable ontology on card | Yes, when spreadsheet would allow edit on that column |
| Storage | localStorage P1; ProjectionConfig P2 |

---

## Verification commands

```bash
cd apps/web
pnpm check
pnpm exec vitest run app/lib/view-field-catalog.test.ts app/composables/useCardPropertyVisibility.test.ts
# Manual: /workspace/browse?type=deadline → Properties
```
