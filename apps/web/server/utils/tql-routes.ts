/**
 * TQL Route Definitions
 *
 * Server-side route definitions for the Trellis workspace.
 * These replace the route nodes from app-config.jsonld.
 *
 * The client fetches these from GET /api/graph/config and converts
 * them into RouteConfig objects for navigation, sidebar, and breadcrumbs.
 */

import type { RouteDefinition } from '@toolkit/tql'

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
  inRail: true,
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
  inRail: true,
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
  icon: 'lucide:layout-grid',
  order: 10,
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
      label: 'TODAY',
      key: 'personal-today-section',
      icon: 'lucide:sun',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/workspace/welcome', label: 'Welcome', icon: 'lucide:home' },
        { routePath: '/workspace/today', label: 'Overview', icon: 'lucide:layout-dashboard' },
        { routePath: '/workspace/feed', label: 'Feed', icon: 'lucide:rss' },
      ],
    },
    {
      label: 'WORKSPACE',
      key: 'personal-workspace',
      icon: 'lucide:briefcase',
      collapsible: true,
      order: 20,
      items: [
        { routePath: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar', entityType: 'event', inRail: true, railPosition: 'primary', order: 15 },
        { routePath: '/workspace/projects', label: 'Projects', icon: 'lucide:folder-kanban', entityType: 'project' },
        { routePath: '/workspace/tasks', label: 'Tasks', icon: 'lucide:check-square', entityType: 'task' },
        { routePath: '/workspace/sprints', label: 'Sprints', icon: 'lucide:zap', entityType: 'sprint' },
        { routePath: '/workspace/milestones', label: 'Milestones', icon: 'lucide:flag', entityType: 'milestone' },
        { routePath: '/workspace/notes', label: 'Notes', icon: 'lucide:sticky-note', entityType: 'note' },
      ],
    },
    {
      label: 'PERSONAL',
      key: 'personal-personal',
      icon: 'lucide:user',
      collapsible: true,
      order: 25,
      items: [
        { routePath: '/workspace/people', label: 'People', icon: 'lucide:users', entityType: 'person' },
        { routePath: '/workspace/goals', label: 'Goals', icon: 'lucide:target', entityType: 'goal' },
        { routePath: '/workspace/budgets', label: 'Budgets', icon: 'lucide:wallet', entityType: 'budget' },
        { routePath: '/workspace/places', label: 'Places', icon: 'lucide:map-pin' },
      ],
    },
    {
      label: 'LIBRARY',
      key: 'personal-library',
      icon: 'lucide:library',
      collapsible: true,
      order: 30,
      items: [
        { routePath: '/workspace/documents', label: 'Documents', icon: 'lucide:file-text', entityType: 'page' },
        { routePath: '/workspace/bookmarks', label: 'Bookmarks', icon: 'lucide:bookmark', entityType: 'bookmark' },
      ],
    },
    {
      label: 'PAGES',
      key: 'personal-pages',
      icon: 'lucide:file-text',
      collapsible: true,
      editable: true,
      order: 40,
      items: [],
    },
  ],
  children: [
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
    title: 'Graph',
    description: 'Explore and query the knowledge graph',
    fullWidth: true,
  },
  sidebarSections: [
    {
      label: 'VIEWS',
      key: 'graph-views',
      icon: 'lucide:eye',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/graph/dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
        { routePath: '/graph/explorer', label: 'Explorer', icon: 'lucide:network' },
        { routePath: '/graph/query', label: 'Query', icon: 'lucide:terminal' },
        { routePath: '/graph/ontology', label: 'Ontology', icon: 'lucide:shapes' },
        { routePath: '/graph/activity', label: 'Activity', icon: 'lucide:activity' },
      ],
    },
  ],
  children: [
    {
      '@id': 'route:graph/dashboard',
      '@type': 'trellis:Route',
      routePath: '/graph/dashboard',
      label: 'Dashboard',
      icon: 'lucide:layout-dashboard',
      meta: { title: 'Graph Dashboard', description: 'Overview of your knowledge graph' },
    },
    {
      '@id': 'route:graph/explorer',
      '@type': 'trellis:Route',
      routePath: '/graph/explorer',
      label: 'Explorer',
      icon: 'lucide:network',
      meta: { title: 'Graph Explorer', description: 'Visual graph exploration', fullWidth: true },
    },
    {
      '@id': 'route:graph/query',
      '@type': 'trellis:Route',
      routePath: '/graph/query',
      label: 'Query',
      icon: 'lucide:terminal',
      meta: { title: 'Graph Query', description: 'Run EQL-S queries', fullWidth: true },
    },
    {
      '@id': 'route:graph/ontology',
      '@type': 'trellis:Route',
      routePath: '/graph/ontology',
      label: 'Ontology',
      icon: 'lucide:shapes',
      tabs: [
        { label: 'Core Ontology', to: '/graph/ontology?tab=core', icon: 'lucide:lock' },
        { label: 'Entity Registry', to: '/graph/ontology?tab=registry', icon: 'lucide:layers' },
      ],
      meta: { title: 'Ontology Visualizer', description: 'Schema visualization', fullWidth: true },
    },
    {
      '@id': 'route:graph/activity',
      '@type': 'trellis:Route',
      routePath: '/graph/activity',
      label: 'Activity',
      icon: 'lucide:activity',
      meta: { title: 'Graph Activity', description: 'Mutation log and event stream' },
    },
  ],
}

// ============================================================================
// Calendar Route — /workspace/calendar (top-level for icon rail)
// ============================================================================

const calendarRoute: RouteDefinition = {
  '@id': 'route:calendar',
  '@type': 'trellis:Route',
  routePath: '/workspace/calendar',
  label: 'Calendar',
  icon: 'lucide:calendar',
  order: 12,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: true,
  meta: {
    title: 'Calendar',
    description: 'View and manage your schedule',
    hideSidebar: true,
  },
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
// Marketplace Route — /marketplace
// ============================================================================

const marketplaceRoute: RouteDefinition = {
  '@id': 'route:marketplace',
  '@type': 'trellis:Route',
  routePath: '/marketplace',
  label: 'Marketplace',
  icon: 'lucide:store',
  order: 38,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: 'admin', permission: 'read' },
  meta: {
    title: 'Marketplace',
    description: 'Browse and install workspace templates',
  },
  sidebarSections: [
    {
      label: 'BROWSE',
      key: 'marketplace-browse',
      icon: 'lucide:compass',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/marketplace', label: 'All Templates', icon: 'lucide:layout-grid' },
        { routePath: '/marketplace/featured', label: 'Featured', icon: 'lucide:star' },
      ],
    },
    {
      label: 'CATEGORIES',
      key: 'marketplace-categories',
      icon: 'lucide:tag',
      collapsible: true,
      order: 20,
      items: [
        { routePath: '/marketplace/category/utilities', label: 'Utilities', icon: 'lucide:wrench' },
        { routePath: '/marketplace/category/project-management', label: 'Project Management', icon: 'lucide:folder-kanban' },
        { routePath: '/marketplace/category/finance', label: 'Finance', icon: 'lucide:wallet' },
        { routePath: '/marketplace/category/education', label: 'Education', icon: 'lucide:graduation-cap' },
        { routePath: '/marketplace/category/crm', label: 'CRM', icon: 'lucide:users' },
      ],
    },
    {
      label: 'INSTALLED',
      key: 'marketplace-installed',
      icon: 'lucide:check-circle',
      collapsible: true,
      order: 30,
      items: [
        { routePath: '/marketplace/installed', label: 'My Templates', icon: 'lucide:package-check' },
      ],
    },
  ],
  children: [
    {
      '@id': 'route:marketplace/index',
      '@type': 'trellis:Route',
      routePath: '/marketplace',
      label: 'All Templates',
      icon: 'lucide:layout-grid',
      meta: { title: 'Marketplace', description: 'Browse workspace templates' },
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
  inRail: false,
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
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Settings',
    description: 'Application settings',
  },
  sidebarSections: [
    {
      label: 'SETTINGS',
      key: 'settings',
      icon: 'lucide:settings',
      collapsible: true,
      order: 10,
      items: [
        { routePath: '/settings/project', label: 'Project', icon: 'lucide:folder' },
        { routePath: '/settings/profile', label: 'Profile', icon: 'lucide:user' },
        { routePath: '/settings/members', label: 'Members', icon: 'lucide:users-round' },
        { routePath: '/settings/appearance', label: 'Appearance', icon: 'lucide:paintbrush' },
        { routePath: '/settings/theme', label: 'Theme', icon: 'lucide:palette' },
        { routePath: '/settings/notifications', label: 'Notifications', icon: 'lucide:bell' },
        { routePath: '/settings/pages', label: 'Pages', icon: 'lucide:book-open' },
        { routePath: '/settings/integrations', label: 'Integrations', icon: 'lucide:plug' },
        { routePath: '/settings/marketplace', label: 'Marketplace', icon: 'lucide:store' },
        { routePath: '/settings/branding', label: 'Branding', icon: 'lucide:sparkles' },
      ],
    },
  ],
  children: [
    { '@id': 'route:settings/project', '@type': 'trellis:Route', routePath: '/settings/project', label: 'Project', icon: 'lucide:folder', permissions: { minRole: 'admin', permission: 'admin' }, meta: { title: 'Project Settings' } },
    { '@id': 'route:settings/profile', '@type': 'trellis:Route', routePath: '/settings/profile', label: 'Profile', icon: 'lucide:user', meta: { title: 'Profile Settings' } },
    { '@id': 'route:settings/members', '@type': 'trellis:Route', routePath: '/settings/members', label: 'Members', icon: 'lucide:users-round', permissions: { minRole: 'admin', permission: 'admin' }, meta: { title: 'Members', sidebarSectionPath: '/settings' } },
    { '@id': 'route:settings/appearance', '@type': 'trellis:Route', routePath: '/settings/appearance', label: 'Appearance', icon: 'lucide:paintbrush', meta: { title: 'Appearance' } },
    { '@id': 'route:settings/theme', '@type': 'trellis:Route', routePath: '/settings/theme', label: 'Theme', icon: 'lucide:palette', meta: { title: 'Theme' } },
    { '@id': 'route:settings/notifications', '@type': 'trellis:Route', routePath: '/settings/notifications', label: 'Notifications', icon: 'lucide:bell', meta: { title: 'Notifications' } },
    { '@id': 'route:settings/pages', '@type': 'trellis:Route', routePath: '/settings/pages', label: 'Pages', icon: 'lucide:book-open', permissions: { minRole: 'admin', permission: 'admin' }, meta: { title: 'Pages' } },
    { '@id': 'route:settings/integrations', '@type': 'trellis:Route', routePath: '/settings/integrations', label: 'Integrations', icon: 'lucide:plug', permissions: { minRole: 'admin', permission: 'admin' }, meta: { title: 'Integrations' } },
    { '@id': 'route:settings/marketplace', '@type': 'trellis:Route', routePath: '/settings/marketplace', label: 'Marketplace', icon: 'lucide:store', permissions: { minRole: 'admin', permission: 'admin' }, meta: { title: 'Marketplace' } },
    { '@id': 'route:settings/branding', '@type': 'trellis:Route', routePath: '/settings/branding', label: 'Branding', icon: 'lucide:sparkles', permissions: { minRole: 'admin', permission: 'admin' }, meta: { title: 'Branding' } },
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
    'route:messages': messagesRoute,
    'route:database': databaseRoute,
    'route:graph': graphRoute,
    'route:marketplace': marketplaceRoute,
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
  messagesRoute,
  databaseRoute,
  graphRoute,
  marketplaceRoute,
  workflowsRoute,
  membersRoute,
  settingsRoute,
}
