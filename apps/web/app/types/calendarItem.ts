/**
 * Unified Calendar Item Type System
 *
 * Polymorphic data model for calendar-bound entities:
 * tasks, events, trips, payments, and notes.
 *
 * Each type shares a common base (CalendarItemBase) and extends
 * with type-specific properties via discriminated union on `type`.
 *
 * @deprecated This file is a backward-compatibility shim. The canonical
 * type system is now `~/types/entity` which provides the two-axis Entity
 * Class architecture (temporal / document / actor / container classes with
 * type-specific panels). New code should import from `~/types/entity` and
 * use the Entity class system (EntityBase + class mixins) instead.
 * See also: `~/config/entityRegistry` for type → class → UI config mapping.
 */

// ============================================================================
// Enums & Primitives
// ============================================================================

export type CalendarItemType = 'task' | 'event' | 'trip' | 'payment' | 'note'

export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Urgency = 'urgent' | 'not-urgent'

export type TaskStatus = 'pending' | 'in-progress' | 'on-track' | 'due-soon' | 'overdue' | 'completed'
export type EventType = 'meeting' | 'appointment' | 'training' | 'deadline' | 'social' | 'other'
export type TripStatus = 'planning' | 'booked' | 'in-progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type TransportMode = 'flight' | 'drive' | 'train' | 'bus' | 'other'

export const CALENDAR_ITEM_TYPES: { value: CalendarItemType; label: string; icon: string }[] = [
  { value: 'task', label: 'Task', icon: 'lucide:check-square' },
  { value: 'event', label: 'Event', icon: 'lucide:calendar' },
  { value: 'trip', label: 'Trip', icon: 'lucide:plane' },
  { value: 'payment', label: 'Payment', icon: 'lucide:credit-card' },
  { value: 'note', label: 'Note', icon: 'lucide:sticky-note' },
]

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
// Supporting Types
// ============================================================================

export interface Reminder {
  id: string
  timing: string // e.g. '1-day-before', '1-hour-before', '15-min-before', 'custom'
  method: 'email' | 'push' | 'in-app'
  customMinutes?: number
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'weekdays' | 'custom'
  interval?: number // e.g. every 2 weeks
  weekdays?: number[] // 0=Sun, 1=Mon, etc.
  endDate?: string // YYYY-MM-DD
  occurrences?: number // stop after N occurrences
}

// Re-export the canonical Reference types from entity.ts
export type { FileReference, EntityReference, Reference, FileType } from '~/types/entity'
export { isFileReference, isEntityReference } from '~/types/entity'

/**
 * @deprecated Use `FileReference` from `~/types/entity` instead.
 */
export interface Attachment {
  id: string
  name: string
  type: 'pdf' | 'spreadsheet' | 'image' | 'document' | 'other'
  url?: string
  size?: number // bytes
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
  expression: string // JS expression string
  returnType: 'text' | 'number' | 'boolean' | 'date'
  result?: unknown // Cached computed result
}

// ============================================================================
// CalendarItemBase — shared by all types
// ============================================================================

export interface CalendarItemBase {
  id: string
  type: CalendarItemType
  title: string
  description?: string

  // Scheduling
  startDate: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD (multi-day)
  allDay: boolean
  startTime?: string // HH:mm (when not all-day)
  endTime?: string // HH:mm (when not all-day)
  duration?: number // minutes (alternative to endTime)

  // Classification
  priority: Priority
  urgency: Urgency
  priorityOverride: boolean // true if user manually set priority
  urgencyOverride: boolean // true if user manually set urgency
  category: string
  tags: string[]

  // People
  owner?: string
  involved: string[]

  // Organization
  folder?: string
  notes?: string

  // References (files + entity links)
  references: import('~/types/entity').Reference[]
  /** @deprecated Use `references` instead. */
  attachments: Attachment[]
  commentCount?: number
  fileCount?: number

  // Scheduling / recurrence
  reminders: Reminder[]
  recurrence?: RecurrenceRule

  // Formulas
  formulas?: FormulaField[]

  // Timestamps
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// Type-Specific Extensions (discriminated union)
// ============================================================================

export interface TaskItem extends CalendarItemBase {
  type: 'task'
  taskStatus: TaskStatus
  checklist?: ChecklistItem[]
}

export interface EventItem extends CalendarItemBase {
  type: 'event'
  location?: string
  attendees?: Attendee[]
  conferenceLink?: string
  eventType: EventType
}

export interface TripItem extends CalendarItemBase {
  type: 'trip'
  origin?: string
  destination: string
  transportation: TransportMode
  budget?: number
  currency?: string
  confirmationNumber?: string
  tripStatus: TripStatus
}

export interface PaymentItem extends CalendarItemBase {
  type: 'payment'
  amount: number
  currency: string
  payee?: string
  paymentMethod?: string
  recurring: boolean
  paymentStatus: PaymentStatus
  invoiceNumber?: string
}

export interface NoteItem extends CalendarItemBase {
  type: 'note'
  content?: string // Rich text
  linkedItems?: string[] // IDs of related calendar items
  pinned: boolean
}

// ============================================================================
// Discriminated Union
// ============================================================================

export type CalendarItem = TaskItem | EventItem | TripItem | PaymentItem | NoteItem

// ============================================================================
// Defaults / Factories
// ============================================================================

const getToday = () => new Date().toISOString().split('T')[0] ?? ''

export const createDefaultBase = (): Omit<CalendarItemBase, 'type'> => ({
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
  checklist: [
    { id: `cl-${Date.now()}-a`, label: '', completed: false, order: 0, parentId: null, collapsed: false },
    { id: `cl-${Date.now()}-b`, label: '', completed: false, order: 1, parentId: null, collapsed: false },
    { id: `cl-${Date.now()}-c`, label: '', completed: false, order: 2, parentId: null, collapsed: false },
  ],
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
})

export const createDefaultNote = (): NoteItem => ({
  ...createDefaultBase(),
  type: 'note',
  content: '',
  linkedItems: [],
  pinned: false,
})

export const createDefaultItem = (type: CalendarItemType): CalendarItem => {
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
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export const isTask = (item: CalendarItem): item is TaskItem => item.type === 'task'
export const isEvent = (item: CalendarItem): item is EventItem => item.type === 'event'
export const isTrip = (item: CalendarItem): item is TripItem => item.type === 'trip'
export const isPayment = (item: CalendarItem): item is PaymentItem => item.type === 'payment'
export const isNote = (item: CalendarItem): item is NoteItem => item.type === 'note'

// ============================================================================
// UI Config Lookups
// ============================================================================

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

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: string; color: string }[] = [
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
