/**
 * Entity Registry
 *
 * Single source of truth mapping every EntityType → its full UI config:
 * class, label, icon, projections, dialog shell, panel components, actions.
 *
 * Consumed by useEntityRegistry composable and any component that needs
 * to resolve how an entity type should look/behave at runtime.
 */

import type {
  EntityClass,
  EntityType,
  EntityTypeConfig,
  EntityClassConfig,
  EntityPanelConfig,
} from '~/types/entity'
import type { ProjectionType } from '~/types/database'

// ============================================================================
// Class-level defaults
// ============================================================================

export const ENTITY_CLASSES: Record<EntityClass, EntityClassConfig> = {
  temporal: {
    class: 'temporal',
    label: 'Temporal',
    icon: 'lucide:calendar',
    baseProjections: ['calendar', 'list', 'table', 'kanban', 'timeline'],
    dialogShell: 'TemporalDialogShell',
  },
  document: {
    class: 'document',
    label: 'Document',
    icon: 'lucide:file-text',
    baseProjections: ['list', 'card-grid', 'table'],
    dialogShell: 'DocumentDialogShell',
  },
  actor: {
    class: 'actor',
    label: 'Actor',
    icon: 'lucide:users',
    baseProjections: ['table', 'card-grid', 'list', 'graph'],
    dialogShell: 'ActorDialogShell',
  },
  container: {
    class: 'container',
    label: 'Container',
    icon: 'lucide:folder',
    baseProjections: ['list', 'kanban', 'table'],
    dialogShell: 'ContainerDialogShell',
  },
}

// ============================================================================
// Type-level configs
// ============================================================================

const ENTITY_TYPES: Record<EntityType, EntityTypeConfig> = {
  // ── Temporal ─────────────────────────────────────────────────────────────

  task: {
    type: 'task',
    class: 'temporal',
    label: 'Task',
    labelPlural: 'Tasks',
    icon: 'lucide:check-square',
    color: 'blue',
    projections: ['calendar', 'kanban', 'list', 'table', 'timeline'],
    dialogShell: 'temporal',
    panels: {
      properties: 'TaskProperties',
      content: 'TaskContent',
      footerActions: ['complete', 'archive', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'description', 'notes'],
  },

  event: {
    type: 'event',
    class: 'temporal',
    label: 'Event',
    labelPlural: 'Events',
    icon: 'lucide:calendar',
    color: 'purple',
    projections: ['calendar', 'timeline', 'list', 'table'],
    dialogShell: 'temporal',
    panels: {
      properties: 'EventProperties',
      content: 'EventContent',
      footerActions: ['duplicate', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'description', 'location'],
  },

  trip: {
    type: 'trip',
    class: 'temporal',
    label: 'Trip',
    labelPlural: 'Trips',
    icon: 'lucide:plane',
    color: 'cyan',
    projections: ['calendar', 'timeline', 'list', 'card-grid'],
    dialogShell: 'temporal',
    panels: {
      properties: 'TripProperties',
      content: 'TripContent',
      footerActions: ['duplicate', 'archive', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'destination', 'origin'],
  },

  payment: {
    type: 'payment',
    class: 'temporal',
    label: 'Payment',
    labelPlural: 'Payments',
    icon: 'lucide:credit-card',
    color: 'emerald',
    projections: ['calendar', 'list', 'table'],
    dialogShell: 'temporal',
    panels: {
      properties: 'PaymentProperties',
      content: 'PaymentContent',
      footerActions: ['markPaid', 'void', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'payee', 'invoiceNumber'],
  },

  appointment: {
    type: 'appointment',
    class: 'temporal',
    label: 'Appointment',
    labelPlural: 'Appointments',
    icon: 'lucide:stethoscope',
    color: 'rose',
    projections: ['calendar', 'list', 'table', 'timeline'],
    dialogShell: 'temporal',
    panels: {
      properties: 'AppointmentProperties',
      content: 'AppointmentContent',
      footerActions: ['confirm', 'reschedule', 'cancel', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'provider', 'location', 'specialty'],
  },

  reminder: {
    type: 'reminder',
    class: 'temporal',
    label: 'Reminder',
    labelPlural: 'Reminders',
    icon: 'lucide:bell',
    color: 'amber',
    projections: ['list', 'calendar'],
    dialogShell: 'temporal',
    panels: {
      properties: 'ReminderProperties',
      content: 'ReminderContent',
      footerActions: ['acknowledge', 'snooze', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'description'],
  },

  deadline: {
    type: 'deadline',
    class: 'temporal',
    label: 'Deadline',
    labelPlural: 'Deadlines',
    icon: 'lucide:alarm-clock',
    color: 'red',
    projections: ['calendar', 'timeline', 'list'],
    dialogShell: 'temporal',
    panels: {
      properties: 'DeadlineProperties',
      content: 'DeadlineContent',
      footerActions: ['markMet', 'extend', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'description'],
  },

  milestone: {
    type: 'milestone',
    class: 'temporal',
    label: 'Milestone',
    labelPlural: 'Milestones',
    icon: 'lucide:flag',
    color: 'orange',
    projections: ['timeline', 'list', 'calendar'],
    dialogShell: 'temporal',
    panels: {
      properties: 'MilestoneProperties',
      content: 'MilestoneContent',
      footerActions: ['achieve', 'delete'],
    },
    defaultSortField: 'startDate',
    searchFields: ['title', 'description'],
  },

  // ── Document ─────────────────────────────────────────────────────────────

  note: {
    type: 'note',
    class: 'document',
    label: 'Note',
    labelPlural: 'Notes',
    icon: 'lucide:sticky-note',
    color: 'yellow',
    projections: ['card-grid', 'list', 'table'],
    dialogShell: 'document',
    panels: {
      properties: 'NoteProperties',
      content: 'NoteContent',
      footerActions: ['pin', 'archive', 'delete'],
    },
    defaultSortField: 'updatedAt',
    searchFields: ['title', 'content', 'description'],
  },

  file: {
    type: 'file',
    class: 'document',
    label: 'File',
    labelPlural: 'Files',
    icon: 'lucide:file',
    color: 'slate',
    projections: ['card-grid', 'list', 'table'],
    dialogShell: 'document',
    panels: {
      properties: 'FileProperties',
      content: 'FileContent',
      footerActions: ['download', 'share', 'delete'],
    },
    defaultSortField: 'updatedAt',
    searchFields: ['title', 'description'],
  },

  page: {
    type: 'page',
    class: 'document',
    label: 'Page',
    labelPlural: 'Pages',
    icon: 'lucide:book-open',
    color: 'indigo',
    projections: ['list', 'card-grid'],
    dialogShell: 'document',
    panels: {
      properties: 'PageProperties',
      content: 'PageContent',
      footerActions: ['publish', 'archive', 'delete'],
    },
    defaultSortField: 'updatedAt',
    searchFields: ['title', 'content', 'description'],
  },

  template: {
    type: 'template',
    class: 'document',
    label: 'Template',
    labelPlural: 'Templates',
    icon: 'lucide:copy',
    color: 'violet',
    projections: ['list', 'card-grid', 'table'],
    dialogShell: 'document',
    panels: {
      properties: 'TemplateProperties',
      content: 'TemplateContent',
      footerActions: ['useTemplate', 'duplicate', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'description'],
  },

  // ── Actor ────────────────────────────────────────────────────────────────

  person: {
    type: 'person',
    class: 'actor',
    label: 'Person',
    labelPlural: 'People',
    icon: 'lucide:user',
    color: 'sky',
    projections: ['table', 'card-grid', 'list', 'graph'],
    dialogShell: 'actor',
    panels: {
      properties: 'PersonProperties',
      content: 'PersonContent',
      footerActions: ['message', 'archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'email', 'jobTitle', 'organization'],
  },

  contact: {
    type: 'contact',
    class: 'actor',
    label: 'Contact',
    labelPlural: 'Contacts',
    icon: 'lucide:contact',
    color: 'teal',
    projections: ['table', 'card-grid', 'list'],
    dialogShell: 'actor',
    panels: {
      properties: 'ContactProperties',
      content: 'ContactContent',
      footerActions: ['message', 'archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'email', 'company', 'phone'],
  },

  organization: {
    type: 'organization',
    class: 'actor',
    label: 'Organization',
    labelPlural: 'Organizations',
    icon: 'lucide:building-2',
    color: 'zinc',
    projections: ['table', 'card-grid', 'list', 'graph'],
    dialogShell: 'actor',
    panels: {
      properties: 'OrganizationProperties',
      content: 'OrganizationContent',
      footerActions: ['archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'website', 'industry'],
  },

  vendor: {
    type: 'vendor',
    class: 'actor',
    label: 'Vendor',
    labelPlural: 'Vendors',
    icon: 'lucide:store',
    color: 'lime',
    projections: ['table', 'card-grid', 'list'],
    dialogShell: 'actor',
    panels: {
      properties: 'VendorProperties',
      content: 'VendorContent',
      footerActions: ['archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'email', 'services'],
  },

  // ── Container ────────────────────────────────────────────────────────────

  project: {
    type: 'project',
    class: 'container',
    label: 'Project',
    labelPlural: 'Projects',
    icon: 'lucide:folder-kanban',
    color: 'blue',
    projections: ['kanban', 'list', 'table', 'timeline', 'dashboard'],
    dialogShell: 'container',
    panels: {
      properties: 'ProjectProperties',
      content: 'ProjectContent',
      footerActions: ['archive', 'complete', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'description'],
  },

  folder: {
    type: 'folder',
    class: 'container',
    label: 'Folder',
    labelPlural: 'Folders',
    icon: 'lucide:folder',
    color: 'amber',
    projections: ['list', 'table'],
    dialogShell: 'container',
    panels: {
      properties: 'FolderProperties',
      content: 'FolderContent',
      footerActions: ['archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'description'],
  },

  collection: {
    type: 'collection',
    class: 'container',
    label: 'Collection',
    labelPlural: 'Collections',
    icon: 'lucide:database',
    color: 'indigo',
    projections: ['list', 'card-grid', 'table'],
    dialogShell: 'container',
    panels: {
      properties: 'CollectionProperties',
      content: 'CollectionContent',
      footerActions: ['publish', 'archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'description'],
  },

  goal: {
    type: 'goal',
    class: 'container',
    label: 'Goal',
    labelPlural: 'Goals',
    icon: 'lucide:target',
    color: 'emerald',
    projections: ['list', 'kanban', 'table', 'timeline'],
    dialogShell: 'container',
    panels: {
      properties: 'GoalProperties',
      content: 'GoalContent',
      footerActions: ['complete', 'archive', 'delete'],
    },
    defaultSortField: 'title',
    searchFields: ['title', 'description', 'metric'],
  },
}

// ============================================================================
// Lookup helpers
// ============================================================================

/** Get full config for a specific entity type */
export function getEntityTypeConfig(type: EntityType): EntityTypeConfig {
  return ENTITY_TYPES[type]
}

/** Get class-level config */
export function getEntityClassConfig(entityClass: EntityClass): EntityClassConfig {
  return ENTITY_CLASSES[entityClass]
}

/** Get config by resolving type → class */
export function getEntityClassForType(type: EntityType): EntityClassConfig {
  const typeConfig = ENTITY_TYPES[type]
  return ENTITY_CLASSES[typeConfig.class]
}

/** Get all types belonging to a class */
export function getTypesForClass(entityClass: EntityClass): EntityTypeConfig[] {
  return Object.values(ENTITY_TYPES).filter(t => t.class === entityClass)
}

/** Get allowed projections for a type (type-specific override of class defaults) */
export function getProjectionsForType(type: EntityType): ProjectionType[] {
  return ENTITY_TYPES[type].projections
}

/** Get panel config for a type */
export function getPanelsForType(type: EntityType): EntityPanelConfig {
  return ENTITY_TYPES[type].panels
}

/** Get the dialog shell name for a type */
export function getDialogShellForType(type: EntityType): string {
  const classConfig = getEntityClassForType(type)
  return classConfig.dialogShell
}

/** Get all registered entity types */
export function getAllEntityTypes(): EntityTypeConfig[] {
  return Object.values(ENTITY_TYPES)
}

/** Get all registered entity types as a flat list of type strings */
export function getAllEntityTypeIds(): EntityType[] {
  return Object.keys(ENTITY_TYPES) as EntityType[]
}

// ============================================================================
// UI Option Builders (for pickers, dropdowns, etc.)
// ============================================================================

export interface EntityTypeOption {
  value: EntityType
  label: string
  icon: string
  color: string
  class: EntityClass
}

/** Build options list for entity type pickers */
export function buildEntityTypeOptions(filter?: {
  class?: EntityClass
  types?: EntityType[]
}): EntityTypeOption[] {
  let configs = Object.values(ENTITY_TYPES)

  if (filter?.class) {
    configs = configs.filter(c => c.class === filter.class)
  }
  if (filter?.types) {
    const allowed = new Set(filter.types)
    configs = configs.filter(c => allowed.has(c.type))
  }

  return configs.map(c => ({
    value: c.type,
    label: c.label,
    icon: c.icon,
    color: c.color,
    class: c.class,
  }))
}

/** Build options grouped by class (for categorized pickers) */
export function buildGroupedEntityTypeOptions(): Record<EntityClass, EntityTypeOption[]> {
  return {
    temporal: buildEntityTypeOptions({ class: 'temporal' }),
    document: buildEntityTypeOptions({ class: 'document' }),
    actor: buildEntityTypeOptions({ class: 'actor' }),
    container: buildEntityTypeOptions({ class: 'container' }),
  }
}
