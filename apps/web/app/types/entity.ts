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
import { todayYmdLocal } from '~/utils/date'

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
  | 'sprint'
  | 'budget'

export type DocumentEntityType = 'note' | 'file' | 'page' | 'template' | 'slide_deck' | 'bookmark' | 'diagram' | 'email'

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
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled'
export type BudgetStatus = 'draft' | 'active' | 'closed' | 'over-budget'

// ============================================================================
// Supporting Types
// ============================================================================

export interface Reminder {
  id: string
  timing: string
  method: 'email' | 'push' | 'in-app'
  customMinutes?: number
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'weekdays' | 'custom'
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
  parentId?: string | null
  collapsed?: boolean
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
// Additional Shared Types
// ============================================================================

export interface SocialLink {
  platform: string
  url: string
  username?: string
}

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'archived'

/** Alias — matches EventItem.eventType field name */
export type EventType = EventSubtype

export const DEFAULT_CATEGORIES = [
  'general',
  'work',
  'personal',
  'meeting',
  'review',
  'appointment',
  'deadline',
  'health',
  'finance',
  'travel',
] as const

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number]

// ============================================================================
// EntityItemBase — flat runtime shape shared by all entity types
// ============================================================================

export interface EntityItemBase {
  id: string
  type: EntityType
  title: string
  description?: string
  startDate: string
  endDate?: string
  allDay: boolean
  startTime?: string
  endTime?: string
  duration?: number
  priority: Priority
  urgency: Urgency
  priorityOverride: boolean
  urgencyOverride: boolean
  category: string
  tags: string[]
  owner?: string
  involved: string[]
  folder?: string
  notes?: string
  references: Reference[]
  /** @deprecated Use `references` instead. */
  attachments: Attachment[]
  commentCount?: number
  fileCount?: number
  reminders: Reminder[]
  recurrence?: RecurrenceRule
  formulas?: FormulaField[]
  dependsOn?: string[]
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// Concrete Entity Types (flat, extending EntityItemBase)
// ============================================================================

// ── Temporal Entities ──────────────────────────────────────────────────────

export interface TaskItem extends EntityItemBase {
  type: 'task'
  taskStatus: TaskStatus
  /** @deprecated Use `checklistContent` (HTML string) instead */
  checklist?: ChecklistItem[]
  /** TipTap TaskList HTML — replaces the legacy ChecklistItem[] array */
  checklistContent?: string
}

export interface EventItem extends EntityItemBase {
  type: 'event'
  location?: string
  attendees?: Attendee[]
  conferenceLink?: string
  eventType: EventSubtype
}

export interface TripItem extends EntityItemBase {
  type: 'trip'
  origin?: string
  destination: string
  transportation: TransportMode
  budget?: number
  currency?: string
  confirmationNumber?: string
  tripStatus: TripStatus
}

export type PaymentChannel = 'online' | 'in_store' | 'atm' | 'other'
export type PaymentDirection = 'debit' | 'credit'

/** Plaid-compatible counterparty on a transaction */
export interface TransactionCounterparty {
  name: string
  entityId?: string
  type?: 'merchant' | 'financial_institution' | 'payment_app' | 'marketplace' | 'income_source'
  logoUrl?: string
  website?: string
}

/** Line item on an invoice / receipt */
export interface PaymentLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface PaymentItem extends EntityItemBase {
  type: 'payment'
  amount: number
  currency: string
  payee?: string
  paymentMethod?: string
  recurring: boolean
  paymentStatus: PaymentStatus
  invoiceNumber?: string

  // Plaid-compatible transaction metadata
  direction?: PaymentDirection
  paymentChannel?: PaymentChannel
  merchantName?: string
  merchantLogoUrl?: string
  merchantWebsite?: string
  authorizedDate?: string
  accountName?: string
  accountMask?: string
  financeCategory?: string
  financeCategoryDetailed?: string
  counterparties?: TransactionCounterparty[]
  referenceNumber?: string
  checkNumber?: string
  pending?: boolean

  // Invoice / receipt detail
  lineItems?: PaymentLineItem[]
  subtotal?: number
  taxAmount?: number
  taxRate?: number
  discount?: number
  tip?: number
  balanceAfter?: number
  memo?: string
}

export interface AppointmentItem extends EntityItemBase {
  type: 'appointment'
  provider?: string
  location?: string
  specialty?: string
  insurance?: string
  copay?: number
  visitNotes?: string
  followUpDate?: string
}

export interface ReminderItem extends EntityItemBase {
  type: 'reminder'
  acknowledged: boolean
}

export interface DeadlineItem extends EntityItemBase {
  type: 'deadline'
  sourceEntity?: string
  sourceType?: EntityType
  isMet: boolean
}

export interface MilestoneItem extends EntityItemBase {
  type: 'milestone'
  projectId?: string
  achieved: boolean
}

export interface SprintItem extends EntityItemBase {
  type: 'sprint'
  sprintGoal?: string
  sprintStatus: SprintStatus
  velocity?: number
}

export interface BudgetItem extends EntityItemBase {
  type: 'budget'
  amount: number
  currency: string
  budgetStatus: BudgetStatus
}

// ── Document Entities ──────────────────────────────────────────────────────

export interface NoteItem extends EntityItemBase {
  type: 'note'
  content?: string
  linkedItems?: string[]
  pinned: boolean
}

/** File category — derived from MIME type or extension */
export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'code'
  | 'archive'
  | 'font'
  | 'model'
  | 'data'
  | 'other'

export interface FileItem extends EntityItemBase {
  type: 'file'
  mimeType: string
  sizeBytes?: number
  url?: string
  storagePath?: string
  pinned: boolean
  /** Auto-classified file category (image, video, audio, document, code…) */
  fileCategory?: FileCategory
  /** Lowercase file extension without dot (e.g. 'pdf', 'png') */
  fileExtension?: string

  // ── Category-specific enrichment metadata (populated by AI pipeline) ─

  // Image
  imageWidth?: number
  imageHeight?: number
  dominantColors?: string[]
  altText?: string

  // Video
  videoDuration?: number // seconds
  videoWidth?: number
  videoHeight?: number
  videoCodec?: string
  videoThumbnailUrl?: string

  // Audio
  audioDuration?: number // seconds
  audioBitrate?: number // kbps
  audioChannels?: number
  artist?: string
  album?: string
  genre?: string

  // Code
  codeLanguage?: string // e.g. 'typescript', 'python'
  lineCount?: number

  // Document (PDF, DOCX, etc.)
  pageCount?: number
  wordCount?: number
  documentAuthor?: string

  // Spreadsheet
  sheetCount?: number
  rowCount?: number

  // Archive
  archiveEntryCount?: number
  uncompressedSize?: number

  // AI enrichment summary (universal — any category)
  aiSummary?: string
  aiTags?: string[]
}

export type PageStatus = 'draft' | 'published' | 'archived'

export interface PageItem extends EntityItemBase {
  type: 'page'
  content?: string
  slug?: string
  icon?: string
  status?: PageStatus
  folder?: string
  bannerImage?: string
  sortOrder?: number
  isPublished: boolean
  pinned: boolean
}

export interface TemplateItem extends EntityItemBase {
  type: 'template'
  content?: string
  templateFor?: EntityType
  fields?: FormulaField[]
  pinned: boolean
}

export interface SlideDeckItem extends EntityItemBase {
  type: 'slide_deck'
  slides: string
  slideTheme?: 'dark' | 'light' | 'auto'
  slideTransition?: 'fade' | 'slide' | 'none'
  pinned: boolean
}

export interface BookmarkItem extends EntityItemBase {
  type: 'bookmark'
  url: string
  favicon?: string
  thumbnail?: string
  siteName?: string
  excerpt?: string
  pinned: boolean
}

export interface EmailItem extends EntityItemBase {
  type: 'email'
  subject?: string
  snippet?: string
  from?: string
  to?: string
  cc?: string
  bcc?: string
  date?: string
  labelIds?: string[]
  threadId?: string
  messageId?: string
  isRead?: boolean
  isStarred?: boolean
  bodyText?: string
  bodyHtml?: string
  source?: string
  gmailMessageId?: string
  gmailThreadId?: string
  pinned: boolean

  // ── AI enrichment (populated by server-side gmail-ingest) ────────────
  /** One-sentence AI-generated summary of the email body. Rendered read-only
   *  under the subject in the inline dialog for `email` entities. */
  summary?: string
  /** ISO timestamp of the last summary generation. */
  summaryGeneratedAt?: string
  /** JSON-encoded `EnrichmentSuggestion[]` — hydrated by EntityAISuggestionsPanel. */
  aiSuggestions?: string
  /** Topical tags extracted by the LLM (distinct from user `tags`). */
  aiSuggestedTags?: string[]
  /** JSON-encoded `TypeProposal[]` — hydrated by EntityAISuggestionsPanel. */
  aiTypeProposals?: string
  /** Short categorical labels assigned by the classifier (finance, travel, …). */
  aiLabels?: string[]
  /** ISO timestamp of the last full AI scan (covers summary + extract + classify). */
  aiScannedAt?: string
}

export interface DiagramItem extends EntityItemBase {
  type: 'diagram'
  content?: string
  diagramType?: 'flowchart' | 'sequence' | 'gantt' | 'class' | 'er' | 'mindmap' | 'other'
  pinned: boolean
}

// ── Actor Entities ─────────────────────────────────────────────────────────

export interface PersonItem extends EntityItemBase {
  type: 'person'
  email?: string
  phone?: string
  jobTitle?: string
  organization?: string
  website?: string
  avatar?: string
  address?: string
  socialLinks?: SocialLink[]
  birthday?: string
  pronouns?: string
}

export interface ContactItem extends EntityItemBase {
  type: 'contact'
  email?: string
  phone?: string
  avatar?: string
  company?: string
  address?: string
}

export interface OrganizationItem extends EntityItemBase {
  type: 'organization'
  website?: string
  industry?: string
  memberCount?: number
  logo?: string
  email?: string
  phone?: string
  address?: string
  founded?: string
  socialLinks?: SocialLink[]
}

export interface VendorItem extends EntityItemBase {
  type: 'vendor'
  email?: string
  phone?: string
  avatar?: string
  services?: string[]
  contractEnd?: string
  rating?: number
}

// ── Container Entities ─────────────────────────────────────────────────────

export interface ProjectItem extends EntityItemBase {
  type: 'project'
  status: ProjectStatus
  progress?: number
  budget?: number
  currency?: string
  children: string[]
  parentId?: string
}

export interface FolderItem extends EntityItemBase {
  type: 'folder'
  children: string[]
  status: ContainerStatus
  parentId?: string
  isSystemGenerated?: boolean
}

export interface CollectionItem extends EntityItemBase {
  type: 'collection'
  children: string[]
  status: ContainerStatus
  parentId?: string
  collectionType?: 'database' | 'document' | 'board' | 'calendar' | 'gallery' | 'form' | 'page' | 'list'
}

export interface GoalItem extends EntityItemBase {
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
  | SprintItem
  | BudgetItem

export type DocumentEntity = NoteItem | FileItem | PageItem | TemplateItem | SlideDeckItem | BookmarkItem | EmailItem

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
  'sprint',
  'budget',
])
const DOCUMENT_TYPES: Set<string> = new Set<DocumentEntityType>([
  'note',
  'file',
  'page',
  'template',
  'slide_deck',
  'bookmark',
  'email',
])
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
export const isSlideDeck = (entity: Entity): entity is SlideDeckItem => entity.type === 'slide_deck'
export const isBookmark = (entity: Entity): entity is BookmarkItem => entity.type === 'bookmark'
export const isEmail = (entity: Entity): entity is EmailItem => entity.type === 'email'
export const isPerson = (entity: Entity): entity is PersonItem => entity.type === 'person'
export const isOrganization = (entity: Entity): entity is OrganizationItem => entity.type === 'organization'
export const isProject = (entity: Entity): entity is ProjectItem => entity.type === 'project'
export const isFolder = (entity: Entity): entity is FolderItem => entity.type === 'folder'
export const isGoal = (entity: Entity): entity is GoalItem => entity.type === 'goal'
export const isSprint = (entity: Entity): entity is SprintItem => entity.type === 'sprint'
export const isMilestone = (entity: Entity): entity is MilestoneItem => entity.type === 'milestone'
export const isBudget = (entity: Entity): entity is BudgetItem => entity.type === 'budget'

// ============================================================================
// Defaults / Factories
// ============================================================================

const getToday = () => todayYmdLocal(new Date())

export const createDefaultBase = (): Omit<EntityItemBase, 'type'> => ({
  id: '',
  title: '',
  description: '',
  startDate: getToday(),
  endDate: undefined,
  allDay: true,
  startTime: undefined,
  endTime: undefined,
  duration: undefined,
  priority: 'medium',
  urgency: 'not-urgent',
  priorityOverride: false,
  urgencyOverride: false,
  category: 'general',
  tags: [],
  owner: undefined,
  involved: [],
  folder: undefined,
  notes: undefined,
  references: [],
  attachments: [],
  commentCount: 0,
  fileCount: 0,
  reminders: [],
  recurrence: undefined,
  formulas: undefined,
  createdAt: undefined,
  updatedAt: undefined,
})

export const createDefaultTask = (): TaskItem => ({
  ...createDefaultBase(),
  type: 'task',
  taskStatus: 'pending',
  checklistContent: '',
})

export const createDefaultEvent = (): EventItem => ({
  ...createDefaultBase(),
  type: 'event',
  allDay: false,
  startTime: '09:00',
  endTime: '10:00',
  eventType: 'meeting',
  location: undefined,
  attendees: [],
  conferenceLink: undefined,
})

export const createDefaultTrip = (): TripItem => ({
  ...createDefaultBase(),
  type: 'trip',
  destination: '',
  origin: undefined,
  transportation: 'flight',
  budget: undefined,
  currency: 'USD',
  confirmationNumber: undefined,
  tripStatus: 'planning',
})

export const createDefaultPayment = (): PaymentItem => ({
  ...createDefaultBase(),
  type: 'payment',
  amount: 0,
  currency: 'USD',
  payee: undefined,
  paymentMethod: undefined,
  recurring: false,
  paymentStatus: 'pending',
  invoiceNumber: undefined,
  direction: 'debit',
  paymentChannel: undefined,
  merchantName: undefined,
  merchantLogoUrl: undefined,
  merchantWebsite: undefined,
  authorizedDate: undefined,
  accountName: undefined,
  accountMask: undefined,
  financeCategory: undefined,
  financeCategoryDetailed: undefined,
  counterparties: [],
  referenceNumber: undefined,
  checkNumber: undefined,
  pending: false,
  lineItems: [],
  subtotal: undefined,
  taxAmount: undefined,
  taxRate: undefined,
  discount: undefined,
  tip: undefined,
  balanceAfter: undefined,
  memo: undefined,
})

export const createDefaultNote = (): NoteItem => ({
  ...createDefaultBase(),
  type: 'note',
  content: '',
  linkedItems: [],
  pinned: false,
})

export const createDefaultSlideDeck = (): SlideDeckItem => ({
  ...createDefaultBase(),
  type: 'slide_deck',
  slides: '[]',
  slideTheme: 'dark',
  slideTransition: 'fade',
  pinned: false,
})

export const createDefaultBookmark = (): BookmarkItem => ({
  ...createDefaultBase(),
  type: 'bookmark',
  url: '',
  favicon: undefined,
  thumbnail: undefined,
  siteName: undefined,
  excerpt: undefined,
  pinned: false,
})

export const createDefaultEmail = (): EmailItem => ({
  ...createDefaultBase(),
  type: 'email',
  subject: undefined,
  snippet: undefined,
  from: undefined,
  to: undefined,
  cc: undefined,
  bcc: undefined,
  date: undefined,
  labelIds: [],
  threadId: undefined,
  messageId: undefined,
  isRead: false,
  isStarred: false,
  bodyText: undefined,
  bodyHtml: undefined,
  source: 'gmail',
  gmailMessageId: undefined,
  gmailThreadId: undefined,
  pinned: false,
})

export const createDefaultPerson = (): PersonItem => ({
  ...createDefaultBase(),
  type: 'person',
  email: undefined,
  phone: undefined,
  jobTitle: undefined,
  organization: undefined,
  website: undefined,
  avatar: undefined,
  address: undefined,
  socialLinks: [],
  birthday: undefined,
  pronouns: undefined,
})

export const createDefaultOrganization = (): OrganizationItem => ({
  ...createDefaultBase(),
  type: 'organization',
  website: undefined,
  industry: undefined,
  memberCount: undefined,
  logo: undefined,
  email: undefined,
  phone: undefined,
  address: undefined,
  founded: undefined,
  socialLinks: [],
})

export const createDefaultFile = (): FileItem => ({
  ...createDefaultBase(),
  type: 'file',
  mimeType: '',
  sizeBytes: undefined,
  url: undefined,
  storagePath: undefined,
  pinned: false,
  fileCategory: undefined,
  fileExtension: undefined,
})

export const createDefaultSprint = (): SprintItem => ({
  ...createDefaultBase(),
  type: 'sprint',
  sprintGoal: undefined,
  sprintStatus: 'planning',
  velocity: undefined,
})

export const createDefaultMilestone = (): MilestoneItem => ({
  ...createDefaultBase(),
  type: 'milestone',
  projectId: undefined,
  achieved: false,
})

export const createDefaultGoal = (): GoalItem => ({
  ...createDefaultBase(),
  type: 'goal',
  targetDate: undefined,
  metric: undefined,
  targetValue: undefined,
  currentValue: undefined,
})

export const createDefaultBudget = (): BudgetItem => ({
  ...createDefaultBase(),
  type: 'budget',
  amount: 0,
  currency: 'USD',
  budgetStatus: 'draft',
})

export const createDefaultProject = (): ProjectItem => ({
  ...createDefaultBase(),
  type: 'project',
  status: 'active',
  progress: 0,
  budget: undefined,
  currency: 'USD',
  children: [],
  parentId: undefined,
})

export const createDefaultItem = (type: EntityType | string): Entity => {
  switch (type) {
    case 'task':
      return createDefaultTask()
    case 'event':
      return createDefaultEvent()
    case 'trip':
      return createDefaultTrip()
    case 'payment':
      return createDefaultPayment()
    case 'note':
      return createDefaultNote()
    case 'slide_deck':
      return createDefaultSlideDeck()
    case 'file':
      return createDefaultFile()
    case 'bookmark':
      return createDefaultBookmark()
    case 'email':
      return createDefaultEmail()
    case 'person':
      return createDefaultPerson()
    case 'organization':
      return createDefaultOrganization()
    case 'project':
      return createDefaultProject()
    case 'sprint':
      return createDefaultSprint()
    case 'milestone':
      return createDefaultMilestone()
    case 'goal':
      return createDefaultGoal()
    case 'budget':
      return createDefaultBudget()
    default:
      return { ...createDefaultBase(), type: type as EntityType } as Entity
  }
}

// ============================================================================
// UI Config Lookups
// ============================================================================

export const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string; icon: string }[] = [
  { value: 'task', label: 'Task', icon: 'lucide:check-square' },
  { value: 'event', label: 'Event', icon: 'lucide:calendar' },
  { value: 'trip', label: 'Trip', icon: 'lucide:plane' },
  { value: 'payment', label: 'Payment', icon: 'lucide:credit-card' },
  { value: 'note', label: 'Note', icon: 'lucide:sticky-note' },
  { value: 'file', label: 'File', icon: 'lucide:file' },
  { value: 'page', label: 'Page', icon: 'lucide:book-open' },
  { value: 'template', label: 'Template', icon: 'lucide:copy' },
  { value: 'slide_deck', label: 'Slide Deck', icon: 'lucide:presentation' },
  { value: 'bookmark', label: 'Bookmark', icon: 'lucide:bookmark' },
  { value: 'person', label: 'Person', icon: 'lucide:user' },
  { value: 'organization', label: 'Organization', icon: 'lucide:building-2' },
  { value: 'project', label: 'Project', icon: 'lucide:folder-kanban' },
  { value: 'sprint', label: 'Sprint', icon: 'lucide:zap' },
  { value: 'milestone', label: 'Milestone', icon: 'lucide:flag' },
  { value: 'goal', label: 'Goal', icon: 'lucide:target' },
  { value: 'budget', label: 'Budget', icon: 'lucide:wallet' },
]

export const PRIORITY_OPTIONS: { value: Priority; label: string; icon: string; color: string }[] = [
  {
    value: 'critical',
    label: 'Critical',
    icon: 'lucide:alert-octagon',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'high',
    label: 'High',
    icon: 'lucide:arrow-up',
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: 'lucide:minus',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    value: 'low',
    label: 'Low',
    icon: 'lucide:arrow-down',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
]

export const URGENCY_OPTIONS: { value: Urgency; label: string; icon: string; color: string }[] = [
  {
    value: 'urgent',
    label: 'Urgent',
    icon: 'lucide:zap',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'not-urgent',
    label: 'Not Urgent',
    icon: 'lucide:clock',
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
  },
]

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; icon: string; color: string }[] = [
  {
    value: 'pending',
    label: 'Pending',
    icon: 'lucide:circle',
    color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    icon: 'lucide:loader',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'on-track',
    label: 'On Track',
    icon: 'lucide:trending-up',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'due-soon',
    label: 'Due Soon',
    icon: 'lucide:alarm-clock',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    value: 'overdue',
    label: 'Overdue',
    icon: 'lucide:alert-triangle',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: 'lucide:check-circle',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
]

export const EVENT_TYPE_OPTIONS: { value: EventSubtype; label: string; icon: string; color: string }[] = [
  {
    value: 'meeting',
    label: 'Meeting',
    icon: 'lucide:users',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'appointment',
    label: 'Appointment',
    icon: 'lucide:calendar-check',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'training',
    label: 'Training',
    icon: 'lucide:graduation-cap',
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    value: 'deadline',
    label: 'Deadline',
    icon: 'lucide:alert-circle',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'social',
    label: 'Social',
    icon: 'lucide:party-popper',
    color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400',
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'lucide:calendar',
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
  },
]

export const TRIP_STATUS_OPTIONS: { value: TripStatus; label: string; icon: string; color: string }[] = [
  {
    value: 'planning',
    label: 'Planning',
    icon: 'lucide:map',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'booked',
    label: 'Booked',
    icon: 'lucide:ticket',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    icon: 'lucide:plane',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: 'lucide:check-circle',
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: 'lucide:x-circle',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
]

export const TRANSPORT_OPTIONS: { value: TransportMode; label: string; icon: string }[] = [
  { value: 'flight', label: 'Flight', icon: 'lucide:plane' },
  { value: 'drive', label: 'Drive', icon: 'lucide:car' },
  { value: 'train', label: 'Train', icon: 'lucide:train-front' },
  { value: 'bus', label: 'Bus', icon: 'lucide:bus' },
  { value: 'other', label: 'Other', icon: 'lucide:navigation' },
]

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string; icon: string; color: string }[] = [
  {
    value: 'pending',
    label: 'Pending',
    icon: 'lucide:clock',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    value: 'paid',
    label: 'Paid',
    icon: 'lucide:check-circle',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'overdue',
    label: 'Overdue',
    icon: 'lucide:alert-triangle',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: 'lucide:x-circle',
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
  },
]

export const SPRINT_STATUS_OPTIONS: { value: SprintStatus; label: string; icon: string; color: string }[] = [
  {
    value: 'planning',
    label: 'Planning',
    icon: 'lucide:map',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'active',
    label: 'Active',
    icon: 'lucide:play',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: 'lucide:check-circle',
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: 'lucide:x-circle',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
]

export const BUDGET_STATUS_OPTIONS: { value: BudgetStatus; label: string; icon: string; color: string }[] = [
  {
    value: 'draft',
    label: 'Draft',
    icon: 'lucide:file-edit',
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
  },
  {
    value: 'active',
    label: 'Active',
    icon: 'lucide:play',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'closed',
    label: 'Closed',
    icon: 'lucide:check-circle',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'over-budget',
    label: 'Over Budget',
    icon: 'lucide:alert-triangle',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
]

export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
]

export const CATEGORY_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'general', label: 'General', icon: 'lucide:layers' },
  { value: 'work', label: 'Work', icon: 'lucide:briefcase' },
  { value: 'personal', label: 'Personal', icon: 'lucide:user' },
  { value: 'meeting', label: 'Meeting', icon: 'lucide:users' },
  { value: 'review', label: 'Review', icon: 'lucide:eye' },
  { value: 'appointment', label: 'Appointment', icon: 'lucide:calendar-check' },
  { value: 'deadline', label: 'Deadline', icon: 'lucide:alert-circle' },
  { value: 'health', label: 'Health', icon: 'lucide:heart-pulse' },
  { value: 'finance', label: 'Finance', icon: 'lucide:banknote' },
  { value: 'travel', label: 'Travel', icon: 'lucide:map-pin' },
]

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
  // ── Type-specific fields (promoted from content panels) ──
  // Payment
  | 'amount'
  | 'currency'
  | 'payee'
  | 'invoiceNumber'
  | 'paymentStatus'
  | 'recurring'
  // Trip
  | 'origin'
  | 'destination'
  | 'transportation'
  | 'tripStatus'
  | 'tripBudget'
  | 'confirmationNumber'
  // Sprint
  | 'sprintStatus'
  | 'velocity'
  | 'sprintGoal'
  // Milestone
  | 'achieved'
  | 'projectId'
  // Budget
  | 'budgetAmount'
  | 'budgetCurrency'
  | 'budgetStatus'
  // Goal
  | 'metric'
  | 'targetDate'
  | 'currentValue'
  | 'targetValue'
  // Event
  | 'location'
  | 'eventSubtype'

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
  /** Short description shown in page headers and tooltips */
  description?: string
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
