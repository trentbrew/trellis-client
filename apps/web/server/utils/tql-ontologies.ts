/**
 * TQL Ontology Definitions
 *
 * Canonical schema definitions for every entity type in the Trellis system.
 * Each ontology defines both the data schema (fields) and UI metadata
 * (icon, color, projections, panels, property fields).
 *
 * The client fetches these from GET /api/graph/ontologies and derives
 * EntityTypeConfig objects. This is the single source of truth for what
 * entity types exist and how they look/behave.
 *
 * Also includes the legacy polymorphic calendaritem ontology for backward
 * compat with TQL queries (FIND calendaritem AS ?t WHERE ?t.type = "task").
 */

import type { SchemaDefinition, PropertyValueSpecification, WorkspaceConfig } from '@toolkit/tql'
import { getRouteDefinitions } from './tql-routes'

// ============================================================================
// Field helpers — compact builders for PropertyValueSpecification
// ============================================================================

type PVS = PropertyValueSpecification
const f = (name: string, valueType: PVS['valueType'], opts?: Partial<Omit<PVS, 'name' | 'valueType'>>): PVS =>
  ({ name, valueType, ...opts }) as PVS

// ── Shared field sets (per class) ──────────────────────────────────────────

const baseFields = (): PVS[] => [
  f('title', 'title', { required: true }),
  f('description', 'rich_text'),
  f('tags', 'multi_select', { icon: 'lucide:hash', group: 'annotation', display: 'inline-input', editable: true, defaultValue: [] }),
  f('owner', 'people', { icon: 'lucide:user', group: 'people', display: 'popover', editable: true }),
  f('involved', 'people', { icon: 'lucide:users', group: 'people', display: 'popover', editable: true }),
  f('category', 'select', { icon: 'lucide:tag', group: 'classification', display: 'popover', editable: true, selectOptions: ['general', 'work', 'personal', 'meeting', 'review', 'appointment', 'deadline', 'health', 'finance', 'travel'] }),
  f('createdAt', 'date'),
  f('updatedAt', 'date'),
]

const temporalFields = (): PVS[] => [
  f('startDate', 'date', { icon: 'lucide:calendar', group: 'scheduling', display: 'inline-input', editable: true }),
  f('endDate', 'date', { icon: 'lucide:calendar-range', group: 'scheduling', display: 'inline-input', editable: true }),
  f('allDay', 'checkbox', { icon: 'lucide:sun', group: 'scheduling', display: 'toggle', editable: true, defaultValue: false }),
  f('startTime', 'rich_text'),
  f('endTime', 'rich_text'),
  f('priority', 'select', { selectOptions: ['critical', 'high', 'medium', 'low'], icon: 'lucide:minus', group: 'triage', display: 'popover', editable: true, computed: true }),
  f('urgency', 'select', { selectOptions: ['urgent', 'not-urgent'], icon: 'lucide:clock', group: 'triage', display: 'popover', editable: true, computed: true }),
  f('priorityOverride', 'checkbox'),
  f('urgencyOverride', 'checkbox'),
]

const documentFields = (): PVS[] => [
  f('content', 'rich_text'),
  f('pinned', 'checkbox', { icon: 'lucide:pin', group: 'annotation', display: 'toggle', editable: true, defaultValue: false }),
]

const actorFields = (): PVS[] => [
  f('email', 'email'),
  f('phone', 'phone_number'),
  f('avatar', 'url'),
  f('role', 'rich_text'),
]

const containerFields = (): PVS[] => [
  f('status', 'select', { selectOptions: ['active', 'archived', 'completed', 'on-hold'], icon: 'lucide:circle-dot', group: 'triage', display: 'popover', editable: true }),
  f('parentId', 'rich_text'),
  f('progress', 'number'),
]

// ============================================================================
// Per-Type Ontologies — Temporal
// ============================================================================

const taskOntology: SchemaDefinition = {
  '@id': 'trellis:schema/task', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Task', labelPlural: 'Tasks',
  icon: 'lucide:check-square', color: 'blue',
  projections: ['kanban', 'calendar', 'list', 'table', 'timeline'],
  defaultProjection: 'kanban',
  dialogShell: 'temporal',
  panels: { properties: 'TaskProperties', content: 'TaskContent', footerActions: ['complete', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'status', 'startDate', 'endDate', 'allDay', 'timeRange', 'priority', 'urgency', 'category', 'owner', 'involved', 'folder', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'description', 'notes'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('taskStatus', 'select', { selectOptions: ['pending', 'in-progress', 'on-track', 'due-soon', 'overdue', 'completed'], icon: 'lucide:circle-dot', group: 'triage', display: 'popover', editable: true }),
    f('folder', 'rich_text', { icon: 'lucide:folder', group: 'classification', display: 'popover', editable: true }),
    f('notes', 'rich_text'),
  ],
}

const eventOntology: SchemaDefinition = {
  '@id': 'trellis:schema/event', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Event', labelPlural: 'Events',
  icon: 'lucide:calendar', color: 'purple',
  projections: ['calendar', 'timeline', 'list', 'table'],
  defaultProjection: 'calendar',
  dialogShell: 'temporal',
  panels: { properties: 'EventProperties', content: 'EventContent', footerActions: ['duplicate', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'endDate', 'allDay', 'timeRange', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'description', 'location'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('location', 'rich_text'),
    f('conferenceLink', 'url'),
    f('eventSubtype', 'select', { selectOptions: ['meeting', 'appointment', 'training', 'deadline', 'social', 'other'] }),
  ],
}

const tripOntology: SchemaDefinition = {
  '@id': 'trellis:schema/trip', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Trip', labelPlural: 'Trips',
  icon: 'lucide:plane', color: 'cyan',
  projections: ['calendar', 'timeline', 'list', 'card-grid'],
  defaultProjection: 'calendar',
  dialogShell: 'temporal',
  panels: { properties: 'TripProperties', content: 'TripContent', footerActions: ['duplicate', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'endDate', 'allDay', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'destination', 'origin'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('origin', 'rich_text'),
    f('destination', 'rich_text'),
    f('transportation', 'select', { selectOptions: ['flight', 'drive', 'train', 'bus', 'other'] }),
    f('budget', 'number'),
    f('currency', 'rich_text'),
    f('confirmationNumber', 'rich_text'),
    f('tripStatus', 'select', { selectOptions: ['planning', 'booked', 'in-progress', 'completed', 'cancelled'] }),
  ],
}

const paymentOntology: SchemaDefinition = {
  '@id': 'trellis:schema/payment', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Payment', labelPlural: 'Payments',
  icon: 'lucide:credit-card', color: 'emerald',
  projections: ['calendar', 'list', 'table'],
  defaultProjection: 'table',
  dialogShell: 'temporal',
  panels: { properties: 'PaymentProperties', content: 'PaymentContent', footerActions: ['markPaid', 'void', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'allDay', 'priority', 'urgency', 'category', 'owner', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'payee', 'invoiceNumber'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('amount', 'number'),
    f('currency', 'rich_text'),
    f('payee', 'rich_text'),
    f('paymentMethod', 'rich_text'),
    f('recurring', 'checkbox'),
    f('paymentStatus', 'select', { selectOptions: ['pending', 'paid', 'overdue', 'cancelled'] }),
    f('invoiceNumber', 'rich_text'),
  ],
}

const appointmentOntology: SchemaDefinition = {
  '@id': 'trellis:schema/appointment', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Appointment', labelPlural: 'Appointments',
  icon: 'lucide:stethoscope', color: 'rose',
  projections: ['calendar', 'list', 'table', 'timeline'],
  defaultProjection: 'calendar',
  dialogShell: 'temporal',
  panels: { properties: 'AppointmentProperties', content: 'AppointmentContent', footerActions: ['confirm', 'reschedule', 'cancel', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'endDate', 'timeRange', 'category', 'owner', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'provider', 'location', 'specialty'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('provider', 'rich_text'),
    f('location', 'rich_text'),
    f('specialty', 'rich_text'),
    f('insurance', 'rich_text'),
    f('copay', 'number'),
    f('visitNotes', 'rich_text'),
    f('followUpDate', 'date'),
  ],
}

const reminderOntology: SchemaDefinition = {
  '@id': 'trellis:schema/reminder', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Reminder', labelPlural: 'Reminders',
  icon: 'lucide:bell', color: 'amber',
  projections: ['list', 'calendar'],
  defaultProjection: 'list',
  dialogShell: 'temporal',
  panels: { properties: 'ReminderProperties', content: 'ReminderContent', footerActions: ['acknowledge', 'snooze', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'timeRange', 'category', 'owner', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('acknowledged', 'checkbox'),
  ],
}

const deadlineOntology: SchemaDefinition = {
  '@id': 'trellis:schema/deadline', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Deadline', labelPlural: 'Deadlines',
  icon: 'lucide:alarm-clock', color: 'red',
  projections: ['calendar', 'timeline', 'list'],
  defaultProjection: 'calendar',
  dialogShell: 'temporal',
  panels: { properties: 'DeadlineProperties', content: 'DeadlineContent', footerActions: ['markMet', 'extend', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'allDay', 'priority', 'urgency', 'category', 'owner', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('sourceEntity', 'rich_text'),
    f('sourceType', 'rich_text'),
    f('isMet', 'checkbox'),
  ],
}

const milestoneOntology: SchemaDefinition = {
  '@id': 'trellis:schema/milestone', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'temporal', label: 'Milestone', labelPlural: 'Milestones',
  icon: 'lucide:flag', color: 'orange',
  projections: ['timeline', 'list', 'calendar'],
  defaultProjection: 'timeline',
  dialogShell: 'temporal',
  panels: { properties: 'MilestoneProperties', content: 'MilestoneContent', footerActions: ['achieve', 'delete'] },
  propertyFieldIds: ['type', 'startDate', 'allDay', 'category', 'owner', 'tags'],
  defaultSortField: 'startDate',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...temporalFields(),
    f('projectId', 'rich_text'),
    f('achieved', 'checkbox'),
  ],
}

// ============================================================================
// Per-Type Ontologies — Document
// ============================================================================

const noteOntology: SchemaDefinition = {
  '@id': 'trellis:schema/note', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'document', label: 'Note', labelPlural: 'Notes',
  icon: 'lucide:sticky-note', color: 'yellow',
  projections: ['card-grid', 'list', 'table'],
  defaultProjection: 'card-grid',
  dialogShell: 'document',
  panels: { properties: 'NoteProperties', content: 'NoteContent', footerActions: ['archive', 'delete'] },
  propertyFieldIds: ['type', 'pin', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'updatedAt',
  searchFields: ['title', 'content', 'description'],
  fields: [...baseFields(), ...documentFields()],
}

const fileOntology: SchemaDefinition = {
  '@id': 'trellis:schema/file', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'document', label: 'File', labelPlural: 'Files',
  icon: 'lucide:file', color: 'slate',
  projections: ['card-grid', 'list', 'table'],
  defaultProjection: 'card-grid',
  dialogShell: 'document',
  panels: { properties: 'FileProperties', content: 'FileContent', footerActions: ['download', 'share', 'delete'] },
  propertyFieldIds: ['type', 'pin', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'updatedAt',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...documentFields(),
    f('mimeType', 'rich_text'),
    f('sizeBytes', 'number'),
    f('url', 'url'),
    f('storagePath', 'rich_text'),
  ],
}

const pageOntology: SchemaDefinition = {
  '@id': 'trellis:schema/page', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'document', label: 'Page', labelPlural: 'Pages',
  icon: 'lucide:book-open', color: 'indigo',
  projections: ['list', 'card-grid'],
  defaultProjection: 'list',
  dialogShell: 'document',
  panels: { properties: 'PageProperties', content: 'PageContent', footerActions: ['publish', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'pin', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'updatedAt',
  searchFields: ['title', 'content', 'description'],
  fields: [
    ...baseFields(), ...documentFields(),
    f('slug', 'rich_text'),
    f('isPublished', 'checkbox'),
  ],
}

const templateOntology: SchemaDefinition = {
  '@id': 'trellis:schema/template', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'document', label: 'Template', labelPlural: 'Templates',
  icon: 'lucide:copy', color: 'violet',
  projections: ['list', 'card-grid', 'table'],
  defaultProjection: 'list',
  dialogShell: 'document',
  panels: { properties: 'TemplateProperties', content: 'TemplateContent', footerActions: ['useTemplate', 'duplicate', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...documentFields(),
    f('templateFor', 'rich_text'),
  ],
}

const slideDeckOntology: SchemaDefinition = {
  '@id': 'trellis:schema/slide_deck', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'document', label: 'Slide Deck', labelPlural: 'Slide Decks',
  icon: 'lucide:presentation', color: 'rose',
  projections: ['slide-deck', 'list', 'table'],
  defaultProjection: 'slide-deck',
  dialogShell: 'document',
  panels: { properties: 'SlideDeckProperties', content: 'SlideDeckContent', footerActions: ['present', 'duplicate', 'delete'] },
  propertyFieldIds: ['type', 'pin', 'category', 'owner', 'tags'],
  defaultSortField: 'updatedAt',
  searchFields: ['title', 'description'],
  fields: [...baseFields(), ...documentFields()],
}

const bookmarkOntology: SchemaDefinition = {
  '@id': 'trellis:schema/bookmark', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'document', label: 'Bookmark', labelPlural: 'Bookmarks',
  icon: 'lucide:bookmark', color: 'sky',
  projections: ['card-grid', 'list', 'table', 'moodboard'],
  defaultProjection: 'card-grid',
  dialogShell: 'document',
  panels: { properties: 'BookmarkProperties', content: 'BookmarkContent', footerActions: ['pin', 'archive', 'delete'] },
  propertyFieldIds: ['pin', 'tags'],
  defaultSortField: 'updatedAt',
  searchFields: ['title', 'url', 'description', 'siteName', 'excerpt'],
  fields: [
    ...baseFields(), ...documentFields(),
    f('url', 'url', { required: true }),
    f('favicon', 'url'),
    f('thumbnail', 'url'),
    f('siteName', 'rich_text'),
    f('excerpt', 'rich_text'),
  ],
}

// ============================================================================
// Per-Type Ontologies — Actor
// ============================================================================

const personOntology: SchemaDefinition = {
  '@id': 'trellis:schema/person', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'actor', label: 'Person', labelPlural: 'People',
  icon: 'lucide:user', color: 'sky',
  projections: ['table', 'card-grid', 'list', 'graph'],
  defaultProjection: 'table',
  dialogShell: 'actor',
  panels: { properties: 'PersonProperties', content: 'PersonContent', footerActions: ['message', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'email', 'jobTitle', 'organization'],
  fields: [
    ...baseFields(), ...actorFields(),
    f('organization', 'rich_text'),
    f('jobTitle', 'rich_text'),
  ],
}

const contactOntology: SchemaDefinition = {
  '@id': 'trellis:schema/contact', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'actor', label: 'Contact', labelPlural: 'Contacts',
  icon: 'lucide:contact', color: 'teal',
  projections: ['table', 'card-grid', 'list'],
  defaultProjection: 'table',
  dialogShell: 'actor',
  panels: { properties: 'ContactProperties', content: 'ContactContent', footerActions: ['message', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'email', 'company', 'phone'],
  fields: [
    ...baseFields(), ...actorFields(),
    f('company', 'rich_text'),
    f('address', 'rich_text'),
    f('notes', 'rich_text'),
  ],
}

const organizationOntology: SchemaDefinition = {
  '@id': 'trellis:schema/organization', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'actor', label: 'Organization', labelPlural: 'Organizations',
  icon: 'lucide:building-2', color: 'zinc',
  projections: ['table', 'card-grid', 'list', 'graph'],
  defaultProjection: 'table',
  dialogShell: 'actor',
  panels: { properties: 'OrganizationProperties', content: 'OrganizationContent', footerActions: ['archive', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'website', 'industry'],
  fields: [
    ...baseFields(), ...actorFields(),
    f('website', 'url'),
    f('industry', 'rich_text'),
    f('memberCount', 'number'),
  ],
}

const vendorOntology: SchemaDefinition = {
  '@id': 'trellis:schema/vendor', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'actor', label: 'Vendor', labelPlural: 'Vendors',
  icon: 'lucide:store', color: 'lime',
  projections: ['table', 'card-grid', 'list'],
  defaultProjection: 'table',
  dialogShell: 'actor',
  panels: { properties: 'VendorProperties', content: 'VendorContent', footerActions: ['archive', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'email', 'services'],
  fields: [
    ...baseFields(), ...actorFields(),
    f('services', 'multi_select'),
    f('contractEnd', 'date'),
    f('rating', 'number'),
  ],
}

// ============================================================================
// Per-Type Ontologies — Container
// ============================================================================

const projectOntology: SchemaDefinition = {
  '@id': 'trellis:schema/project', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'container', label: 'Project', labelPlural: 'Projects',
  icon: 'lucide:folder-kanban', color: 'blue',
  projections: ['kanban', 'list', 'table', 'timeline', 'dashboard'],
  defaultProjection: 'kanban',
  dialogShell: 'container',
  panels: { properties: 'ProjectProperties', content: 'ProjectContent', footerActions: ['archive', 'complete', 'delete'] },
  propertyFieldIds: ['type', 'status', 'startDate', 'endDate', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...containerFields(),
    f('startDate', 'date', { icon: 'lucide:calendar', group: 'scheduling', display: 'inline-input', editable: true }),
    f('endDate', 'date', { icon: 'lucide:calendar-range', group: 'scheduling', display: 'inline-input', editable: true }),
    f('budget', 'number'),
  ],
}

const folderOntology: SchemaDefinition = {
  '@id': 'trellis:schema/folder', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'container', label: 'Folder', labelPlural: 'Folders',
  icon: 'lucide:folder', color: 'amber',
  projections: ['list', 'table'],
  defaultProjection: 'list',
  dialogShell: 'container',
  panels: { properties: 'FolderProperties', content: 'FolderContent', footerActions: ['archive', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...containerFields(),
    f('isSystemGenerated', 'checkbox'),
  ],
}

const collectionOntology: SchemaDefinition = {
  '@id': 'trellis:schema/collection', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'container', label: 'Collection', labelPlural: 'Collections',
  icon: 'lucide:database', color: 'indigo',
  projections: ['list', 'card-grid', 'table'],
  defaultProjection: 'table',
  dialogShell: 'container',
  panels: { properties: 'CollectionProperties', content: 'CollectionContent', footerActions: ['publish', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'category', 'owner', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'description'],
  fields: [
    ...baseFields(), ...containerFields(),
    f('collectionType', 'select', { selectOptions: ['database', 'document', 'board', 'calendar', 'gallery', 'form', 'page', 'list'] }),
  ],
}

const goalOntology: SchemaDefinition = {
  '@id': 'trellis:schema/goal', '@type': 'trellis:Schema', version: '1.0.0', tier: 'system',
  entityClass: 'container', label: 'Goal', labelPlural: 'Goals',
  icon: 'lucide:target', color: 'emerald',
  projections: ['list', 'kanban', 'table', 'timeline'],
  defaultProjection: 'kanban',
  dialogShell: 'container',
  panels: { properties: 'GoalProperties', content: 'GoalContent', footerActions: ['complete', 'archive', 'delete'] },
  propertyFieldIds: ['type', 'status', 'endDate', 'category', 'owner', 'involved', 'tags'],
  defaultSortField: 'title',
  searchFields: ['title', 'description', 'metric'],
  fields: [
    ...baseFields(), ...containerFields(),
    f('targetDate', 'date'),
    f('metric', 'rich_text'),
    f('targetValue', 'number'),
    f('currentValue', 'number'),
    f('endDate', 'date', { icon: 'lucide:calendar-range', group: 'scheduling', display: 'inline-input', editable: true }),
  ],
}

// ============================================================================
// Legacy Polymorphic Ontology — CalendarItem
// Kept for backward compat with TQL queries: FIND calendaritem AS ?t ...
// ============================================================================

const calendarItemOntology: SchemaDefinition = {
  '@id': 'trellis:schema/calendaritem',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  tier: 'system',
  fields: [
    f('type', 'select', { required: true, selectOptions: ['task', 'event', 'trip', 'payment', 'note', 'appointment', 'reminder', 'deadline', 'milestone', 'bookmark', 'file', 'page', 'template', 'slide_deck', 'person', 'contact', 'organization', 'vendor', 'project', 'folder', 'collection', 'goal'] }),
    f('title', 'title', { required: true }),
    f('description', 'rich_text'),
    f('startDate', 'date'),
    f('endDate', 'date'),
    f('allDay', 'checkbox'),
    f('startTime', 'rich_text'),
    f('endTime', 'rich_text'),
    f('priority', 'select', { selectOptions: ['critical', 'high', 'medium', 'low'] }),
    f('urgency', 'select', { selectOptions: ['urgent', 'not-urgent'] }),
    f('priorityOverride', 'checkbox'),
    f('urgencyOverride', 'checkbox'),
    f('category', 'select', { selectOptions: ['general', 'work', 'personal', 'meeting', 'review', 'appointment', 'deadline', 'health', 'finance', 'travel'] }),
    f('tags', 'multi_select'),
    f('owner', 'rich_text'),
    f('involved', 'multi_select'),
    f('folder', 'rich_text'),
    f('notes', 'rich_text'),
    f('taskStatus', 'select', { selectOptions: ['pending', 'in-progress', 'on-track', 'due-soon', 'overdue', 'completed'] }),
    f('location', 'rich_text'),
    f('conferenceLink', 'url'),
    f('eventType', 'select', { selectOptions: ['meeting', 'appointment', 'training', 'deadline', 'social', 'other'] }),
    f('amount', 'number'),
    f('currency', 'rich_text'),
    f('payee', 'rich_text'),
    f('paymentMethod', 'rich_text'),
    f('recurring', 'checkbox'),
    f('paymentStatus', 'select', { selectOptions: ['pending', 'paid', 'overdue', 'cancelled'] }),
    f('content', 'rich_text'),
    f('pinned', 'checkbox'),
    f('origin', 'rich_text'),
    f('destination', 'rich_text'),
    f('transportation', 'select', { selectOptions: ['flight', 'drive', 'train', 'bus', 'other'] }),
    f('budget', 'number'),
    f('confirmationNumber', 'rich_text'),
    f('tripStatus', 'select', { selectOptions: ['planning', 'booked', 'in-progress', 'completed', 'cancelled'] }),
  ],
}

// ============================================================================
// Comment — activity/comment entries linked to any entity
// ============================================================================

const commentOntology: SchemaDefinition = {
  '@id': 'trellis:schema/comment',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  tier: 'system',
  fields: [
    f('entityId', 'rich_text', { required: true }),
    f('entityType', 'select', { required: true, selectOptions: ['calendarItem', 'task', 'note', 'event', 'payment', 'trip'] }),
    f('authorId', 'rich_text', { required: true }),
    f('authorName', 'rich_text', { required: true }),
    f('authorAvatar', 'rich_text'),
    f('content', 'rich_text', { required: true }),
    f('type', 'select', { required: true, selectOptions: ['comment', 'status_change', 'attachment', 'created'] }),
    f('metadata', 'rich_text'),
    f('createdAt', 'number'),
    f('updatedAt', 'number'),
    f('deletedAt', 'number'),
  ],
}

// ============================================================================
// All entity type ontologies — keyed by schema ID
// ============================================================================

const entityTypeOntologies: Record<string, SchemaDefinition> = {
  'trellis:schema/task': taskOntology,
  'trellis:schema/event': eventOntology,
  'trellis:schema/trip': tripOntology,
  'trellis:schema/payment': paymentOntology,
  'trellis:schema/appointment': appointmentOntology,
  'trellis:schema/reminder': reminderOntology,
  'trellis:schema/deadline': deadlineOntology,
  'trellis:schema/milestone': milestoneOntology,
  'trellis:schema/note': noteOntology,
  'trellis:schema/file': fileOntology,
  'trellis:schema/page': pageOntology,
  'trellis:schema/template': templateOntology,
  'trellis:schema/slide_deck': slideDeckOntology,
  'trellis:schema/bookmark': bookmarkOntology,
  'trellis:schema/person': personOntology,
  'trellis:schema/contact': contactOntology,
  'trellis:schema/organization': organizationOntology,
  'trellis:schema/vendor': vendorOntology,
  'trellis:schema/project': projectOntology,
  'trellis:schema/folder': folderOntology,
  'trellis:schema/collection': collectionOntology,
  'trellis:schema/goal': goalOntology,
}

// ============================================================================
// Workspace Configuration — the .trellis format
// ============================================================================

export function createWorkspaceConfig(): WorkspaceConfig {
  return {
    workspace: {
      name: 'Trellis',
      description: 'Single graph, many projections — all app data as a graph.',
      ontologies: {
        // System ontologies
        'trellis:schema/calendaritem': calendarItemOntology,
        'trellis:schema/comment': commentOntology,
        // Per-type ontologies (all 22 entity types)
        ...entityTypeOntologies,
      },
      routes: getRouteDefinitions() as any,
      app: {
        '@id': 'trellis:app',
        '@type': 'trellis:App' as const,
        title: 'Trellis',
        description: 'Personal knowledge graph platform',
        version: '0.1.0',
        devPort: 4141,
      },
      projections: {
        'trellis:projection/all-tasks': {
          '@id': 'trellis:projection/all-tasks',
          '@type': 'trellis:Projection',
          name: 'All Tasks',
          type: 'table',
          query: 'FIND calendaritem AS ?t WHERE ?t.type = "task"',
        },
        'trellis:projection/all-events': {
          '@id': 'trellis:projection/all-events',
          '@type': 'trellis:Projection',
          name: 'All Events',
          type: 'table',
          query: 'FIND calendaritem AS ?e WHERE ?e.type = "event"',
        },
        'trellis:projection/all-notes': {
          '@id': 'trellis:projection/all-notes',
          '@type': 'trellis:Projection',
          name: 'All Notes',
          type: 'card-grid',
          query: 'FIND calendaritem AS ?n WHERE ?n.type = "note"',
        },
        'trellis:projection/all-payments': {
          '@id': 'trellis:projection/all-payments',
          '@type': 'trellis:Projection',
          name: 'All Payments',
          type: 'table',
          query: 'FIND calendaritem AS ?p WHERE ?p.type = "payment"',
        },
      },
    },
  }
}

export {
  calendarItemOntology,
  commentOntology,
  entityTypeOntologies,
  taskOntology,
  eventOntology,
  tripOntology,
  paymentOntology,
  appointmentOntology,
  reminderOntology,
  deadlineOntology,
  milestoneOntology,
  noteOntology,
  fileOntology,
  pageOntology,
  templateOntology,
  slideDeckOntology,
  bookmarkOntology,
  personOntology,
  contactOntology,
  organizationOntology,
  vendorOntology,
  projectOntology,
  folderOntology,
  collectionOntology,
  goalOntology,
}
