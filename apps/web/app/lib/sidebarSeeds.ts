/**
 * Default Sidebar Seed Templates
 *
 * These define the initial sidebar tree structure for each scope.
 * They mirror the current hardcoded sections from tql-routes.ts
 * so that migrating to the dynamic sidebar is seamless.
 */

import type { SidebarNodeSeed } from '~/composables/useSidebarTree'

// ── Workspace (default "Personal Knowledge Management" template) ────────

export const DEFAULT_WORKSPACE_SIDEBAR: SidebarNodeSeed[] = [
  {
    id: 'ws-pinned',
    label: 'PINNED',
    icon: 'lucide:pin',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    collapsed: false,
    order: 1,
    sectionKey: 'personal-pinned',
    specialItems: 'pinned',
  },
  {
    id: 'ws-workspace',
    label: 'WORKSPACE',
    icon: 'lucide:briefcase',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    collapsed: false,
    order: 10,
    sectionKey: 'personal-workspace',
    children: [
      {
        id: 'ws-today-overview',
        label: 'Overview',
        icon: 'lucide:layout-dashboard',
        routePath: '/workspace/today',
        scope: 'workspace',
        nodeType: 'item',
        locked: true,
        order: 1,
      },
      {
        id: 'ws-today-feed',
        label: 'Feed',
        icon: 'lucide:rss',
        routePath: '/workspace/feed',
        scope: 'workspace',
        nodeType: 'item',
        locked: true,
        order: 2,
      },
      {
        id: 'ws-browse',
        label: 'Browse',
        icon: 'lucide:layers-3',
        routePath: '/workspace/browse',
        scope: 'workspace',
        nodeType: 'item',
        locked: true,
        order: 3,
      },
      {
        id: 'ws-calendar',
        label: 'Calendar',
        icon: 'lucide:calendar',
        routePath: '/workspace/calendar',
        entityType: 'event',
        scope: 'workspace',
        nodeType: 'item',
        order: 4,
      },
    ],
  },
  {
    id: 'ws-pages',
    label: 'PAGES',
    icon: 'lucide:file-text',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    collapsed: false,
    order: 20,
    sectionKey: 'personal-pages',
    specialItems: 'pages',
    editable: true,
  },
  {
    id: 'ws-workshop',
    label: 'WORKSHOP',
    icon: 'lucide:hammer',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    collapsed: false,
    order: 25,
    sectionKey: 'workshop-sheets',
    specialItems: 'workshop',
    editable: true,
    children: [
      {
        id: 'ws-sheets-browse',
        label: 'All sheets',
        icon: 'lucide:table-2',
        routePath: '/sheets',
        scope: 'workspace',
        nodeType: 'item',
        locked: true,
        order: 0,
      },
      {
        id: 'ws-decks-browse',
        label: 'All decks',
        icon: 'lucide:presentation',
        routePath: '/decks',
        scope: 'workspace',
        nodeType: 'item',
        locked: true,
        order: 1,
      },
    ],
  },
]
