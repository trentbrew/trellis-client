# Pages

File-based routing via Nuxt. Each `.vue` file = one route.

## Route Structure

```
pages/
├── index.vue                 Landing/marketing page
├── onboarding.vue            First-run onboarding flow
├── auth/                     Login, callback
├── invite/                   Invite acceptance
├── home/                     Home dashboard
├── workspace/                Main workspace routes
│   ├── browse/               Unified entity browse (filter by type)
│   │   ├── index.vue         All entities with type pill filter
│   │   └── [entityType].vue  Single-type browse
│   ├── today.vue             Dashboard with widgets
│   ├── feed.vue              Chronological activity feed
│   ├── calendar.vue          Calendar view
│   ├── tasks.vue             Tasks (kanban/list/gantt)
│   ├── pages/[pageId].vue    Grid page editor
│   └── welcome.vue           Welcome/getting started
├── pages/                    Full-page document editor
│   ├── index.vue             Page list with folder tree sidebar
│   └── [id].vue              **Full-page editor** (not a dialog)
├── calendar/                 Standalone calendar route
├── database/                 Database browser
│   ├── index.vue             All entity types with record counts
│   ├── [type].vue            Schema-driven browse per type
│   └── collections/[slug]    Collection detail
├── graph/                    Graph visualization routes
├── settings/                 Settings pages
├── messages/                 Chat/messaging
├── notifications.vue         Notification center
├── members.vue               Member management
└── workflows/                Workflow builder
```

## Special Pages

- **`pages/[id].vue`** — Full-page rich text editor. Only entity type with a dedicated page (not a dialog). Uses `useAutoSave` with a reactive mirror of local refs.
- **`workspace/browse/index.vue`** — Unified browse with `useBrowsePage`. Type filter pills, group-by-class toggle, adaptive view modes.
- **`workspace/tasks.vue`** — Custom page (not `useBrowsePage`) because of Gantt view integration.
- **`[...path].vue`** — Catch-all fallback page.

## Patterns

- **Browse pages**: Use `useBrowsePage()` composable. See `workspace/browse/index.vue` as reference.
- **All pages**: Use `<Page variant="...">` layout component. Never create bespoke layouts.
- **Entity dialogs**: Opened from browse pages via `viewOpen`/`viewingItem` from `useBrowsePage`.
