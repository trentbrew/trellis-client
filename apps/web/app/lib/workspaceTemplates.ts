/**
 * Built-in Workspace Templates
 *
 * Each template defines a complete World configuration:
 * ontology types, sidebar tree, and optional pages/seed data.
 *
 * These are the templates available in the Ontology Marketplace.
 * The "Personal Knowledge Management" template corresponds to the
 * current default workspace sidebar (DEFAULT_WORKSPACE_SIDEBAR).
 */

import type { WorkspaceTemplate } from '~/types/workspace-template'
import type { SidebarNodeSeed } from '~/composables/useSidebarTree'
import { DEFAULT_WORKSPACE_SIDEBAR } from '~/lib/sidebarSeeds'

// ── Personal Knowledge Management (current default) ────────────────────

export const PKM_TEMPLATE: WorkspaceTemplate = {
  id: 'pkm',
  name: 'Personal Knowledge Management',
  slug: 'pkm',
  version: '1.0.0',
  description: 'Tasks, notes, projects, people, and documents — the default Trellis workspace',
  longDescription: 'A complete personal knowledge management system. Track tasks and projects with kanban boards, write notes with rich text, manage contacts, and organize everything with folders and tags.',
  icon: 'lucide:brain',
  category: 'utilities',
  color: 'blue',
  tier: 'official',
  author: { name: 'Trellis' },
  license: 'MIT',
  tags: ['pkm', 'tasks', 'notes', 'projects', 'personal'],
  featured: true,
  downloads: 50000,
  rating: 4.9,
  sidebarTree: DEFAULT_WORKSPACE_SIDEBAR,
  entityTypes: [
    { id: 'task', name: 'Task', pluralName: 'Tasks', icon: 'lucide:check-square', description: 'Track work items', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'status', name: 'Status', type: 'select' }, { id: 'priority', name: 'Priority', type: 'select' }, { id: 'startDate', name: 'Due Date', type: 'date' }], views: ['kanban', 'list', 'table'] },
    { id: 'note', name: 'Note', pluralName: 'Notes', icon: 'lucide:sticky-note', description: 'Rich text notes', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'content', name: 'Content', type: 'richtext' }], views: ['card-grid', 'list'] },
    { id: 'project', name: 'Project', pluralName: 'Projects', icon: 'lucide:folder-kanban', description: 'Group tasks and milestones', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'status', name: 'Status', type: 'select' }], views: ['kanban', 'list', 'table'] },
    { id: 'person', name: 'Person', pluralName: 'People', icon: 'lucide:user', description: 'Contacts and people', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }, { id: 'email', name: 'Email', type: 'email' }], views: ['table', 'card-grid'] },
    { id: 'event', name: 'Event', pluralName: 'Events', icon: 'lucide:calendar', description: 'Calendar events', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'startDate', name: 'Date', type: 'datetime' }], views: ['calendar', 'list'] },
    { id: 'bookmark', name: 'Bookmark', pluralName: 'Bookmarks', icon: 'lucide:bookmark', description: 'Saved links', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'url', name: 'URL', type: 'url', required: true }], views: ['card-grid', 'table'] },
  ],
  views: [],
  widgets: [],
}

// ── Personal Finance ───────────────────────────────────────────────────

const FINANCE_SIDEBAR: SidebarNodeSeed[] = [
  {
    id: 'fin-pinned',
    label: 'PINNED',
    icon: 'lucide:pin',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 1,
    sectionKey: 'personal-pinned',
    specialItems: 'pinned',
  },
  {
    id: 'fin-overview',
    label: 'OVERVIEW',
    icon: 'lucide:layout-dashboard',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 10,
    children: [
      { id: 'fin-dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard', routePath: '/workspace/today', scope: 'workspace', nodeType: 'item', locked: true, order: 1 },
      { id: 'fin-net-worth', label: 'Net Worth', icon: 'lucide:trending-up', routePath: '/workspace/goals', entityType: 'goal', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'fin-accounts',
    label: 'ACCOUNTS',
    icon: 'lucide:landmark',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 20,
    children: [
      { id: 'fin-budgets', label: 'Budgets', icon: 'lucide:wallet', routePath: '/workspace/budgets', entityType: 'budget', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'fin-payments', label: 'Transactions', icon: 'lucide:credit-card', routePath: '/workspace/payments', entityType: 'payment', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'fin-planning',
    label: 'PLANNING',
    icon: 'lucide:target',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 30,
    children: [
      { id: 'fin-goals', label: 'Financial Goals', icon: 'lucide:target', routePath: '/workspace/goals', entityType: 'goal', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'fin-calendar', label: 'Calendar', icon: 'lucide:calendar', routePath: '/workspace/calendar', entityType: 'event', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'fin-reminders', label: 'Reminders', icon: 'lucide:bell', routePath: '/workspace/reminders', entityType: 'reminder', scope: 'workspace', nodeType: 'item', order: 3 },
    ],
  },
  {
    id: 'fin-pages',
    label: 'PAGES',
    icon: 'lucide:file-text',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 40,
    sectionKey: 'personal-pages',
    specialItems: 'pages',
    editable: true,
  },
]

export const FINANCE_TEMPLATE: WorkspaceTemplate = {
  id: 'personal-finance',
  name: 'Personal Finance',
  slug: 'personal-finance',
  version: '1.0.0',
  description: 'Budgets, transactions, financial goals, and net worth tracking',
  icon: 'lucide:wallet',
  category: 'finance',
  color: 'emerald',
  tier: 'official',
  author: { name: 'Trellis' },
  license: 'MIT',
  tags: ['finance', 'budgets', 'transactions', 'money'],
  featured: true,
  downloads: 12000,
  rating: 4.7,
  sidebarTree: FINANCE_SIDEBAR,
  entityTypes: [
    { id: 'budget', name: 'Budget', pluralName: 'Budgets', icon: 'lucide:wallet', description: 'Monthly/yearly budgets', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }, { id: 'amount', name: 'Amount', type: 'currency' }, { id: 'startDate', name: 'Period Start', type: 'date' }], views: ['list', 'table'] },
    { id: 'payment', name: 'Transaction', pluralName: 'Transactions', icon: 'lucide:credit-card', description: 'Income and expenses', fields: [{ id: 'title', name: 'Description', type: 'text', required: true }, { id: 'amount', name: 'Amount', type: 'currency' }, { id: 'startDate', name: 'Date', type: 'date' }], views: ['table', 'list'] },
    { id: 'goal', name: 'Financial Goal', pluralName: 'Financial Goals', icon: 'lucide:target', description: 'Savings and investment goals', fields: [{ id: 'title', name: 'Goal', type: 'text', required: true }, { id: 'targetValue', name: 'Target', type: 'currency' }, { id: 'currentValue', name: 'Current', type: 'currency' }], views: ['kanban', 'list'] },
  ],
  views: [],
  widgets: [],
}

// ── Company HQ ─────────────────────────────────────────────────────────

const COMPANY_SIDEBAR: SidebarNodeSeed[] = [
  {
    id: 'co-pinned',
    label: 'PINNED',
    icon: 'lucide:pin',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 1,
    sectionKey: 'personal-pinned',
    specialItems: 'pinned',
  },
  {
    id: 'co-dashboard',
    label: 'DASHBOARD',
    icon: 'lucide:layout-dashboard',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 10,
    children: [
      { id: 'co-overview', label: 'Overview', icon: 'lucide:layout-dashboard', routePath: '/workspace/today', scope: 'workspace', nodeType: 'item', locked: true, order: 1 },
      { id: 'co-feed', label: 'Activity Feed', icon: 'lucide:rss', routePath: '/workspace/feed', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'co-team',
    label: 'TEAM',
    icon: 'lucide:users',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 20,
    children: [
      { id: 'co-people', label: 'People', icon: 'lucide:users', routePath: '/workspace/people', entityType: 'person', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'co-orgs', label: 'Departments', icon: 'lucide:building-2', routePath: '/workspace/organizations', entityType: 'organization', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'co-projects',
    label: 'PROJECTS',
    icon: 'lucide:folder-kanban',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 30,
    children: [
      { id: 'co-active', label: 'Active Projects', icon: 'lucide:folder-kanban', routePath: '/workspace/projects', entityType: 'project', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'co-tasks', label: 'Tasks', icon: 'lucide:check-square', routePath: '/workspace/tasks', entityType: 'task', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'co-sprints', label: 'Sprints', icon: 'lucide:zap', routePath: '/workspace/sprints', entityType: 'sprint', scope: 'workspace', nodeType: 'item', order: 3 },
      { id: 'co-milestones', label: 'Milestones', icon: 'lucide:flag', routePath: '/workspace/milestones', entityType: 'milestone', scope: 'workspace', nodeType: 'item', order: 4 },
    ],
  },
  {
    id: 'co-operations',
    label: 'OPERATIONS',
    icon: 'lucide:cog',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 40,
    children: [
      { id: 'co-calendar', label: 'Calendar', icon: 'lucide:calendar', routePath: '/workspace/calendar', entityType: 'event', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'co-goals', label: 'Goals & OKRs', icon: 'lucide:target', routePath: '/workspace/goals', entityType: 'goal', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'co-budgets', label: 'Budgets', icon: 'lucide:wallet', routePath: '/workspace/budgets', entityType: 'budget', scope: 'workspace', nodeType: 'item', order: 3 },
    ],
  },
  {
    id: 'co-resources',
    label: 'RESOURCES',
    icon: 'lucide:library',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 50,
    children: [
      { id: 'co-docs', label: 'Documents', icon: 'lucide:file-text', routePath: '/workspace/documents', entityType: 'page', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'co-notes', label: 'Notes', icon: 'lucide:sticky-note', routePath: '/workspace/notes', entityType: 'note', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'co-bookmarks', label: 'Bookmarks', icon: 'lucide:bookmark', routePath: '/workspace/bookmarks', entityType: 'bookmark', scope: 'workspace', nodeType: 'item', order: 3 },
    ],
  },
  {
    id: 'co-pages',
    label: 'PAGES',
    icon: 'lucide:file-text',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 60,
    sectionKey: 'personal-pages',
    specialItems: 'pages',
    editable: true,
  },
]

export const COMPANY_TEMPLATE: WorkspaceTemplate = {
  id: 'company-hq',
  name: 'Company HQ',
  slug: 'company-hq',
  version: '1.0.0',
  description: 'Team management, projects, operations, and company resources',
  icon: 'lucide:building-2',
  category: 'project-management',
  color: 'blue',
  tier: 'official',
  author: { name: 'Trellis' },
  license: 'MIT',
  tags: ['company', 'team', 'projects', 'operations'],
  featured: true,
  downloads: 18000,
  rating: 4.8,
  sidebarTree: COMPANY_SIDEBAR,
  entityTypes: [
    { id: 'task', name: 'Task', pluralName: 'Tasks', icon: 'lucide:check-square', description: 'Work items', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'status', name: 'Status', type: 'select' }], views: ['kanban', 'table'] },
    { id: 'project', name: 'Project', pluralName: 'Projects', icon: 'lucide:folder-kanban', description: 'Active projects', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }], views: ['kanban', 'timeline'] },
    { id: 'person', name: 'Person', pluralName: 'People', icon: 'lucide:user', description: 'Team members', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }], views: ['table'] },
    { id: 'event', name: 'Event', pluralName: 'Events', icon: 'lucide:calendar', description: 'Meetings and events', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }], views: ['calendar'] },
    { id: 'note', name: 'Note', pluralName: 'Notes', icon: 'lucide:sticky-note', description: 'Team notes', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }], views: ['card-grid'] },
  ],
  views: [],
  widgets: [],
}

// ── Game Development ───────────────────────────────────────────────────

const GAMEDEV_SIDEBAR: SidebarNodeSeed[] = [
  {
    id: 'gd-pinned',
    label: 'PINNED',
    icon: 'lucide:pin',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 1,
    sectionKey: 'personal-pinned',
    specialItems: 'pinned',
  },
  {
    id: 'gd-overview',
    label: 'OVERVIEW',
    icon: 'lucide:gamepad-2',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 10,
    children: [
      { id: 'gd-dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard', routePath: '/workspace/today', scope: 'workspace', nodeType: 'item', locked: true, order: 1 },
      { id: 'gd-feed', label: 'Dev Log', icon: 'lucide:rss', routePath: '/workspace/feed', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'gd-design',
    label: 'DESIGN',
    icon: 'lucide:palette',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 20,
    children: [
      { id: 'gd-gdd', label: 'Game Design Doc', icon: 'lucide:book-open', routePath: '/workspace/documents', entityType: 'page', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'gd-notes', label: 'Design Notes', icon: 'lucide:sticky-note', routePath: '/workspace/notes', entityType: 'note', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'gd-refs', label: 'References', icon: 'lucide:bookmark', routePath: '/workspace/bookmarks', entityType: 'bookmark', scope: 'workspace', nodeType: 'item', order: 3 },
    ],
  },
  {
    id: 'gd-engineering',
    label: 'ENGINEERING',
    icon: 'lucide:code',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 30,
    children: [
      { id: 'gd-tasks', label: 'Tasks', icon: 'lucide:check-square', routePath: '/workspace/tasks', entityType: 'task', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'gd-sprints', label: 'Sprints', icon: 'lucide:zap', routePath: '/workspace/sprints', entityType: 'sprint', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'gd-production',
    label: 'PRODUCTION',
    icon: 'lucide:kanban',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 40,
    children: [
      { id: 'gd-projects', label: 'Projects', icon: 'lucide:folder-kanban', routePath: '/workspace/projects', entityType: 'project', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'gd-milestones', label: 'Milestones', icon: 'lucide:flag', routePath: '/workspace/milestones', entityType: 'milestone', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'gd-calendar', label: 'Timeline', icon: 'lucide:calendar', routePath: '/workspace/calendar', entityType: 'event', scope: 'workspace', nodeType: 'item', order: 3 },
      { id: 'gd-budgets', label: 'Budget', icon: 'lucide:wallet', routePath: '/workspace/budgets', entityType: 'budget', scope: 'workspace', nodeType: 'item', order: 4 },
    ],
  },
  {
    id: 'gd-pages',
    label: 'PAGES',
    icon: 'lucide:file-text',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 50,
    sectionKey: 'personal-pages',
    specialItems: 'pages',
    editable: true,
  },
]

export const GAMEDEV_TEMPLATE: WorkspaceTemplate = {
  id: 'game-dev',
  name: 'Game Development',
  slug: 'game-dev',
  version: '1.0.0',
  description: 'GDD, art pipeline, engineering tasks, and production milestones',
  icon: 'lucide:gamepad-2',
  category: 'project-management',
  color: 'violet',
  tier: 'official',
  author: { name: 'Trellis' },
  license: 'MIT',
  tags: ['gamedev', 'game-design', 'production', 'sprints'],
  featured: true,
  downloads: 8500,
  rating: 4.6,
  sidebarTree: GAMEDEV_SIDEBAR,
  entityTypes: [
    { id: 'task', name: 'Task', pluralName: 'Tasks', icon: 'lucide:check-square', description: 'Dev tasks and bugs', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'status', name: 'Status', type: 'select' }, { id: 'priority', name: 'Priority', type: 'select' }], views: ['kanban', 'table'] },
    { id: 'project', name: 'Project', pluralName: 'Projects', icon: 'lucide:folder-kanban', description: 'Game projects', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }], views: ['kanban'] },
    { id: 'milestone', name: 'Milestone', pluralName: 'Milestones', icon: 'lucide:flag', description: 'Release milestones', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }, { id: 'date', name: 'Target Date', type: 'date' }], views: ['timeline'] },
    { id: 'note', name: 'Note', pluralName: 'Notes', icon: 'lucide:sticky-note', description: 'Design notes', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }], views: ['card-grid'] },
    { id: 'bookmark', name: 'Bookmark', pluralName: 'Bookmarks', icon: 'lucide:bookmark', description: 'References and links', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'url', name: 'URL', type: 'url' }], views: ['card-grid'] },
  ],
  views: [],
  widgets: [],
}

// ── University Student ─────────────────────────────────────────────────

const STUDENT_SIDEBAR: SidebarNodeSeed[] = [
  {
    id: 'stu-pinned',
    label: 'PINNED',
    icon: 'lucide:pin',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 1,
    sectionKey: 'personal-pinned',
    specialItems: 'pinned',
  },
  {
    id: 'stu-dashboard',
    label: 'DASHBOARD',
    icon: 'lucide:layout-dashboard',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 10,
    children: [
      { id: 'stu-overview', label: 'Overview', icon: 'lucide:layout-dashboard', routePath: '/workspace/today', scope: 'workspace', nodeType: 'item', locked: true, order: 1 },
      { id: 'stu-calendar', label: 'Schedule', icon: 'lucide:calendar', routePath: '/workspace/calendar', entityType: 'event', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'stu-assignments',
    label: 'ASSIGNMENTS',
    icon: 'lucide:check-square',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 20,
    children: [
      { id: 'stu-tasks', label: 'Assignments', icon: 'lucide:check-square', routePath: '/workspace/tasks', entityType: 'task', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'stu-projects', label: 'Projects', icon: 'lucide:folder-kanban', routePath: '/workspace/projects', entityType: 'project', scope: 'workspace', nodeType: 'item', order: 2 },
      { id: 'stu-deadlines', label: 'Deadlines', icon: 'lucide:alarm-clock', routePath: '/workspace/milestones', entityType: 'milestone', scope: 'workspace', nodeType: 'item', order: 3 },
    ],
  },
  {
    id: 'stu-notes',
    label: 'NOTES',
    icon: 'lucide:sticky-note',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 30,
    children: [
      { id: 'stu-lecture-notes', label: 'Lecture Notes', icon: 'lucide:sticky-note', routePath: '/workspace/notes', entityType: 'note', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'stu-documents', label: 'Documents', icon: 'lucide:file-text', routePath: '/workspace/documents', entityType: 'page', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'stu-resources',
    label: 'RESOURCES',
    icon: 'lucide:library',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 40,
    children: [
      { id: 'stu-bookmarks', label: 'Bookmarks', icon: 'lucide:bookmark', routePath: '/workspace/bookmarks', entityType: 'bookmark', scope: 'workspace', nodeType: 'item', order: 1 },
      { id: 'stu-people', label: 'Professors & TAs', icon: 'lucide:users', routePath: '/workspace/people', entityType: 'person', scope: 'workspace', nodeType: 'item', order: 2 },
    ],
  },
  {
    id: 'stu-pages',
    label: 'PAGES',
    icon: 'lucide:file-text',
    scope: 'workspace',
    nodeType: 'section',
    locked: true,
    order: 50,
    sectionKey: 'personal-pages',
    specialItems: 'pages',
    editable: true,
  },
]

export const STUDENT_TEMPLATE: WorkspaceTemplate = {
  id: 'university-student',
  name: 'University Student',
  slug: 'university-student',
  version: '1.0.0',
  description: 'Courses, assignments, lecture notes, and study resources',
  icon: 'lucide:graduation-cap',
  category: 'education',
  color: 'indigo',
  tier: 'official',
  author: { name: 'Trellis' },
  license: 'MIT',
  tags: ['student', 'university', 'courses', 'assignments', 'notes'],
  featured: true,
  downloads: 15000,
  rating: 4.8,
  sidebarTree: STUDENT_SIDEBAR,
  entityTypes: [
    { id: 'task', name: 'Assignment', pluralName: 'Assignments', icon: 'lucide:check-square', description: 'Homework and assignments', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'status', name: 'Status', type: 'select' }, { id: 'dueDate', name: 'Due Date', type: 'date' }], views: ['kanban', 'table', 'calendar'] },
    { id: 'note', name: 'Note', pluralName: 'Notes', icon: 'lucide:sticky-note', description: 'Lecture and study notes', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'content', name: 'Content', type: 'richtext' }], views: ['card-grid', 'list'] },
    { id: 'event', name: 'Class', pluralName: 'Classes', icon: 'lucide:calendar', description: 'Class schedule', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }, { id: 'startDate', name: 'Date', type: 'datetime' }], views: ['calendar'] },
    { id: 'person', name: 'Contact', pluralName: 'Contacts', icon: 'lucide:user', description: 'Professors and TAs', fields: [{ id: 'title', name: 'Name', type: 'text', required: true }, { id: 'email', name: 'Email', type: 'email' }], views: ['table'] },
    { id: 'bookmark', name: 'Resource', pluralName: 'Resources', icon: 'lucide:bookmark', description: 'Course materials and links', fields: [{ id: 'title', name: 'Title', type: 'text', required: true }, { id: 'url', name: 'URL', type: 'url' }], views: ['card-grid'] },
  ],
  views: [],
  widgets: [],
}

// ── All built-in templates ─────────────────────────────────────────────

export const BUILTIN_TEMPLATES: WorkspaceTemplate[] = [
  PKM_TEMPLATE,
  FINANCE_TEMPLATE,
  COMPANY_TEMPLATE,
  GAMEDEV_TEMPLATE,
  STUDENT_TEMPLATE,
]
