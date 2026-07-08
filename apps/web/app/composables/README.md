# Composables

130+ reactive composables, Nuxt-auto-imported. Grouped by domain below; full pattern reference at the bottom.

## Core Data

| Composable           | Purpose                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `useEntities`        | **Canonical entity CRUD** — delegates to `useTrellisEntities`. Use this everywhere. |
| `useTrellisEntities` | Implementation: TQL graph + cloud adapter, hydration, SSE sync                      |
| `useTrellisGraph`    | Low-level graph fetch/mutate + SSE EventSource connection                           |
| `useTrellisConfig`   | Server config (ontologies, routes, projections) from `/api/graph/config`            |
| `useTrellisAdapter`  | TQL adapter bridge for entity CRUD                                                  |
| `useInstantData`     | Platform data: orgs/worlds, members, settings, collections                          |
| `useInstantAuth`     | Auth state (user, signIn, signOut)                                                  |
| `useInstantDb`       | Raw InstantDB instance                                                              |
| `useDataAdapter`     | Active data adapter (local or cloud)                                                |
| `useAdapterStatus`   | Reactive data mode/health info                                                      |

## Entity System

| Composable            | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `useEntityDialog`     | **Shared dialog logic** — mode, hydration, auto-save, comments, refs, owners |
| `useEntityFormulas`   | Auto-compute priority/urgency from date proximity                            |
| `useEntityReferences` | Bidirectional entity reference link/unlink via TQL                           |
| `useEntitySearch`     | Search/filter entities for pickers and mentions                              |
| `useEntitySelection`  | Multi-select with keyboard shortcuts                                         |
| `useEntityPresence`   | Realtime presence tracking per entity                                        |
| `useEntityRegistry`   | Runtime entity type resolution from registry                                 |
| `useAutoSave`         | Debounced auto-save for reactive items                                       |
| `useDetailDialog`     | Dialog open/close state for entity detail views                              |
| `useDialogStack`      | Stacked dialog management (push/pop)                                         |
| `useDialogStackAware` | Stack-aware dialog positioning                                               |
| `useDialogUrl`        | URL hash sync for dialog state                                               |

## Browse & Navigation

| Composable           | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `useBrowsePage`      | **Universal browse page** — search, filter, sort, dialog, CRUD |
| `useBrowse`          | Core browse state (search, sort, filter, view mode)            |
| `useBrowseSelection` | Selection state for browse pages                               |
| `useRoutes`          | Sidebar sections, breadcrumbs, route resolution                |
| `useAppNavigate`     | Programmatic navigation helpers                                |
| `useWorkspacePath`   | Hybrid slug URL builder (`/w/{slug}-{idPrefix}/...`)           |
| `useHashNavigation`  | Hash-based navigation for SPAs                                 |

## Pages & Content

| Composable               | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `usePageNotes`           | Page entity CRUD + folder grouping                  |
| `usePages`               | Grid page config, layout, views                     |
| `usePageBuilder`         | Page builder state                                  |
| `usePagePresence`        | Collaborative presence per page                     |
| `usePageSidebar`         | Page-injected sidebar content                       |
| `usePageMeta`            | Page metadata resolution                            |
| `useRecentPages`         | Recently visited pages                              |
| `useComments`            | Comment/activity CRUD per entity                    |
| `useMentionLinks`        | Sync @mentions → TQL graph links                    |
| `useImageLinks`          | Sync inline images → content-derived FileReferences |
| `useCollaborativeEditor` | Yjs collaborative editing bridge                    |

## UI & Layout

| Composable             | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `useTheme`             | Theme preset access                             |
| `useBranding`          | HSL-based branding system                       |
| `useLayoutPreferences` | Header layout toggle (above sidebar vs. inline) |
| `useSidebarCollapse`   | AppSidebar open/collapsed + route force-collapse — see [SIDEBAR_BEHAVIOR.md](../../../../docs/architecture/SIDEBAR_BEHAVIOR.md) |
| `usePageShell`         | Page-level AppSidebar disable (`hide-sidebar` prop) |
| `usePageSidebar`       | Inject browse type filter into AppSidebar |
| `useRightSidebarWidth` | Global Agent panel (right, teleported) |
| `useSidebarOrder`      | Sidebar item ordering                           |
| `useSidebarTree`       | Recursive sidebar tree CRUD                     |
| `useKeyboardShortcuts` | Registry-driven keyboard shortcut system        |
| `useContextMenu`       | Declarative context menu presets                |
| `useCommandDialog`     | Command palette open state                      |
| `useStatusBar`         | Status bar data                                 |
| `useAnimationSettings` | Motion preference                               |
| `useGapResize`         | Resizable panel gaps                            |

## Integrations

| Composable             | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `useGoogleCalendar`    | GCal sync, calendar list, event enrichment |
| `useGCalEnrichment`    | GCal event → entity enrichment             |
| `useIntegrations`      | Integration definitions + connections      |
| `useNotifications`     | Realtime notification system               |
| `usePresence`          | Workspace-level online presence            |
| `useChat`              | Chat messaging                             |
| `useChatPresence`      | Chat typing indicators                     |
| `useChatNotifications` | Chat notification badges                   |
| `useWeather`           | Weather widget data                        |

## Ontology & Schema

| Composable               | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `useOntologyRegistry`    | Server ontology types + dynamic type resolution |
| `useOntologyMarketplace` | Template marketplace                            |
| `useSchemaBuilder`       | Schema editor state                             |
| `useTemplateInstaller`   | World template installation                     |

## Patterns

Trellis composables fall into two shapes. Knowing which is which matters because **singletons share state across the whole app** and **factories don't**.

### Singleton composables — shared global state

**Pattern**: state declared at module scope (top of file), then returned from the function. Every caller gets the same refs.

```ts
// useDialogStack.ts
import { ref } from 'vue'

const stack = ref<DialogStackEntry[]>([]) // ← module-scope, shared

export function useDialogStack() {
  function push(entry: DialogStackEntry) {
    stack.value.push(entry)
  }
  function pop() {
    stack.value.pop()
  }
  return { stack: readonly(stack), push, pop }
}
```

**Use a singleton when**: the state IS the app-wide truth (open dialogs, sidebar collapse, theme, command palette, the active workspace, the current user).

**Examples**: `useDialogStack`, `useTheme`, `useBranding`, `useTrellisConfig`, `useTrellisEntities`, `useOntologyRegistry`, `useSidebarTree`, `useAnyDialogOpen`.

### Factory composables — per-call instance state

**Pattern**: state declared **inside** the function body, fresh on every call.

```ts
// useAutoSave.ts
export function useAutoSave<T>(item: T, options: { enabled: Ref<boolean>; debounce?: number }) {
  const status = ref<SaveStatus>('idle') // ← function-scope, per call
  const lastSavedAt = ref<Date | null>(null)
  // ... watches `item`, calls update, etc.
  return { status, lastSavedAt }
}
```

**Use a factory when**: the state is bound to a specific subject (an entity, a dialog, a route, a component instance) and two consumers should get independent state.

**Examples**: `useAutoSave`, `useEntityDialog`, `useEntityFormulas`, `useBrowse`, `useEntitySelection`, `useComments`.

### How to tell at a glance

Look at where the `ref()`/`reactive()` calls live in the source file:

| Location                 | Shape     | Behaviour                                    |
| ------------------------ | --------- | -------------------------------------------- |
| Above `export function`  | singleton | Same state everywhere; treat as global store |
| Inside `export function` | factory   | Fresh state per call; safe to use in loops   |

Mixing both inside one composable is allowed but rare — keep it intentional.

## Hard rules

- **Browse pages** → always `useBrowsePage()`. Never hand-roll search/filter/sort.
- **Auto-save** → always `useAutoSave()`. Never hand-roll debounced save with `setTimeout`.
- **Entity dialogs** → always `useEntityDialog()`. It owns hydration, edit-mode toggle, auto-save wiring, comments, refs, and owners.
- **Entity CRUD** → always `useEntities()` (which delegates to `useTrellisEntities`). Never call `/api/graph/mutate` directly from a component.
- **Routes** → always `useRoutes()` for sidebar/breadcrumb data. Don't recompute from `route.path` in components.

## Adding a new composable

1. Decide singleton vs. factory **before** writing code (see above).
2. Create `apps/web/app/composables/useThing.ts`.
3. Default-export is **not** required — Nuxt picks up named `export function useThing(...)`.
4. If the composable owns shared state, document it with a `// ── Singleton state ──` banner so readers don't accidentally treat it as a factory.
5. Add a colocated test if it has non-trivial logic: `useThing.test.ts` next to the source. Vitest discovers it automatically.
6. Add the new composable to the relevant table in this README so it's discoverable.

## Testing

Tests are colocated (see [`apps/web/app/CONVENTIONS.md`](../CONVENTIONS.md) → "Testing"):

```
useAutoSave.ts
useAutoSave.test.ts
```

Run:

```bash
pnpm --filter @trellis/web test
```

For singleton composables, **import via the public name only** in tests; don't poke at module-scope refs from outside — that's the whole point of the encapsulation.
