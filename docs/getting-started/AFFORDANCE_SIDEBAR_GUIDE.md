# Affordance Sidebar Guide (for agents)

How to wire AppSidebar when adding a new Trellis affordance (projection, tool surface, or route family).

**Related:** `docs/architecture/SIDEBAR_BEHAVIOR.md` (runtime matrix) · `docs/getting-started/SIDEBAR_SECTIONS_GUIDE.md` (legacy `sidebarSections` API)

---

## Pick a pattern

```
New affordance needs sidebar navigation?
│
├─ A. Route-owned panel (Pages, Decks, Calendar, Mail, Chat)
│     Full custom tree while on that route prefix.
│     → trellis-shell-routes.ts + *Sidebar.vue + AppSidebar branch
│
├─ B. Workspace section with dynamic entities (Sheets/Decks in WORKSHOP)
│     Lives under /workspace sidebar; lists graph entities.
│     → sidebarSeeds.ts + specialItems keyword + useRoutes resolver
│
├─ C. Static sections on the route (Settings, Mail labels)
│     → sidebarSections[] in trellis-shell-routes.ts
│
└─ D. In-page only (Deck inspector, Page right rail)
      Not AppSidebar — see SIDEBAR_BEHAVIOR.md decision tree
```

---

## Pattern A — Route-owned panel (recommended for projections)

**Example:** Decks (`/decks`, `/decks/:id/*`)

### 1. Route definition (`apps/web/server/utils/trellis-shell-routes.ts`)

```typescript
const decksRoute: RouteDefinition = {
  routePath: '/decks',
  label: 'Decks',
  icon: 'lucide:presentation',
  inRail: true,
  railPosition: 'primary',
  // Do NOT set meta.sidebarSectionPath — let /decks own the sidebar section
  sidebarSections: [
    {
      label: 'DECKS',
      key: 'decks-list',
      icon: 'lucide:presentation',
      collapsible: true,
      editable: true,
      order: 10,
      items: [], // panel component renders items
    },
  ],
  children: [/* /decks/:id, /decks/:id/present, … */],
}
```

### 2. Panel component (`apps/web/app/components/<affordance>/*Sidebar.vue`)

- List affordance instances (from graph composable, e.g. `useDeckList()`)
- Highlight active item from `route.params`
- Optional sub-nav (deck vantages: editor / sorter / thumb / present)
- Create action via affordance composable (`useCreateDeck()`)

### 3. AppSidebar branch (`apps/web/app/components/app/AppSidebar.vue`)

```typescript
const isDecksRoute = computed(() => {
  const clean = getCleanPath(route.path)
  return clean === '/decks' || clean.startsWith('/decks/')
})
```

```vue
<template v-else-if="isDecksRoute">
  <DecksSidebar class="pt-2" />
</template>
```

### 4. Register in affordance registry

Add a row to `apps/web/app/lib/sidebar-affordances.ts` → `ROUTE_SIDEBAR_PANELS`.

### 5. Zone + rail (campus shell)

| File | What to set |
|------|-------------|
| `useZoneContext.ts` | `{ prefix: '/decks', zoneId: CAMPUS_ZONES.workshop }` |
| `trellis-shell-routes.ts` | `inRail`, `order`, `searchKeywords` |
| `campus-zone-routes.ts` | Only if zone grouping needs a new prefix rule |

---

## Pattern B — Workshop / workspace dynamic section

For entity lists that appear under **Workspace** when browsing `/workspace/*`:

### 1. Seed (`apps/web/app/lib/sidebarSeeds.ts`)

```typescript
{
  sectionKey: 'workshop-sheets',
  specialItems: 'workshop', // not 'sheets' — legacy alias still works
  children: [
    { routePath: '/sheets', label: 'All sheets', … },
    { routePath: '/decks', label: 'All decks', … },
  ],
}
```

### 2. Resolver (`apps/web/app/composables/useRoutes.ts`)

Use helpers from `~/lib/sidebar-affordances.ts`:

- `isWorkshopSpecialItems(keyword)`
- `resolveWorkshopSidebarItems(sheetsChildren, decksChildren)`

### 3. Entity children

Add a `*Children` computed in `useRoutes.ts` (see `sheetsChildren`, `decksChildren`) and path helpers in `~/lib/<affordance>-routes.ts`.

### 4. New `specialItems` keyword

1. Add to `SIDEBAR_SPECIAL_ITEMS` in `sidebar-affordances.ts`
2. Handle in `resolveWorkspaceSidebarFromTree()` and legacy `currentSidebarSections`
3. Document the keyword in this file

---

## Pattern C — Static `sidebarSections`

Mail, Settings, Ontologies use declarative sections in `trellis-shell-routes.ts`. Items can be static arrays or resolved by section `key` in `useRoutes.ts` (see `database-entities`, `personal-pages`).

---

## Checklist (copy for new affordance)

- [ ] Route in `trellis-shell-routes.ts` (path, icon, `inRail`, `sidebarSections`)
- [ ] **No** `sidebarSectionPath: '/workspace'` if the affordance owns its sidebar (Pattern A)
- [ ] Panel component OR `specialItems` resolver
- [ ] `AppSidebar.vue` `is*Route` + template branch (Pattern A)
- [ ] `sidebarSeeds.ts` + workspace route `sidebarSections` stub (Pattern B)
- [ ] `useRoutes` dynamic children + path helpers
- [ ] `useZoneContext.ts` zone prefix
- [ ] Row in `sidebar-affordances.ts`
- [ ] Row in `docs/architecture/SIDEBAR_BEHAVIOR.md` surfaces table
- [ ] Quick Create / command palette if user-facing create flow exists

---

## Decks reference implementation

| Piece | Location |
|-------|----------|
| Route | `trellis-shell-routes.ts` → `decksRoute` |
| Panel | `components/deck/DecksSidebar.vue` |
| List composable | `composables/useDeckList.ts` |
| Create | `composables/useCreateDeck.ts` |
| Path helpers | `lib/deck-routes.ts` |
| AppSidebar | `isDecksRoute` → `<DecksSidebar />` |
| Workshop fallback | `specialItems: 'workshop'` when on `/workspace` |
