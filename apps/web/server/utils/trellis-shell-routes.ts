/**
 * Trellis shell route definitions
 *
 * Navigation chrome only — rail, sidebar, collapse. Projection eligibility
 * lives in `app/lib/trellis-projection-registry/` (ADR-001 Phase 2b).
 *
 * Server-side route definitions for the Trellis workspace.
 * These replace the route nodes from app-config.jsonld.
 *
 * The client fetches these from GET /api/graph/config and converts
 * them into RouteConfig objects for navigation, sidebar, and breadcrumbs.
 */

import type { RouteDefinition } from '@turtle.tech/trellis-kernel'

// ============================================================================
// Home Route — /home
// ============================================================================

const homeRoute: RouteDefinition = {
  '@id': 'route:home',
  '@type': 'trellis:Route',
  routePath: '/home',
  label: 'Chat',
  icon: 'lucide:bot',
  order: 0,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: false,
  searchKeywords: ['home', 'chat', 'ask', 'assistant', 'agent'],
  meta: {
    title: 'Chat',
    description: 'Chat with your Trellis assistant',
    hideSidebar: false,
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
  label: 'Collections',
  icon: 'lucide:layers',
  order: 1,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  meta: {
    title: 'Collections',
    description: 'Your collections and pages',
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
    {
      label: 'WORKSHOP',
      key: 'workshop-sheets',
      icon: 'lucide:hammer',
      collapsible: true,
      editable: true,
      order: 25,
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
      '@id': 'route:workspace/places',
      '@type': 'trellis:Route',
      routePath: '/workspace/places',
      label: 'Places',
      icon: 'lucide:map-pin',
      meta: { title: 'Places', description: 'Saved locations' },
    },
  ],
}

// ============================================================================
// Ontologies Route — /ontologies
// ============================================================================
//
// Previously /database. Renamed to match the TQL/MCP/CLI domain vocabulary.
// The /database/* paths remain as redirect shims in app/pages/database/ to
// preserve any outstanding links.

const ontologiesRoute: RouteDefinition = {
  '@id': 'route:ontologies',
  '@type': 'trellis:Route',
  routePath: '/ontologies',
  label: 'Ontologies',
  icon: 'lucide:shapes',
  order: 2,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: 'admin', permission: 'read' },
  pageVariant: 'database',
  meta: {
    title: 'Ontologies',
    description: 'Define the shape of your data — types, fields, and relationships',
    fullWidth: true,
  },
  sidebarSections: [
    {
      label: 'TOOLS',
      key: 'ontologies-tools',
      icon: 'lucide:wrench',
      collapsible: true,
      order: 0,
      items: [
        { routePath: '/ontologies/graph', label: 'Graph view', icon: 'lucide:git-branch' },
        { routePath: '/ontologies/explorer', label: 'Explorer', icon: 'lucide:search' },
        { routePath: '/query', label: 'Query console', icon: 'lucide:terminal' },
        { routePath: '/ontologies/activity', label: 'Activity log', icon: 'lucide:scroll-text' },
      ],
    },
    {
      label: 'CUSTOM',
      key: 'ontologies-custom',
      icon: 'lucide:blocks',
      items: 'unpinned',
      collapsible: true,
      editable: true,
      order: 1,
    },
    {
      label: 'SYSTEM',
      key: 'ontologies-system',
      icon: 'lucide:lock',
      collapsible: true,
      order: 2,
    },
    {
      label: 'CORE',
      key: 'ontologies-core',
      icon: 'lucide:shield',
      collapsible: true,
      defaultCollapsed: true,
      order: 3,
    },
  ],
  children: [
    {
      '@id': 'route:ontologies/graph',
      '@type': 'trellis:Route',
      routePath: '/ontologies/graph',
      label: 'Graph',
      icon: 'lucide:git-branch',
      meta: { title: 'Ontology Graph', description: 'Visualize schema relationships', fullWidth: true },
    },
    {
      '@id': 'route:ontologies/explorer',
      '@type': 'trellis:Route',
      routePath: '/ontologies/explorer',
      label: 'Explorer',
      icon: 'lucide:search',
      meta: { title: 'Entity Explorer', description: 'Browse, search, and inspect graph entities' },
    },
    {
      '@id': 'route:ontologies/activity',
      '@type': 'trellis:Route',
      routePath: '/ontologies/activity',
      label: 'Activity',
      icon: 'lucide:scroll-text',
      meta: { title: 'Activity Log', description: 'Graph mutation log and event stream' },
    },
  ],
}

// Top-level Query Console — promoted from /database/query.
const queryRoute: RouteDefinition = {
  '@id': 'route:query',
  '@type': 'trellis:Route',
  routePath: '/query',
  label: 'Query',
  icon: 'lucide:terminal',
  order: 2.5,
  inRail: false,
  inCommandPalette: true,
  requiresAuth: true,
  permissions: { minRole: 'admin', permission: 'read' },
  meta: { title: 'Query Console', description: 'Run EQL-S queries', fullWidth: true },
}

// ============================================================================
// Graph Route — /graph
// ============================================================================

const graphRoute: RouteDefinition = {
  '@id': 'route:graph',
  '@type': 'trellis:Route',
  routePath: '/graph',
  label: 'Graph',
  icon: 'lucide:brain',
  order: 3,
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
// Locations Route — /locations
// ============================================================================

const locationsRoute: RouteDefinition = {
  '@id': 'route:locations',
  '@type': 'trellis:Route',
  routePath: '/locations',
  label: 'Locations',
  icon: 'lucide:map-pin',
  order: 3.5,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  collapseSidebar: false,
  searchKeywords: ['locations', 'map', 'places', 'geo', 'travel'],
  meta: {
    title: 'Locations',
    description: 'Map view of places in your graph',
    fullWidth: true,
    hideSidebar: false,
  },
}

// ============================================================================
// Sheets Route — /sheets (Workshop zone; icon rail)
// ============================================================================

const sheetsRoute: RouteDefinition = {
  '@id': 'route:sheets',
  '@type': 'trellis:Route',
  routePath: '/sheets',
  label: 'Sheets',
  icon: 'lucide:table-2',
  order: 25,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  searchKeywords: ['sheets', 'spreadsheet', 'projection', 'workshop'],
  meta: {
    title: 'Sheets',
    description: 'Graph-native sheet projections',
    sidebarSectionPath: '/workspace',
    fullWidth: true,
    hideSidebar: false,
  },
  children: [
    {
      '@id': 'route:sheets/sheet',
      '@type': 'trellis:Route',
      routePath: '/sheets/:id',
      label: 'Sheet',
      icon: 'lucide:table-2',
      meta: {
        title: 'Sheet',
        sidebarSectionPath: '/workspace',
        fullWidth: true,
      },
    },
  ],
}

const decksRoute: RouteDefinition = {
  '@id': 'route:decks',
  '@type': 'trellis:Route',
  routePath: '/decks',
  label: 'Decks',
  icon: 'lucide:presentation',
  order: 26,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  searchKeywords: ['decks', 'presentation', 'slides', 'workshop'],
  meta: {
    title: 'Decks',
    description: 'Graph-native deck projections',
    fullWidth: true,
    hideSidebar: false,
  },
  children: [
    {
      '@id': 'route:decks/deck',
      '@type': 'trellis:Route',
      routePath: '/decks/:id',
      label: 'Deck',
      icon: 'lucide:presentation',
      collapseSidebar: true,
      meta: {
        title: 'Deck',
        fullWidth: true,
      },
    },
    {
      '@id': 'route:decks/sorter',
      '@type': 'trellis:Route',
      routePath: '/decks/:id/sorter',
      label: 'Sorter',
      icon: 'lucide:gallery-horizontal',
      collapseSidebar: true,
      meta: {
        title: 'Deck sorter',
        fullWidth: true,
      },
    },
    {
      '@id': 'route:decks/thumb',
      '@type': 'trellis:Route',
      routePath: '/decks/:id/thumb',
      label: 'Thumbnails',
      icon: 'lucide:layout-grid',
      collapseSidebar: true,
      meta: {
        title: 'Deck thumbnails',
        fullWidth: true,
      },
    },
    {
      '@id': 'route:decks/present',
      '@type': 'trellis:Route',
      routePath: '/decks/:id/present',
      label: 'Present',
      icon: 'lucide:monitor-play',
      collapseSidebar: true,
      meta: {
        title: 'Present',
        fullWidth: true,
      },
    },
  ],
}

const canvasesRoute: RouteDefinition = {
  '@id': 'route:canvases',
  '@type': 'trellis:Route',
  routePath: '/canvases',
  label: 'Canvases',
  icon: 'lucide:layout-dashboard',
  order: 27,
  inRail: true,
  railPosition: 'primary',
  inCommandPalette: true,
  requiresAuth: true,
  searchKeywords: ['canvas', 'board', 'spatial', 'workshop'],
  sidebarSections: [
    {
      label: 'CANVASES',
      key: 'canvases-list',
      icon: 'lucide:layout-dashboard',
      collapsible: true,
      editable: true,
      order: 11,
      items: [],
    },
  ],
  meta: {
    title: 'Canvases',
    description: 'Graph-native spatial canvas boards',
    fullWidth: true,
    hideSidebar: false,
  },
  children: [
    {
      '@id': 'route:canvases/canvas',
      '@type': 'trellis:Route',
      routePath: '/canvases/:id',
      label: 'Canvas',
      icon: 'lucide:layout-dashboard',
      meta: {
        title: 'Canvas',
        fullWidth: true,
        sidebarCollapsible: true,
      },
    },
  ],
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
  inRail: false,
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
          routePath: '/settings/profile',
          label: 'Profile',
          icon: 'lucide:user',
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
        { routePath: '/settings/shortcuts', label: 'Keyboard Shortcuts', icon: 'lucide:keyboard' },
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
      '@id': 'route:settings/shortcuts',
      '@type': 'trellis:Route',
      routePath: '/settings/shortcuts',
      label: 'Keyboard Shortcuts',
      icon: 'lucide:keyboard',
      meta: { title: 'Keyboard Shortcuts' },
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
    'route:ontologies': ontologiesRoute,
    'route:query': queryRoute,
    'route:graph': graphRoute,
    'route:locations': locationsRoute,
    'route:sheets': sheetsRoute,
    'route:decks': decksRoute,
    'route:canvases': canvasesRoute,
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
  ontologiesRoute,
  queryRoute,
  graphRoute,
  locationsRoute,
  sheetsRoute,
  decksRoute,
  canvasesRoute,
  settingsRoute,
}
