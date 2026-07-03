# Components

Vue components, Nuxt-auto-imported by name (`~/components` is registered with `pathPrefix: false`). The directory layout is **organizational** — it does not affect the auto-import name.

> Example: `components/editor-blocks/CalloutBlock.vue` is auto-imported as `<CalloutBlock />` from anywhere. The `editor-blocks/` segment is purely for human navigation.

---

## Top-level groupings

| Folder                  | Purpose                                                                                       |
|-------------------------|-----------------------------------------------------------------------------------------------|
| `Ui/`                   | shadcn-ui-style primitives. Auto-imported with the `Ui` prefix (`<UiButton />`).              |
| `editor-blocks/`        | TipTap NodeView blocks. Registered programmatically in `app/lib/*-extension.ts` — not used as templates directly. |
| `editors/`              | Standalone editor surfaces (CodeEditor, PlainTextEditor, FormulaTestPlayground).              |
| `dashboard/`            | Dashboard widget cards (runtime). One file per widget type.                                   |
| `dashboard-builder/`    | Builder UI for assembling dashboards (design-time).                                           |
| `page-builder/`         | Builder UI for graph-driven pages.                                                            |
| `route-builder/`        | Builder UI for route configuration.                                                           |
| `data/`                 | Data projection components (DataTable, CollectionDataGridProjection, TrellisBlocksProjection). |
| `views/`                | View renderers per layout (Board, Calendar, Graph, List, Table).                              |
| `entity/`               | Entity-specific components (panels, dialogs, sections per entity type).                       |
| `agent/`                | Agent UI (chat panels, tool result renderers, routing display).                               |
| `admin/`                | Admin-only UI (members, billing, etc.). Routes live at `pages/admin/`.                        |
| `archive/`              | Archive viewer UI.                                                                             |
| `app/`                  | Root app chrome (header, command palette, system bars).                                        |
| `graph/`                | Graph explorer UI.                                                                             |
| `JsonLdBlocks/`         | JSON-LD block editor.                                                                          |
| `layout/`               | Layout-only components used inside `~/layouts/` files.                                         |
| `notifications/`, `chat/`, `comments/`, `presence/`, … | Domain components grouped by feature.                              |

---

## The "editor" naming — read this once

There are three folders whose names look similar and confused agents in the past:

| Folder                          | What lives here                                                                | When to use                                              |
|---------------------------------|--------------------------------------------------------------------------------|----------------------------------------------------------|
| `Ui/RichTextEditor.vue`         | The TipTap **editor instance** itself.                                         | Mounting an editor somewhere in the app.                 |
| `editor-blocks/`                | TipTap **NodeView block** components (callouts, cards, embeds, query views, tabs, table cells, …). | Adding a new TipTap block. Register via `app/lib/*-extension.ts`. |
| `editors/`                      | **Alternate editor surfaces** — `CodeEditor` (Monaco-style), `PlainTextEditor`, `FormulaTestPlayground`. | When the canvas is *not* TipTap.                         |

If you're tempted to put a file in `components/editor/` (singular, no suffix) — stop. That folder no longer exists. Choose one of the three above.

---

## The `*-builder` pattern

`dashboard-builder/`, `page-builder/`, `route-builder/`. The convention:

| Folder           | Holds              | Companion runtime         |
|------------------|--------------------|---------------------------|
| `<x>-builder/`   | The design-time UI for composing an `<x>` | `<x>/` (where applicable) |

Example: `dashboard-builder/DashboardBuilder.vue` lets a user compose a dashboard at design time; `dashboard/DashboardChartCard.vue` etc. render the resulting widgets at runtime.

This is **not** a duplication. They are intentionally separate so that builder-only code doesn't ship into the runtime bundle when a user just views a dashboard.

---

## Auto-import behaviour

- `~/components` is registered with `pathPrefix: false` in `nuxt.config.ts` → the directory path does **not** prefix the component name.
- `~/components/Ui/` is registered with `pathPrefix: true, prefix: 'Ui'` → file `Ui/Button.vue` is `<UiButton />`.
- All other folders are flat for naming purposes; reorganize freely.

> Renaming a directory is safe as long as **explicit imports** (`import X from '~/components/foo/X.vue'`) are updated. Auto-import refs (`<X />` in templates) are unaffected.

---

## Tests

Tests are colocated:

```
Counter.vue
Counter.test.ts
SchemaEditor.vue
SchemaEditor.test.ts
```

See [`apps/web/app/CONVENTIONS.md`](../CONVENTIONS.md) → "Testing" for the full convention.

Run: `pnpm --filter @trellis/web test`.

---

## See also

- [`apps/web/app/CONVENTIONS.md`](../CONVENTIONS.md) — frontend conventions
- [`apps/web/app/composables/README.md`](../composables/README.md) — companion index for composables
- [`apps/web/nuxt.config.ts`](../../nuxt.config.ts) — `components: [...]` config that drives auto-import
