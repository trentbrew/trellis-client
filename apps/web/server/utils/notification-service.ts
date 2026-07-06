/**
 * Notification Service
 *
 * Server-side helper for emitting notifications into the TQL graph.
 * Writes to the `notification` namespace, logs the mutation, and
 * broadcasts an SSE event so connected clients render the toast/bell badge.
 */

import { useTrellisKernel, pushMutationLog } from '../plugins/trellis-kernel'
import { emitMutation } from './trellis-events'
import { admitNotification, recordNotificationOutcome } from './notification-policy'
import type { CreateNotificationInput, NotificationAction, TrellisNotification } from '../../app/types/notification'
import { NOTIFICATION_NAMESPACE } from './trellis-ontologies'

const NOTIFICATION_PREFIX = `${NOTIFICATION_NAMESPACE}:`

function newId(): string {
  const rand = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${NOTIFICATION_PREFIX}${rand}`
}

function serializeActions(actions?: NotificationAction[]): string | undefined {
  if (!actions || actions.length === 0) return undefined
  try {
    return JSON.stringify(actions)
  } catch {
    return undefined
  }
}

function serializeMetadata(meta?: Record<string, any>): string | undefined {
  if (!meta) return undefined
  try {
    return JSON.stringify(meta)
  } catch {
    return undefined
  }
}

/**
 * Create a notification in the TQL graph.
 *
 * Returns the persisted record (best-effort — id + input shape is authoritative
 * on the client since the server does not re-read after write).
 */
export async function createNotification(
  input: CreateNotificationInput,
  opts: { agentId?: string } = {},
): Promise<TrellisNotification> {
  const kernel = useTrellisKernel()
  const admitted = admitNotification(input)
  const id = newId()
  const now = new Date().toISOString()
  const agent = opts.agentId || 'system'

  const record: Record<string, any> = {
    title: admitted.title,
    body: admitted.body,
    kind: admitted.kind,
    source: admitted.source,
    sourceId: admitted.sourceId,
    priority: admitted.priority || 'normal',
    delivery: admitted.delivery,
    requiredAction: admitted.requiredAction,
    status: 'unread',
    icon: admitted.icon,
    color: admitted.color,
    sound: admitted.sound,
    entityId: admitted.entityId,
    entityType: admitted.entityType,
    url: admitted.url,
    actions: serializeActions(admitted.actions),
    metadata: serializeMetadata(admitted.metadata),
    groupKey: admitted.groupKey,
    createdAt: now,
    updatedAt: now,
  }

  // Strip undefined so we don't persist empty facts
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(record)) if (v !== undefined) clean[k] = v

  await kernel.createNode(id, clean, NOTIFICATION_NAMESPACE, { agentId: agent })
  pushMutationLog({ action: 'createNode', entityId: id, type: NOTIFICATION_NAMESPACE, data: record })
  emitMutation({
    action: 'createNode',
    entityId: id,
    type: NOTIFICATION_NAMESPACE,
    agentId: agent,
    data: record,
  })

  return {
    id,
    title: admitted.title,
    body: admitted.body,
    kind: admitted.kind,
    source: admitted.source,
    sourceId: admitted.sourceId,
    priority: admitted.priority || 'normal',
    delivery: admitted.delivery,
    requiredAction: admitted.requiredAction,
    status: 'unread',
    icon: admitted.icon,
    color: admitted.color,
    sound: admitted.sound,
    entityId: admitted.entityId,
    entityType: admitted.entityType,
    url: admitted.url,
    actions: admitted.actions,
    metadata: admitted.metadata,
    groupKey: admitted.groupKey,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Read notification fields needed for outcome tracking.
 */
export function getNotificationFields(id: string): Pick<TrellisNotification, 'source' | 'delivery'> | null {
  try {
    const kernel = useTrellisKernel()
    const facts = kernel.getStore().getFactsByEntity(id)
    if (facts.length === 0) return null
    const source = facts.find((f) => f.a === 'source')?.v
    const delivery = facts.find((f) => f.a === 'delivery')?.v
    if (typeof source !== 'string') return null
    return {
      source: source as TrellisNotification['source'],
      delivery: (typeof delivery === 'string' ? delivery : undefined) as TrellisNotification['delivery'],
    }
  } catch {
    return null
  }
}

/**
 * Update a notification's status (mark read, archive, snooze, etc.).
 */
export async function updateNotificationStatus(
  id: string,
  patch: Partial<Pick<TrellisNotification, 'status' | 'readAt' | 'snoozeUntil' | 'archivedAt'>>,
  opts: { agentId?: string; outcome?: 'acted' | 'dismissed' } = {},
): Promise<void> {
  const kernel = useTrellisKernel()
  const agent = opts.agentId || 'system'

  if (opts.outcome) {
    const fields = getNotificationFields(id)
    if (fields?.source && fields.delivery === 'interrupt') {
      recordNotificationOutcome(fields.source, opts.outcome)
    }
  }

  const data: Record<string, any> = { updatedAt: new Date().toISOString() }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) data[k] = v
  await kernel.updateNode(id, data, NOTIFICATION_NAMESPACE, { agentId: agent })
  pushMutationLog({ action: 'updateNode', entityId: id, type: NOTIFICATION_NAMESPACE, data })
  emitMutation({ action: 'updateNode', entityId: id, type: NOTIFICATION_NAMESPACE, agentId: agent, data })
}

export async function deleteNotification(id: string, opts: { agentId?: string } = {}): Promise<void> {
  const kernel = useTrellisKernel()
  const agent = opts.agentId || 'system'
  await kernel.deleteNode(id, { agentId: agent })
  pushMutationLog({ action: 'deleteNode', entityId: id, type: NOTIFICATION_NAMESPACE })
  emitMutation({ action: 'deleteNode', entityId: id, type: NOTIFICATION_NAMESPACE, agentId: agent })
}

// ─── System alert helper ───────────────────────────────────────────────────

/**
 * Check whether an unread notification with the given sourceId already exists.
 * Used by `createSystemAlert` to avoid spamming the same error repeatedly.
 */
function hasUnreadWithSourceId(sourceId: string): boolean {
  try {
    const kernel = useTrellisKernel()
    const result = kernel.query(
      `FIND ${NOTIFICATION_NAMESPACE} AS ?n WHERE ?n.sourceId = "${sourceId}" AND ?n.status = "unread" RETURN ?n.sourceId LIMIT 1`,
    ) as any
    return Array.isArray(result?.rows) && result.rows.length > 0
  } catch {
    return false
  }
}

export interface SystemAlertInput {
  /** Short, user-facing title */
  title: string
  /** Optional body with more context */
  body?: string
  /** Stable id so repeated calls don't spawn duplicate unread alerts */
  sourceId: string
  /** Who surfaced this alert (e.g. `gmail-notifier`, `calendar-notifier`) */
  source?: CreateNotificationInput['source']
  /** Alert severity */
  severity?: 'error' | 'warning'
  /** Optional deep-link (usually /settings/integrations) */
  url?: string
  /** Optional CTA actions; a Dismiss action is appended automatically */
  actions?: NotificationAction[]
  metadata?: Record<string, any>
  groupKey?: string
  agentId?: string
}

/**
 * Emit a system-level alert (error / warning) with built-in de-duplication.
 *
 * If an unread notification with the same `sourceId` already exists, this is a
 * no-op. Mark the alert as read (or let the user dismiss it) to re-enable
 * future alerts for the same source.
 */
export async function createSystemAlert(input: SystemAlertInput): Promise<TrellisNotification | null> {
  if (hasUnreadWithSourceId(input.sourceId)) return null

  const severity = input.severity || 'error'
  const actions: NotificationAction[] = [
    ...(input.actions || []),
    { id: 'dismiss', kind: 'dismiss', label: 'Dismiss', icon: 'lucide:x' },
  ]

  return createNotification(
    {
      title: input.title,
      body: input.body,
      kind: severity,
      source: input.source || 'ops',
      sourceId: input.sourceId,
      priority: severity === 'error' ? 'high' : 'normal',
      delivery: 'interrupt',
      requiredAction: severity === 'error' ? 'resolve' : 'acknowledge',
      url: input.url,
      actions,
      metadata: input.metadata,
      groupKey: input.groupKey || `alert:${input.sourceId}`,
    },
    { agentId: input.agentId || 'ops-notifier' },
  )
}
