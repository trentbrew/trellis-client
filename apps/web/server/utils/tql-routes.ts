/**
 * TQL Route Definitions
 *
 * Server-side route definitions for the Trellis workspace.
 * These replace the route nodes from app-config.jsonld.
 *
 * The client fetches these from GET /api/graph/config and converts
 * them into RouteConfig objects for navigation, sidebar, and breadcrumbs.
 */

import type { RouteDefinition } from '@turtle.tech/tql'

// ============================================================================
// Home Route — /home
// ============================================================================

const homeRoute: RouteDefinition = {
  '@id': 'route:home',
  '@type': 'trellis:Route',
  routePath: '/home',
  label: 'Home',
  icon: 'lucide:house',
  order: 0,
  inRail: false,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: true,
  meta: {
    title: 'Home',
    description: 'Your personal home dashboard',
    hideSidebar: true,
  },
}

// ============================================================================
// Agent Route — /agent
// ============================================================================

const agentRoute: RouteDefinition = {
  '@id': 'route:agent',
  '@type': 'trellis:Route',
  routePath: '/agent',
  label: 'Agent',
  icon: 'lucide:bot',
  order: 5,
  inRail: false,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: true,
  meta: {
    title: 'Agent',
    description: 'AI agent workspace',
    hideSidebar: true,
  },
}

// ============================================================================
// Workspace Route — /workspace
// ============================================================================

const workspaceRoute: RouteDefinition = {
  '@id': 'route:workspace',
  '@type': 'trellis:Route',
  routePath: '/workspace',
  label: 'Workspace',
  icon: 'lucide:house',
  order: 0,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Workspace',
    description: 'Your personal workspace',
  },
  sidebarSections: [
    {
      label: 'PINNED',
      key: 'personal-pinned',
      icon: 'lucide:pin',
      items: 'pinned',
      collapsible: false,
      order: 1,
    },
    {
      label: 'WORKSPACE',
      key: 'personal-workspace',
      icon: 'lucide:briefcase',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/workspace/today', label: 'Overview', icon: 'lucide:layout-dashboard' },
        { routePath: '/workspace/feed', label: 'Feed', icon: 'lucide:rss' },
        { routePath: '/workspace/browse', label: 'Browse', icon: 'lucide:layers-3' },
        { routePath: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar', entityType: 'event' },
      ],
    },
    {
      label: 'PAGES',
      key: 'personal-pages',
      icon: 'lucide:file-text',
      collapsible: true,
      editable: true,
      order: 20,
      items: [],
    },
  ],
  children: [
    {
      '@id': 'route:workspace/browse',
      '@type': 'trellis:Route',
      routePath: '/workspace/browse',
      label: 'Browse',
      icon: 'lucide:layers-3',
      inCommandPalette: true,
      meta: { title: 'Browse', description: 'Browse all your entities in one place' },
    },
    {
      '@id': 'route:workspace/welcome',
      '@type': 'trellis:Route',
      routePath: '/workspace/welcome',
      label: 'Welcome',
      icon: 'lucide:home',
      meta: { title: 'Welcome', description: 'World overview and quick links' },
    },
    {
      '@id': 'route:workspace/today',
      '@type': 'trellis:Route',
      routePath: '/workspace/today',
      label: 'Today',
      icon: 'lucide:layout-dashboard',
      meta: { title: 'Today', description: 'Your daily overview' },
    },
    {
      '@id': 'route:workspace/feed',
      '@type': 'trellis:Route',
      routePath: '/workspace/feed',
      label: 'Feed',
      icon: 'lucide:rss',
      meta: { title: 'Feed', description: 'Activity feed' },
    },
    {
      '@id': 'route:workspace/people',
      '@type': 'trellis:Route',
      routePath: '/workspace/people',
      label: 'People',
      icon: 'lucide:users',
      entityType: 'person',
      pageVariant: 'browse',
      projectionTypes: ['table', 'card-grid', 'list', 'graph'],
      meta: { title: 'People', description: 'Manage your contacts and relationships' },
    },
    {
      '@id': 'route:workspace/calendar',
      '@type': 'trellis:Route',
      routePath: '/workspace/calendar',
      label: 'Calendar',
      icon: 'lucide:calendar',
      entityType: 'event',
      pageVariant: 'browse',
      projectionTypes: ['calendar', 'timeline', 'list'],
      meta: { title: 'Calendar', description: 'View and manage your schedule' },
    },
    {
      '@id': 'route:workspace/projects',
      '@type': 'trellis:Route',
      routePath: '/workspace/projects',
      label: 'Projects',
      icon: 'lucide:folder-kanban',
      entityType: 'project',
      pageVariant: 'browse',
      projectionTypes: ['kanban', 'list', 'table', 'timeline'],
      meta: { title: 'Projects', description: 'Manage your projects' },
    },
    {
      '@id': 'route:workspace/tasks',
      '@type': 'trellis:Route',
      routePath: '/workspace/tasks',
      label: 'Tasks',
      icon: 'lucide:check-square',
      entityType: 'task',
      pageVariant: 'browse',
      projectionTypes: ['kanban', 'calendar', 'list', 'table', 'timeline'],
      meta: { title: 'Tasks', description: 'Manage your tasks' },
    },
    {
      '@id': 'route:workspace/notes',
      '@type': 'trellis:Route',
      routePath: '/workspace/notes',
      label: 'Notes',
      icon: 'lucide:sticky-note',
      entityType: 'note',
      pageVariant: 'browse',
      projectionTypes: ['card-grid', 'list', 'table'],
      meta: { title: 'Notes', description: 'Your notes and thoughts' },
    },
    {
      '@id': 'route:workspace/documents',
      '@type': 'trellis:Route',
      routePath: '/workspace/documents',
      label: 'Documents',
      icon: 'lucide:file-text',
      entityType: 'page',
      pageVariant: 'browse',
      projectionTypes: ['list', 'card-grid'],
      meta: { title: 'Documents', description: 'Pages and documents' },
    },
    {
      '@id': 'route:workspace/bookmarks',
      '@type': 'trellis:Route',
      routePath: '/workspace/bookmarks',
      label: 'Bookmarks',
      icon: 'lucide:bookmark',
      entityType: 'bookmark',
      pageVariant: 'browse',
      projectionTypes: ['card-grid', 'list', 'table', 'moodboard'],
      meta: { title: 'Bookmarks', description: 'Saved bookmarks and links' },
    },
    {
      '@id': 'route:workspace/places',
      '@type': 'trellis:Route',
      routePath: '/workspace/places',
      label: 'Places',
      icon: 'lucide:map-pin',
      pageVariant: 'browse',
      meta: { title: 'Places', description: 'Saved locations' },
    },
    {
      '@id': 'route:workspace/sprints',
      '@type': 'trellis:Route',
      routePath: '/workspace/sprints',
      label: 'Sprints',
      icon: 'lucide:zap',
      entityType: 'sprint',
      pageVariant: 'browse',
      projectionTypes: ['list', 'kanban', 'timeline'],
      meta: { title: 'Sprints', description: 'Plan and track sprints' },
    },
    {
      '@id': 'route:workspace/goals',
      '@type': 'trellis:Route',
      routePath: '/workspace/goals',
      label: 'Goals',
      icon: 'lucide:target',
      entityType: 'goal',
      pageVariant: 'browse',
      projectionTypes: ['list', 'kanban', 'table', 'timeline'],
      meta: { title: 'Goals', description: 'Track your goals and progress' },
    },
    {
      '@id': 'route:workspace/milestones',
      '@type': 'trellis:Route',
      routePath: '/workspace/milestones',
      label: 'Milestones',
      icon: 'lucide:flag',
      entityType: 'milestone',
      pageVariant: 'browse',
      projectionTypes: ['timeline', 'list', 'calendar'],
      meta: { title: 'Milestones', description: 'Key milestones and checkpoints' },
    },
    {
      '@id': 'route:workspace/budgets',
      '@type': 'trellis:Route',
      routePath: '/workspace/budgets',
      label: 'Budgets',
      icon: 'lucide:wallet',
      entityType: 'budget',
      pageVariant: 'browse',
      projectionTypes: ['list', 'table'],
      meta: { title: 'Budgets', description: 'Manage budgets and spending' },
    },
  ],
}

// ============================================================================
// Database Route — /database
// ============================================================================

const databaseRoute: RouteDefinition = {
  '@id': 'route:database',
  '@type': 'trellis:Route',
  routePath: '/database',
  label: 'Database',
  icon: 'lucide:database',
  order: 22,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: 'admin', permission: 'read' },
  pageVariant: 'database',
  projectionTypes: ['table', 'kanban', 'card-grid', 'calendar', 'timeline', 'gallery', 'list', 'moodboard'],
  meta: {
    title: 'Database',
    description: 'Browse and query all entities as a database',
    fullWidth: true,
  },
  sidebarSections: [
    {
      label: 'PLATFORM',
      key: 'database-system',
      icon: 'lucide:blocks',
      collapsible: true,
      order: 0,
    },
    {
      label: 'ENTITIES',
      key: 'database-entities',
      icon: 'lucide:box',
      collapsible: true,
      order: 1,
    },
    {
      label: 'CUSTOM',
      key: 'database-custom',
      icon: 'lucide:layers',
      items: 'unpinned',
      collapsible: true,
      editable: true,
      order: 2,
    },
    {
      label: 'TOOLS',
      key: 'database-tools',
      icon: 'lucide:wrench',
      collapsible: true,
      order: 3,
      items: [
        { routePath: '/database/explorer', label: 'Explorer', icon: 'lucide:search' },
        { routePath: '/database/query', label: 'Query', icon: 'lucide:terminal' },
        { routePath: '/database/ontology', label: 'Ontology', icon: 'lucide:shapes' },
        { routePath: '/database/activity', label: 'Activity', icon: 'lucide:scroll-text' },
      ],
    },
  ],
  children: [
    {
      '@id': 'route:database/explorer',
      '@type': 'trellis:Route',
      routePath: '/database/explorer',
      label: 'Explorer',
      icon: 'lucide:search',
      meta: { title: 'Entity Explorer', description: 'Browse, search, and inspect graph entities' },
    },
    {
      '@id': 'route:database/query',
      '@type': 'trellis:Route',
      routePath: '/database/query',
      label: 'Query',
      icon: 'lucide:terminal',
      meta: { title: 'Query Console', description: 'Run EQL-S queries', fullWidth: true },
    },
    {
      '@id': 'route:database/ontology',
      '@type': 'trellis:Route',
      routePath: '/database/ontology',
      label: 'Ontology',
      icon: 'lucide:shapes',
      tabs: [
        { label: 'Core Ontology', to: '/database/ontology?tab=core', icon: 'lucide:lock' },
        { label: 'Entity Registry', to: '/database/ontology?tab=registry', icon: 'lucide:layers' },
      ],
      meta: { title: 'Ontology Visualizer', description: 'Schema visualization', fullWidth: true },
    },
    {
      '@id': 'route:database/activity',
      '@type': 'trellis:Route',
      routePath: '/database/activity',
      label: 'Activity',
      icon: 'lucide:scroll-text',
      meta: { title: 'Activity Log', description: 'Mutation log and event stream' },
    },
  ],
}

// ============================================================================
// Graph Route — /graph
// ============================================================================

const graphRoute: RouteDefinition = {
  '@id': 'route:graph',
  '@type': 'trellis:Route',
  routePath: '/graph',
  label: 'Graph',
  icon: 'lucide:workflow',
  order: 32,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: 'admin', permission: 'read' },
  collapseSidebar: true,
  meta: {
    title: 'Graph Visualization',
    description: 'Force-directed view of all graph entities and their relationships',
    fullWidth: true,
  },
}

// ============================================================================
// Calendar Route — /calendar (top-level icon rail, auto-cloned to /w/:orgSlug/calendar)
// ============================================================================

const calendarRoute: RouteDefinition = {
  '@id': 'route:calendar',
  '@type': 'trellis:Route',
  routePath: '/calendar',
  label: 'Calendar',
  icon: 'lucide:calendar',
  order: 12,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Calendar',
    description: 'View and manage your schedule',
  },
}

// ============================================================================
// Mail Route — /mail
// ============================================================================

const mailRoute: RouteDefinition = {
  '@id': 'route:mail',
  '@type': 'trellis:Route',
  routePath: '/mail',
  label: 'Mail',
  icon: 'lucide:mail',
  order: 15,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Mail',
    description: 'Read, send, and link emails to workspace entities',
    hideSidebar: false,
    fullWidth: true,
  },
  sidebarSections: [
    {
      label: 'MAILBOXES',
      key: 'mail-mailboxes',
      icon: 'lucide:inbox',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/mail?label=INBOX', label: 'Inbox', icon: 'lucide:inbox' },
        { routePath: '/mail?label=STARRED', label: 'Starred', icon: 'lucide:star' },
        { routePath: '/mail?label=SENT', label: 'Sent', icon: 'lucide:send' },
        { routePath: '/mail?label=DRAFT', label: 'Drafts', icon: 'lucide:file-edit' },
        { routePath: '/mail?label=IMPORTANT', label: 'Important', icon: 'lucide:flag' },
        { routePath: '/mail?label=TRASH', label: 'Trash', icon: 'lucide:trash-2' },
      ],
    },
    {
      label: 'LABELS',
      key: 'mail-labels',
      icon: 'lucide:tag',
      collapsible: true,
      editable: true,
      order: 20,
      items: [],
    },
  ],
  children: [
    {
      '@id': 'route:mail/compose',
      '@type': 'trellis:Route',
      routePath: '/mail/compose',
      label: 'Compose',
      icon: 'lucide:pen-square',
      meta: { title: 'Compose' },
    },
    {
      '@id': 'route:mail/thread',
      '@type': 'trellis:Route',
      routePath: '/mail/thread/:threadId',
      label: 'Thread',
      icon: 'lucide:mail',
      meta: { title: 'Thread' },
    },
  ],
}

// ============================================================================
// Contacts Route — /contacts
// ============================================================================

const contactsRoute: RouteDefinition = {
  '@id': 'route:contacts',
  '@type': 'trellis:Route',
  routePath: '/contacts',
  label: 'Contacts',
  icon: 'lucide:contact',
  order: 18,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Contacts',
    description: 'Manage your contacts, people, and organizations',
    hideSidebar: false,
  },
  sidebarSections: [
    {
      label: 'CONTACTS',
      key: 'contacts-all',
      icon: 'lucide:users',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/contacts', label: 'All Contacts', icon: 'lucide:users' },
        { routePath: '/contacts?type=person', label: 'People', icon: 'lucide:user' },
        { routePath: '/contacts?type=organization', label: 'Organizations', icon: 'lucide:building-2' },
      ],
    },
  ],
  children: [
    {
      '@id': 'route:contacts/person',
      '@type': 'trellis:Route',
      routePath: '/contacts/:id',
      label: 'Contact',
      icon: 'lucide:user',
      meta: { title: 'Contact' },
    },
  ],
}

// ============================================================================
// Messages Route — /messages
// ============================================================================

const messagesRoute: RouteDefinition = {
  '@id': 'route:messages',
  '@type': 'trellis:Route',
  routePath: '/messages',
  label: 'Messages',
  icon: 'lucide:message-square',
  order: 25,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Messages',
    description: 'Realtime team chat and threads',
    hideSidebar: false,
  },
  sidebarSections: [
    {
      label: 'CHANNELS',
      key: 'chat-channels',
      icon: 'lucide:hash',
      collapsible: true,
      editable: true,
      order: 10,
      items: [],
    },
    {
      label: 'DIRECT MESSAGES',
      key: 'chat-dms',
      icon: 'lucide:message-circle',
      collapsible: true,
      order: 20,
      items: [],
    },
    {
      label: 'THREADS',
      key: 'chat-threads',
      icon: 'lucide:git-branch',
      collapsible: true,
      order: 30,
      items: [],
    },
  ],
  children: [
    {
      '@id': 'route:messages/channel',
      '@type': 'trellis:Route',
      routePath: '/messages/:channelId',
      label: 'Channel',
      icon: 'lucide:hash',
      meta: { title: 'Channel' },
    },
    {
      '@id': 'route:messages/dm',
      '@type': 'trellis:Route',
      routePath: '/messages/dm/:userId',
      label: 'Direct Message',
      icon: 'lucide:message-circle',
      meta: { title: 'Direct Message' },
    },
  ],
}

// ============================================================================
// Pages Route — /pages
// ============================================================================

const pagesRoute: RouteDefinition = {
  '@id': 'route:pages',
  '@type': 'trellis:Route',
  routePath: '/pages',
  label: 'Pages',
  icon: 'lucide:notebook',
  order: 20,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Pages',
    description: 'Fullscreen document editor with folders',
    hideSidebar: false,
  },
  sidebarSections: [
    {
      label: 'PAGES',
      key: 'pages-list',
      icon: 'lucide:file-text',
      collapsible: true,
      editable: true,
      order: 10,
      items: [],
    },
  ],
  children: [
    {
      '@id': 'route:pages/page',
      '@type': 'trellis:Route',
      routePath: '/pages/:id',
      label: 'Page',
      icon: 'lucide:file-text',
      meta: { title: 'Page' },
    },
  ],
}

// ============================================================================
// Workflows Route — /workflows
// ============================================================================

const workflowsRoute: RouteDefinition = {
  '@id': 'route:workflows',
  '@type': 'trellis:Route',
  routePath: '/workflows',
  label: 'Workflows',
  icon: 'lucide:git-branch',
  order: 40,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Workflows',
    description: 'Build and manage agentic automation workflows',
  },
  sidebarSections: [
    {
      label: 'WORKFLOWS',
      key: 'workflows',
      icon: 'lucide:git-branch',
      collapsible: true,
      editable: true,
      order: 10,
    },
  ],
}

// ============================================================================
// Members Route — /settings/members (child of settings, not a standalone rail item)
// ============================================================================

const membersRoute: RouteDefinition = {
  '@id': 'route:members',
  '@type': 'trellis:Route',
  routePath: '/settings/members',
  label: 'Members',
  icon: 'lucide:users-round',
  order: 80,
  inRail: false,
  railPosition: 'secondary',
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: 'admin', permission: 'admin' },
  meta: {
    title: 'Members',
    description: 'Manage team members, invites, and permissions',
    sidebarSectionPath: '/settings',
  },
}

// ============================================================================
// Settings Route — /settings
// ============================================================================

const settingsRoute: RouteDefinition = {
  '@id': 'route:settings',
  '@type': 'trellis:Route',
  routePath: '/settings',
  label: 'Settings',
  icon: 'lucide:settings',
  order: 42,
  inRail: true,
  railPosition: 'secondary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Settings',
    description: 'Application settings',
  },
  sidebarSections: [
    {
      label: 'WORKSPACE',
      key: 'settings-workspace',
      icon: 'lucide:building-2',
      collapsible: true,
      order: 10,
      items: [
        {
          routePath: '/settings/project',
          label: 'Project',
          icon: 'lucide:folder',
          permissions: { minRole: 'admin', permission: 'admin' },
        },
        {
          routePath: '/settings/members',
          label: 'Members',
          icon: 'lucide:users-round',
          permissions: { minRole: 'admin', permission: 'admin' },
        },
        {
          routePath: '/settings/roles',
          label: 'Roles',
          icon: 'lucide:shield',
          permissions: { minRole: 'admin', permission: 'admin' },
        },
        {
          routePath: '/settings/branding',
          label: 'Branding',
          icon: 'lucide:sparkles',
          permissions: { minRole: 'admin', permission: 'admin' },
        },
      ],
    },
    {
      label: 'PREFERENCES',
      key: 'settings-preferences',
      icon: 'lucide:sliders-horizontal',
      collapsible: true,
      order: 20,
      items: [
        { routePath: '/settings/appearance', label: 'Appearance', icon: 'lucide:paintbrush' },
        { routePath: '/settings/theme', label: 'Theme', icon: 'lucide:palette' },
        { routePath: '/settings/notifications', label: 'Notifications', icon: 'lucide:bell' },
        { routePath: '/settings/shortcuts', label: 'Keyboard Shortcuts', icon: 'lucide:keyboard' },
      ],
    },
    {
      label: 'EXTENSIONS',
      key: 'settings-extensions',
      icon: 'lucide:plug',
      collapsible: true,
      order: 30,
      items: [
        {
          routePath: '/settings/marketplace',
          label: 'Marketplace',
          icon: 'lucide:store',
          permissions: { minRole: 'admin', permission: 'admin' },
        },
        {
          routePath: '/settings/integrations',
          label: 'Integrations',
          icon: 'lucide:plug',
          permissions: { minRole: 'admin', permission: 'admin' },
        },
      ],
    },
  ],
  children: [
    {
      '@id': 'route:settings/project',
      '@type': 'trellis:Route',
      routePath: '/settings/project',
      label: 'Project',
      icon: 'lucide:folder',
      permissions: { minRole: 'admin', permission: 'admin' },
      meta: { title: 'Project Settings' },
    },
    {
      '@id': 'route:settings/members',
      '@type': 'trellis:Route',
      routePath: '/settings/members',
      label: 'Members',
      icon: 'lucide:users-round',
      permissions: { minRole: 'admin', permission: 'admin' },
      meta: { title: 'Members', sidebarSectionPath: '/settings' },
    },
    {
      '@id': 'route:settings/roles',
      '@type': 'trellis:Route',
      routePath: '/settings/roles',
      label: 'Roles',
      icon: 'lucide:shield',
      permissions: { minRole: 'admin', permission: 'admin' },
      meta: { title: 'Roles' },
    },
    {
      '@id': 'route:settings/branding',
      '@type': 'trellis:Route',
      routePath: '/settings/branding',
      label: 'Branding',
      icon: 'lucide:sparkles',
      permissions: { minRole: 'admin', permission: 'admin' },
      meta: { title: 'Branding' },
    },
    {
      '@id': 'route:settings/appearance',
      '@type': 'trellis:Route',
      routePath: '/settings/appearance',
      label: 'Appearance',
      icon: 'lucide:paintbrush',
      meta: { title: 'Appearance' },
    },
    {
      '@id': 'route:settings/theme',
      '@type': 'trellis:Route',
      routePath: '/settings/theme',
      label: 'Theme',
      icon: 'lucide:palette',
      meta: { title: 'Theme' },
    },
    {
      '@id': 'route:settings/notifications',
      '@type': 'trellis:Route',
      routePath: '/settings/notifications',
      label: 'Notifications',
      icon: 'lucide:bell',
      meta: { title: 'Notifications' },
    },
    {
      '@id': 'route:settings/shortcuts',
      '@type': 'trellis:Route',
      routePath: '/settings/shortcuts',
      label: 'Keyboard Shortcuts',
      icon: 'lucide:keyboard',
      meta: { title: 'Keyboard Shortcuts' },
    },
    {
      '@id': 'route:settings/marketplace',
      '@type': 'trellis:Route',
      routePath: '/settings/marketplace',
      label: 'Marketplace',
      icon: 'lucide:store',
      permissions: { minRole: 'admin', permission: 'admin' },
      meta: { title: 'Marketplace' },
    },
    {
      '@id': 'route:settings/integrations',
      '@type': 'trellis:Route',
      routePath: '/settings/integrations',
      label: 'Integrations',
      icon: 'lucide:plug',
      permissions: { minRole: 'admin', permission: 'admin' },
      meta: { title: 'Integrations' },
    },
  ],
}

// ============================================================================
// All route definitions — keyed by route ID
// ============================================================================

export function getRouteDefinitions(): Record<string, RouteDefinition> {
  return {
    'route:home': homeRoute,
    'route:agent': agentRoute,
    'route:workspace': workspaceRoute,
    'route:calendar': calendarRoute,
    'route:contacts': contactsRoute,
    'route:mail': mailRoute,
    'route:messages': messagesRoute,
    'route:pages': pagesRoute,
    'route:database': databaseRoute,
    'route:graph': graphRoute,
    'route:workflows': workflowsRoute,
    'route:members': membersRoute,
    'route:settings': settingsRoute,
  }
}

export {
  homeRoute,
  agentRoute,
  workspaceRoute,
  calendarRoute,
  contactsRoute,
  mailRoute,
  messagesRoute,
  pagesRoute,
  databaseRoute,
  graphRoute,
  workflowsRoute,
  membersRoute,
  settingsRoute,
}
