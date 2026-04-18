/**
 * Notification Service
 *
 * Server-side helper for emitting notifications into the TQL graph.
 * Writes to the `notification` namespace, logs the mutation, and
 * broadcasts an SSE event so connected clients render the toast/bell badge.
 */

import { useTqlKernel, pushMutationLog } from '../plugins/tql'
import { emitMutation } from './tql-events'
import type { CreateNotificationInput, NotificationAction, TrellisNotification } from '../../app/types/notification'
import { NOTIFICATION_NAMESPACE } from './tql-ontologies'

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
  const kernel = useTqlKernel()
  const id = newId()
  const now = new Date().toISOString()
  const agent = opts.agentId || 'system'

  const record: Record<string, any> = {
    title: input.title,
    body: input.body,
    kind: input.kind,
    source: input.source,
    sourceId: input.sourceId,
    priority: input.priority || 'normal',
    status: 'unread',
    icon: input.icon,
    color: input.color,
    sound: input.sound,
    entityId: input.entityId,
    entityType: input.entityType,
    url: input.url,
    actions: serializeActions(input.actions),
    metadata: serializeMetadata(input.metadata),
    groupKey: input.groupKey,
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
    title: input.title,
    body: input.body,
    kind: input.kind,
    source: input.source,
    sourceId: input.sourceId,
    priority: input.priority || 'normal',
    status: 'unread',
    icon: input.icon,
    color: input.color,
    sound: input.sound,
    entityId: input.entityId,
    entityType: input.entityType,
    url: input.url,
    actions: input.actions,
    metadata: input.metadata,
    groupKey: input.groupKey,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Update a notification's status (mark read, archive, snooze, etc.).
 */
export async function updateNotificationStatus(
  id: string,
  patch: Partial<Pick<TrellisNotification, 'status' | 'readAt' | 'snoozeUntil' | 'archivedAt'>>,
  opts: { agentId?: string } = {},
): Promise<void> {
  const kernel = useTqlKernel()
  const agent = opts.agentId || 'system'
  const data: Record<string, any> = { updatedAt: new Date().toISOString() }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) data[k] = v
  await kernel.updateNode(id, data, NOTIFICATION_NAMESPACE, { agentId: agent })
  pushMutationLog({ action: 'updateNode', entityId: id, type: NOTIFICATION_NAMESPACE, data })
  emitMutation({ action: 'updateNode', entityId: id, type: NOTIFICATION_NAMESPACE, agentId: agent, data })
}

export async function deleteNotification(id: string, opts: { agentId?: string } = {}): Promise<void> {
  const kernel = useTqlKernel()
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
    const kernel = useTqlKernel()
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
      url: input.url,
      actions,
      metadata: input.metadata,
      groupKey: input.groupKey || `alert:${input.sourceId}`,
    },
    { agentId: input.agentId || 'ops-notifier' },
  )
}
