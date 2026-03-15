# Composables

110 reactive composables, Nuxt auto-imported. Grouped by domain.

## Core Data
| Composable | Purpose |
|---|---|
| `useEntities` | **Canonical entity CRUD** — delegates to `useTrellisEntities`. Use this everywhere. |
| `useTrellisEntities` | Implementation: TQL graph + cloud adapter, hydration, SSE sync |
| `useTrellisGraph` | Low-level graph fetch/mutate + SSE EventSource connection |
| `useTrellisConfig` | Server config (ontologies, routes, projections) from `/api/graph/config` |
| `useTrellisAdapter` | TQL adapter bridge for entity CRUD |
| `useInstantData` | Platform data: orgs/worlds, members, settings, collections |
| `useInstantAuth` | Auth state (user, signIn, signOut) |
| `useInstantDb` | Raw InstantDB instance |
| `useDataAdapter` | Active data adapter (local or cloud) |
| `useAdapterStatus` | Reactive data mode/health info |

## Entity System
| Composable | Purpose |
|---|---|
| `useEntityDialog` | **Shared dialog logic** — mode, hydration, auto-save, comments, refs, owners |
| `useEntityFormulas` | Auto-compute priority/urgency from date proximity |
| `useEntityReferences` | Bidirectional entity reference link/unlink via TQL |
| `useEntitySearch` | Search/filter entities for pickers and mentions |
| `useEntitySelection` | Multi-select with keyboard shortcuts |
| `useEntityPresence` | Realtime presence tracking per entity |
| `useEntityRegistry` | Runtime entity type resolution from registry |
| `useAutoSave` | Debounced auto-save for reactive items |
| `useDetailDialog` | Dialog open/close state for entity detail views |
| `useDialogStack` | Stacked dialog management (push/pop) |
| `useDialogStackAware` | Stack-aware dialog positioning |
| `useDialogUrl` | URL hash sync for dialog state |

## Browse & Navigation
| Composable | Purpose |
|---|---|
| `useBrowsePage` | **Universal browse page** — search, filter, sort, dialog, CRUD |
| `useBrowse` | Core browse state (search, sort, filter, view mode) |
| `useBrowseSelection` | Selection state for browse pages |
| `useRoutes` | Sidebar sections, breadcrumbs, route resolution |
| `useAppNavigate` | Programmatic navigation helpers |
| `useWorkspacePath` | Hybrid slug URL builder (`/w/{slug}-{idPrefix}/...`) |
| `useHashNavigation` | Hash-based navigation for SPAs |

## Pages & Content
| Composable | Purpose |
|---|---|
| `usePageNotes` | Page entity CRUD + folder grouping |
| `usePages` | Grid page config, layout, views |
| `usePageBuilder` | Page builder state |
| `usePagePresence` | Collaborative presence per page |
| `usePageSidebar` | Page-injected sidebar content |
| `usePageMeta` | Page metadata resolution |
| `useRecentPages` | Recently visited pages |
| `useComments` | Comment/activity CRUD per entity |
| `useMentionLinks` | Sync @mentions → TQL graph links |
| `useImageLinks` | Sync inline images → content-derived FileReferences |
| `useCollaborativeEditor` | Yjs collaborative editing bridge |

## UI & Layout
| Composable | Purpose |
|---|---|
| `useTheme` | Theme preset access |
| `useBranding` | HSL-based branding system |
| `useLayoutPreferences` | Header layout toggle (above sidebar vs. inline) |
| `useSidebarCollapse` | Sidebar section collapse state |
| `useSidebarOrder` | Sidebar item ordering |
| `useSidebarTree` | Recursive sidebar tree CRUD |
| `useKeyboardShortcuts` | Registry-driven keyboard shortcut system |
| `useContextMenu` | Declarative context menu presets |
| `useCommandDialog` | Command palette open state |
| `useStatusBar` | Status bar data |
| `useAnimationSettings` | Motion preference |
| `useGapResize` | Resizable panel gaps |

## Integrations
| Composable | Purpose |
|---|---|
| `useGoogleCalendar` | GCal sync, calendar list, event enrichment |
| `useGCalEnrichment` | GCal event → entity enrichment |
| `useIntegrations` | Integration definitions + connections |
| `useNotifications` | Realtime notification system |
| `usePresence` | Workspace-level online presence |
| `useChat` | Chat messaging |
| `useChatPresence` | Chat typing indicators |
| `useChatNotifications` | Chat notification badges |
| `useWeather` | Weather widget data |

## Ontology & Schema
| Composable | Purpose |
|---|---|
| `useOntologyRegistry` | Server ontology types + dynamic type resolution |
| `useOntologyMarketplace` | Template marketplace |
| `useSchemaBuilder` | Schema editor state |
| `useTemplateInstaller` | World template installation |

## Patterns

**Singleton state**: Most composables use module-level `ref()`/`reactive()` shared across callers.

**Browse pages**: Always use `useBrowsePage()` — never hand-roll search/filter/sort.

**Auto-save**: Always use `useAutoSave()` — never hand-roll debounced save with `setTimeout`.
