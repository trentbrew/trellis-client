/**
 * App Template Registry
 *
 * Pre-configured bundles of ontology types, sidebar structure, and metadata
 * that can be applied when creating a new World (app).
 *
 * Each template defines:
 * - Which entity types (ontologies) are enabled
 * - A suggested sidebar tree structure
 * - Icon, color, and description for the template picker
 *
 * Templates are NOT persisted — they're applied at creation time
 * by setting the app's `ontologies` array and optionally its `sidebarTree`.
 */

export interface AppTemplate {
  id: string
  name: string
  description: string
  icon: string
  color: string
  ontologies: string[]
  category: 'productivity' | 'business' | 'personal' | 'creative' | 'engineering' | 'custom'
}

export const APP_TEMPLATES: AppTemplate[] = [
  // ── Productivity ────────────────────────────────────────────────────
  {
    id: 'personal',
    name: 'Personal',
    description: 'Tasks, notes, calendar, and everyday life management',
    icon: 'lucide:user',
    color: '#3b82f6',
    ontologies: ['task', 'note', 'event', 'reminder', 'bookmark', 'person', 'project', 'file'],
    category: 'personal',
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Projects, sprints, milestones, and team coordination',
    icon: 'lucide:briefcase',
    color: '#0ea5e9',
    ontologies: ['task', 'event', 'project', 'milestone', 'sprint', 'person', 'organization', 'note', 'file', 'deadline'],
    category: 'productivity',
  },

  // ── Business ────────────────────────────────────────────────────────
  {
    id: 'crm',
    name: 'CRM',
    description: 'Contacts, organizations, deals, and sales pipeline',
    icon: 'lucide:handshake',
    color: '#22c55e',
    ontologies: ['person', 'contact', 'organization', 'task', 'event', 'note', 'project'],
    category: 'business',
  },
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Tasks, milestones, sprints, and Gantt timelines',
    icon: 'lucide:folder-kanban',
    color: '#8b5cf6',
    ontologies: ['task', 'project', 'milestone', 'sprint', 'deadline', 'note', 'file', 'person'],
    category: 'business',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Payments, budgets, invoices, and financial tracking',
    icon: 'lucide:wallet',
    color: '#10b981',
    ontologies: ['payment', 'sheet', 'goal', 'note', 'file', 'organization', 'vendor'],
    category: 'business',
  },

  // ── Creative ────────────────────────────────────────────────────────
  {
    id: 'creative',
    name: 'Creative',
    description: 'Notes, bookmarks, mood boards, and inspiration collection',
    icon: 'lucide:palette',
    color: '#f59e0b',
    ontologies: ['note', 'bookmark', 'file', 'project', 'task', 'diagram'],
    category: 'creative',
  },
  {
    id: 'content',
    name: 'Content Pipeline',
    description: 'Blog posts, editorial calendar, and content management',
    icon: 'lucide:pen-line',
    color: '#f97316',
    ontologies: ['note', 'task', 'event', 'bookmark', 'file', 'project', 'person'],
    category: 'creative',
  },

  // ── Engineering ─────────────────────────────────────────────────────
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'Sprints, bug tracking, milestones, and technical docs',
    icon: 'lucide:code',
    color: '#6366f1',
    ontologies: ['task', 'sprint', 'milestone', 'project', 'deadline', 'note', 'file', 'person', 'diagram'],
    category: 'engineering',
  },

  // ── Personal ────────────────────────────────────────────────────────
  {
    id: 'health',
    name: 'Health & Wellness',
    description: 'Appointments, goals, reminders, and health tracking',
    icon: 'lucide:heart',
    color: '#f43f5e',
    ontologies: ['appointment', 'goal', 'reminder', 'note', 'task', 'person'],
    category: 'personal',
  },
  {
    id: 'learning',
    name: 'Learning',
    description: 'Notes, bookmarks, goals, and study management',
    icon: 'lucide:graduation-cap',
    color: '#eab308',
    ontologies: ['note', 'bookmark', 'goal', 'task', 'file', 'project'],
    category: 'personal',
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Trips, bookings, budgets, and travel planning',
    icon: 'lucide:plane',
    color: '#06b6d4',
    ontologies: ['trip', 'event', 'payment', 'bookmark', 'note', 'file', 'person'],
    category: 'personal',
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'productivity', label: 'Productivity', icon: 'lucide:zap' },
  { id: 'business', label: 'Business', icon: 'lucide:building-2' },
  { id: 'creative', label: 'Creative', icon: 'lucide:palette' },
  { id: 'engineering', label: 'Engineering', icon: 'lucide:code' },
  { id: 'personal', label: 'Personal', icon: 'lucide:user' },
] as const

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): AppTemplate | undefined {
  return APP_TEMPLATES.find((t) => t.id === id)
}

/**
 * Get templates filtered by category.
 */
export function getTemplatesByCategory(category: string): AppTemplate[] {
  return APP_TEMPLATES.filter((t) => t.category === category)
}
