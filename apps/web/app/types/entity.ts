/**
 * Entity Class Architecture
 *
 * Two-axis type system for all entities in the app:
 *
 *   Axis 1: Entity Class — determines structural chrome (dialog shell,
 *           base properties, allowed projections, behaviors)
 *
 *   Axis 2: Entity Type  — determines content panels (property editors,
 *           content sections, footer actions, type-specific fields)
 *
 * Every entity type belongs to exactly one class. The class provides
 * the structural container; the type fills it with specific content.
 *
 * Classes:
 *   - temporal   — has date/time span, lives on a calendar
 *   - document   — has rich content body, no inherent temporality
 *   - actor      — represents a person or entity with identity
 *   - container  — groups/organizes other entities
 */

import type { ProjectionType } from '~/types/database'

// ============================================================================
// Entity Classes
// ============================================================================

export type EntityClass = 'temporal' | 'document' | 'actor' | 'container'

// ============================================================================
// Entity Types (per class)
// ============================================================================

export type TemporalEntityType =
  | 'task'
  | 'event'
  | 'trip'
  | 'payment'
  | 'appointment'
  | 'reminder'
  | 'deadline'
  | 'milestone'

export type DocumentEntityType = 'note' | 'file' | 'page' | 'template' | 'slide_deck' | 'bookmark'

export type ActorEntityType = 'person' | 'contact' | 'organization' | 'vendor'

export type ContainerEntityType = 'project' | 'folder' | 'collection' | 'goal'

export type EntityType = TemporalEntityType | DocumentEntityType | ActorEntityType | ContainerEntityType

// ============================================================================
// EntityBase — shared by ALL entities regardless of class
// ============================================================================

export interface EntityBase {
  id: string
  type: EntityType
  title: string
  description?: string
  tags: string[]
  owner?: string
  involved: string[]
  category?: string
  references: Reference[]
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// Class Mixins — structural properties unique to each class
// ============================================================================

/** Properties meaningful for things that occupy time */
export interface TemporalMixin {
  startDate: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD (multi-day)
  allDay: boolean
  startTime?: string // HH:mm (when not all-day)
  endTime?: string // HH:mm (when not all-day)
  duration?: number // minutes (alternative to endTime)
  priority: Priority
  urgency: Urgency
  priorityOverride: boolean
  urgencyOverride: boolean
  reminders: Reminder[]
  recurrence?: RecurrenceRule
}

/** Properties meaningful for things with a content body */
export interface DocumentMixin {
  content?: string // rich text body
  pinned: boolean
  /** @deprecated Use `EntityBase.references` instead. */
  linkedItems?: string[] // IDs of related entities
  wordCount?: number
}

/** Properties meaningful for things with identity/relationships */
export interface ActorMixin {
  email?: string
  phone?: string
  avatar?: string
  role?: string
  relationships: string[] // entity IDs
}

/** Properties meaningful for things that group other entities */
export interface ContainerMixin {
  children: string[] // entity IDs
  progress?: number // 0–1
  status: ContainerStatus
  parentId?: string
}

// ============================================================================
// Shared Enums & Primitives
// ============================================================================

export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Urgency = 'urgent' | 'not-urgent'
export type ContainerStatus = 'active' | 'archived' | 'completed' | 'on-hold'

export type TaskStatus = 'pending' | 'in-progress' | 'on-track' | 'due-soon' | 'overdue' | 'completed'
export type EventSubtype = 'meeting' | 'appointment' | 'training' | 'deadline' | 'social' | 'other'
export type TripStatus = 'planning' | 'booked' | 'in-progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type TransportMode = 'flight' | 'drive' | 'train' | 'bus' | 'other'

// ============================================================================
// Supporting Types (unchanged from calendarItem.ts)
// ============================================================================

export interface Reminder {
  id: string
  timing: string
  method: 'email' | 'push' | 'in-app'
  customMinutes?: number
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'custom'
  interval?: number
  weekdays?: number[]
  endDate?: string
  occurrences?: number
}

// ── Reference System ─────────────────────────────────────────────────────

export type FileType = 'pdf' | 'spreadsheet' | 'image' | 'document' | 'other'

export interface FileReference {
  kind: 'file'
  id: string
  name: string
  fileType: FileType
  url?: string
  size?: number
}

export interface EntityReference {
  kind: 'entity'
  id: string // unique reference record ID
  entityId: string // target entity's ID
  entityType: EntityType // target entity's type
  title: string // denormalized snapshot for display
  direction: 'outgoing' | 'incoming'
}

export interface BookmarkReference {
  kind: 'bookmark'
  id: string
  url: string
  title: string
  favicon?: string
}

export type Reference = FileReference | EntityReference | BookmarkReference

export const isFileReference = (ref: Reference): ref is FileReference => ref.kind === 'file'
export const isEntityReference = (ref: Reference): ref is EntityReference => ref.kind === 'entity'
export const isBookmarkReference = (ref: Reference): ref is BookmarkReference => ref.kind === 'bookmark'

/**
 * @deprecated Use `FileReference` instead. Kept for backward compatibility.
 */
export interface Attachment {
  id: string
  name: string
  type: FileType
  url?: string
  size?: number
}

export interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  order: number
}

export interface Attendee {
  id: string
  name: string
  email?: string
  avatar?: string
  rsvp?: 'accepted' | 'declined' | 'tentative' | 'pending'
}

export interface FormulaField {
  id: string
  name: string
  expression: string
  returnType: 'text' | 'number' | 'boolean' | 'date'
  result?: unknown
}

// ============================================================================
// Concrete Entity Types — compose EntityBase + class mixin + type fields
// ============================================================================

// ── Temporal Entities ──────────────────────────────────────────────────────

export interface TaskItem extends EntityBase, TemporalMixin {
  type: 'task'
  taskStatus: TaskStatus
  checklist?: ChecklistItem[]
  attachments: Attachment[]
  formulas?: FormulaField[]
  folder?: string
  notes?: string
}

export interface EventItem extends EntityBase, TemporalMixin {
  type: 'event'
  location?: string
  attendees?: Attendee[]
  conferenceLink?: string
  eventSubtype: EventSubtype
  attachments: Attachment[]
}

export interface TripItem extends EntityBase, TemporalMixin {
  type: 'trip'
  origin?: string
  destination: string
  transportation: TransportMode
  budget?: number
  currency?: string
  confirmationNumber?: string
  tripStatus: TripStatus
}

export interface PaymentItem extends EntityBase, TemporalMixin {
  type: 'payment'
  amount: number
  currency: string
  payee?: string
  paymentMethod?: string
  recurring: boolean
  paymentStatus: PaymentStatus
  invoiceNumber?: string
}

export interface AppointmentItem extends EntityBase, TemporalMixin {
  type: 'appointment'
  provider?: string
  location?: string
  specialty?: string
  insurance?: string
  copay?: number
  visitNotes?: string
  followUpDate?: string
}

export interface ReminderItem extends EntityBase, TemporalMixin {
  type: 'reminder'
  acknowledged: boolean
}

export interface DeadlineItem extends EntityBase, TemporalMixin {
  type: 'deadline'
  sourceEntity?: string // ID of the entity this deadline belongs to
  sourceType?: EntityType
  isMet: boolean
}

export interface MilestoneItem extends EntityBase, TemporalMixin {
  type: 'milestone'
  projectId?: string
  achieved: boolean
}

// ── Document Entities ──────────────────────────────────────────────────────

export interface NoteItem extends EntityBase, DocumentMixin {
  type: 'note'
}

export interface FileItem extends EntityBase, DocumentMixin {
  type: 'file'
  mimeType: string
  sizeBytes?: number
  url?: string
  storagePath?: string
}

export interface PageItem extends EntityBase, DocumentMixin {
  type: 'page'
  slug?: string
  isPublished: boolean
}

export interface TemplateItem extends EntityBase, DocumentMixin {
  type: 'template'
  templateFor: EntityType // what entity type this is a template for
  fields?: FormulaField[]
}

export interface BookmarkItem extends EntityBase, DocumentMixin {
  type: 'bookmark'
  url: string
  favicon?: string
  thumbnail?: string
  siteName?: string
  excerpt?: string
}

// ── Actor Entities ─────────────────────────────────────────────────────────

export interface PersonItem extends EntityBase, ActorMixin {
  type: 'person'
  organization?: string
  jobTitle?: string
}

export interface ContactItem extends EntityBase, ActorMixin {
  type: 'contact'
  company?: string
  address?: string
  notes?: string
}

export interface OrganizationItem extends EntityBase, ActorMixin {
  type: 'organization'
  website?: string
  industry?: string
  memberCount?: number
}

export interface VendorItem extends EntityBase, ActorMixin {
  type: 'vendor'
  services?: string[]
  contractEnd?: string
  rating?: number
}

// ── Container Entities ─────────────────────────────────────────────────────

export interface ProjectItem extends EntityBase, ContainerMixin {
  type: 'project'
  startDate?: string
  endDate?: string
  budget?: number
}

export interface FolderItem extends EntityBase, ContainerMixin {
  type: 'folder'
  isSystemGenerated?: boolean
}

export interface CollectionItem extends EntityBase, ContainerMixin {
  type: 'collection'
  collectionType?: 'database' | 'document' | 'board' | 'calendar' | 'gallery' | 'form' | 'page' | 'list'
}

export interface GoalItem extends EntityBase, ContainerMixin {
  type: 'goal'
  targetDate?: string
  metric?: string
  targetValue?: number
  currentValue?: number
}

// ============================================================================
// Discriminated Unions (per class and universal)
// ============================================================================

export type TemporalEntity =
  | TaskItem
  | EventItem
  | TripItem
  | PaymentItem
  | AppointmentItem
  | ReminderItem
  | DeadlineItem
  | MilestoneItem

export type DocumentEntity = NoteItem | FileItem | PageItem | TemplateItem | BookmarkItem

export type ActorEntity = PersonItem | ContactItem | OrganizationItem | VendorItem

export type ContainerEntity = ProjectItem | FolderItem | CollectionItem | GoalItem

/** Any entity in the system */
export type Entity = TemporalEntity | DocumentEntity | ActorEntity | ContainerEntity

// ============================================================================
// Class → Union mapping (useful for generic components)
// ============================================================================

export type EntityOfClass<C extends EntityClass> = C extends 'temporal'
  ? TemporalEntity
  : C extends 'document'
    ? DocumentEntity
    : C extends 'actor'
      ? ActorEntity
      : C extends 'container'
        ? ContainerEntity
        : never

// ============================================================================
// Type Guards
// ============================================================================

const TEMPORAL_TYPES: Set<string> = new Set<TemporalEntityType>([
  'task',
  'event',
  'trip',
  'payment',
  'appointment',
  'reminder',
  'deadline',
  'milestone',
])
const DOCUMENT_TYPES: Set<string> = new Set<DocumentEntityType>(['note', 'file', 'page', 'template', 'bookmark'])
const ACTOR_TYPES: Set<string> = new Set<ActorEntityType>(['person', 'contact', 'organization', 'vendor'])
const CONTAINER_TYPES: Set<string> = new Set<ContainerEntityType>(['project', 'folder', 'collection', 'goal'])

export const getEntityClass = (type: EntityType): EntityClass => {
  if (TEMPORAL_TYPES.has(type)) return 'temporal'
  if (DOCUMENT_TYPES.has(type)) return 'document'
  if (ACTOR_TYPES.has(type)) return 'actor'
  if (CONTAINER_TYPES.has(type)) return 'container'
  return 'temporal' // fallback
}

export const isTemporal = (entity: Entity): entity is TemporalEntity => TEMPORAL_TYPES.has(entity.type)

export const isDocument = (entity: Entity): entity is DocumentEntity => DOCUMENT_TYPES.has(entity.type)

export const isActor = (entity: Entity): entity is ActorEntity => ACTOR_TYPES.has(entity.type)

export const isContainer = (entity: Entity): entity is ContainerEntity => CONTAINER_TYPES.has(entity.type)

// Fine-grained type guards
export const isTask = (entity: Entity): entity is TaskItem => entity.type === 'task'
export const isEvent = (entity: Entity): entity is EventItem => entity.type === 'event'
export const isTrip = (entity: Entity): entity is TripItem => entity.type === 'trip'
export const isPayment = (entity: Entity): entity is PaymentItem => entity.type === 'payment'
export const isAppointment = (entity: Entity): entity is AppointmentItem => entity.type === 'appointment'
export const isNote = (entity: Entity): entity is NoteItem => entity.type === 'note'
export const isFile = (entity: Entity): entity is FileItem => entity.type === 'file'
export const isPerson = (entity: Entity): entity is PersonItem => entity.type === 'person'
export const isProject = (entity: Entity): entity is ProjectItem => entity.type === 'project'
export const isBookmark = (entity: Entity): entity is BookmarkItem => entity.type === 'bookmark'
export const isFolder = (entity: Entity): entity is FolderItem => entity.type === 'folder'
export const isGoal = (entity: Entity): entity is GoalItem => entity.type === 'goal'

// ============================================================================
// Property Field System — schema-driven UI field declarations
// ============================================================================

/** Canonical property field identifiers */
export type PropertyFieldId =
  // Scheduling
  | 'startDate'
  | 'endDate'
  | 'allDay'
  | 'timeRange'
  // Triage
  | 'priority'
  | 'urgency'
  | 'status'
  // Classification
  | 'type'
  | 'category'
  | 'folder'
  // People
  | 'owner'
  | 'involved'
  // Annotation (user-level, not intrinsic to the entity)
  | 'pin'
  | 'tags'

/** Layout groups for the properties row */
export type PropertyFieldGroup =
  | 'identity' // type switcher
  | 'scheduling' // dates, times, allDay
  | 'triage' // priority, urgency, status
  | 'classification' // category, folder
  | 'people' // owner, involved
  | 'annotation' // pin, tags — user-level metadata, not intrinsic

/** Display style for the field in the properties row */
export type PropertyFieldDisplay = 'pill' | 'toggle' | 'inline-input' | 'popover'

/** Per-field configuration: what it is, how it behaves, where it renders */
export interface PropertyFieldConfig {
  id: PropertyFieldId
  group: PropertyFieldGroup
  label: string
  icon: string
  display: PropertyFieldDisplay
  /** Field is editable (vs read-only computed) */
  editable: boolean
  /** Field must have a value before save */
  required: boolean
  /** Field value is auto-computed (e.g. priority from formulas) */
  computed: boolean
  /** Show only in these modes (omit = show in all modes) */
  modes?: Array<'view' | 'create' | 'edit'>
  /** Default value when creating a new entity of this type */
  defaultValue?: unknown
}

// ============================================================================
// Registry Types — consumed by entityRegistry.ts
// ============================================================================

/** What dialog panels a type uses */
export interface EntityPanelConfig {
  properties: string // component name for the properties row
  content: string // component name for the main content area
  footerActions: string[] // action IDs: 'complete', 'markPaid', 'archive', etc.
}

/** Full config for how a type behaves in the UI */
export interface EntityTypeConfig {
  type: EntityType
  class: EntityClass
  label: string
  labelPlural: string
  icon: string
  color: string // Tailwind color token (e.g. 'blue', 'emerald')
  projections: ProjectionType[]
  /** The preferred default projection when viewing this entity type */
  defaultProjection?: ProjectionType
  dialogShell: EntityClass // which shell to use (matches class by default)
  panels: EntityPanelConfig
  propertyFields: PropertyFieldConfig[]
  defaultSortField: string
  searchFields: string[]
}

/** Class-level config (shared by all types in a class) */
export interface EntityClassConfig {
  class: EntityClass
  label: string
  icon: string
  baseProjections: ProjectionType[]
  dialogShell: string // component name
}
