/**
 * Ontology Marketplace Composable
 *
 * Provides pluggable vertical module management for the self-building app.
 * Supports browsing, installing, and managing ontology packages that extend
 * the application with new entity types, fields, views, and components.
 */

// Ontology package categories
export type OntologyCategory =
  | 'crm'
  | 'project-management'
  | 'inventory'
  | 'education'
  | 'healthcare'
  | 'real-estate'
  | 'events'
  | 'hr'
  | 'finance'
  | 'utilities'

// Package status
export type PackageStatus = 'available' | 'installed' | 'updating' | 'error'

// Entity type definition within a package
export interface OntologyEntityType {
  id: string
  name: string
  pluralName: string
  icon: string
  description: string
  fields: Array<{
    id: string
    name: string
    type: string
    required?: boolean
    default?: any
  }>
  views?: string[]
  relations?: Array<{
    type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany'
    target: string
    field: string
  }>
}

// View definition within a package
export interface OntologyView {
  id: string
  name: string
  type: 'table' | 'kanban' | 'calendar' | 'gallery' | 'timeline' | 'map' | 'chart'
  entityType: string
  config: Record<string, any>
}

// Dashboard widget definition
export interface OntologyWidget {
  id: string
  name: string
  type: string
  entityType?: string
  config: Record<string, any>
}

// Complete ontology package definition
export interface OntologyPackage {
  id: string
  name: string
  slug: string
  version: string
  description: string
  longDescription?: string
  icon: string
  category: OntologyCategory
  author: {
    name: string
    url?: string
  }
  license: string
  repository?: string
  homepage?: string
  tags: string[]
  entityTypes: OntologyEntityType[]
  views: OntologyView[]
  widgets: OntologyWidget[]
  dependencies?: string[]
  screenshots?: string[]
  changelog?: Array<{
    version: string
    date: string
    changes: string[]
  }>
  downloads?: number
  rating?: number
  featured?: boolean
}

// Installed package instance
export interface InstalledPackage {
  packageId: string
  name: string
  version: string
  installedAt: number
  updatedAt: number
  status: PackageStatus
  config: Record<string, any>
  enabled: boolean
}

export function useOntologyMarketplace() {
  const { currentOrganization } = useOrganizations()

  // Built-in ontology packages (marketplace catalog)
  const availablePackages: OntologyPackage[] = [
    // CRM
    {
      id: 'crm-basic',
      name: 'Basic CRM',
      slug: 'crm-basic',
      version: '1.0.0',
      description: 'Customer relationship management with contacts, companies, and deals',
      longDescription: 'A comprehensive CRM solution for managing customer relationships. Track contacts, companies, deals, and activities all in one place.',
      icon: 'lucide:users',
      category: 'crm',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['crm', 'contacts', 'sales', 'deals'],
      featured: true,
      downloads: 12500,
      rating: 4.8,
      entityTypes: [
        {
          id: 'contact',
          name: 'Contact',
          pluralName: 'Contacts',
          icon: 'lucide:user',
          description: 'Individual people you interact with',
          fields: [
            { id: 'firstName', name: 'First Name', type: 'text', required: true },
            { id: 'lastName', name: 'Last Name', type: 'text', required: true },
            { id: 'email', name: 'Email', type: 'email' },
            { id: 'phone', name: 'Phone', type: 'phone' },
            { id: 'company', name: 'Company', type: 'relation' },
            { id: 'status', name: 'Status', type: 'select' },
          ],
          views: ['table', 'kanban'],
        },
        {
          id: 'company',
          name: 'Company',
          pluralName: 'Companies',
          icon: 'lucide:building',
          description: 'Organizations you do business with',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'website', name: 'Website', type: 'url' },
            { id: 'industry', name: 'Industry', type: 'select' },
            { id: 'size', name: 'Size', type: 'select' },
          ],
          views: ['table'],
        },
        {
          id: 'deal',
          name: 'Deal',
          pluralName: 'Deals',
          icon: 'lucide:handshake',
          description: 'Sales opportunities and pipelines',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'value', name: 'Value', type: 'currency' },
            { id: 'stage', name: 'Stage', type: 'select' },
            { id: 'closeDate', name: 'Close Date', type: 'date' },
            { id: 'contact', name: 'Contact', type: 'relation' },
          ],
          views: ['table', 'kanban'],
        },
      ],
      views: [
        { id: 'contacts-table', name: 'Contacts Table', type: 'table', entityType: 'contact', config: {} },
        { id: 'deals-pipeline', name: 'Deals Pipeline', type: 'kanban', entityType: 'deal', config: { groupBy: 'stage' } },
      ],
      widgets: [
        { id: 'deals-value', name: 'Total Deal Value', type: 'stat-number', entityType: 'deal', config: { aggregation: 'sum', field: 'value' } },
        { id: 'contacts-count', name: 'Total Contacts', type: 'stat-number', entityType: 'contact', config: { aggregation: 'count' } },
      ],
    },

    // Project Management
    {
      id: 'project-management',
      name: 'Project Management',
      slug: 'project-management',
      version: '1.2.0',
      description: 'Projects, tasks, milestones, and team collaboration',
      icon: 'lucide:folder-kanban',
      category: 'project-management',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['projects', 'tasks', 'milestones', 'teams'],
      featured: true,
      downloads: 18200,
      rating: 4.9,
      entityTypes: [
        {
          id: 'project',
          name: 'Project',
          pluralName: 'Projects',
          icon: 'lucide:folder',
          description: 'Group of related tasks and milestones',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'description', name: 'Description', type: 'richtext' },
            { id: 'status', name: 'Status', type: 'select' },
            { id: 'startDate', name: 'Start Date', type: 'date' },
            { id: 'endDate', name: 'End Date', type: 'date' },
            { id: 'owner', name: 'Owner', type: 'user' },
          ],
          views: ['table', 'kanban', 'timeline'],
        },
        {
          id: 'task',
          name: 'Task',
          pluralName: 'Tasks',
          icon: 'lucide:check-square',
          description: 'Individual work items',
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true },
            { id: 'description', name: 'Description', type: 'richtext' },
            { id: 'status', name: 'Status', type: 'select' },
            { id: 'priority', name: 'Priority', type: 'select' },
            { id: 'dueDate', name: 'Due Date', type: 'date' },
            { id: 'assignee', name: 'Assignee', type: 'user' },
            { id: 'project', name: 'Project', type: 'relation' },
          ],
          views: ['table', 'kanban', 'calendar'],
        },
        {
          id: 'milestone',
          name: 'Milestone',
          pluralName: 'Milestones',
          icon: 'lucide:flag',
          description: 'Key project checkpoints',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'date', name: 'Date', type: 'date', required: true },
            { id: 'project', name: 'Project', type: 'relation' },
          ],
          views: ['table', 'timeline'],
        },
      ],
      views: [
        { id: 'tasks-kanban', name: 'Task Board', type: 'kanban', entityType: 'task', config: { groupBy: 'status' } },
        { id: 'project-timeline', name: 'Project Timeline', type: 'timeline', entityType: 'project', config: {} },
      ],
      widgets: [
        { id: 'tasks-by-status', name: 'Tasks by Status', type: 'chart-pie', entityType: 'task', config: { groupBy: 'status' } },
        { id: 'overdue-tasks', name: 'Overdue Tasks', type: 'stat-number', entityType: 'task', config: { filter: 'overdue' } },
      ],
    },

    // Inventory
    {
      id: 'inventory-basic',
      name: 'Inventory Management',
      slug: 'inventory-basic',
      version: '1.0.0',
      description: 'Track products, stock levels, and warehouse locations',
      icon: 'lucide:package',
      category: 'inventory',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['inventory', 'products', 'stock', 'warehouse'],
      downloads: 8700,
      rating: 4.6,
      entityTypes: [
        {
          id: 'product',
          name: 'Product',
          pluralName: 'Products',
          icon: 'lucide:box',
          description: 'Items in your inventory',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'sku', name: 'SKU', type: 'text' },
            { id: 'category', name: 'Category', type: 'select' },
            { id: 'price', name: 'Price', type: 'currency' },
            { id: 'quantity', name: 'Quantity', type: 'number' },
            { id: 'reorderLevel', name: 'Reorder Level', type: 'number' },
          ],
          views: ['table', 'gallery'],
        },
        {
          id: 'warehouse',
          name: 'Warehouse',
          pluralName: 'Warehouses',
          icon: 'lucide:warehouse',
          description: 'Storage locations',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'address', name: 'Address', type: 'text' },
            { id: 'capacity', name: 'Capacity', type: 'number' },
          ],
          views: ['table'],
        },
      ],
      views: [
        { id: 'products-table', name: 'Products Table', type: 'table', entityType: 'product', config: {} },
        { id: 'products-gallery', name: 'Product Gallery', type: 'gallery', entityType: 'product', config: {} },
      ],
      widgets: [
        { id: 'low-stock', name: 'Low Stock Items', type: 'stat-number', entityType: 'product', config: { filter: 'low-stock' } },
        { id: 'total-value', name: 'Total Inventory Value', type: 'stat-number', entityType: 'product', config: { aggregation: 'sum', formula: 'price * quantity' } },
      ],
    },

    // Events
    {
      id: 'events-management',
      name: 'Event Management',
      slug: 'events-management',
      version: '1.1.0',
      description: 'Plan and manage events, venues, and attendees',
      icon: 'lucide:calendar-days',
      category: 'events',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['events', 'venues', 'attendees', 'scheduling'],
      downloads: 6200,
      rating: 4.5,
      entityTypes: [
        {
          id: 'event',
          name: 'Event',
          pluralName: 'Events',
          icon: 'lucide:calendar',
          description: 'Scheduled events and gatherings',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'description', name: 'Description', type: 'richtext' },
            { id: 'startDate', name: 'Start Date', type: 'datetime', required: true },
            { id: 'endDate', name: 'End Date', type: 'datetime' },
            { id: 'venue', name: 'Venue', type: 'relation' },
            { id: 'capacity', name: 'Capacity', type: 'number' },
            { id: 'status', name: 'Status', type: 'select' },
          ],
          views: ['table', 'calendar'],
        },
        {
          id: 'venue',
          name: 'Venue',
          pluralName: 'Venues',
          icon: 'lucide:map-pin',
          description: 'Event locations',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'address', name: 'Address', type: 'text' },
            { id: 'capacity', name: 'Capacity', type: 'number' },
            { id: 'amenities', name: 'Amenities', type: 'multiselect' },
          ],
          views: ['table', 'map'],
        },
        {
          id: 'attendee',
          name: 'Attendee',
          pluralName: 'Attendees',
          icon: 'lucide:user-check',
          description: 'Event participants',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'email', name: 'Email', type: 'email' },
            { id: 'event', name: 'Event', type: 'relation' },
            { id: 'status', name: 'Status', type: 'select' },
            { id: 'checkedIn', name: 'Checked In', type: 'boolean' },
          ],
          views: ['table'],
        },
      ],
      views: [
        { id: 'events-calendar', name: 'Events Calendar', type: 'calendar', entityType: 'event', config: {} },
        { id: 'venues-map', name: 'Venues Map', type: 'map', entityType: 'venue', config: {} },
      ],
      widgets: [
        { id: 'upcoming-events', name: 'Upcoming Events', type: 'list-cards', entityType: 'event', config: { filter: 'upcoming', limit: 5 } },
        { id: 'total-attendees', name: 'Total Attendees', type: 'stat-number', entityType: 'attendee', config: { aggregation: 'count' } },
      ],
    },

    // HR
    {
      id: 'hr-essentials',
      name: 'HR Essentials',
      slug: 'hr-essentials',
      version: '1.0.0',
      description: 'Employee management, time-off, and onboarding',
      icon: 'lucide:users-round',
      category: 'hr',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['hr', 'employees', 'time-off', 'onboarding'],
      downloads: 5400,
      rating: 4.4,
      entityTypes: [
        {
          id: 'employee',
          name: 'Employee',
          pluralName: 'Employees',
          icon: 'lucide:user',
          description: 'Team members',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'email', name: 'Email', type: 'email' },
            { id: 'department', name: 'Department', type: 'relation' },
            { id: 'role', name: 'Role', type: 'text' },
            { id: 'startDate', name: 'Start Date', type: 'date' },
            { id: 'manager', name: 'Manager', type: 'relation' },
          ],
          views: ['table'],
        },
        {
          id: 'department',
          name: 'Department',
          pluralName: 'Departments',
          icon: 'lucide:building-2',
          description: 'Organizational units',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'head', name: 'Head', type: 'relation' },
          ],
          views: ['table'],
        },
        {
          id: 'timeoff',
          name: 'Time Off Request',
          pluralName: 'Time Off Requests',
          icon: 'lucide:palm-tree',
          description: 'Leave and vacation requests',
          fields: [
            { id: 'employee', name: 'Employee', type: 'relation', required: true },
            { id: 'type', name: 'Type', type: 'select' },
            { id: 'startDate', name: 'Start Date', type: 'date', required: true },
            { id: 'endDate', name: 'End Date', type: 'date', required: true },
            { id: 'status', name: 'Status', type: 'select' },
            { id: 'notes', name: 'Notes', type: 'text' },
          ],
          views: ['table', 'calendar'],
        },
      ],
      views: [
        { id: 'employees-table', name: 'Employee Directory', type: 'table', entityType: 'employee', config: {} },
        { id: 'timeoff-calendar', name: 'Time Off Calendar', type: 'calendar', entityType: 'timeoff', config: {} },
      ],
      widgets: [
        { id: 'employee-count', name: 'Total Employees', type: 'stat-number', entityType: 'employee', config: { aggregation: 'count' } },
        { id: 'pending-requests', name: 'Pending Requests', type: 'stat-number', entityType: 'timeoff', config: { filter: 'pending' } },
      ],
    },

    // Education (ECMS)
    {
      id: 'ecms-education',
      name: 'Education CMS',
      slug: 'ecms-education',
      version: '2.0.0',
      description: 'Complete education management with facilities, programs, and enrollment',
      icon: 'lucide:graduation-cap',
      category: 'education',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['education', 'facilities', 'programs', 'enrollment', 'ecms'],
      featured: true,
      downloads: 9800,
      rating: 4.7,
      entityTypes: [
        {
          id: 'facility',
          name: 'Facility',
          pluralName: 'Facilities',
          icon: 'lucide:building',
          description: 'Educational facilities and centers',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'address', name: 'Address', type: 'text' },
            { id: 'phone', name: 'Phone', type: 'phone' },
            { id: 'capacity', name: 'Capacity', type: 'number' },
            { id: 'status', name: 'Status', type: 'select' },
          ],
          views: ['table', 'map'],
        },
        {
          id: 'program',
          name: 'Program',
          pluralName: 'Programs',
          icon: 'lucide:book-open',
          description: 'Educational programs and courses',
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true },
            { id: 'description', name: 'Description', type: 'richtext' },
            { id: 'facility', name: 'Facility', type: 'relation' },
            { id: 'ageRange', name: 'Age Range', type: 'text' },
            { id: 'capacity', name: 'Capacity', type: 'number' },
          ],
          views: ['table'],
        },
        {
          id: 'enrollment',
          name: 'Enrollment',
          pluralName: 'Enrollments',
          icon: 'lucide:user-plus',
          description: 'Student enrollments',
          fields: [
            { id: 'student', name: 'Student', type: 'text', required: true },
            { id: 'program', name: 'Program', type: 'relation' },
            { id: 'startDate', name: 'Start Date', type: 'date' },
            { id: 'status', name: 'Status', type: 'select' },
          ],
          views: ['table'],
        },
      ],
      views: [
        { id: 'facilities-table', name: 'Facilities', type: 'table', entityType: 'facility', config: {} },
        { id: 'facilities-map', name: 'Facilities Map', type: 'map', entityType: 'facility', config: {} },
      ],
      widgets: [
        { id: 'total-facilities', name: 'Total Facilities', type: 'stat-number', entityType: 'facility', config: { aggregation: 'count' } },
        { id: 'total-enrollment', name: 'Total Enrollment', type: 'stat-number', entityType: 'enrollment', config: { aggregation: 'count' } },
      ],
    },

    // Utilities
    {
      id: 'utilities-core',
      name: 'Core Utilities',
      slug: 'utilities-core',
      version: '1.0.0',
      description: 'Common utility types: notes, files, links, and tags',
      icon: 'lucide:wrench',
      category: 'utilities',
      author: { name: 'CAL Team' },
      license: 'MIT',
      tags: ['utilities', 'notes', 'files', 'links', 'tags'],
      downloads: 22000,
      rating: 4.9,
      entityTypes: [
        {
          id: 'note',
          name: 'Note',
          pluralName: 'Notes',
          icon: 'lucide:sticky-note',
          description: 'Rich text notes and documents',
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true },
            { id: 'content', name: 'Content', type: 'richtext' },
            { id: 'tags', name: 'Tags', type: 'multiselect' },
          ],
          views: ['table', 'gallery'],
        },
        {
          id: 'bookmark',
          name: 'Bookmark',
          pluralName: 'Bookmarks',
          icon: 'lucide:bookmark',
          description: 'Saved links and references',
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true },
            { id: 'url', name: 'URL', type: 'url', required: true },
            { id: 'description', name: 'Description', type: 'text' },
            { id: 'tags', name: 'Tags', type: 'multiselect' },
          ],
          views: ['table', 'gallery'],
        },
      ],
      views: [
        { id: 'notes-gallery', name: 'Notes Gallery', type: 'gallery', entityType: 'note', config: {} },
        { id: 'bookmarks-table', name: 'Bookmarks', type: 'table', entityType: 'bookmark', config: {} },
      ],
      widgets: [],
    },
  ]

  // Group packages by category
  const packagesByCategory = computed(() => {
    const grouped: Record<string, OntologyPackage[]> = {}

    for (const pkg of availablePackages) {
      if (!grouped[pkg.category]) grouped[pkg.category] = []
      grouped[pkg.category]!.push(pkg)
    }

    return grouped
  })

  // All available packages
  const allPackages = computed(() => availablePackages)

  // Featured packages
  const featuredPackages = computed(() => availablePackages.filter((p) => p.featured))

  // Get package by ID
  const getPackageById = (id: string): OntologyPackage | undefined => {
    return availablePackages.find((p) => p.id === id)
  }

  // Search packages
  const searchPackages = (query: string): OntologyPackage[] => {
    const q = query.toLowerCase()
    return availablePackages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  // Create installed package instance
  const createInstalledPackage = (packageId: string): InstalledPackage | null => {
    const pkg = getPackageById(packageId)
    if (!pkg) return null

    return {
      packageId: pkg.id,
      name: pkg.name,
      version: pkg.version,
      installedAt: Date.now(),
      updatedAt: Date.now(),
      status: 'installed',
      config: {},
      enabled: true,
    }
  }

  // Category metadata
  const categoryMeta: Record<OntologyCategory, { label: string; icon: string; description: string }> = {
    crm: { label: 'CRM', icon: 'lucide:users', description: 'Customer relationship management' },
    'project-management': { label: 'Project Management', icon: 'lucide:folder-kanban', description: 'Tasks and projects' },
    inventory: { label: 'Inventory', icon: 'lucide:package', description: 'Stock and warehouse' },
    education: { label: 'Education', icon: 'lucide:graduation-cap', description: 'Learning management' },
    healthcare: { label: 'Healthcare', icon: 'lucide:heart-pulse', description: 'Medical and health' },
    'real-estate': { label: 'Real Estate', icon: 'lucide:home', description: 'Properties and listings' },
    events: { label: 'Events', icon: 'lucide:calendar-days', description: 'Event planning' },
    hr: { label: 'Human Resources', icon: 'lucide:users-round', description: 'Employee management' },
    finance: { label: 'Finance', icon: 'lucide:wallet', description: 'Financial tracking' },
    utilities: { label: 'Utilities', icon: 'lucide:wrench', description: 'Common tools' },
  }

  return {
    // Package catalog
    availablePackages,
    packagesByCategory,
    allPackages,
    featuredPackages,
    getPackageById,
    searchPackages,

    // Installation
    createInstalledPackage,

    // Metadata
    categoryMeta,

    // Context
    currentOrganization,
  }
}
