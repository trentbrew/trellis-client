# Sidebar behavior reference

How sidebars work across Trellis web affordances — triggers, persistence, content, and known inconsistencies.

**Last audited:** 2026-07-06

---

## Mental model: three layers

Trellis stacks up to three independent sidebar layers depending on context:

```
┌─────────────────────────────────────────────────────────────────┐
│ App shell (layouts/default.vue)                                 │
│  IconRail │ AppSidebar │ Main content │ AgentPanel (teleport)   │
├─────────────────────────────────────────────────────────────────┤
│ Page chrome (components/layout/Page.vue)                        │
│  #leftSidebar │ content │ #secondarySidebar  (rarely used)      │
├─────────────────────────────────────────────────────────────────┤
│ In-surface panels (per affordance)                              │
│  EntityRightSidebar │ pages/[id] right tabs │ DeckInspector …   │
└─────────────────────────────────────────────────────────────────┘
```

When debugging “why is the sidebar wrong here?”, identify **which layer** first.

---

## Layer 1 — App shell

**Key files:** `layouts/default.vue`, `components/layout/IconRail.vue`, `components/app/AppSidebar.vue`

### IconRail (far left)

| Property | Value |
|----------|-------|
| Visibility | Always on when authenticated |
| Collapse | Never |
| Position | `left` or `bottom` via `useLayoutPreferences` |
| Persistence | `localStorage: layout-preferences` |

### AppSidebar (section navigation)

Route-aware tree: workspace, pages list, mail labels, calendar filters, browse type filter, graph types, settings sections, etc.

| Property | Value |
|----------|-------|
| Show/hide | `showSidebar` in `default.vue` — hidden when `usePageShell().sidebarDisabled` **or** `useSidebarCollapse().isForcedCollapsed` |
| Exceptions | `/calendar` and `/locations` always allow sidebar (host dedicated route panels) |
| Collapse | Width → `0px` via `useSidebarCollapse` |
| Resize | 250–500px via `useState('sidebarWidth')` — **session only** |
| Section accordion | `useCollapsedSections` → `localStorage: collapsed-sidebar-sections` |
| Toggle UI | Visible button restored; `data-sidebar="trigger"` for shortcut compat |
| Keyboard | `mod+b` → `useSidebarCollapse().toggle()` (skipped when route force-collapsed) |

#### `useSidebarCollapse` contract

File: `composables/useSidebarCollapse.ts`

- **Default:** expanded unless user has previously set `sidebar-collapsed:explicit = true`
- **User toggle:** `toggle()` / `setCollapsed()` — blocked when `isForcedCollapsed`
- **Route force:** `collapseSidebar: true` on route config → `forceCollapsed(true)` (no localStorage write; user cannot reopen)
- **Route expand:** `collapseSidebar: false` → `setCollapsed(false)`
- **Routes with `collapseSidebar: true`:** `/home`, `/agent`, `/graph` (`server/utils/trellis-shell-routes.ts`)
- **Routes with `collapseSidebar: false`:** `/locations`

#### Hiding AppSidebar from a page

Two mechanisms — they do not always agree:

| Mechanism | How | Used by |
|-----------|-----|---------|
| `<Page :hide-sidebar="true">` | Sets `usePageShell().sidebarDisabled` | home, agent, calendar, notifications, lab/issues |
| Route `collapseSidebar: true` | `useSidebarCollapse().forceCollapsed` | home, agent, graph |

> **Gap:** Route `meta.hideSidebar` exists in shell routes but is **not auto-wired**. Pages must pass the `hide-sidebar` prop explicitly.

### Agent panel (global right)

| Property | Value |
|----------|-------|
| Composable | `useRightSidebarWidth` |
| Open | Omnibox “ask agent” → `setRightSidebarOpen(true)` |
| Close | `AgentPanel` header |
| Width | 200–600px, default 320 |
| Persistence | **None** (module ref) |
| DOM | Teleported `fixed right-0` — separate from entity/page sidebars |

---

## Layer 2 — Page chrome

**Key file:** `components/layout/Page.vue`

### Slots (rarely used)

| Slot | Width | Purpose |
|------|-------|---------|
| `#leftSidebar` | `w-64` | In-page left column |
| `#secondarySidebar` | `w-64` | In-page right column |

Most pages use AppSidebar or custom in-page layout instead.

### `usePageSidebar()` — browse type filter injection

When `/workspace/browse` calls `activate()`, AppSidebar shows entity-type counts with pin/unpin.

| Property | Value |
|----------|-------|
| Activation | `browse/index.vue` only |
| Pinned types | `localStorage: browse:pinnedTypes` |
| **Gap** | `/workspace/browse/:entityType` does **not** call `usePageSidebar` |

---

## Layer 3 — In-surface panels

### Pages editor (`pages/[id].vue`)

| Property | Value |
|----------|-------|
| AppSidebar | Visible — `PagesSidebar` page tree |
| Right panel | **Custom inline** — not `EntityRightSidebar` |
| Default | Open (`showSidebar = true`) |
| Tabs | Properties · References · Activity |
| Width | 272px default, resizable 220–480px |
| Persistence | **None** |
| Toggle | Close in tab bar; 40px collapsed strip with expand button |

### Entity dialogs

**Shell:** `components/dialogs/EntityDialogShell.vue` — variants: `dialog`, `inset`, `inline`

#### `EntityDialog.vue` (primary entity UI)

| Panel | Behavior |
|-------|----------|
| Right | `EntityRightSidebar` — Properties / References / Activity |
| Default | Open; **bookmarks auto-collapse** on open |
| Width | 360px, resizable 200–480px |
| Persistence | None |
| Left schedule | State exists (`schedulePanelOpen`, `leftSidebarW`) but **no template** — dead code |

#### Class shells (`DocumentDialogShell`, `ActorDialogShell`, `ContainerDialogShell`)

Header + properties row + content slot. **No sidebar chrome** — callers own layout.

#### `DynamicEntityDialog.vue`

Own right sidebar (not `EntityRightSidebar`). Tabs: References · Activity only. Properties in header pills.

#### Legacy dialogs (`PersonDialog`, `OrganizationDialog`, `ProjectDialog`)

`useEntityDialog` + `EntityRightSidebar`. Width 240–560px.

#### Variants

| Variant | Sidebar pattern |
|---------|-----------------|
| `dialog` (modal) | `EntityRightSidebar` right column |
| `inset` (graph) | Vertical tabs inside 420px panel |
| `inline` (mail) | `EntityRightSidebar` in column layout |

**Shared component:** `components/entity/EntityRightSidebar.vue`

### Browse (`/workspace/browse`)

- AppSidebar: type filter via `usePageSidebar`
- No in-page sidebar; detail via `DynamicEntityDialog` modal

### Sheets (`/sheets/[id]`)

- AppSidebar visible (workspace section, or dedicated panel — future)
- Formula bar + grid only — **no inspector sidebar**

### Decks (`/decks` and `/decks/[id]/*`)

| Layer | Behavior |
|-------|----------|
| AppSidebar | `DecksSidebar` — deck list, active deck, vantage links (editor / sorter / thumb / present) |
| In-page left | `SlideThumbList` filmstrip (editor routes) |
| In-page right | `DeckInspector` — fixed `md:w-[208px]` on md+; dropped in present mode |

### Calendar

| Layer | Behavior |
|-------|----------|
| AppSidebar | `CalendarSidebarPanel` (mini-cal, filters, GCal) |
| CalendarView internal | Own left sidebar — hidden when `:hide-sidebar="true"` |
| Calendar page | Passes `hide-sidebar` → relies on AppSidebar panel only |
| State | `useCalendarSidebarState` (module refs, resets on unmount) |

### Graph (`/graph`)

- AppSidebar **force-collapsed** (`collapseSidebar: true`)
- Type visibility via `useGraphTypesSidebar` → `AppSidebarGraphTypes`
- Entity inspect: `EntityDialog variant="inset"` (420px right panel)

### Mail (`/mail`)

| Column | Content |
|--------|---------|
| AppSidebar | Inboxes + Labels |
| Page col 1 | Thread list `w-[360px]` — not collapsible |
| Page col 2 | Inline `EntityDialog` + `EntityRightSidebar` |

### Settings

| Page | Pattern |
|------|---------|
| Most settings | Standard AppSidebar sections |
| `settings/integrations.vue` | In-page category nav `w-52` left (not AppSidebar) |
| `settings/appearance.vue` | Toggles `headerAboveSidebar`, `iconRailPosition` |

### Other surfaces

| Surface | Notes |
|---------|-------|
| Gantt | Internal left `--gantt-sidebar-width: 300px` (row labels) |
| Chat/home | AppSidebar hidden, full-width |
| Agent/lab | AppSidebar hidden via `hide-sidebar` prop |
| Locations | `LocationsSidebarPanel`; `collapseSidebar: false` |

---

## State systems matrix

| Composable | Controls | Persisted? | Key files |
|------------|----------|------------|-----------|
| `useSidebarCollapse` | AppSidebar open/collapsed + route force | `sidebar-collapsed`, `sidebar-collapsed:explicit` | `useSidebarCollapse.ts`, `AppSidebar.vue` |
| `useCollapsedSections` | Accordion within AppSidebar | `collapsed-sidebar-sections` | `useCollapsedSections.ts` |
| `usePageShell` | Page disables AppSidebar | Session (`useState`) | `usePageShell.ts`, `Page.vue` |
| `usePageSidebar` | Browse type filter in AppSidebar | Pinned types only | `usePageSidebar.ts`, `browse/index.vue` |
| `useRightSidebarWidth` | Global Agent panel | None | `useRightSidebarWidth.ts`, `default.vue` |
| `useLayoutPreferences` | Icon rail position, header layout | `layout-preferences` | `useLayoutPreferences.ts` |
| `useCalendarSidebarState` | Calendar filter state | None | `useCalendarSidebarState.ts` |
| `useGraphTypesSidebar` | Graph type visibility | None | `useGraphTypesSidebar.ts` |
| `useEntityDialog` | Legacy dialog right sidebar | None (per instance) | `useEntityDialog.ts` |
| Per-page refs | e.g. `pages/[id].vue` `showSidebar` | None | Various |
| `Ui/Sidebar/Provider` | shadcn cookie + mobile sheet | Cookie | **Not mounted anywhere** |

---

## Decision tree: which pattern to copy?

```
Adding sidebar to a new affordance?
│
├─ Section navigation (tree, filters, route context)
│  └─ Inject into AppSidebar via route config or usePageSidebar.activate()
│
├─ Entity metadata (properties, refs, activity)
│  └─ Use EntityRightSidebar (or extract shared panel — see backlog)
│
├─ Full-page editor with persistent right panel
│  └─ Follow pages/[id].vue pattern OR migrate to shared component
│
├─ Immersive canvas (no nav distraction)
│  └─ <Page :hide-sidebar="true"> + optional in-surface panel
│
├─ Tool inspector (deck, sheet future)
│  └─ In-surface fixed column; consider collapse for small viewports
│
└─ Global agent / assistant
   └─ useRightSidebarWidth + teleport in default.vue
```

---

## Known inconsistencies (cohesion backlog)

| ID | Issue | Severity | Recommendation |
|----|-------|----------|----------------|
| F1 | `mod+b` shortcut is a no-op | High | **Fixed** — wired to `useSidebarCollapse().toggle()`; AppSidebar toggle restored |
| F2 | Two sidebar systems (`useSidebarCollapse` vs unused `Ui/Sidebar/Provider`) | High | Adopt one; remove or integrate shadcn provider |
| F3 | `hideSidebar` route meta unwired | Medium | Auto-apply in layout middleware or remove dead meta |
| F4 | Three right-panel implementations | Medium | **Partial** — `ResizableRightPanel` + pages use `EntityRightSidebar`; `DynamicEntityDialog` remains |
| F5 | Dead left schedule sidebar in `EntityDialog.vue` | Medium | Remove orphan state or restore panel |
| F6 | Default widths differ (208/272/320/360/290) | Low | Tokenize `--panel-width-sm/md/lg` |
| F7 | Persistence inconsistent (collapse yes, widths no) | Medium | Document per-surface contract; persist where expected |
| F8 | Browse sidebar only on `/browse`, not typed browse | Medium | Activate on `[entityType]` or document omission |
| F9 | Bookmark auto-collapse only in `EntityDialog` | Low | Extend or remove special case |
| F10 | Calendar dual mini-sidebar | Medium | Keep `hide-sidebar` contract on CalendarView |
| F11 | Forced collapse irreversible on graph/home/agent | Medium | Allow override or icon-rail wayfinding |
| F12 | Deck inspector non-collapsible | Low | Add collapse for small viewports |
| F13 | `IconRail` imports unused `toggleRightSidebar` | Low | Wire agent toggle or remove import |

### Proposed unification (F4)

Shared components:

1. **`ResizableRightPanel.vue`** — collapse width + drag resize shell
2. **`EntityRightSidebar.vue`** — tabbed Properties / References / Activity (with `#activity` slot override)

Used by `EntityDialog.vue` and `pages/[id].vue`. Still pending: `DynamicEntityDialog.vue`.

---

## Quick reference by route

| Route | AppSidebar | In-surface right | In-surface left |
|-------|------------|------------------|-----------------|
| `/home` | Hidden | — | — |
| `/agent` | Hidden | — | — |
| `/graph` | Force-collapsed (types in sidebar) | Inset entity dialog | — |
| `/calendar` | CalendarSidebarPanel | — | — (CalendarView internal off) |
| `/locations` | LocationsSidebarPanel | — | — |
| `/workspace/browse` | Type filter | Modal on open | — |
| `/workspace/browse/:type` | Workspace default | Modal on open | — |
| `/pages/:id` | Pages tree | Properties/Refs/Activity | — |
| `/sheets/:id` | Workspace | — | — |
| `/decks/:id` | Workspace | DeckInspector | SlideThumbList |
| `/mail` | Mail sections | EntityRightSidebar (inline) | Thread list |
| `/settings/*` | Settings sections | — | Integrations category nav |

---

## Related docs

- [Route config architecture](./ROUTE_CONFIG_ARCHITECTURE.md) — `collapseSidebar`, `hideSidebar` meta
- [App config](./APP_CONFIG.md) — shell route definitions
- `apps/web/app/composables/README.md` — composable conventions
