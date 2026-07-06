/**
 * Trellis Notification Types
 *
 * In-app notifications stored as TQL nodes in the `notification` namespace.
 * Mirrors the schema defined in `server/utils/tql-ontologies.ts`
 * (`notificationOntology`).
 */

export type NotificationKind =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'reminder'
  | 'email'
  | 'calendar'
  | 'alert'
  | 'ops'
  | 'job'

export type NotificationSource =
  | 'system'
  | 'email'
  | 'calendar'
  | 'graph'
  | 'job'
  | 'ops'
  | 'workflow'
  | 'ai'
  | 'user'

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low'

export type NotificationDelivery = 'interrupt' | 'passive'

export type NotificationRequiredAction = 'none' | 'acknowledge' | 'navigate' | 'resolve'

export type NotificationStatus = 'unread' | 'read' | 'archived' | 'snoozed'

export type NotificationSound = 'success' | 'fail' | 'reminder' | 'email' | 'none'

export type NotificationActionKind =
  | 'link'
  | 'dismiss'
  | 'snooze'
  | 'mark_read'
  | 'workflow'
  | 'create_entity'
  | 'api'

export interface NotificationAction {
  /** Stable action id — also used for analytics */
  id: string
  /** Button label */
  label: string
  kind: NotificationActionKind
  /** kind=link → route path or URL */
  target?: string
  /** kind=snooze → minutes */
  minutes?: number
  /** kind=workflow → workflow identifier */
  workflow?: string
  /** kind=create_entity → entity seed */
  entityType?: string
  entitySeed?: Record<string, any>
  /** kind=api → relative API path + method + body */
  apiPath?: string
  apiMethod?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  apiBody?: Record<string, any>
  /** Optional icon override for the action button */
  icon?: string
  /** If true, close the row after action runs */
  closesNotification?: boolean
}

export interface TrellisNotification {
  id: string
  title: string
  body?: string
  kind: NotificationKind
  source: NotificationSource
  sourceId?: string
  priority: NotificationPriority
  status: NotificationStatus
  readAt?: string
  snoozeUntil?: string
  archivedAt?: string
  icon?: string
  color?: string
  sound?: NotificationSound
  entityId?: string
  entityType?: string
  url?: string
  actions?: NotificationAction[]
  metadata?: Record<string, any>
  groupKey?: string
  /** interrupt = bell/toast; passive = activity only */
  delivery?: NotificationDelivery
  /** EEMUA audit — why interrupt was granted */
  requiredAction?: NotificationRequiredAction
  createdAt: string
  updatedAt?: string
}

/** Payload accepted by the create-notification helper */
export interface CreateNotificationInput {
  title: string
  body?: string
  kind: NotificationKind
  source: NotificationSource
  sourceId?: string
  priority?: NotificationPriority
  icon?: string
  color?: string
  sound?: NotificationSound
  entityId?: string
  entityType?: string
  url?: string
  actions?: NotificationAction[]
  metadata?: Record<string, any>
  groupKey?: string
  delivery?: NotificationDelivery
  requiredAction?: NotificationRequiredAction
}

// ============================================================================
// Visual + audio mapping
// ============================================================================

export interface NotificationVisual {
  icon: string
  color: string
  sound: NotificationSound
}

/** Per-kind defaults — overridable per-notification via `icon`/`color`/`sound` */
export const NOTIFICATION_KIND_VISUALS: Record<NotificationKind, NotificationVisual> = {
  success:  { icon: 'lucide:check-circle-2', color: 'emerald', sound: 'success' },
  error:    { icon: 'lucide:triangle-alert', color: 'red',     sound: 'fail' },
  warning:  { icon: 'lucide:alert-triangle', color: 'amber',   sound: 'fail' },
  info:     { icon: 'lucide:info',           color: 'sky',     sound: 'none' },
  reminder: { icon: 'lucide:bell',           color: 'amber',   sound: 'reminder' },
  email:    { icon: 'lucide:mail',           color: 'rose',    sound: 'email' },
  calendar: { icon: 'lucide:calendar',       color: 'violet',  sound: 'reminder' },
  alert:    { icon: 'lucide:siren',          color: 'red',     sound: 'fail' },
  ops:      { icon: 'lucide:activity',       color: 'slate',   sound: 'none' },
  job:      { icon: 'lucide:cog',            color: 'indigo',  sound: 'none' },
}

/** Filesystem paths (served from /public) for each sound slot */
export const NOTIFICATION_SOUND_FILES: Record<Exclude<NotificationSound, 'none'>, string> = {
  success:  '/sounds/sfx/success.wav',
  fail:     '/sounds/sfx/fail.wav',
  reminder: '/sounds/sfx/Jig1.wav',
  email:    '/sounds/sfx/Jig0.wav',
}

export function resolveNotificationVisual(n: Pick<TrellisNotification, 'kind' | 'icon' | 'color' | 'sound'>): NotificationVisual {
  const base = NOTIFICATION_KIND_VISUALS[n.kind] ?? NOTIFICATION_KIND_VISUALS.info
  return {
    icon: n.icon || base.icon,
    color: n.color || base.color,
    sound: n.sound || base.sound,
  }
}

/** Legacy notifications without `delivery` default to interrupt (30-day compat). */
export function resolveNotificationDelivery(
  n: Pick<TrellisNotification, 'delivery'>,
): NotificationDelivery {
  return n.delivery ?? 'interrupt'
}
